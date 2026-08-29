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
 * Triggers a real file download from a new (non-sandboxed) tab. Owlbear's
 * iframe silently blocks a plain `<a download>` click with no error, and
 * relying on the browser's native "Save As" over a raw JSON blob tab (the
 * previous approach here) turned out to be unreliable - the Save dialog
 * opens but nothing actually reaches disk in some browsers. Instead, this
 * opens a tiny wrapper HTML page in a new tab whose own script builds the
 * JSON blob and clicks a real `<a download>` link itself - a full top-level
 * tab isn't sandboxed the way our popover iframe is, so the download fires
 * immediately with no manual Save-As step at all.
 */
export function exportSheetJsonViaNewTab(sheet: CharacterSheet): void {
  const json = serializeSheet(sheet);
  const filename = `${slugify(sheet.name)}-void-born.json`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Void Born export</title></head>
<body style="font-family: sans-serif; padding: 2rem;">
<p id="status">Preparing your download...</p>
<script>
  try {
    const json = ${JSON.stringify(json)};
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ${JSON.stringify(filename)};
    document.body.appendChild(a);
    a.click();
    document.getElementById("status").textContent =
      "Download started (" + ${JSON.stringify(filename)} + "). You can close this tab.";
  } catch (err) {
    document.getElementById("status").textContent =
      "Download failed: " + (err && err.message ? err.message : err);
  }
</script>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
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
