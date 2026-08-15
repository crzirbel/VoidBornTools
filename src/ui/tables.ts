import { ALL_TABLES } from "../data/tables";
import { rollOnTable, buildTableLogEntry, buildLuckLogEntry } from "../dice";
import type { RollLogEntry } from "../types";

export function renderTables(
  container: HTMLElement,
  playerName: string,
  onRoll: (entry: RollLogEntry) => void
) {
  container.innerHTML = "";

  const luckPanel = document.createElement("div");
  luckPanel.className = "panel";
  const luckTitle = document.createElement("h2");
  luckTitle.textContent = "Luck Coin";
  luckPanel.appendChild(luckTitle);
  const luckHint = document.createElement("div");
  luckHint.className = "empty-state";
  luckHint.style.padding = "0 0 0.5rem";
  luckHint.style.textAlign = "left";
  luckHint.textContent = "Flip to turn a failed test into a success.";
  luckPanel.appendChild(luckHint);
  const luckBtn = document.createElement("button");
  luckBtn.className = "btn";
  luckBtn.textContent = "Flip Luck Coin";
  luckBtn.addEventListener("click", () => {
    const pass = Math.random() < 0.5;
    const entry = buildLuckLogEntry(playerName, pass);
    onRoll(entry);
  });
  luckPanel.appendChild(luckBtn);
  container.appendChild(luckPanel);

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.appendChild((() => {
    const h = document.createElement("h2");
    h.textContent = "Resolution Tables";
    return h;
  })());

  const hint = document.createElement("div");
  hint.className = "empty-state";
  hint.style.padding = "0 0 0.5rem";
  hint.style.textAlign = "left";
  hint.textContent = "Anyone can roll on these tables. Results are shared in the Log.";
  panel.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "table-btn-grid";

  for (const table of ALL_TABLES) {
    const btn = document.createElement("button");
    btn.className = "btn secondary";
    btn.textContent = table.label;
    btn.addEventListener("click", () => {
      const result = rollOnTable(table);
      const entry = buildTableLogEntry(playerName, table, result);
      onRoll(entry);
    });
    grid.appendChild(btn);
  }

  panel.appendChild(grid);
  container.appendChild(panel);
}
