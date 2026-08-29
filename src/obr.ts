import OBR from "@owlbear-rodeo/sdk";
import type { Player } from "@owlbear-rodeo/sdk";
import type { CharacterSheet, RollLogEntry, TokenPool, TokenType } from "./types";
import { emptySheet, emptyAbilityEffects, defaultTokenPool, MAX_TOKENS, makeId } from "./types";
import type { ResultPayload } from "./ui/result";

const ID = "com.madisonmetro.voidborn";
const SHEET_PREFIX = `${ID}/sheet/`; // sheets live in ROOM metadata, one key per player id
const LEGACY_SHEET_KEY = `${ID}/sheet`; // old player-metadata location, pre-migration
const LOG_KEY = `${ID}/log`;
const TOKEN_POOL_KEY = `${ID}/tokens`;
const ROLL_CHANNEL = `${ID}/roll-toast`;
const MAX_LOG_ENTRIES = 30;

function sheetKey(playerId: string): string {
  return `${SHEET_PREFIX}${playerId}`;
}

// Verbose, always-on diagnostic logging for the sheet save/load pipeline.
// Left in deliberately (not stripped for production) so a real repro of the
// data-loss bug can be captured straight from the browser console.
function logSheet(...args: unknown[]) {
  console.log("[VoidBorn/sheet]", new Date().toISOString(), ...args);
}

function summarize(sheet: CharacterSheet): Record<string, unknown> {
  return {
    name: sheet.name,
    updatedAt: sheet.updatedAt,
    weapons: sheet.weapons.length,
    abilities: sheet.abilities.length,
    wargear: sheet.wargear.length,
  };
}

/**
 * Merges stored data over sheet defaults and migrates older shapes:
 * - `abilities` used to be a single free-text string; now it's a list.
 * - `wargear` and `handle` are newly added fields.
 */
export function migrateSheet(stored: unknown): CharacterSheet {
  const base = emptySheet();
  if (!stored || typeof stored !== "object") return base;

  const merged = { ...base, ...(stored as Partial<CharacterSheet>) } as CharacterSheet;
  merged.updatedAt = typeof (stored as any).updatedAt === "number" ? (stored as any).updatedAt : 0;
  const rawAbilities = (stored as any).abilities;

  if (typeof rawAbilities === "string") {
    merged.abilities = rawAbilities.trim()
      ? [{ id: makeId("ab"), name: "Abilities", description: rawAbilities, effects: emptyAbilityEffects() }]
      : [];
  } else if (!Array.isArray(merged.abilities)) {
    merged.abilities = [];
  } else {
    // Backfill effects on abilities saved before the effects engine existed.
    merged.abilities = merged.abilities.map((a) => ({ ...a, effects: a.effects ?? emptyAbilityEffects() }));
  }

  if (!Array.isArray(merged.wargear)) merged.wargear = [];

  if (!Array.isArray(merged.weapons)) {
    merged.weapons = [];
  } else {
    // Backfill per-weapon Effects fields added after weapons could already be saved.
    merged.weapons = merged.weapons.map((w) => ({
      ...w,
      atkBonus: w.atkBonus ?? 0,
      hitBonus: w.hitBonus ?? 0,
      dmgBonus: w.dmgBonus ?? 0,
      extraDmgDicePerHit: w.extraDmgDicePerHit ?? 0,
    }));
  }

  return merged;
}

export async function getRole(): Promise<"GM" | "PLAYER"> {
  return OBR.player.getRole();
}

export async function getPlayerName(): Promise<string> {
  return OBR.player.getName();
}

export async function getPlayerId(): Promise<string> {
  return OBR.player.getId();
}

/**
 * Sheets now live in ROOM metadata (one key per player id), NOT player
 * metadata. A real-world repro proved player metadata writes can report
 * success and even verify via an immediate read-back, yet still be gone
 * after a plain page reload - almost certainly because that verification
 * was only ever checking a local/optimistic echo, not a confirmed round
 * trip to Owlbear's backend. Room metadata is what the Log and Token Pool
 * already use, and neither of those has ever been reported to lose data,
 * so this mirrors that proven-reliable path. Trade-off: room metadata has a
 * documented 16kB TOTAL cap shared by the log, the token pool, and every
 * party member's sheet combined - worth keeping an eye on for a large party
 * with heavily-loaded characters.
 */
export async function loadSheet(playerId: string): Promise<CharacterSheet> {
  logSheet("loadSheet: calling OBR.room.getMetadata()...");
  const metadata = await OBR.room.getMetadata();
  const raw = metadata[sheetKey(playerId)];
  logSheet("loadSheet: raw metadata for key", sheetKey(playerId), "=", raw);
  if (raw !== undefined) {
    const result = migrateSheet(raw);
    logSheet("loadSheet: resolved to", summarize(result));
    return result;
  }

  // Nothing in the new room-metadata location yet - check the OLD
  // player-metadata location in case this player has legacy data there from
  // before the storage migration, so it isn't orphaned by the transition.
  logSheet("loadSheet: nothing in room metadata, checking legacy player metadata...");
  try {
    const playerMetadata = await OBR.player.getMetadata();
    const legacyRaw = playerMetadata[LEGACY_SHEET_KEY];
    if (legacyRaw !== undefined) {
      const migrated = migrateSheet(legacyRaw);
      logSheet("loadSheet: found legacy player-metadata sheet, carrying it forward", summarize(migrated));
      // Best-effort forward-migration write; if it fails, the same legacy
      // data is still there to find again on the next load.
      saveSheet(playerId, migrated).catch((err) =>
        logSheet("loadSheet: forward-migration save failed (will retry on next load)", err)
      );
      return migrated;
    }
  } catch (err) {
    logSheet("loadSheet: checking legacy player metadata threw (non-fatal)", err);
  }
  logSheet("loadSheet: no legacy data either - starting fresh");
  return emptySheet();
}

/**
 * Saves the sheet, then reads it back to confirm the write actually landed
 * before resolving - `setMetadata` resolving isn't a guarantee the data is
 * durably stored, and we've seen sheets go missing with no visible error.
 * Retries a few times with backoff, then throws so the caller can surface a
 * loud, visible failure instead of pretending the save succeeded.
 */
export async function saveSheet(playerId: string, sheet: CharacterSheet): Promise<CharacterSheet> {
  const stamped: CharacterSheet = { ...sheet, updatedAt: Date.now() };
  const key = sheetKey(playerId);
  logSheet("saveSheet: attempting to save", summarize(stamped));
  const MAX_ATTEMPTS = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await OBR.room.setMetadata({ [key]: stamped });
      logSheet(`saveSheet: attempt ${attempt} - setMetadata resolved, verifying...`);
      const confirmed = await OBR.room.getMetadata();
      const confirmedSheet = confirmed[key];
      if (JSON.stringify(confirmedSheet) === JSON.stringify(stamped)) {
        logSheet(`saveSheet: attempt ${attempt} - verified OK`, summarize(stamped));
        return stamped;
      }
      logSheet(
        `saveSheet: attempt ${attempt} - VERIFY MISMATCH. Sent:`,
        summarize(stamped),
        "Read back:",
        confirmedSheet
      );
      lastError = new Error("Save did not verify: metadata read back after saving does not match what was sent.");
    } catch (err) {
      logSheet(`saveSheet: attempt ${attempt} - threw`, err);
      lastError = err;
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  console.error("obr.saveSheet: failed after retries", lastError);
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * NOTE: OBR.room.onMetadataChange fires on ANY change to room metadata -
 * the Log, the Token Pool, or any player's sheet, not just this player's
 * own. The caller is responsible for ignoring stale snapshots (compare
 * `sheet.updatedAt`) so an unrelated event can't silently revert a more
 * recent local edit that just hasn't finished round-tripping yet.
 */
export function onSheetChange(playerId: string, callback: (sheet: CharacterSheet) => void) {
  const key = sheetKey(playerId);
  return OBR.room.onMetadataChange((metadata) => {
    const raw = metadata[key];
    if (raw === undefined) return;
    const updated = migrateSheet(raw);
    logSheet("onSheetChange fired, metadata =", summarize(updated));
    callback(updated);
  });
}

/** Fires on ANY room metadata change - used to refresh the GM Roster live as players edit their sheets, since sheets now live in room metadata rather than embedded directly in the player object. */
export function onRoomMetadataChange(callback: () => void) {
  return OBR.room.onMetadataChange(() => callback());
}

export async function loadLog(): Promise<RollLogEntry[]> {
  const metadata = await OBR.room.getMetadata();
  const stored = metadata[LOG_KEY] as RollLogEntry[] | undefined;
  return stored ?? [];
}

export async function pushLogEntry(entry: RollLogEntry): Promise<void> {
  const current = await loadLog();
  const next = [...current, entry].slice(-MAX_LOG_ENTRIES);
  await OBR.room.setMetadata({ [LOG_KEY]: next });
}

export async function clearLog(): Promise<void> {
  await OBR.room.setMetadata({ [LOG_KEY]: [] });
}

export function onLogChange(callback: (log: RollLogEntry[]) => void) {
  return OBR.room.onMetadataChange((metadata) => {
    const stored = metadata[LOG_KEY] as RollLogEntry[] | undefined;
    callback(stored ?? []);
  });
}

// ---- Luck & Chaos token pool (shared, room-wide, persists indefinitely) --

export async function loadTokenPool(): Promise<TokenPool> {
  const metadata = await OBR.room.getMetadata();
  const stored = metadata[TOKEN_POOL_KEY] as TokenPool | undefined;
  return stored ?? defaultTokenPool();
}

/** Flips a single token in place: Luck -> Chaos when a player spends it, Chaos -> Luck when the Arbitrator spends it. */
export async function flipToken(index: number, to: TokenType): Promise<void> {
  const current = await loadTokenPool();
  if (current.tokens[index] === undefined || current.tokens[index] === to) return;
  const next: TokenPool = {
    tokens: current.tokens.map((t, i) => (i === index ? to : t)),
  };
  await OBR.room.setMetadata({ [TOKEN_POOL_KEY]: next });
}

/**
 * Permanently removes one token from the pool (a character's death). Returns
 * the type that was burned so it can be logged, or null if the index was
 * already gone (e.g. someone else burned it first).
 */
export async function burnToken(index: number): Promise<TokenType | null> {
  const current = await loadTokenPool();
  const burned = current.tokens[index];
  if (burned === undefined) return null;
  const next: TokenPool = {
    tokens: current.tokens.filter((_, i) => i !== index),
  };
  await OBR.room.setMetadata({ [TOKEN_POOL_KEY]: next });
  return burned;
}

/** Arbitrator-only: adds a Luck token back into the pool, capped at MAX_TOKENS. */
export async function grantLuckToken(): Promise<boolean> {
  const current = await loadTokenPool();
  if (current.tokens.length >= MAX_TOKENS) return false;
  const next: TokenPool = { tokens: [...current.tokens, "luck"] };
  await OBR.room.setMetadata({ [TOKEN_POOL_KEY]: next });
  return true;
}

export function onTokenPoolChange(callback: (pool: TokenPool) => void) {
  return OBR.room.onMetadataChange((metadata) => {
    const stored = metadata[TOKEN_POOL_KEY] as TokenPool | undefined;
    callback(stored ?? defaultTokenPool());
  });
}

export interface PartyMember {
  id: string;
  connectionId: string;
  name: string;
  color: string;
  role: "GM" | "PLAYER";
  sheet: CharacterSheet | null; // null if this player has no Void Born sheet data yet
}

function toPartyMember(p: Player, roomMetadata: Record<string, unknown>): PartyMember {
  const raw = roomMetadata[sheetKey(p.id)];
  return {
    id: p.id,
    connectionId: p.connectionId,
    name: p.name,
    color: p.color,
    role: p.role,
    sheet: raw !== undefined ? migrateSheet(raw) : null,
  };
}

/** Reads every connected player's sheet out of shared room metadata. */
export async function getPartySheets(): Promise<PartyMember[]> {
  const [players, roomMetadata] = await Promise.all([OBR.party.getPlayers(), OBR.room.getMetadata()]);
  return players.map((p) => toPartyMember(p, roomMetadata));
}

/** Fires when party membership changes (someone joins/leaves) - not on sheet edits; pair with onRoomMetadataChange for that. */
export function onPartyChange(callback: (members: PartyMember[]) => void) {
  return OBR.party.onChange(async (players) => {
    const roomMetadata = await OBR.room.getMetadata();
    callback(players.map((p) => toPartyMember(p, roomMetadata)));
  });
}

/** Broadcasts a roll result toast to every connected player (including yourself). */
export async function broadcastRollResult(payload: ResultPayload): Promise<void> {
  await OBR.broadcast.sendMessage(ROLL_CHANNEL, payload, { destination: "ALL" });
}

export function onRollResultBroadcast(callback: (payload: ResultPayload) => void) {
  return OBR.broadcast.onMessage(ROLL_CHANNEL, (event) => {
    callback(event.data as ResultPayload);
  });
}

/**
 * Shows a native Owlbear Rodeo notification, rendered by Owlbear's own UI
 * (not our iframe), so it appears over the main room view rather than inside
 * our popover. Only reaches players who currently have this extension's
 * popover open, since that's what runs the code that receives the broadcast.
 */
export function showNativeNotification(
  message: string,
  variant: "DEFAULT" | "SUCCESS" | "WARNING" | "ERROR" = "DEFAULT"
): void {
  OBR.notification.show(message, variant);
}
