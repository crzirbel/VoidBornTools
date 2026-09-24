export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/feedback" && request.method === "POST") {
      return handleFeedback(request, env);
    }

    if (url.pathname === "/api/gm-sheet") {
      if (request.method === "GET") return handleGmSheetGet(url, env);
      if (request.method === "PUT") return handleGmSheetPut(request, env);
      return json({ error: "Method not allowed" }, 405);
    }

    return env.ASSETS.fetch(request);
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function handleFeedback(request: Request, env: any): Promise<Response> {
  try {
    const data: any = await request.json();
    const { title, description, reporter, honeypot } = data;

    // Bots fill hidden fields; humans won't see this field at all
    if (honeypot) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "Missing title or description" }), { status: 400 });
    }

    const body = `${description}\n\n---\n*Submitted via in-app feedback form${reporter ? ` by ${reporter}` : ""}*`;

    const ghRes = await fetch("https://api.github.com/repos/crzirbel/VoidBornTools/issues", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "voidborn-feedback-worker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels: ["player-feedback"] }),
    });

    if (!ghRes.ok) {
      return new Response(JSON.stringify({ error: "GitHub API error" }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}

// ---- Arbitrator slot sheets (D1) ------------------------------------------
//
// The Arbitrator's 4 NPC/enemy sheet slots live here instead of in Owlbear
// room metadata, whose ~16kB shared cap they were filling (issues #13, #14).
// One row per (Owlbear room id, slot storage id). Requires the D1 binding
// "DB" in wrangler.jsonc. The table is created on first use, so there is no
// separate migration step.
//
// Access control is by obscurity only: anyone who knows a room id and the
// Arbitrator's player id could read or overwrite these rows. That's the same
// exposure the slots had in room metadata (any client in the room could
// read/write them there too), and acceptable for a private group tool.

// Loose on purpose: Owlbear doesn't document its room/player id formats, and
// a too-strict pattern would lock the Arbitrator out of their slots. Values
// only ever reach D1 as bound parameters, never interpolated into SQL.
const ROOM_ID_RE = /^\S{1,200}$/;
// Only Arbitrator slot ids (see obr.gmSlotStorageId) are accepted, so this
// endpoint can't be used as general-purpose storage.
const SLOT_ID_RE = /^\S{1,200}::gmSlot[1-4]$/;
const MAX_SHEET_BYTES = 64 * 1024;

let tableReady = false;

async function ensureTable(env: any): Promise<void> {
  if (tableReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS gm_sheets (
       room_id    TEXT    NOT NULL,
       storage_id TEXT    NOT NULL,
       sheet      TEXT    NOT NULL,
       updated_at INTEGER NOT NULL,
       PRIMARY KEY (room_id, storage_id)
     )`
  ).run();
  tableReady = true;
}

function validIds(room: unknown, id: unknown): room is string {
  return typeof room === "string" && typeof id === "string" && ROOM_ID_RE.test(room) && SLOT_ID_RE.test(id);
}

async function readRow(env: any, room: string, id: string): Promise<unknown | null> {
  const row = await env.DB.prepare("SELECT sheet FROM gm_sheets WHERE room_id = ?1 AND storage_id = ?2")
    .bind(room, id)
    .first();
  return row ? JSON.parse(row.sheet as string) : null;
}

async function handleGmSheetGet(url: URL, env: any): Promise<Response> {
  const room = url.searchParams.get("room");
  const id = url.searchParams.get("id");
  if (!validIds(room, id)) return json({ error: "Invalid room or sheet id" }, 400);
  try {
    await ensureTable(env);
    return json({ sheet: await readRow(env, room, id as string) });
  } catch (err) {
    console.error("gm-sheet GET failed", err);
    return json({ error: "Server error" }, 500);
  }
}

async function handleGmSheetPut(request: Request, env: any): Promise<Response> {
  let data: any;
  try {
    const text = await request.text();
    if (text.length > MAX_SHEET_BYTES) return json({ error: "Sheet too large" }, 413);
    data = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { room, id, sheet } = data ?? {};
  if (!validIds(room, id)) return json({ error: "Invalid room or sheet id" }, 400);
  if (!sheet || typeof sheet !== "object" || typeof sheet.updatedAt !== "number") {
    return json({ error: "Invalid sheet" }, 400);
  }
  try {
    await ensureTable(env);
    // Upsert, but never replace a row with an OLDER copy (e.g. a second tab
    // or device still holding a stale sheet). Equal timestamps are allowed
    // so a retried save of the same sheet still succeeds.
    const result = await env.DB.prepare(
      `INSERT INTO gm_sheets (room_id, storage_id, sheet, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (room_id, storage_id) DO UPDATE
         SET sheet = excluded.sheet, updated_at = excluded.updated_at
         WHERE excluded.updated_at >= gm_sheets.updated_at`
    )
      .bind(room, id, JSON.stringify(sheet), sheet.updatedAt)
      .run();
    if (!result.meta || result.meta.changes === 0) {
      return json({ error: "A newer copy of this sheet is already saved", sheet: await readRow(env, room, id) }, 409);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("gm-sheet PUT failed", err);
    return json({ error: "Server error" }, 500);
  }
}
