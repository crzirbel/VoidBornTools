import html2canvas from "html2canvas";
import type { CharacterSheet } from "./types";

const HEADING_FONT = '"Black Ops One", "Arial Narrow", sans-serif';
const BODY_FONT = '"Special Elite", "Courier New", monospace';

function el(tag: string, styles: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (text !== undefined) node.textContent = text;
  return node;
}

function sectionBox(): HTMLElement {
  return el("div", {
    border: "2px solid #000000",
    padding: "10px 14px",
    marginBottom: "14px",
  });
}

function sectionHeading(text: string): HTMLElement {
  return el(
    "div",
    {
      fontFamily: HEADING_FONT,
      fontSize: "14px",
      textTransform: "uppercase",
      letterSpacing: "1px",
      marginBottom: "6px",
    },
    text
  );
}

function buildExportLayout(sheet: CharacterSheet): HTMLElement {
  const root = el("div", {
    position: "fixed",
    left: "-99999px",
    top: "0",
    width: "900px",
    background: "#ffffff",
    color: "#000000",
    fontFamily: BODY_FONT,
    fontSize: "13px",
    padding: "24px",
    boxSizing: "border-box",
  });

  // Header: name, handle
  const header = el("div", { marginBottom: "16px", borderBottom: "3px solid #000000", paddingBottom: "10px" });
  header.appendChild(el("div", { fontFamily: HEADING_FONT, fontSize: "28px", textTransform: "uppercase" }, sheet.name || "Unnamed Colonist"));
  if (sheet.handle.trim()) {
    header.appendChild(el("div", { fontSize: "14px", fontStyle: "italic", marginTop: "2px" }, `"${sheet.handle}"`));
  }
  root.appendChild(header);

  // Attributes row - all nine, full width, no cramped mobile layout needed here
  const attrBox = sectionBox();
  const attrGrid = el("div", { display: "flex", gap: "8px" });
  const attrs: { key: keyof CharacterSheet; label: string }[] = [
    { key: "mov", label: "MOV" },
    { key: "str", label: "STR" },
    { key: "agl", label: "AGL" },
    { key: "tgh", label: "TGH" },
    { key: "int", label: "INT" },
    { key: "wil", label: "WIL" },
    { key: "prs", label: "PRS" },
    { key: "sav", label: "SAV" },
    { key: "fgt", label: "FGT" },
  ];
  for (const a of attrs) {
    const cell = el("div", { flex: "1", border: "1px solid #000000", textAlign: "center", padding: "6px 0" });
    cell.appendChild(el("div", { fontFamily: HEADING_FONT, fontSize: "10px", color: "#555555" }, a.label));
    cell.appendChild(el("div", { fontSize: "18px" }, String(sheet[a.key])));
    attrGrid.appendChild(cell);
  }
  attrBox.appendChild(attrGrid);
  root.appendChild(attrBox);

  // Background
  const bgBox = sectionBox();
  bgBox.appendChild(sectionHeading("Background"));
  const bgGrid = el("div", { display: "flex", gap: "16px" });
  const bgFields: { key: keyof CharacterSheet; label: string }[] = [
    { key: "species", label: "Species" },
    { key: "trait", label: "Defining Trait" },
    { key: "past", label: "Past / Role" },
    { key: "trinket", label: "Trinket" },
  ];
  for (const f of bgFields) {
    const cell = el("div", { flex: "1" });
    cell.appendChild(el("div", { fontFamily: HEADING_FONT, fontSize: "9px", color: "#555555", textTransform: "uppercase" }, f.label));
    cell.appendChild(el("div", {}, String(sheet[f.key] || "—")));
    bgGrid.appendChild(cell);
  }
  bgBox.appendChild(bgGrid);
  root.appendChild(bgBox);

  // Weapons table
  if (sheet.weapons.length > 0) {
    const box = sectionBox();
    box.appendChild(sectionHeading("Weapons"));
    const table = el("table", { width: "100%", borderCollapse: "collapse", fontSize: "12px" }) as HTMLTableElement;
    const headRow = document.createElement("tr");
    for (const h of ["Name", "RNG", "Kind", "ATK", "HIT", "DMG", "Traits"]) {
      const th = el("th", {
        textAlign: "left",
        borderBottom: "1px solid #000000",
        padding: "3px 6px",
        fontFamily: HEADING_FONT,
        fontSize: "9px",
        textTransform: "uppercase",
      }, h);
      headRow.appendChild(th);
    }
    table.appendChild(headRow);
    for (const w of sheet.weapons) {
      const row = document.createElement("tr");
      const atkLabel = w.kind === "melee" ? (w.baseDice > 0 ? `FGT+${w.baseDice}` : "FGT") : `${w.baseDice}D10`;
      const cells = [w.name || "—", w.rng, w.kind === "melee" ? "Melee" : "Ranged", atkLabel, w.hit || "—", w.dmg || "—", w.traits || "—"];
      for (const c of cells) {
        row.appendChild(el("td", { padding: "3px 6px", borderBottom: "1px solid #cccccc" }, c));
      }
      table.appendChild(row);
    }
    box.appendChild(table);
    root.appendChild(box);
  }

  // Abilities
  if (sheet.abilities.length > 0) {
    const box = sectionBox();
    box.appendChild(sectionHeading("Abilities"));
    for (const a of sheet.abilities) {
      const row = el("div", { marginBottom: "5px" });
      const nameSpan = el("span", { fontWeight: "bold" }, `${a.name || "Unnamed"}: `);
      row.appendChild(nameSpan);
      row.appendChild(document.createTextNode(a.description || ""));
      box.appendChild(row);
    }
    root.appendChild(box);
  }

  // Wargear
  if (sheet.wargear.length > 0) {
    const box = sectionBox();
    box.appendChild(sectionHeading("Wargear"));
    for (const w of sheet.wargear) {
      const row = el("div", { marginBottom: "5px" });
      const label = w.quantity !== 1 ? `${w.name || "Unnamed"} (x${w.quantity}): ` : `${w.name || "Unnamed"}: `;
      row.appendChild(el("span", { fontWeight: "bold" }, label));
      row.appendChild(document.createTextNode(w.description || ""));
      box.appendChild(row);
    }
    root.appendChild(box);
  }

  // Injuries / Bonds / Gold
  const bottomRow = el("div", { display: "flex", gap: "14px" });

  const injuryBox = sectionBox();
  injuryBox.style.flex = "1";
  injuryBox.appendChild(sectionHeading("Injuries, Corruption, etc."));
  injuryBox.appendChild(el("div", { whiteSpace: "pre-wrap" }, sheet.injuries || "—"));
  bottomRow.appendChild(injuryBox);

  const bondBox = sectionBox();
  bondBox.style.flex = "1";
  bondBox.appendChild(sectionHeading("Bonds"));
  bondBox.appendChild(el("div", { whiteSpace: "pre-wrap" }, sheet.bonds || "—"));
  bottomRow.appendChild(bondBox);

  root.appendChild(bottomRow);

  const goldBox = sectionBox();
  goldBox.appendChild(sectionHeading("Gold"));
  goldBox.appendChild(el("div", { fontSize: "16px" }, String(sheet.gold)));
  root.appendChild(goldBox);

  return root;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas produced no image data"))),
      "image/jpeg",
      quality
    );
  });
}

export async function exportSheetAsJpeg(sheet: CharacterSheet): Promise<void> {
  const node = buildExportLayout(sheet);
  document.body.appendChild(node);
  try {
    const canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const blob = await canvasToBlob(canvas, 0.92);
    const blobUrl = URL.createObjectURL(blob);

    // Owlbear embeds this popover in a sandboxed iframe, which can silently
    // block a programmatic <a download> click with no error at all. Opening
    // the image in a new tab uses the same window.open() mechanism the Pop
    // Out feature already relies on successfully in this exact environment -
    // the user can then save the image manually (long-press / right-click).
    const opened = window.open(blobUrl, "_blank");
    if (!opened) {
      throw new Error("The browser blocked opening the export. Check for a blocked-popup notice and allow it, then try again.");
    }

    // Give the new tab time to actually load the blob before revoking it.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } finally {
    node.remove();
  }
}
