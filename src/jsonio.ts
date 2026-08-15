import type { CharacterSheet } from "./types";

export function serializeSheet(sheet: CharacterSheet): string {
  return JSON.stringify(sheet, null, 2);
}

export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "colonist";
}

/**
 * Opens the sheet's JSON in a new tab as a Blob URL. This is the same
 * mechanism the JPEG export uses, since Owlbear's sandboxed iframe silently
 * blocks a plain `<a download>` click with no error. From the new tab the
 * browser's own "Save As" / Ctrl+S saves the file.
 */
export function exportSheetJsonViaNewTab(sheet: CharacterSheet): void {
  const json = serializeSheet(sheet);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    throw new Error("The browser blocked opening the export. Allow popups for this site and try again.");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Direct one-click file download. Works cleanly in a normal top-level
 * browser tab (e.g. the standalone editor page), but is unreliable inside
 * Owlbear's sandboxed iframe - use exportSheetJsonViaNewTab there instead.
 */
export function downloadSheetJson(sheet: CharacterSheet): void {
  const json = serializeSheet(sheet);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(sheet.name)}-void-born.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
