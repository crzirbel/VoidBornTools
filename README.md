# Void Born — Owlbear Rodeo Extension

A character sheet, dice roller, and GM resolution-table tool for the **Void Born**
(Departmento Colonia) tabletop RPG, built as an [Owlbear Rodeo](https://www.owlbear.rodeo/) extension.

## Features (v1)

- **Sheet tab** — editable MOV/STR/AGL/TGH/INT/WIL/PRS/SAV, weapons list, abilities &
  wargear, species/trait/past/trinket, injuries & corruption notes, bonds, and gold.
  Click an attribute box or a weapon's "Roll" button to make a test (1D10 vs. the
  stat; 0 is always a critical success, 9 is always a critical fail).
- **Tables tab** — one-click rolls on Critical Hit, Critical Fail, Injury, Vehicle
  Damage, Hallucinations, Perils of the Warp, and Corruption. Anyone (player or GM)
  can roll.
- **Log tab** — a shared, live-updating roll log visible to everyone in the room.

Character sheets are saved per-player (private to you, persists automatically).
The roll log is shared room data, capped to the most recent 30 rolls.

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

Outputs a static site to `dist/`. Everything uses relative paths, so it works
whether hosted at a domain root or a GitHub Pages project subpath.

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds and deploys `dist/` to GitHub Pages automatically on every push to `main`.

One-time setup:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to "GitHub Actions".
3. Push to `main` (or run the workflow manually from the Actions tab).
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## Adding the extension to Owlbear Rodeo

Once deployed, in Owlbear Rodeo go to the extensions menu and add a custom
extension using your manifest URL:

```
https://<username>.github.io/<repo-name>/manifest.json
```

## Project structure

```
public/
  manifest.json       # Extension manifest (name, action, embed URL)
  icon.svg            # Action bar icon
index.html            # Popover entry point (loaded in the OBR iframe)
src/
  main.ts             # App bootstrap, tab routing
  types.ts            # CharacterSheet / RollLogEntry types
  dice.ts             # Dice rolling + table lookup logic
  obr.ts              # OBR SDK wrapper (player metadata, room metadata sync)
  data/tables.ts       # Critical Hit/Fail, Injury, Vehicle Damage,
                        # Hallucinations, Perils of the Warp, Corruption tables
  ui/
    sheet.ts           # Sheet tab
    tables.ts          # Tables tab
    log.ts             # Log tab
    result.ts          # Roll-result pop-up card
  style.css
```

## Notes / known limitations

- GM viewing of *other players'* full sheets isn't wired up yet (v1 scope was
  manual sharing — players can just show their screen or you can extend `obr.ts`
  later to mirror sheets into room metadata, namespaced by player ID, if you want
  a live GM roster view).
- The Corruption table's roll `10` isn't covered in the source rulebook (it lists
  `00-09` then jumps to `11-13`); it's folded into "Psychic Awakening" in
  `src/data/tables.ts` — change that if you'd rather it land elsewhere.
- Weapon ATK/DMG dice pools are stored as free text on the sheet (matching the
  rulebook's weapon tables) rather than auto-rolled; only the HIT test is wired
  to a roll button for now. Damage rolling can be added the same way if useful.
