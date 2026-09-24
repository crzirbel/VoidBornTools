/**
 * Client for the Arbitrator's slot sheets, which live in the Cloudflare
 * Worker's D1 database instead of Owlbear room metadata (see api-worker.ts).
 *
 * Why: room metadata has a ~16kB cap shared by every player's sheet, the log
 * and the token pool. Four extra full sheets for the Arbitrator's NPC slots
 * were enough to fill it, at which point sheet saves, log entries and token
 * flips all started failing (issues #13, #14). The slot sheets are private
 * to the Arbitrator anyway, so nothing needs them in shared room state.
 *
 * Rows are keyed by (Owlbear room id, slot storage id), so each room keeps
 * its own set of slots, same as before.
 */
import type { CharacterSheet } from "./types";

const ENDPOINT = "/api/gm-sheet";

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Sheet server returned non-JSON (HTTP ${res.status})`);
  }
}

/** Returns the stored sheet (raw, unmigrated) or null if this slot has never been saved. Throws on network/server errors. */
export async function fetchGmSheet(roomId: string, storageId: string): Promise<unknown | null> {
  const url = `${ENDPOINT}?room=${encodeURIComponent(roomId)}&id=${encodeURIComponent(storageId)}`;
  const res = await fetch(url, { cache: "no-store" });
  const body = await readJson(res);
  if (!res.ok) throw new Error(body.error ?? `Sheet server error (HTTP ${res.status})`);
  return body.sheet ?? null;
}

/**
 * Saves a slot sheet. The server refuses to replace a row with an OLDER
 * updatedAt (e.g. a second tab holding a stale copy); in that case this
 * resolves with `stale: true` and the newer stored sheet, so the caller can
 * adopt it instead of silently losing either copy.
 */
export async function putGmSheet(
  roomId: string,
  storageId: string,
  sheet: CharacterSheet
): Promise<{ stale: boolean; sheet: unknown }> {
  const res = await fetch(ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: roomId, id: storageId, sheet }),
  });
  const body = await readJson(res);
  if (res.status === 409) return { stale: true, sheet: body.sheet };
  if (!res.ok) throw new Error(body.error ?? `Sheet server error (HTTP ${res.status})`);
  return { stale: false, sheet };
}
