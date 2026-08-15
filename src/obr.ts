import OBR from "@owlbear-rodeo/sdk";
import type { Player } from "@owlbear-rodeo/sdk";
import type { CharacterSheet, RollLogEntry } from "./types";
import { emptySheet, emptyAbilityEffects, makeId } from "./types";
import type { ResultPayload } from "./ui/result";

const ID = "com.madisonmetro.voidborn";
const SHEET_KEY = `${ID}/sheet`;
const LOG_KEY = `${ID}/log`;
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
