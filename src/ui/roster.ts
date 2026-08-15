import type { PartyMember } from "../obr";
import type { CharacterSheet } from "../types";
import { exportSheetJsonViaNewTab } from "../jsonio";

export function renderRoster(container: HTMLElement, members: PartyMember[]) {
  container.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel";

  const h = document.createElement("h2");
  h.textContent = "Party Roster";
  panel.appendChild(h);

  const hint = document.createElement("div");
  hint.className = "empty-state";
  hint.style.textAlign = "left";
  hint.style.padding = "0 0 0.5rem";
  hint.textContent = "Live view of connected players' sheets. Read-only for now.";
  panel.appendChild(hint);

  if (members.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No other players connected.";
    panel.appendChild(empty);
  }

  for (const member of members) {
    panel.appendChild(renderMemberRow(member));
  }

  container.appendChild(panel);
}

function renderMemberRow(member: PartyMember): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "roster-member";

  const header = document.createElement("button");
  header.className = "roster-member-header";

  const swatch = document.createElement("span");
  swatch.className = "roster-color-swatch";
  swatch.style.background = member.color || "#888888";
  header.appendChild(swatch);

  const label = document.createElement("span");
  label.className = "roster-member-label";
  label.textContent = member.sheet?.name ? `${member.name} — ${member.sheet.name}` : member.name;
  header.appendChild(label);

  if (member.role === "GM") {
    const badge = document.createElement("span");
    badge.className = "role-badge";
    badge.textContent = "GM";
    header.appendChild(badge);
  }

  const chevron = document.createElement("span");
  chevron.className = "roster-chevron";
  chevron.textContent = "▸";
  header.appendChild(chevron);

  const detail = document.createElement("div");
  detail.className = "roster-detail";
  detail.style.display = "none";

  header.addEventListener("click", () => {
    const isOpen = detail.style.display !== "none";
    detail.style.display = isOpen ? "none" : "block";
    chevron.textContent = isOpen ? "▸" : "▾";
    if (!isOpen) {
      detail.innerHTML = "";
      detail.appendChild(renderSheetSummary(member.sheet));
      if (member.sheet) {
        const exportBtn = document.createElement("button");
        exportBtn.className = "btn secondary small";
        exportBtn.style.marginTop = "0.5rem";
        exportBtn.textContent = "Export JSON";
        exportBtn.title = "Opens the sheet's JSON in a new tab - use the browser's Save As to keep the file";
        exportBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          try {
            exportSheetJsonViaNewTab(member.sheet!);
          } catch (err) {
            alert(String(err));
          }
        });
        detail.appendChild(exportBtn);
      }
    }
  });

  wrap.appendChild(header);
  wrap.appendChild(detail);
  return wrap;
}

function labeledValue(label: string, value: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "roster-field";
  const l = document.createElement("span");
  l.className = "roster-field-label";
  l.textContent = label;
  wrap.appendChild(l);
  wrap.appendChild(document.createTextNode(value || "—"));
  return wrap;
}

function renderSheetSummary(sheet: CharacterSheet | null): HTMLElement {
  const box = document.createElement("div");

  if (!sheet) {
    box.className = "empty-state";
    box.textContent = "No character sheet yet.";
    return box;
  }

  if (sheet.handle.trim()) {
    box.appendChild(labeledValue("Handle", sheet.handle));
  }

  // Attributes
  const attrRow = document.createElement("div");
  attrRow.className = "roster-attr-row";
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
    const cell = document.createElement("div");
    cell.className = "roster-attr-cell";
    const l = document.createElement("div");
    l.className = "roster-attr-cell-label";
    l.textContent = a.label;
    cell.appendChild(l);
    cell.appendChild(document.createTextNode(String(sheet[a.key])));
    attrRow.appendChild(cell);
  }
  box.appendChild(attrRow);

  // Background
  const bgParts = [sheet.species, sheet.trait, sheet.past, sheet.trinket].filter((s) => s.trim());
  if (bgParts.length > 0) {
    box.appendChild(labeledValue("Background", bgParts.join(" · ")));
  }

  // Weapons
  if (sheet.weapons.length > 0) {
    const sectionLabel = document.createElement("div");
    sectionLabel.className = "roster-section-label";
    sectionLabel.textContent = "Weapons";
    box.appendChild(sectionLabel);
    for (const w of sheet.weapons) {
      const atkLabel = w.kind === "melee" ? (w.baseDice > 0 ? `FGT+${w.baseDice}` : "FGT") : `${w.baseDice}D10`;
      const line = document.createElement("div");
      line.className = "roster-line";
      line.textContent = `${w.name || "Unnamed"} — ${w.kind === "melee" ? "Melee" : "Ranged"}, ATK ${atkLabel}, HIT ${w.hit || "—"}, DMG ${w.dmg || "—"}${w.traits ? ` (${w.traits})` : ""}`;
      box.appendChild(line);
    }
  }

  // Abilities
  if (sheet.abilities.length > 0) {
    const sectionLabel = document.createElement("div");
    sectionLabel.className = "roster-section-label";
    sectionLabel.textContent = "Abilities";
    box.appendChild(sectionLabel);
    for (const a of sheet.abilities) {
      const line = document.createElement("div");
      line.className = "roster-line";
      line.innerHTML = `<strong>${escapeHtml(a.name || "Unnamed")}:</strong> ${escapeHtml(a.description)}`;
      box.appendChild(line);
    }
  }

  // Wargear
  if (sheet.wargear.length > 0) {
    const sectionLabel = document.createElement("div");
    sectionLabel.className = "roster-section-label";
    sectionLabel.textContent = "Wargear";
    box.appendChild(sectionLabel);
    for (const w of sheet.wargear) {
      const qtyLabel = w.quantity !== 1 ? ` (x${w.quantity})` : "";
      const line = document.createElement("div");
      line.className = "roster-line";
      line.innerHTML = `<strong>${escapeHtml(w.name || "Unnamed")}${qtyLabel}:</strong> ${escapeHtml(w.description)}`;
      box.appendChild(line);
    }
  }

  if (sheet.injuries.trim()) box.appendChild(labeledValue("Injuries", sheet.injuries));
  if (sheet.bonds.trim()) box.appendChild(labeledValue("Bonds", sheet.bonds));
  box.appendChild(labeledValue("Gold", String(sheet.gold)));

  return box;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
