import OBR from "@owlbear-rodeo/sdk";
import type { Player } from "@owlbear-rodeo/sdk";
import type { CharacterSheet, RollLogEntry, TokenPool, TokenType } from "./types";
import { emptySheet, emptyAbilityEffects, defaultTokenPool, MAX_TOKENS, makeId } from "./types";
import type { ResultPayload } from "./ui/result";

const ID = "com.madisonmetro.voidborn";
const SHEET_KEY = `${ID}/sheet`;
const LOG_KEY = `${ID}/log`;
const TOKEN_POOL_KEY = `${ID}/tokens`;
const ROLL_CHANNEL = `${ID}/roll-toast`;
const MAX_LOG_ENTRIES = 30;

/**
 * Merges stored data over sheet defaults and migrates older shapes:
 * - `abilities` used to be a single free-text string; now it's a list.
 * - `wargear` and `handle` are newly added fields.
 */
export function migrateSheet(stored: unknown): CharacterSheet {
  const base = emptySheet();
  if (!stored || typeof stored !== "object") return base;

  const merged = { ...base, ...(stored as Partial<CharacterSheet>) } as CharacterSheet;
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

export async function loadSheet(): Promise<CharacterSheet> {
  const metadata = await OBR.player.getMetadata();
  return migrateSheet(metadata[SHEET_KEY]);
}

export async function saveSheet(sheet: CharacterSheet): Promise<void> {
  await OBR.player.setMetadata({ [SHEET_KEY]: sheet });
}

export function onSheetChange(callback: (sheet: CharacterSheet) => void) {
  return OBR.player.onChange((player: Player) => {
    if (player.metadata[SHEET_KEY]) callback(migrateSheet(player.metadata[SHEET_KEY]));
  });
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

function toPartyMember(p: Player): PartyMember {
  return {
    id: p.id,
    connectionId: p.connectionId,
    name: p.name,
    color: p.color,
    role: p.role,
    sheet: p.metadata[SHEET_KEY] ? migrateSheet(p.metadata[SHEET_KEY]) : null,
  };
}

/**
 * Reads every other connected player's sheet directly from their Player
 * object - `metadata` is included in what `party.getPlayers()` returns, so
 * this works live with no broadcast/request needed, and isn't limited by the
 * 16kB room-metadata cap (each player's data is separate). Read-only: there's
 * no API to write another player's metadata, only your own.
 */
export async function getPartySheets(): Promise<PartyMember[]> {
  const players = await OBR.party.getPlayers();
  return players.map(toPartyMember);
}

export function onPartyChange(callback: (members: PartyMember[]) => void) {
  return OBR.party.onChange((players) => callback(players.map(toPartyMember)));
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
