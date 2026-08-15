import type { RollLogEntry } from "../types";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function renderLog(
  container: HTMLElement,
  log: RollLogEntry[],
  role: "GM" | "PLAYER",
  onClear: () => void
) {
  container.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "panel";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  const h = document.createElement("h2");
  h.textContent = "Shared Roll Log";
  h.style.marginBottom = "0";
  headerRow.appendChild(h);

  if (role === "GM") {
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn secondary small";
    clearBtn.textContent = "Clear Log";
    clearBtn.addEventListener("click", () => {
      if (confirm("Clear the shared roll log for everyone?")) {
        onClear();
      }
    });
    headerRow.appendChild(clearBtn);
  }

  panel.appendChild(headerRow);

  if (log.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No rolls yet this session.";
    panel.appendChild(empty);
  } else {
    // Most recent first
    for (const entry of [...log].reverse()) {
      panel.appendChild(renderEntry(entry));
    }
  }

  container.appendChild(panel);
}

function renderEntry(entry: RollLogEntry): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "log-entry";

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.alignItems = "center";

  const label = document.createElement("span");
  label.innerHTML = `<strong>${escapeHtml(entry.playerName)}</strong> — ${escapeHtml(entry.label)}`;
  top.appendChild(label);

  const badge = document.createElement("span");
  badge.className = `log-outcome ${entry.outcome}`;
  badge.textContent = entry.outcome.replace("-", " ");
  top.appendChild(badge);

  wrap.appendChild(top);

  const meta = document.createElement("div");
  meta.className = "meta";
  const diceStr = entry.dice.join(", ");
  const targetStr = entry.target !== undefined ? ` vs target ${entry.target}` : "";
  meta.textContent = `${formatTime(entry.timestamp)} · Rolled [${diceStr}]${targetStr}`;
  wrap.appendChild(meta);

  if (entry.detail) {
    const detail = document.createElement("div");
    detail.className = "meta";
    detail.style.marginTop = "0.15rem";
    detail.textContent = entry.detail;
    wrap.appendChild(detail);
  }

  return wrap;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
