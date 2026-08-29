# Void Born Tools — Owlbear Rodeo Extension

A character sheet, dice roller, and Arbitrator resolution-table tool for the **Void Born**
(Departmento Colonia) tabletop RPG, built as an [Owlbear Rodeo](https://www.owlbear.rodeo/) extension.

Current version: **v1.0**

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

Character sheets are saved per-player (private to you, persists automatically
via Owlbear player metadata, scoped to the room you're in). The roll log and
Luck & Chaos token pool are shared room metadata.

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
  "assets": {
    "directory": "./dist"
  }
}
```

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
  _headers               # CORS headers for cross-origin manifest fetch
wrangler.jsonc          # Cloudflare Workers static assets config
index.html              # Popover entry point (loaded in the OBR iframe)
editor.html             # Standalone offline sheet editor entry point
feedback.html           # Standalone feedback form entry point
src/
  main.ts                # App bootstrap, tab routing, OBR <-> popout bridge
  editor.ts               # Standalone offline sheet editor
  feedback.ts              # Standalone feedback form -> GitHub Issues
  api-worker.ts             # Cloudflare Worker: feedback-to-GitHub-Issues API
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

- Arbitrator live-editing of *other players'* sheets is intentionally not supported —
  Owlbear's permission model only allows a player to write their own metadata.
- Wargear modifiers (e.g. armor setting SAV score, scopes adding a HIT bonus)
  aren't automated yet — deferred for a future session.
- The Corruption table's roll `10` isn't covered in the source rulebook (it lists
  `00-09` then jumps to `11-13`); it's folded into "Psychic Awakening" in
  `src/data/tables.ts` — change that if you'd rather it land elsewhere.