import type { CharacterSheet } from "./types";
import {
  emptySheet,
  emptyWeapon,
  emptyAbilityEffects,
  emptyWargearEntry,
  emptyInventoryEntry,
} from "./types";
import { ABILITY_CATALOG } from "./data/abilities";
import { WARGEAR_CATALOG } from "./data/wargear";

/**
 * Compact on-the-wire format for sheets stored in Owlbear room metadata.
 *
 * Room metadata has a ~16kB cap shared by every sheet, the log and the token
 * pool, and a full sheet spends most of its bytes on values that carry no
 * information: all-zero effects objects on every ability and wargear item,
 * zero weapon bonuses, empty strings, and catalog descriptions copied in
 * verbatim. packSheet() drops anything equal to its default (and any
 * description identical to the catalog text for that item's name);
 * hydrateStoredSheet() puts it all back. Only storage is affected - the app,
 * the local backup and JSON export all still see full sheets.
 *
 * hydrateStoredSheet() is a no-op on data that is already full-size, so
 * sheets saved by older versions load unchanged and shrink on their next
 * save.
 */

const abilityDescByName = new Map(ABILITY_CATALOG.map((a) => [a.name, a.description]));
const wargearDescByName = new Map(WARGEAR_CATALOG.map((w) => [w.name, w.description]));

type Json = Record<string, unknown>;

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Copies `obj` without keys whose value equals the same key in `defaults`. `keep` keys are always kept. */
function stripDefaults(obj: Json, defaults: Json, keep: string[] = []): Json {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (!keep.includes(k) && k in defaults && same(v, defaults[k])) continue;
    out[k] = v;
  }
  return out;
}

/** Description is omitted when it matches what we'd rebuild on load: the catalog text for that name, or "" for custom items. */
function packDescription(out: Json, name: unknown, description: unknown, catalog: Map<string, string>) {
  const expected = catalog.get(String(name ?? "")) ?? "";
  if (description === expected) delete out.description;
  else out.description = description ?? "";
}

function hydrateDescription(entry: Json, catalog: Map<string, string>): string {
  if (typeof entry.description === "string") return entry.description;
  return catalog.get(String(entry.name ?? "")) ?? "";
}

export function packSheet(sheet: CharacterSheet): Json {
  const { id: _w, ...weaponDefaults } = emptyWeapon() as unknown as Json;
  const { id: _g, effects: wargearEffectDefaults, ...wargearDefaults } = emptyWargearEntry() as unknown as Json;
  const { id: _i, ...inventoryDefaults } = emptyInventoryEntry() as unknown as Json;
  const abilityEffectDefaults = emptyAbilityEffects() as unknown as Json;

  const top = stripDefaults(sheet as unknown as Json, emptySheet() as unknown as Json, ["updatedAt"]);

  top.weapons = sheet.weapons.map((w) => stripDefaults(w as unknown as Json, weaponDefaults));

  top.abilities = sheet.abilities.map((a) => {
    const out: Json = { id: a.id, name: a.name };
    packDescription(out, a.name, a.description, abilityDescByName);
    const effects = stripDefaults((a.effects ?? {}) as unknown as Json, abilityEffectDefaults);
    if (Object.keys(effects).length > 0) out.effects = effects;
    return out;
  });

  top.wargear = sheet.wargear.map((g) => {
    const { effects, description, ...rest } = g as unknown as Json;
    const out = stripDefaults(rest, wargearDefaults);
    packDescription(out, g.name, description, wargearDescByName);
    const packedEffects = stripDefaults((effects ?? {}) as Json, wargearEffectDefaults as Json);
    if (Object.keys(packedEffects).length > 0) out.effects = packedEffects;
    return out;
  });

  top.inventory = sheet.inventory.map((item) => stripDefaults(item as unknown as Json, inventoryDefaults));

  // Empty lists carry nothing either.
  for (const k of ["weapons", "abilities", "wargear", "inventory"]) {
    if ((top[k] as unknown[]).length === 0) delete top[k];
  }
  return top;
}

/**
 * Restores every field packSheet() dropped. Top-level fields are filled in by
 * migrateSheet() (which merges over emptySheet()), so this only needs to
 * rebuild list entries. Safe on full-size (unpacked) data.
 */
export function hydrateStoredSheet(stored: unknown): unknown {
  if (!stored || typeof stored !== "object") return stored;
  const s = { ...(stored as Json) };

  if (Array.isArray(s.weapons)) {
    s.weapons = s.weapons.map((w: Json) => ({ ...emptyWeapon(), ...w }));
  }
  if (Array.isArray(s.abilities)) {
    // Built field-by-field (not by spreading `a`) so the key order matches a
    // freshly-created entry - code elsewhere compares sheets via JSON.stringify.
    s.abilities = s.abilities.map((a: Json) => ({
      id: a.id,
      name: a.name ?? "",
      description: hydrateDescription(a, abilityDescByName),
      effects: { ...emptyAbilityEffects(), ...((a.effects as Json) ?? {}) },
    }));
  }
  if (Array.isArray(s.wargear)) {
    s.wargear = s.wargear.map((g: Json) => {
      const base = emptyWargearEntry();
      return {
        ...base,
        ...g,
        description: hydrateDescription(g, wargearDescByName),
        effects: { ...base.effects, ...((g.effects as Json) ?? {}) },
      };
    });
  }
  if (Array.isArray(s.inventory)) {
    s.inventory = s.inventory.map((item: Json) => ({ ...emptyInventoryEntry(), ...item }));
  }
  return s;
}
