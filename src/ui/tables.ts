import { ALL_TABLES } from "../data/tables";
import {
  rollOnTable,
  buildTableLogEntry,
  buildLuckLogEntry,
  rollFreeDice,
  buildFreeRollLogEntry,
  rollCharge,
  buildChargeLogEntry,
} from "../dice";
import type { FreeDieSize } from "../dice";
import type { CharacterSheet, RollLogEntry } from "../types";

const FREE_DIE_SIZES: FreeDieSize[] = [4, 6, 8, 10, 12, 20, 100];

function buildDiceRollerPanel(
  playerName: string,
  onRoll: (entry: RollLogEntry) => void
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "panel";

  const title = document.createElement("h2");
  title.textContent = "Dice Roller";
  panel.appendChild(title);

  const hint = document.createElement("div");
  hint.className = "empty-state";
  hint.style.padding = "0 0 0.5rem";
  hint.style.textAlign = "left";
  hint.textContent = "Tap dice to add them to the pool, then Roll. Results are shared in the Log.";
  panel.appendChild(hint);

  const btnGrid = document.createElement("div");
  btnGrid.className = "dice-btn-grid";
  panel.appendChild(btnGrid);

  const poolWrap = document.createElement("div");
  poolWrap.className = "dice-pool";
  panel.appendChild(poolWrap);

  const actionRow = document.createElement("div");
  actionRow.className = "dice-action-row";
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn secondary";
  resetBtn.textContent = "Reset";
  const rollBtn = document.createElement("button");
  rollBtn.className = "btn";
  rollBtn.textContent = "Roll";
  actionRow.appendChild(resetBtn);
  actionRow.appendChild(rollBtn);
  panel.appendChild(actionRow);

  let pool: FreeDieSize[] = [];

  function renderPool() {
    poolWrap.innerHTML = "";
    if (pool.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.padding = "0.25rem 0";
      empty.style.textAlign = "left";
      empty.textContent = "No dice in pool.";
      poolWrap.appendChild(empty);
    } else {
      pool.forEach((sides, i) => {
        const chip = document.createElement("button");
        chip.className = "dice-pool-chip";
        chip.textContent = `d${sides}`;
        chip.title = "Remove from pool";
        chip.addEventListener("click", () => {
          pool.splice(i, 1);
          renderPool();
        });
        poolWrap.appendChild(chip);
      });
    }
    rollBtn.disabled = pool.length === 0;
  }

  for (const sides of FREE_DIE_SIZES) {
    const btn = document.createElement("button");
    btn.className = "btn secondary";
    btn.textContent = sides === 100 ? "d100" : `d${sides}`;
    btn.addEventListener("click", () => {
      pool.push(sides);
      renderPool();
    });
    btnGrid.appendChild(btn);
  }

  resetBtn.addEventListener("click", () => {
    pool = [];
    renderPool();
  });

  rollBtn.addEventListener("click", () => {
    if (pool.length === 0) return;
    const result = rollFreeDice(pool);
    const entry = buildFreeRollLogEntry(playerName, result);
    onRoll(entry);
    pool = [];
    renderPool();
  });

  renderPool();
  return panel;
}

function buildChargePanel(
  sheet: CharacterSheet,
  playerName: string,
  onRoll: (entry: RollLogEntry) => void
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "panel";

  const title = document.createElement("h2");
  title.textContent = "Charge";
  panel.appendChild(title);

  const hint = document.createElement("div");
  hint.className = "empty-state";
  hint.style.padding = "0 0 0.5rem";
  hint.style.textAlign = "left";
  hint.textContent = "Charge move = MOV + d10/2 (rounded down).";
  panel.appendChild(hint);

  const maxLabel = document.createElement("div");
  maxLabel.style.marginBottom = "0.5rem";
  maxLabel.style.fontWeight = "bold";
  const renderMax = () => {
    const maxTotal = sheet.mov + Math.floor(10 / 2);
    maxLabel.textContent = `Max Charge Move: ${maxTotal}" (MOV ${sheet.mov} + 5)`;
  };
  renderMax();
  panel.appendChild(maxLabel);

  const chargeBtn = document.createElement("button");
  chargeBtn.className = "btn";
  chargeBtn.textContent = "Roll Charge";
  chargeBtn.addEventListener("click", () => {
    const result = rollCharge(sheet.mov);
    const entry = buildChargeLogEntry(playerName, result);
    onRoll(entry);
  });
  panel.appendChild(chargeBtn);

  return panel;
}

export function renderTables(
  container: HTMLElement,
  sheet: CharacterSheet,
  playerName: string,
  onRoll: (entry: RollLogEntry) => void
) {
  container.innerHTML = "";

  container.appendChild(buildChargePanel(sheet, playerName, onRoll));

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

  container.appendChild(buildDiceRollerPanel(playerName, onRoll));
}
