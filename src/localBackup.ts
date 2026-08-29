import type { CharacterSheet } from "./types";

const KEY = "voidborn-tools:sheet-backup";

/**
 * A sheet with no name, no weapons/abilities/wargear, and no background
 * fields filled in - i.e. indistinguishable from a brand-new, never-touched
 * character. Used to decide whether a loaded sheet looks like real data or
 * looks like something went wrong.
 */
export function isSheetBlank(sheet: CharacterSheet): boolean {
  return (
    !sheet.name.trim() &&
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
export function backupSheetLocally(sheet: CharacterSheet): void {
  if (isSheetBlank(sheet)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ sheet, savedAt: Date.now() }));
  } catch (err) {
    console.warn("Local sheet backup failed (non-fatal):", err);
  }
}

export function readLocalBackup(): { sheet: CharacterSheet; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.sheet) return null;
    return parsed;
  } catch (err) {
    console.warn("Reading local sheet backup failed (non-fatal):", err);
    return null;
  }
}
