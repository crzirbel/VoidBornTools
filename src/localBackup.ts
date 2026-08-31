import type { CharacterSheet } from "./types";

const KEY_PREFIX = "voidborn-tools:sheet-backup:";
// Pre-v1.0.5 key, written before backups were scoped per player. Only ever
// read once, as a one-time forward-migration source - two identities on the
// same browser would otherwise have silently shared/clobbered one backup.
const LEGACY_KEY = "voidborn-tools:sheet-backup";

function keyFor(playerId: string): string {
  return `${KEY_PREFIX}${playerId}`;
}

/**
 * A sheet with no name, no weapons/abilities/wargear, and no background
 * fields filled in - i.e. indistinguishable from a brand-new, never-touched
 * character. Used to decide whether a loaded sheet looks like real data or
 * looks like something went wrong.
 */
export function isSheetBlank(sheet: CharacterSheet): boolean {
  return (
    (!sheet.name.trim() || sheet.name.trim() === "New Colonist") &&
    !sheet.handle.trim() &&
    !sheet.species.trim() &&
    !sheet.trait.trim() &&
    !sheet.past.trim() &&
    sheet.weapons.length === 0 &&
    sheet.abilities.length === 0 &&
    sheet.wargear.length === 0
  );
}

/**
 * Mirrors every successful save to localStorage as well, purely as a local
 * safety net independent of whatever Owlbear's own persistence is doing.
 * Never overwrites a real backup with a blank sheet, and never throws -
 * localStorage can fail (private browsing, storage full), but that should
 * never block the actual save.
 */
export function backupSheetLocally(playerId: string, sheet: CharacterSheet): void {
  if (isSheetBlank(sheet)) {
    console.log("[VoidBorn/backup] Skipping local backup - sheet looks blank.");
    return;
  }
  try {
    localStorage.setItem(keyFor(playerId), JSON.stringify({ sheet, savedAt: Date.now() }));
    console.log("[VoidBorn/backup] Local backup written.", { name: sheet.name, updatedAt: sheet.updatedAt });
  } catch (err) {
    console.error("[VoidBorn/backup] Local backup FAILED (localStorage threw):", err);
  }
}

/**
 * Reads this player's local backup. Falls back to the old unscoped legacy
 * key once (pre-v1.0.5) so nobody's existing backup is orphaned by the
 * per-player scoping change; that legacy key is removed once migrated.
 */
export function readLocalBackup(playerId: string): { sheet: CharacterSheet; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(keyFor(playerId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.sheet) {
        console.log("[VoidBorn/backup] Local backup found.", { name: parsed.sheet.name, savedAt: parsed.savedAt });
        return parsed;
      }
      console.log("[VoidBorn/backup] Local backup key present but malformed.", parsed);
      return null;
    }

    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) {
      console.log("[VoidBorn/backup] No local backup present in localStorage.");
      return null;
    }
    const legacyParsed = JSON.parse(legacyRaw);
    if (!legacyParsed || typeof legacyParsed !== "object" || !legacyParsed.sheet) {
      console.log("[VoidBorn/backup] Legacy local backup key present but malformed.", legacyParsed);
      return null;
    }
    console.log("[VoidBorn/backup] Migrating legacy unscoped local backup to per-player key.", {
      name: legacyParsed.sheet.name,
      savedAt: legacyParsed.savedAt,
    });
    localStorage.setItem(keyFor(playerId), legacyRaw);
    localStorage.removeItem(LEGACY_KEY);
    return legacyParsed;
  } catch (err) {
    console.error("[VoidBorn/backup] Reading local backup FAILED (localStorage threw):", err);
    return null;
  }
}
