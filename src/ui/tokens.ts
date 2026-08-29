import type { TokenPool, TokenType } from "../types";
import { MAX_TOKENS } from "../types";

const ICON_SRC: Record<TokenType, string> = {
  luck: "/icons/luck-token.png",
  chaos: "/icons/chaos-token.png",
};

export interface TokenPoolProps {
  pool: TokenPool;
  role: "GM" | "PLAYER";
  onSpendLuck: (index: number) => void; // flips Luck -> Chaos
  onSpendChaos: (index: number) => void; // flips Chaos -> Luck
  onBurn: (index: number) => void;
  onGrant: () => void;
}

export function renderTokenPool(container: HTMLElement, props: TokenPoolProps): void {
  const { pool, role, onSpendLuck, onSpendChaos, onBurn, onGrant } = props;

  const panel = document.createElement("div");
  panel.className = "panel";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  const title = document.createElement("h2");
  title.textContent = "Luck & Chaos";
  title.style.marginBottom = "0";
  headerRow.appendChild(title);

  if (role === "GM") {
    const grantBtn = document.createElement("button");
    grantBtn.className = "btn secondary small";
    grantBtn.textContent = "Grant Luck";
    grantBtn.disabled = pool.tokens.length >= MAX_TOKENS;
    grantBtn.title = grantBtn.disabled ? "Pool is already full" : "Add a Luck token to the pool";
    grantBtn.addEventListener("click", onGrant);
    headerRow.appendChild(grantBtn);
  }
  panel.appendChild(headerRow);

  const hint = document.createElement("div");
  hint.className = "empty-state";
  hint.style.padding = "0 0 0.5rem";
  hint.style.textAlign = "left";
  hint.textContent =
    "Luck tokens add a die to an ATK or Test, cancel a Critical Fail, or reroll a Wound roll. Spending one flips it to Chaos. The Arbitrator spends Chaos tokens to turn a failed ATK into a Critical Fail or force a reroll on Injury/Perils of the Warp - spending flips it back to Luck.";
  panel.appendChild(hint);

  let burnMode = false;

  const burnBtn = document.createElement("button");
  burnBtn.style.marginBottom = "0.5rem";

  const burnHint = document.createElement("div");
  burnHint.style.fontSize = "0.75rem";
  burnHint.style.color = "var(--red-bright)";
  burnHint.style.marginBottom = "0.4rem";
  burnHint.style.display = "none";
  burnHint.textContent = "Tap a token below to permanently burn it. This cannot be undone.";

  const gridWrap = document.createElement("div");
  gridWrap.className = "token-pool";

  function renderGrid() {
    gridWrap.innerHTML = "";
    if (pool.tokens.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.padding = "0.25rem 0";
      empty.style.textAlign = "left";
      empty.textContent = "No tokens left in the pool.";
      gridWrap.appendChild(empty);
      return;
    }
    pool.tokens.forEach((token, i) => {
      const canSpend = (token === "luck" && role === "PLAYER") || (token === "chaos" && role === "GM");
      const clickable = burnMode || canSpend;
      const chip = document.createElement("button");
      chip.className = "token-chip";
      chip.disabled = !clickable;
      const img = document.createElement("img");
      img.src = ICON_SRC[token];
      img.alt = token === "luck" ? "Luck token" : "Chaos token";
      chip.appendChild(img);
      chip.title = burnMode
        ? `Burn this ${token === "luck" ? "Luck" : "Chaos"} token`
        : canSpend
          ? `Spend this ${token === "luck" ? "Luck" : "Chaos"} token`
          : token === "luck"
            ? "Luck token - only players can spend this"
            : "Chaos token - only the Arbitrator can spend this";
      if (clickable) {
        chip.addEventListener("click", () => {
          if (burnMode) {
            const label = token === "luck" ? "Luck" : "Chaos";
            if (confirm(`Permanently burn this ${label} token? This cannot be undone.`)) {
              onBurn(i);
            }
            burnMode = false;
            updateBurnUi();
          } else if (token === "luck") {
            onSpendLuck(i);
          } else {
            onSpendChaos(i);
          }
        });
      }
      gridWrap.appendChild(chip);
    });
  }

  function updateBurnUi() {
    burnBtn.textContent = burnMode ? "Cancel Burn" : "Burn Token";
    burnBtn.className = burnMode ? "btn danger" : "btn secondary";
    burnHint.style.display = burnMode ? "block" : "none";
    renderGrid();
  }

  updateBurnUi();

  burnBtn.addEventListener("click", () => {
    burnMode = !burnMode;
    updateBurnUi();
  });

  if (role === "PLAYER") {
    panel.appendChild(burnBtn);
    panel.appendChild(burnHint);
  }

  panel.appendChild(gridWrap);
  container.appendChild(panel);
}
