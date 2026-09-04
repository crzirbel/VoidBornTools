import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import type { CharacterSheet, RollLogEntry, TokenPool } from "./types";
import { emptySheet, defaultTokenPool } from "./types";
import { renderSheet, cancelPendingSave } from "./ui/sheet";
import { renderTables } from "./ui/tables";
import { renderLog } from "./ui/log";
import { renderRoster } from "./ui/roster";
import { renderAbout } from "./ui/about";
import * as obr from "./obr";
import type { PartyMember } from "./obr";
import type { ResultPayload } from "./ui/result";
import { buildTokenSpendLogEntry, buildTokenBurnLogEntry, buildTokenGrantLogEntry } from "./dice";
import { backupSheetLocally, readLocalBackup, isSheetBlank } from "./localBackup";

type Tab = "sheet" | "tables" | "log" | "roster" | "about";

const MSG_SOURCE = "voidborn";
const isPopout = new URLSearchParams(location.search).get("popout") === "1";

let currentTab: Tab = "sheet";
let sheet: CharacterSheet = emptySheet();
let log: RollLogEntry[] = [];
let tokenPool: TokenPool = defaultTokenPool();
let partyMembers: PartyMember[] = [];
let playerName = "Colonist";
let playerId = "";
let role: "GM" | "PLAYER" = "PLAYER";
let sheetLocked = true; // sheet starts locked (read/roll mode); Edit unlocks it
let popoutWindow: Window | null = null;
// The Arbitrator's 4 quick-swap sheet slots (for running multiple NPCs/
// enemies without re-importing a JSON file each time). Meaningless for
// PLAYER role. gmSlotNames is a small local cache of each slot's sheet
// name for the slot-bar buttons - populated lazily so the initial render
// isn't blocked on 3 extra loads.
let gmSlot = 1;
let gmSlotNames: string[] = Array(obr.GM_SLOT_COUNT).fill("");
let unsubscribeSheetChange: (() => void) | null = null;
// Set at load if the sheet from Owlbear looks blank AND a non-blank local
// backup exists - offers the player a one-click recovery instead of quietly
// accepting what might be data loss. Cleared once restored or dismissed.
let recoveryBackup: { sheet: CharacterSheet; savedAt: number } | null = null;

// The Arbitrator role comes from Owlbear's SDK as "GM" - this only maps it
// to the game's own terminology for display; the underlying role value and
// every role === "GM" check elsewhere stays as-is.
function roleLabel(r: "GM" | "PLAYER"): string {
  return r === "GM" ? "Arbitrator" : "Player";
}

const app = document.getElementById("app")!;

// ---- Actions -----------------------------------------------------------
// When embedded in Owlbear, these call the real SDK. When popped out into a
// plain browser window (which has no Owlbear iframe connection), they relay
// the action back to the embedded window via postMessage instead.

// The Arbitrator's own sheet storage uses a per-slot virtual id instead of
// their real player id (see obr.gmSlotStorageId) - every other player just
// uses their real id, unchanged.
function sheetStorageId(): string {
  return role === "GM" ? obr.gmSlotStorageId(playerId, gmSlot) : playerId;
}

function postToOpener(message: Record<string, unknown>) {
  window.opener?.postMessage({ source: MSG_SOURCE, ...message }, "*");
}

function postToPopout(message: Record<string, unknown>) {
  if (popoutWindow && !popoutWindow.closed) {
    popoutWindow.postMessage({ source: MSG_SOURCE, ...message }, "*");
  }
}

function syncPopout() {
  postToPopout({ kind: "state", role, playerName, playerId, sheet, log, tokenPool, partyMembers, gmSlot, gmSlotNames });
}

async function saveSheet(updated: CharacterSheet) {
  sheet = updated;
  if (isPopout) {
    postToOpener({ kind: "save-sheet", sheet: updated });
    return;
  }
  try {
    const storageId = sheetStorageId();
    sheet = await obr.saveSheet(storageId, sheet);
    backupSheetLocally(storageId, sheet);
    if (role === "GM") gmSlotNames[gmSlot - 1] = sheet.name;
    syncPopout();
  } catch (err) {
    console.error("Failed to save character sheet:", err);
    obr.showNativeNotification(
      "Your sheet failed to save! Your last changes may not be kept - check your connection and try again, or export a JSON backup now.",
      "ERROR"
    );
  }
}

// Importing replaces every field on the sheet, so (unlike normal typing
// saves) this needs an immediate full re-render to show the new values.
// cancelPendingSave() is critical here: without it, a debounce timer left
// over from an edit made just before the import can fire up to 300ms later
// and silently overwrite the freshly-imported sheet with the stale one.
async function importSheet(updated: CharacterSheet) {
  cancelPendingSave();
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

async function handleSpendLuck(index: number) {
  if (isPopout) {
    postToOpener({ kind: "flip-token", index, to: "chaos" });
    return;
  }
  await obr.flipToken(index, "chaos");
  await handleRoll(buildTokenSpendLogEntry(playerName, "luck"));
}

async function handleSpendChaos(index: number) {
  if (isPopout) {
    postToOpener({ kind: "flip-token", index, to: "luck" });
    return;
  }
  await obr.flipToken(index, "luck");
  await handleRoll(buildTokenSpendLogEntry(playerName, "chaos"));
}

async function handleBurnToken(index: number) {
  if (isPopout) {
    postToOpener({ kind: "burn-token", index });
    return;
  }
  const burned = await obr.burnToken(index);
  if (burned) await handleRoll(buildTokenBurnLogEntry(playerName, burned));
}

async function handleGrantToken() {
  if (isPopout) {
    postToOpener({ kind: "grant-token" });
    return;
  }
  const granted = await obr.grantLuckToken();
  if (granted) await handleRoll(buildTokenGrantLogEntry(playerName));
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

function buildRecoveryBanner(backup: { sheet: CharacterSheet; savedAt: number }): HTMLElement {
  const banner = document.createElement("div");
  banner.className = "panel";
  banner.style.border = "2px solid var(--red-bright)";
  banner.style.marginBottom = "0.75rem";

  const title = document.createElement("div");
  title.style.fontFamily = "var(--font-heading)";
  title.style.fontSize = "0.85rem";
  title.style.textTransform = "uppercase";
  title.style.marginBottom = "0.3rem";
  title.textContent = "Possible sheet data loss detected";
  banner.appendChild(title);

  const body = document.createElement("div");
  body.style.fontSize = "0.8rem";
  body.style.marginBottom = "0.5rem";
  const when = new Date(backup.savedAt).toLocaleString();
  body.textContent = `The sheet loaded from Owlbear looks blank, but this browser has a local backup from ${when}. Restore it?`;
  banner.appendChild(body);

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "0.4rem";

  const restoreBtn = document.createElement("button");
  restoreBtn.className = "btn";
  restoreBtn.textContent = "Restore Local Backup";
  restoreBtn.addEventListener("click", async () => {
    cancelPendingSave();
    const restored = backup.sheet;
    recoveryBackup = null;
    await saveSheet(restored);
    render();
  });
  row.appendChild(restoreBtn);

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "btn secondary";
  dismissBtn.textContent = "Dismiss";
  dismissBtn.addEventListener("click", () => {
    recoveryBackup = null;
    render();
  });
  row.appendChild(dismissBtn);

  banner.appendChild(row);
  return banner;
}

function buildGmSlotBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "gm-slot-bar";
  for (let s = 1; s <= obr.GM_SLOT_COUNT; s++) {
    const btn = document.createElement("button");
    btn.className = `gm-slot-btn ${s === gmSlot ? "active" : ""}`;
    const num = document.createElement("div");
    num.className = "gm-slot-btn-num";
    num.textContent = String(s);
    btn.appendChild(num);
    const name = gmSlotNames[s - 1];
    if (name) {
      const nameEl = document.createElement("div");
      nameEl.className = "gm-slot-btn-name";
      nameEl.textContent = name;
      btn.appendChild(nameEl);
    }
    btn.title = name ? `Slot ${s}: ${name}` : `Slot ${s} (empty)`;
    btn.addEventListener("click", () => switchGmSlot(s));
    bar.appendChild(btn);
  }
  return bar;
}

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
  badge.textContent = roleLabel(role);
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

  if (recoveryBackup) {
    app.appendChild(buildRecoveryBanner(recoveryBackup));
  }

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
    // The Arbitrator's 4 quick-swap slots (for running multiple NPCs/
    // enemies) only make sense on their own Sheet tab - players never see
    // this, and it doesn't apply to any other tab. Must be inserted AFTER
    // renderSheet runs: renderSheet does container.innerHTML = "" as its
    // first line (it owns and fully redraws its container), which would
    // silently wipe out anything appended beforehand.
    if (role === "GM") {
      content.insertBefore(buildGmSlotBar(), content.firstChild);
    }
  } else if (currentTab === "tables") {
    renderTables(content, sheet, playerName, handleRoll, {
      pool: tokenPool,
      role,
      onSpendLuck: handleSpendLuck,
      onSpendChaos: handleSpendChaos,
      onBurn: handleBurnToken,
      onGrant: handleGrantToken,
    });
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

/**
 * Loads a sheet from room metadata for the given storage id and reconciles
 * it against that same id's local backup (see obr.loadSheet's docblock for
 * why this reconciliation is necessary at all). Shared between the initial
 * onReady load and every GM slot switch, since both need the identical
 * stale-vs-blank handling - just against a different storage id each time.
 */
async function loadAndReconcileSheet(storageId: string, checkLegacy: boolean): Promise<CharacterSheet> {
  let resolved = await obr.loadSheet(storageId, checkLegacy);

  // Room metadata's write acknowledgment only confirms the local Owlbear
  // host tab accepted the write, not that it durably reached the backend -
  // so a reload shortly after an edit can come back with a stale-but-NOT-
  // blank snapshot that a blank-only check would never catch, silently
  // reverting recent work. Timestamps are the only reliable signal here,
  // so check this before anything else: if the local backup is newer than
  // what Owlbear just returned, trust local and self-heal room metadata
  // back up to match it.
  const backup = readLocalBackup(storageId);
  if (backup && !isSheetBlank(backup.sheet) && backup.sheet.updatedAt > resolved.updatedAt) {
    console.log(
      "[VoidBorn/main] Local backup is newer than what Owlbear returned - recovering from local and re-syncing.",
      { storageId, localUpdatedAt: backup.sheet.updatedAt, roomUpdatedAt: resolved.updatedAt }
    );
    resolved = backup.sheet;
    obr.saveSheet(storageId, resolved).catch((err) =>
      console.error("[VoidBorn/main] Re-sync of recovered local backup failed (will retry on next edit):", err)
    );
    obr.showNativeNotification(
      "Recovered a newer local save that hadn't finished syncing to this room.",
      "WARNING"
    );
  } else if (isSheetBlank(resolved)) {
    console.log("[VoidBorn/main] Initial load looks blank - re-checking after a short delay in case of a late sync...");
    // Guard against a possible race where the metadata read returns a
    // not-yet-synced snapshot immediately after onReady fires. Re-fetch
    // once, directly, before trusting that this is really a blank sheet.
    await new Promise((resolve) => setTimeout(resolve, 800));
    const recheck = await obr.loadSheet(storageId, checkLegacy);
    if (!isSheetBlank(recheck)) {
      console.log("[VoidBorn/main] Re-check found real data - initial load was stale/racy.", recheck);
      resolved = recheck;
    } else if (backup && !isSheetBlank(backup.sheet)) {
      // Still blank after the recheck, and the earlier newer-than check
      // didn't fire (backup isn't newer, just present) - e.g. the very
      // first load after this id's room metadata was wiped for some other
      // reason. Surface a manual recovery prompt rather than auto-
      // restoring, since we can't prove local is actually correct here the
      // way the timestamp check above can.
      console.log("[VoidBorn/main] Found a non-blank local backup - showing recovery banner.", backup);
      recoveryBackup = backup;
    } else {
      console.log("[VoidBorn/main] No usable local backup found.");
    }
  } else {
    // Good data loaded - mirror it locally so this backup is available in
    // case something goes wrong on a later save.
    backupSheetLocally(storageId, resolved);
  }
  return resolved;
}

/** (Re)subscribes the shared onSheetChange listener to a given storage id - tears down the previous subscription first, since only one should ever be active (the currently-viewed sheet/slot). */
function subscribeSheetChange(storageId: string) {
  if (unsubscribeSheetChange) unsubscribeSheetChange();
  unsubscribeSheetChange = obr.onSheetChange(storageId, (updated) => {
    // OBR.room.onMetadataChange fires on ANY room metadata change - the
    // Log, the Token Pool, or any player's sheet - not just our own writes.
    // A stale snapshot from one of those unrelated events must never
    // overwrite more recent local edits, so only accept it if it's at
    // least as new as what we already have.
    if (updated.updatedAt < sheet.updatedAt) {
      console.log(
        "[VoidBorn/main] onSheetChange: REJECTED stale snapshot",
        { incomingUpdatedAt: updated.updatedAt, currentUpdatedAt: sheet.updatedAt }
      );
      return;
    }
    console.log(
      "[VoidBorn/main] onSheetChange: ACCEPTED",
      { incomingUpdatedAt: updated.updatedAt, previousUpdatedAt: sheet.updatedAt }
    );
    sheet = updated;
    backupSheetLocally(storageId, sheet);
    if (role === "GM") gmSlotNames[gmSlot - 1] = sheet.name;
    if (currentTab !== "sheet") render();
    syncPopout();
  });
}

/** Background-loads the other 3 slots' sheet names so the slot bar can show a caption under each button, without blocking the initial render on 3 extra loads. */
async function prefetchGmSlotNames() {
  for (let s = 1; s <= obr.GM_SLOT_COUNT; s++) {
    if (s === gmSlot) continue; // already loaded as the active slot
    try {
      const slotSheet = await obr.loadSheet(obr.gmSlotStorageId(playerId, s), false);
      gmSlotNames[s - 1] = slotSheet.name;
    } catch (err) {
      console.error(`[VoidBorn/main] Failed to prefetch GM slot ${s} name (non-fatal):`, err);
    }
  }
  if (currentTab === "sheet") render();
  syncPopout();
}

/** Switches which of the Arbitrator's 4 sheet slots is active - only meaningful for role === "GM". */
async function switchGmSlot(newSlot: number) {
  if (role !== "GM" || newSlot === gmSlot || newSlot < 1 || newSlot > obr.GM_SLOT_COUNT) return;
  if (isPopout) {
    postToOpener({ kind: "switch-gm-slot", slot: newSlot });
    return;
  }
  // A debounce timer left over from an edit on the OLD slot must never be
  // allowed to fire after switching - it would save the old slot's stale
  // sheet object under the NEW slot's storage key, clobbering whatever was
  // already there. Same class of bug as the JSON-import race.
  cancelPendingSave();
  gmSlot = newSlot;
  obr.saveGmActiveSlot(playerId, gmSlot).catch((err) =>
    console.error("[VoidBorn/main] Failed to save active GM slot (will retry on next switch):", err)
  );
  const storageId = sheetStorageId();
  sheet = await loadAndReconcileSheet(storageId, false);
  gmSlotNames[gmSlot - 1] = sheet.name;
  subscribeSheetChange(storageId);
  render();
  syncPopout();
}

async function initEmbedded() {
  if (!OBR.isAvailable) {
    app.innerHTML = `<div class="empty-state" style="padding-top:2rem">This extension only runs inside Owlbear Rodeo.</div>`;
    return;
  }

  OBR.onReady(async () => {
    role = await obr.getRole();
    playerName = await obr.getPlayerName();
    playerId = await obr.getPlayerId();
    if (role === "GM") {
      gmSlot = await obr.loadGmActiveSlot(playerId);
    }
    console.log("[VoidBorn/main] onReady fired. role =", role, "playerName =", playerName, "playerId =", playerId, "gmSlot =", gmSlot);

    const storageId = sheetStorageId();
    sheet = await loadAndReconcileSheet(storageId, role !== "GM");
    if (role === "GM") gmSlotNames[gmSlot - 1] = sheet.name;

    log = await obr.loadLog();
    tokenPool = await obr.loadTokenPool();
    if (role === "GM") {
      partyMembers = await obr.getPartySheets();
    }

    render();

    subscribeSheetChange(storageId);

    if (role === "GM") {
      prefetchGmSlotNames();
    }

    obr.onLogChange((updated) => {
      log = updated;
      if (currentTab === "log") render();
      syncPopout();
    });

    obr.onTokenPoolChange((updated) => {
      tokenPool = updated;
      if (currentTab === "tables") render();
      syncPopout();
    });

    if (role === "GM") {
      obr.onPartyChange((members) => {
        partyMembers = members;
        if (currentTab === "roster") render();
        syncPopout();
      });
      // Sheets now live in room metadata rather than embedded in the player
      // object, so party.onChange alone won't fire when someone edits their
      // sheet - refresh the roster on any room metadata change too.
      obr.onRoomMetadataChange(async () => {
        partyMembers = await obr.getPartySheets();
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
        cancelPendingSave();
        saveSheet(msg.sheet);
      } else if (msg.kind === "roll") {
        handleRoll(msg.entry);
      } else if (msg.kind === "clear-log" && role === "GM") {
        clearLog();
      } else if (msg.kind === "flip-token") {
        obr.flipToken(msg.index, msg.to).then(() => {
          handleRoll(buildTokenSpendLogEntry(playerName, msg.to === "chaos" ? "luck" : "chaos"));
        });
      } else if (msg.kind === "burn-token") {
        obr.burnToken(msg.index).then((burned) => {
          if (burned) handleRoll(buildTokenBurnLogEntry(playerName, burned));
        });
      } else if (msg.kind === "grant-token" && role === "GM") {
        obr.grantLuckToken().then((granted) => {
          if (granted) handleRoll(buildTokenGrantLogEntry(playerName));
        });
      } else if (msg.kind === "switch-gm-slot" && role === "GM") {
        switchGmSlot(msg.slot);
      }
    });
  });
}

function initPopout() {
  if (!window.opener) {
    app.innerHTML = `<div class="empty-state" style="padding-top:2rem">This is a pop-out view — open it using the Pop Out button on the Void Born sheet inside Owlbear Rodeo.</div>`;
    return;
  }

  // The very first "state" sync must always render, even if the sheet/slot
  // it carries happens to match this window's placeholder defaults (e.g. a
  // fresh, lightly-used sheet on slot 1) - otherwise role/playerName/tabs/
  // the GM slot bar never get corrected from their initial "PLAYER"/blank
  // placeholders, which is more than cosmetic: it silently hides the
  // Roster tab, the slot bar, and Arbitrator-only buttons in the popout.
  let hasReceivedInitialState = false;

  window.addEventListener("message", (event) => {
    if (event.source !== window.opener) return;
    const msg = event.data;
    if (!msg || msg.source !== MSG_SOURCE || msg.kind !== "state") return;
    role = msg.role;
    playerName = msg.playerName;
    playerId = msg.playerId;
    // The opener bundles sheet+log+tokenPool+partyMembers into every "state"
    // sync, including ones triggered by something unrelated (e.g. any roll
    // pushed to the shared log). A blind render() on every one of those was
    // the root cause of the DMG box resetting to 0 after a HIT: it wiped the
    // in-progress "Hits: N" / pre-filled DMG dice count between the ATK roll
    // and the follow-up DMG roll. Only force a re-render of the Sheet tab
    // when the sheet itself actually changed - other tabs still refresh
    // normally since they don't hold that kind of transient state.
    const sheetChanged = JSON.stringify(sheet) !== JSON.stringify(msg.sheet);
    const slotChanged = gmSlot !== (msg.gmSlot ?? 1);
    const isFirstState = !hasReceivedInitialState;
    hasReceivedInitialState = true;
    sheet = msg.sheet;
    log = msg.log;
    tokenPool = msg.tokenPool ?? defaultTokenPool();
    partyMembers = msg.partyMembers ?? [];
    gmSlot = msg.gmSlot ?? 1;
    gmSlotNames = msg.gmSlotNames ?? gmSlotNames;
    if (isFirstState || currentTab !== "sheet" || sheetChanged || slotChanged) render();
  });

  render(); // show something immediately while we wait for state
  postToOpener({ kind: "hello" });
}

if (isPopout) {
  initPopout();
} else {
  initEmbedded();
}