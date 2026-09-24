# Void Born Tools — Owlbear Rodeo Extension

A character sheet, dice roller, and Arbitrator resolution-table tool for the **Void Born**
(Departmento Colonia) tabletop RPG, built as an [Owlbear Rodeo](https://www.owlbear.rodeo/) extension.

Current version: **v1.1.1**

## Patch changelog (v1.0.1 - v1.1.1)

These point releases aren't shown in the in-app About tab (which covers
feature-level milestones only) but are recorded here for reference:

- **v1.0.1** — Sheet saves now retry and verify the write landed, with a
  visible on-screen error on failure instead of failing silently. Added a
  local backup safety net (mirrors every successful save to this browser;
  offers one-click recovery if a blank sheet loads while a real backup
  exists). Replaced the Luck & Chaos Tables-tab summary with the full house
  rules text behind a "Rules" toggle.
- **v1.0.2** — Fixed a stale-echo bug: `OBR.player.onChange` fires on any
  change to your player object (e.g. selecting a token in the scene), not
  just our own saves, so a stale snapshot could silently overwrite a more
  recent edit that hadn't finished saving yet. Sheets are now stamped with a
  save timestamp and a stale snapshot can never overwrite newer local data.
- **v1.0.3** — Found the actual root cause of the sheet-wipe bug: sheets
  were stored in Owlbear's player metadata, which turned out not to
  reliably survive a page reload even though saves reported success. Sheets
  now live in room metadata (the same storage the Log and Token Pool
  already used, which never had this problem), keyed per player so one
  player's save can't collide with another's. Also fixed a bug in the local
  backup safety net where the default sheet name ("New Colonist") was
  incorrectly treated as real data, which could overwrite a good backup
  with a blank one.
- **v1.0.4** — Removed the "Max Charge Move" line from the Charge tool.
  Made the Luck & Chaos "Rules" and "Burn Token" buttons the same size and
  lined them up in a row.
- **v1.0.5** — Found a deeper root cause of the sheet-wipe bug, confirmed by
  reading the Owlbear SDK's own source: a "verified" save only confirms the
  local Owlbear tab accepted the write, not that it durably reached the
  server, so a reload shortly after an edit could come back with an older
  (but not blank) sheet that the old blank-only recovery check never caught
  - silently reverting recent work and then overwriting the local backup
  with that stale data too. Loading a sheet now compares timestamps and
  keeps whichever of Owlbear's copy or the local backup is actually newer,
  self-healing Owlbear's copy if local wins. Local backups are now scoped
  per player (previously one shared backup slot per browser). Added a
  warning (console + one-time in-room notice) if a room's combined saved
  data is approaching Owlbear's ~16kB room metadata limit.
- **v1.1.1** — Fixed rolls, token flips and sheet saves failing once a room
  filled Owlbear's ~16kB shared room storage (#13, #14). The Arbitrator's
  four slot sheets now live in the site's own database (Cloudflare D1, via
  the Worker) instead of room metadata; existing slots move over
  automatically the first time the Arbitrator opens them, and the room copy
  is deleted once the move succeeds. Player sheets are stored in a compact
  form (defaults and unedited catalog descriptions left out, restored on
  load) - roughly a third of their previous size. The Log is now also capped
  at ~4kB. A failed Log/token/sheet write now shows an error that says when
  the room's storage is full, and a roll's result pop-up still reaches
  everyone even if its Log entry couldn't be saved. Fixed text sitting high
  and clipping in sheet boxes, and "STR"/"PRS"/"Ranged" being cut off in the
  weapon dropdowns (#15) - Special Elite is now self-hosted with corrected
  line metrics.

## Features

- **Sheet tab** — editable MOV/STR/AGL/TGH/INT/WIL/PRS/SAV/FGT, weapons list with
  ATK/HIT/DMG rolling, abilities & wargear, background fields, injuries/bonds/gold,
  and edit/lock mode. Click an attribute box or a weapon's roll button to make a
  D10 test (0 is always a critical success, 9 is always a critical fail).
  Weapon DMG fields support formulas (e.g. `STR+2`) evaluated at roll time.
  Per-weapon Effects (ATK/HIT/DMG bonuses, Extra DMG Dice per HIT for traits
  like Gnawing) are available behind a "+ Effects" toggle on any weapon.
- **Tables tab** — one-click rolls on Critical Hit, Critical Fail, Injury, Vehicle
  Damage, Hallucinations, Perils of the Warp, and Corruption, a Charge move
  calculator (MOV + d10/2), the Luck & Chaos token pool (8 shared tokens that
  persist indefinitely, with Burn and Grant), and a simple Dice Roller
  (d4/d6/d8/d10/d12/d20/d100 pool, roll, reset). Anyone (player or Arbitrator)
  can roll.
- **Log tab** — a shared, live-updating roll log visible to everyone in the room,
  capped at the most recent 30 rolls.
- **Roster tab** (Arbitrator only) — a read-only overview of the connected party.
- **About tab** — an in-app usage guide, version change log, and a feedback
  button.
- **Catalogs** — searchable "Add From Catalog" pickers for weapons, wargear, and
  abilities, so you don't have to type them in by hand.
- **Automated ability bonuses** — select abilities (Scalpel, Wary, Master Crafted,
  Trained, Blast Away) apply their mechanical bonus automatically once added to
  a sheet.
- **Pop Out** — opens the sheet in its own browser window alongside the Owlbear
  Rodeo tab, via a `postMessage` bridge (the Owlbear SDK only works inside the
  embedded iframe, so the pop-out relays actions back to the embedded window).
- **JPEG export** — renders your sheet as an image and opens it in a new tab for
  saving or sharing outside Owlbear Rodeo.
- **JSON export/import** — back up or transfer a sheet as a `.json` file. Export
  triggers a real file download from a new tab (needed since Owlbear's iframe
  silently blocks `<a download>`); import replaces the current sheet.
- **Standalone sheet editor** (`/editor.html`) — an offline page (not connected
  to Owlbear Rodeo) for loading, editing, and re-saving a player's exported
  JSON sheet outside a live session.
- **Feedback button** — submits a bug report or suggestion straight to this
  repo's GitHub Issues via a Cloudflare Worker API route (`/api/*`), with a
  honeypot spam guard.

Player character sheets, the roll log, and the Luck & Chaos token pool are
stored in shared room metadata (keyed per player for sheets, so one
player's save can't collide with another's). Room metadata has a documented
16kB total cap shared across everything an extension stores there, so
sheets are stored in a compact form (`sheetCodec.ts`) and the log is capped
by size. The Arbitrator's four slot sheets are stored separately in a
Cloudflare D1 database behind the Worker (`/api/gm-sheet`), keyed by room,
so they don't count toward that cap. Sheets previously lived in Owlbear's
player metadata, which turned out not to reliably survive a page reload
despite saves reporting success; `obr.ts` still checks that old location
once as a fallback and carries any legacy data forward automatically.

## Local development

```bash
npm install
npm run dev
```

This opens a normal dev server, but the app checks `OBR.isAvailable` and will show
a placeholder outside of Owlbear Rodeo — see below for testing inside a real room.

To test inside Owlbear Rodeo while developing, run `npm run dev`, then in Owlbear
Rodeo add a custom extension pointing at your local dev server's manifest, e.g.
`http://localhost:5173/manifest.json` (see [Owlbear's extension docs](https://docs.owlbear.rodeo/extensions/getting-started)).

## Building

```bash
npm run build
```

Outputs a static site to `dist/`.

## Deploying

This project deploys to **Cloudflare Workers** (static assets), connected
directly to this GitHub repo — every push to `main` triggers an automatic
build and deploy, no GitHub Actions workflow needed.

Config lives in `wrangler.jsonc` at the project root:

```jsonc
{
  "name": "voidborntools",
  "compatibility_date": "2026-08-01",
  "main": "src/api-worker.ts",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "voidborn", "database_id": "<id>" }
  ]
}
```

The D1 database (Arbitrator slot sheets) is created once with
`npx wrangler d1 create voidborn`; paste the id it prints into
`wrangler.jsonc`. The Worker creates its table on first use.

Build command: `npm run build`
Deploy command: `npx wrangler deploy`

The site is served from a custom domain, **void-born.com**, added under the
Worker's Domains & Routes settings (this avoids `*.workers.dev`, which some
corporate networks block by category). A `public/_headers` file sets
`Access-Control-Allow-Origin: *` so Owlbear Rodeo can fetch the manifest
cross-origin without a CORS error.

## Adding the extension to Owlbear Rodeo

In Owlbear Rodeo, go to the extensions menu and add a custom extension using:

```
https://void-born.com/manifest.json
```

## Project structure

```
public/
  manifest.json        # Extension manifest (name, action, embed URL)
  icon.svg              # Action bar icon
  icons/                 # Luck/Chaos token artwork (Aquila, Chaos Star)
  fonts/                  # Self-hosted Special Elite (Apache 2.0) with its license
  _headers               # CORS headers for cross-origin manifest fetch
wrangler.jsonc          # Cloudflare Workers static assets config
index.html              # Popover entry point (loaded in the OBR iframe)
editor.html             # Standalone offline sheet editor entry point
feedback.html           # Standalone feedback form entry point
src/
  main.ts                # App bootstrap, tab routing, OBR <-> popout bridge
  editor.ts               # Standalone offline sheet editor
  feedback.ts              # Standalone feedback form -> GitHub Issues
  api-worker.ts             # Cloudflare Worker: feedback-to-GitHub-Issues API,
                             # Arbitrator slot-sheet storage (D1)
  gmStore.ts                 # Client for the Worker's Arbitrator slot-sheet API
  sheetCodec.ts              # Compact sheet encoding for room metadata
  types.ts                  # CharacterSheet / RollLogEntry / TokenPool types
  dice.ts                    # Dice rolling + table lookup + log-entry builders
  combat.ts                   # ATK/HIT/DMG resolution, weapon bonus math
  obr.ts                       # OBR SDK wrapper (player/room metadata sync)
  export.ts                     # JPEG sheet export (html2canvas)
  jsonio.ts                      # JSON sheet export/import
  data/
    tables.ts               # Critical Hit/Fail, Injury, Vehicle Damage,
                             # Hallucinations, Perils of the Warp, Corruption tables
    weapons.ts               # Weapon catalog
    wargear.ts                # Wargear catalog
    abilities.ts               # Abilities catalog
  ui/
    sheet.ts                    # Sheet tab
    tables.ts                    # Tables tab (Charge, Luck & Chaos, dice roller)
    tokens.ts                     # Luck & Chaos token pool panel
    log.ts                          # Log tab
    roster.ts                        # Roster tab (Arbitrator only)
    about.ts                          # About tab (usage guide, changelog, feedback)
    result.ts                          # Roll-result pop-up card
  style.css
```

## Notes / known limitations

- Arbitrator live-editing of *other players'* sheets isn't exposed in the UI.
  Note this is now an app-level choice rather than an Owlbear permission
  restriction: since sheets moved to shared room metadata, any connected
  client is technically capable of writing any player's sheet key. The app
  itself only ever writes the current player's own key.
- Wargear modifiers (e.g. armor setting SAV score, scopes adding a HIT bonus)
  aren't automated yet — deferred for a future session.
- The Corruption table's roll `10` isn't covered in the source rulebook (it lists
  `00-09` then jumps to `11-13`); it's folded into "Psychic Awakening" in
  `src/data/tables.ts` — change that if you'd rather it land elsewhere.