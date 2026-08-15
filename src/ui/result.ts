export type Outcome = "success" | "fail" | "crit-success" | "crit-fail" | "info";

const OUTCOME_LABEL: Record<Outcome, string> = {
  success: "Success",
  fail: "Fail",
  "crit-success": "Critical Hit",
  "crit-fail": "Critical Fail",
  info: "Result",
};

const FADE_AFTER_MS = 3200;
const REMOVE_AFTER_MS = 3800; // gives the CSS fade-out transition time to finish

export interface ResultPayload {
  playerName: string;
  title: string;
  dice: number[];
  outcome: Outcome;
  detail?: string;
}

/** Shows a toast for a roll result. Auto-fades; no interaction required. */
export function showResult(payload: ResultPayload) {
  const overlay = document.createElement("div");
  overlay.className = "toast-overlay";

  const card = document.createElement("div");
  card.className = "result-card";

  const who = document.createElement("div");
  who.className = "result-player";
  who.textContent = payload.playerName;
  card.appendChild(who);

  const h = document.createElement("h2");
  h.textContent = payload.title;
  card.appendChild(h);

  const banner = document.createElement("div");
  banner.className = `outcome-banner ${payload.outcome}`;
  banner.textContent = OUTCOME_LABEL[payload.outcome];
  card.appendChild(banner);

  if (payload.dice.length > 0) {
    const diceRow = document.createElement("div");
    diceRow.className = "dice-values";
    diceRow.textContent = payload.dice.join("  ·  ");
    card.appendChild(diceRow);
  }

  if (payload.detail) {
    const desc = document.createElement("div");
    desc.className = "result-desc";
    desc.textContent = payload.detail;
    card.appendChild(desc);
  }

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Let the browser paint the initial state before transitioning in.
  requestAnimationFrame(() => overlay.classList.add("visible"));

  setTimeout(() => overlay.classList.remove("visible"), FADE_AFTER_MS);
  setTimeout(() => overlay.remove(), REMOVE_AFTER_MS);
}
