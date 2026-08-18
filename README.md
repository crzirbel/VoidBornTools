# Void Born Tools — Owlbear Rodeo Extension

A character sheet, dice roller, and GM resolution-table tool for the **Void Born**
(Departmento Colonia) tabletop RPG, built as an [Owlbear Rodeo](https://www.owlbear.rodeo/) extension.

Current version: **v0.8**

## Features

- **Sheet tab** — editable MOV/STR/AGL/TGH/INT/WIL/PRS/SAV/FGT, weapons list with
  ATK/HIT/DMG rolling, abilities & wargear, background fields, injuries/bonds/gold,
  and edit/lock mode. Click an attribute box or a weapon's roll button to make a
  D10 test (0 is always a critical success, 9 is always a critical fail).
  Weapon DMG fields support formulas (e.g. `STR+2`) evaluated at roll time.
- **Tables tab** — one-click rolls on Critical Hit, Critical Fail, Injury, Vehicle
  Damage, Hallucinations, Perils of the Warp, and Corruption, plus a Luck Coin
  flip and a simple Dice Roller (d4/d6/d8/d10/d12/d20/d100 pool, roll, reset).
  Anyone (player or GM) can roll.
- **Log tab** — a shared, live-updating roll log visible to everyone in the room,
  capped at the most recent 30 rolls.
- **Roster tab** (GM only) — a read-only overview of the connected party.
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

Character sheets are saved per-player (private to you, persists automatically
via Owlbear player metadata). The roll log is shared room metadata.

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
  _headers               # CORS headers for cross-origin manifest fetch
wrangler.jsonc          # Cloudflare Workers static assets config
index.html              # Popover entry point (loaded in the OBR iframe)
src/
  main.ts                # App bootstrap, tab routing
  types.ts                # CharacterSheet / RollLogEntry types
  dice.ts                  # Dice rolling + table lookup + bonus engine logic
  obr.ts                    # OBR SDK wrapper (player metadata, room metadata sync)
  data/
    tables.ts               # Critical Hit/Fail, Injury, Vehicle Damage,
                             # Hallucinations, Perils of the Warp, Corruption tables
    weapons.ts               # Weapon catalog
    wargear.ts                # Wargear catalog
    abilities.ts               # Abilities catalog
  ui/
    sheet.ts                    # Sheet tab
    tables.ts                    # Tables tab
    log.ts                        # Log tab
    roster.ts                      # Roster tab (GM only)
    about.ts                        # About tab (usage guide, changelog, feedback)
    result.ts                        # Roll-result pop-up card
  style.css
```

## Notes / known limitations

- GM live-editing of *other players'* sheets is intentionally not supported —
  Owlbear's permission model only allows a player to write their own metadata.
- Wargear modifiers (e.g. armor setting SAV score, scopes adding a HIT bonus)
  aren't automated yet — deferred for a future session.
- The Corruption table's roll `10` isn't covered in the source rulebook (it lists
  `00-09` then jumps to `11-13`); it's folded into "Psychic Awakening" in
  `src/data/tables.ts` — change that if you'd rather it land elsewhere.