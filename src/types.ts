// Shared types for Void Born character sheet extension

export type Attribute = "MOV" | "STR" | "AGL" | "TGH" | "INT" | "WIL" | "PRS" | "SAV";
export type TestAttribute = "STR" | "AGL" | "TGH" | "INT" | "WIL" | "PRS";
export type WeaponKind = "melee" | "ranged";

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface Weapon {
  id: string;
  name: string;
  rng: string;
  kind: WeaponKind;
  // Melee: 0 = "FGT" dice, 1 = "FGT+1" dice (matches the rulebook's own
  // weapon-table notation). Ranged: the weapon's own ATK dice count (1-4,
  // e.g. an Autogun's "2D10" is 2). FGT never applies to ranged weapons.
  baseDice: number;
  hit: TestAttribute | ""; // which attribute HIT is rolled against
  dmg: string; // e.g. "5" or "STR+2"
  traits: string;
  // Per-weapon bonuses (e.g. a specific enchanted/masterwork item), hidden
  // behind an "Effects" toggle in the UI since most weapons don't need them.
  atkBonus: number;
  hitBonus: number;
  dmgBonus: number;
  // Extra DMG dice rolled for each successful HIT (e.g. the Gnawing Daemon
  // Weapon trait: "roll 2 extra DMG dice" per HIT). 0 = no bonus dice.
  extraDmgDicePerHit: number;
}

export function emptyWeapon(): Weapon {
  return {
    id: makeId("w"),
    name: "",
    rng: "",
    kind: "melee",
    baseDice: 0,
    hit: "",
    dmg: "",
    traits: "",
    atkBonus: 0,
    hitBonus: 0,
    dmgBonus: 0,
    extraDmgDicePerHit: 0,
  };
}

export interface AbilityEffects {
  meleeAtkBonus: number;
  meleeHitBonus: number;
  rangedAtkBonus: number;
  rangedHitBonus: number;
  dmgBonus: number; // added to every weapon's DMG target
  savBonus: number;
  critThreshold: number; // 1 = default (crit-hit only on a roll of 1); 2 = crit on 1 or 2, etc.
  rerollRangedCritFail: boolean; // reroll a ranged HIT die that comes up 0, once
}

export function emptyAbilityEffects(): AbilityEffects {
  return {
    meleeAtkBonus: 0,
    meleeHitBonus: 0,
    rangedAtkBonus: 0,
    rangedHitBonus: 0,
    dmgBonus: 0,
    savBonus: 0,
    critThreshold: 1,
    rerollRangedCritFail: false,
  };
}

export interface AbilityEntry {
  id: string;
  name: string;
  description: string;
  effects: AbilityEffects;
}

// Mechanical modifiers a piece of wargear grants while equipped. Most
// catalog wargear is flavor-only (empty effects); only items that actually
// move the sheet's math (armor, fields, shields, Holy Water, Laser Sight,
// Hellfire Rounds, etc.) need these set.
export interface WargearEffects {
  // Applies to every melee weapon while equipped (e.g. Holy Water).
  meleeHitBonus: number;
  // Applies only to the single ranged weapon referenced by linkedWeaponId
  // (e.g. Laser Sight, Hellfire Rounds - both are worded "for A weapon").
  rangedHitBonus: number;
  rangedAtkBonus: number;
  // SAV granted by this item. savCategory controls how it stacks with
  // other equipped SAV sources: "armorOrField" sources don't stack with
  // each other (only the single best applies), while "shield" sources
  // always stack on top of whichever armor/field is equipped.
  savBonus: number;
  savCategory: "armorOrField" | "shield";
  tghBonus: number;
  // Which weapon (by id) this item's ranged bonuses are attached to, for
  // effects that must be linked to one specific weapon rather than applying
  // sheet-wide. Ignored unless rangedHitBonus/rangedAtkBonus is non-zero.
  linkedWeaponId: string;
}

export function emptyWargearEffects(): WargearEffects {
  return {
    meleeHitBonus: 0,
    rangedHitBonus: 0,
    rangedAtkBonus: 0,
    savBonus: 0,
    savCategory: "armorOrField",
    tghBonus: 0,
    linkedWeaponId: "",
  };
}

export function wargearHasEffects(e: WargearEffects): boolean {
  return (
    e.meleeHitBonus !== 0 ||
    e.rangedHitBonus !== 0 ||
    e.rangedAtkBonus !== 0 ||
    e.savBonus !== 0 ||
    e.tghBonus !== 0
  );
}

export interface WargearEntry {
  id: string;
  name: string;
  quantity: number;
  description: string;
  equipped: boolean;
  effects: WargearEffects;
}

export function emptyWargearEntry(): WargearEntry {
  return {
    id: makeId("wg"),
    name: "",
    quantity: 1,
    description: "",
    equipped: false,
    effects: emptyWargearEffects(),
  };
}

// Inventory uses the same shape as Wargear (name/quantity/description) but
// is never equippable and never carries effects - plain carried items.
export interface InventoryEntry {
  id: string;
  name: string;
  quantity: number;
  description: string;
}

export function emptyInventoryEntry(): InventoryEntry {
  return { id: makeId("inv"), name: "", quantity: 1, description: "" };
}

export interface CharacterSheet {
  name: string;
  handle: string;
  mov: number;
  str: number;
  agl: number;
  tgh: number;
  int: number;
  wil: number;
  prs: number;
  sav: number;
  fgt: number; // Fight dice: number of D10s rolled for melee ATK by default
  species: string;
  trait: string;
  past: string;
  trinket: string;
  injuries: string;
  bonds: string;
  abilities: AbilityEntry[];
  wargear: WargearEntry[];
  inventory: InventoryEntry[];
  gold: number;
  weapons: Weapon[];
  // Stamped fresh on every save. Used to reject stale metadata echoes from
  // OBR.player.onChange (which fires on ANY player-object change, not just
  // our own metadata writes - e.g. selecting a token in the scene) so a
  // late-arriving stale snapshot can never silently overwrite a more recent
  // local edit that just hasn't finished round-tripping yet.
  updatedAt: number;
}

export function emptySheet(name = "New Colonist"): CharacterSheet {
  return {
    name,
    handle: "",
    mov: 5,
    str: 3,
    agl: 3,
    tgh: 3,
    int: 3,
    wil: 3,
    prs: 3,
    sav: 0,
    fgt: 1,
    species: "",
    trait: "",
    past: "",
    trinket: "",
    injuries: "",
    bonds: "",
    abilities: [],
    wargear: [],
    inventory: [],
    gold: 50,
    weapons: [],
    updatedAt: 0,
  };
}

export interface RollLogEntry {
  id: string;
  playerName: string;
  label: string; // e.g. "STR Test", "Injury Table", "Autogun ATK"
  dice: number[]; // raw die results
  target?: number; // stat being tested against, if applicable
  outcome: "success" | "fail" | "crit-success" | "crit-fail" | "info";
  detail?: string; // e.g. table lookup result text, or a hit-count summary
  timestamp: number;
}

// ---- Luck & Chaos token pool (shared, persists indefinitely) -------------

export type TokenType = "luck" | "chaos";

export const MAX_TOKENS = 8;

export interface TokenPool {
  tokens: TokenType[];
}

/** Campaign start state: all 8 tokens are Luck. */
export function defaultTokenPool(): TokenPool {
  return { tokens: Array(MAX_TOKENS).fill("luck") };
}
