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

  const rulesToggle = document.createElement("button");
  rulesToggle.className = "btn secondary";
  rulesToggle.style.flex = "1";
  rulesToggle.textContent = "Rules";

  const rulesBox = document.createElement("div");
  rulesBox.style.display = "none";
  rulesBox.style.fontSize = "0.8rem";
  rulesBox.style.marginBottom = "0.6rem";
  rulesBox.style.lineHeight = "1.4";

  function rulesPara(text: string): HTMLElement {
    const p = document.createElement("p");
    p.style.margin = "0 0 0.4rem";
    p.textContent = text;
    return p;
  }

  function rulesList(items: string[]): HTMLElement {
    const ul = document.createElement("ul");
    ul.style.margin = "0 0 0.4rem";
    ul.style.paddingLeft = "1.2rem";
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    }
    return ul;
  }

  rulesBox.appendChild(rulesPara("Start each campaign with 8 shared Luck Tokens between the entire party."));
  rulesBox.appendChild(rulesPara("Use Luck tokens to do the following:"));
  rulesBox.appendChild(
    rulesList(["Add a die to an ATK", "Cancel a Critical Fail", "Add a die to a Test", "Reroll your Wound roll"])
  );
  rulesBox.appendChild(
    rulesPara(
      "Once you use a Luck Token, they become Chaos Tokens. These are under the control of the Arbitrator."
    )
  );
  rulesBox.appendChild(rulesPara("The Arbitrator uses Chaos Tokens to:"));
  rulesBox.appendChild(
    rulesList([
      "Turn a failed ATK into a Critical Fail",
      "Force a reroll on the Injury Table",
      "Force a reroll on Perils of the Warp",
    ])
  );
  rulesBox.appendChild(rulesPara("Chaos Tokens become Luck Tokens when used and the cycle continues."));
  rulesBox.appendChild(
    rulesPara(
      "If a character is killed they may Burn a Token. They survive but must roll on the Injury Table (reroll if 00-19) and the Corruption Table. The token pool is permanently reduced by 1."
    )
  );

  rulesToggle.addEventListener("click", () => {
    rulesBox.style.display = rulesBox.style.display === "none" ? "block" : "none";
  });

  let burnMode = false;

  const burnBtn = document.createElement("button");
  burnBtn.style.flex = "1";

  const burnHint = document.createElement("div");
  burnHint.style.fontSize = "0.75rem";
  burnHint.style.color = "var(--red-bright)";
  burnHint.style.marginBottom = "0.4rem";
  burnHint.style.display = "none";
  burnHint.textContent = "Tap a token below to permanently burn it. This cannot be undone.";

  const actionRow = document.createElement("div");
  actionRow.style.display = "flex";
  actionRow.style.gap = "0.4rem";
  actionRow.style.marginBottom = "0.5rem";
  actionRow.appendChild(rulesToggle);
  if (role === "PLAYER") {
    actionRow.appendChild(burnBtn);
  }
  panel.appendChild(actionRow);
  panel.appendChild(rulesBox);
  panel.appendChild(burnHint);

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

  panel.appendChild(gridWrap);
  container.appendChild(panel);
}
