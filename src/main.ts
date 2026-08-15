import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import type { CharacterSheet, RollLogEntry } from "./types";
import { emptySheet } from "./types";
import { renderSheet } from "./ui/sheet";
import { renderTables } from "./ui/tables";
import { renderLog } from "./ui/log";
import { renderRoster } from "./ui/roster";
import { renderAbout } from "./ui/about";
import * as obr from "./obr";
import type { PartyMember } from "./obr";
import type { ResultPayload } from "./ui/result";

type Tab = "sheet" | "tables" | "log" | "roster" | "about";

const MSG_SOURCE = "voidborn";
const isPopout = new URLSearchParams(location.search).get("popout") === "1";

let currentTab: Tab = "sheet";
let sheet: CharacterSheet = emptySheet();
let log: RollLogEntry[] = [];
let partyMembers: PartyMember[] = [];
let playerName = "Colonist";
let role: "GM" | "PLAYER" = "PLAYER";
let sheetLocked = true; // sheet starts locked (read/roll mode); Edit unlocks it
let popoutWindow: Window | null = null;

const app = document.getElementById("app")!;

// ---- Actions -----------------------------------------------------------
// When embedded in Owlbear, these call the real SDK. When popped out into a
// plain browser window (which has no Owlbear iframe connection), they relay
// the action back to the embedded window via postMessage instead.

function postToOpener(message: Record<string, unknown>) {
  window.opener?.postMessage({ source: MSG_SOURCE, ...message }, "*");
}

function postToPopout(message: Record<string, unknown>) {
  if (popoutWindow && !popoutWindow.closed) {
    popoutWindow.postMessage({ source: MSG_SOURCE, ...message }, "*");
  }
}

function syncPopout() {
  postToPopout({ kind: "state", role, playerName, sheet, log, partyMembers });
}

async function saveSheet(updated: CharacterSheet) {
  sheet = updated;
  if (isPopout) {
    postToOpener({ kind: "save-sheet", sheet: updated });
  } else {
    await obr.saveSheet(sheet);
    syncPopout();
  }
}

// Importing replaces every field on the sheet, so (unlike normal typing
// saves) this needs an immediate full re-render to show the new values.
async function importSheet(updated: CharacterSheet) {
  await saveSheet(updated);
  render();
}

async function handleRoll(entry: RollLogEntry) {
  if (isPopout) {
    postToOpener({ kind: "roll", entry });
    return;
  }
  await obr.pushLogEntry(entry);
  await obr.broadcastRollResult({
    playerName: entry.playerName,
    title: entry.label,
    dice: entry.dice,
    outcome: entry.outcome,
    detail: entry.detail ?? (entry.target !== undefined ? `Target: ${entry.target}` : undefined),
  });
}

async function clearLog() {
  if (isPopout) {
    postToOpener({ kind: "clear-log" });
    return;
  }
  await obr.clearLog();
}

function openPopout() {
  if (popoutWindow && !popoutWindow.closed) {
    popoutWindow.focus();
    return;
  }
  popoutWindow = window.open(
    `${location.pathname}?popout=1`,
    "voidborn-popout",
    "width=600,height=880"
  );
  // Give the new window a moment to load before pushing state to it.
  setTimeout(syncPopout, 500);
}

// ---- Render --------------------------------------------------------------

function render() {
  app.innerHTML = "";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "baseline";
  const h1 = document.createElement("h1");
  h1.style.borderBottom = "none";
  h1.style.marginBottom = "0";
  h1.textContent = "Void Born";
  const badge = document.createElement("span");
  badge.className = "role-badge";
  badge.textContent = role;
  h1.appendChild(badge);
  header.appendChild(h1);

  if (!isPopout) {
    const popoutBtn = document.createElement("button");
    popoutBtn.className = "btn secondary small";
    popoutBtn.textContent = "Pop Out";
    popoutBtn.title = "Open the sheet in its own browser window";
    popoutBtn.addEventListener("click", openPopout);
    header.appendChild(popoutBtn);
  }

  const headerWrap = document.createElement("div");
  headerWrap.appendChild(header);
  headerWrap.style.borderBottom = "3px solid #000000";
  headerWrap.style.paddingBottom = "0.4rem";
  headerWrap.style.marginBottom = "0.75rem";
  app.appendChild(headerWrap);

  const tabs = document.createElement("div");
  tabs.className = "tabs";
  const tabDefs: { id: Tab; label: string }[] = [
    { id: "sheet", label: "Sheet" },
    { id: "tables", label: "Tables" },
    { id: "log", label: "Log" },
  ];
  if (role === "GM") {
    tabDefs.push({ id: "roster", label: "Roster" });
  }
  tabDefs.push({ id: "about", label: "About" });
  for (const t of tabDefs) {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${currentTab === t.id ? "active" : ""}`;
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      currentTab = t.id;
      render();
    });
    tabs.appendChild(btn);
  }
  app.appendChild(tabs);

  const content = document.createElement("div");
  app.appendChild(content);

  if (currentTab === "sheet") {
    renderSheet(
      content,
      sheet,
      playerName,
      sheetLocked,
      saveSheet,
      handleRoll,
      () => {
        sheetLocked = !sheetLocked;
        render();
      },
      importSheet
    );
  } else if (currentTab === "tables") {
    renderTables(content, playerName, handleRoll);
  } else if (currentTab === "log") {
    renderLog(content, log, role, clearLog);
  } else if (currentTab === "roster") {
    renderRoster(content, partyMembers);
  } else if (currentTab === "about") {
    renderAbout(content);
  }
}

// ---- Bootstrapping ---------------------------------------------------

function formatResultMessage(payload: ResultPayload): string {
  const parts = [`${payload.playerName} — ${payload.title}`];
  if (payload.dice.length > 0) parts.push(`[${payload.dice.join(", ")}]`);
  if (payload.detail) parts.push(payload.detail);
  return parts.join("  ·  ");
}

function notificationVariant(payload: ResultPayload): "DEFAULT" | "SUCCESS" | "WARNING" | "ERROR" {
  switch (payload.outcome) {
    case "success":
    case "crit-success":
      return "SUCCESS";
    case "fail":
    case "crit-fail":
      return "ERROR";
    default:
      return "DEFAULT";
  }
}

async function initEmbedded() {
  if (!OBR.isAvailable) {
    app.innerHTML = `<div class="empty-state" style="padding-top:2rem">This extension only runs inside Owlbear Rodeo.</div>`;
    return;
  }

  OBR.onReady(async () => {
    role = await obr.getRole();
    playerName = await obr.getPlayerName();
    sheet = await obr.loadSheet();
    log = await obr.loadLog();
    if (role === "GM") {
      partyMembers = await obr.getPartySheets();
    }

    render();

    obr.onSheetChange((updated) => {
      // Echo of our own saveSheet() call (player metadata is private, so
      // nothing else can trigger this). Keep state fresh but don't re-render
      // while the Sheet tab is open, or a focused <input> loses focus mid-type.
      sheet = updated;
      if (currentTab !== "sheet") render();
      syncPopout();
    });

    obr.onLogChange((updated) => {
      log = updated;
      if (currentTab === "log") render();
      syncPopout();
    });

    if (role === "GM") {
      obr.onPartyChange((members) => {
        partyMembers = members;
        if (currentTab === "roster") render();
        syncPopout();
      });
    }

    // Shared roll-result notification: rendered by Owlbear Rodeo's own UI
    // (outside our popover), so it doesn't cover the sheet, and every
    // connected player with this popover open receives it via broadcast.
    obr.onRollResultBroadcast((payload) => {
      obr.showNativeNotification(formatResultMessage(payload), notificationVariant(payload));
    });

    // Bridge for a popped-out window (see initPopout below).
    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || msg.source !== MSG_SOURCE) return;
      if (msg.kind === "hello") {
        syncPopout();
      } else if (msg.kind === "save-sheet") {
        sheet = msg.sheet;
        obr.saveSheet(sheet);
      } else if (msg.kind === "roll") {
        handleRoll(msg.entry);
      } else if (msg.kind === "clear-log" && role === "GM") {
        clearLog();
      }
    });
  });
}

function initPopout() {
  if (!window.opener) {
    app.innerHTML = `<div class="empty-state" style="padding-top:2rem">This is a pop-out view — open it using the Pop Out button on the Void Born sheet inside Owlbear Rodeo.</div>`;
    return;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.opener) return;
    const msg = event.data;
    if (!msg || msg.source !== MSG_SOURCE || msg.kind !== "state") return;
    role = msg.role;
    playerName = msg.playerName;
    sheet = msg.sheet;
    log = msg.log;
    partyMembers = msg.partyMembers ?? [];
    render();
  });

  render(); // show something immediately while we wait for state
  postToOpener({ kind: "hello" });
}

if (isPopout) {
  initPopout();
} else {
  initEmbedded();
}