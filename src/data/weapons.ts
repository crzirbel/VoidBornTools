import type { TestAttribute, Weapon, WeaponKind } from "../types";
import { makeId } from "../types";

export interface WeaponCatalogEntry {
  name: string;
  category: string;
  gold: number;
  rng: string;
  kind: WeaponKind;
  baseDice: number; // melee: 0 = "FGT" (all core melee weapons use plain FGT); ranged: dice count
  hit: TestAttribute | "";
  dmg: string;
  traits: string;
}

// Melee weapons roll "FGT" dice per the rulebook (baseDice: 0) - none of the
// core tables use a "FGT+1" style ATK value; that dropdown option exists for
// homebrew/ability-granted upgrades instead.
const MELEE_ONE_HANDED: WeaponCatalogEntry[] = [
  { name: "Knife", category: "One-Handed Melee", gold: 0, rng: "1\"", kind: "melee", baseDice: 0, hit: "", dmg: "3", traits: "Varied" },
  { name: "Sword", category: "One-Handed Melee", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "", dmg: "4", traits: "Varied, Parry" },
  { name: "Club", category: "One-Handed Melee", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "4", traits: "Shock" },
  { name: "Axe", category: "One-Handed Melee", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "" },
  { name: "Chainsword", category: "One-Handed Melee", gold: 10, rng: "1\"", kind: "melee", baseDice: 0, hit: "", dmg: "4", traits: "Varied, Pierce, Parry" },
  { name: "Chainaxe", category: "One-Handed Melee", gold: 10, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "Pierce" },
  { name: "Chainfist", category: "One-Handed Melee", gold: 40, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "Pierce" },
  { name: "Power Knife", category: "One-Handed Melee", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "", dmg: "5", traits: "Varied" },
  { name: "Power Sword", category: "One-Handed Melee", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "", dmg: "6", traits: "Varied, Parry" },
  { name: "Power Maul", category: "One-Handed Melee", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "6", traits: "Shock" },
  { name: "Power Axe", category: "One-Handed Melee", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "7", traits: "" },
  { name: "Power Fist", category: "One-Handed Melee", gold: 50, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "Shock" },
  { name: "Plasma Knife", category: "One-Handed Melee", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "", dmg: "6", traits: "Varied, Hazard" },
  { name: "Plasma Axe", category: "One-Handed Melee", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "8", traits: "Hazard" },
  { name: "Arco-Flail", category: "One-Handed Melee", gold: 20, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "Shock, Varied" },
  { name: "Force Sword", category: "One-Handed Melee", gold: 40, rng: "1\"", kind: "melee", baseDice: 0, hit: "WIL", dmg: "6", traits: "Parry" },
  { name: "Force Axe", category: "One-Handed Melee", gold: 40, rng: "1\"", kind: "melee", baseDice: 0, hit: "WIL", dmg: "7", traits: "" },
];

const MELEE_TWO_HANDED: WeaponCatalogEntry[] = [
  { name: "Greatsword", category: "Two-Handed Melee", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "Parry" },
  { name: "Maul", category: "Two-Handed Melee", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "Shock" },
  { name: "Battleaxe", category: "Two-Handed Melee", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "6", traits: "" },
  { name: "Power Glaive", category: "Two-Handed Melee", gold: 40, rng: "2\"", kind: "melee", baseDice: 0, hit: "AGL", dmg: "8", traits: "" },
  { name: "Eviscerator", category: "Two-Handed Melee", gold: 10, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "Parry, Pierce" },
  { name: "Omnissiah Axe", category: "Two-Handed Melee", gold: 40, rng: "1\"", kind: "melee", baseDice: 1, hit: "STR", dmg: "6", traits: "Shock" },
  { name: "Thunder Hammer", category: "Two-Handed Melee", gold: 50, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "Shock" },
  { name: "Lightning Claws", category: "Two-Handed Melee", gold: 50, rng: "1\"", kind: "melee", baseDice: 1, hit: "", dmg: "7", traits: "Varied" },
  { name: "Heavy Plasma Axe", category: "Two-Handed Melee", gold: 30, rng: "2\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "Hazard" },
  { name: "Force Staff", category: "Two-Handed Melee", gold: 40, rng: "2\"", kind: "melee", baseDice: 0, hit: "WIL", dmg: "7", traits: "" },
  { name: "Force Halberd", category: "Two-Handed Melee", gold: 50, rng: "2\"", kind: "melee", baseDice: 0, hit: "WIL", dmg: "8", traits: "Pierce" },
];

const PISTOLS: WeaponCatalogEntry[] = [
  { name: "Thrown Weapon", category: "Pistols", gold: 0, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "3", traits: "" },
  { name: "Handbow", category: "Pistols", gold: 0, rng: "6\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "3", traits: "" },
  { name: "Autopistol", category: "Pistols", gold: 5, rng: "12\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "3", traits: "" },
  { name: "Laspistol", category: "Pistols", gold: 5, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "3", traits: "Precise" },
  { name: "Radium Pistol", category: "Pistols", gold: 15, rng: "12\"", kind: "ranged", baseDice: 3, hit: "PRS", dmg: "3", traits: "" },
  { name: "Arc Pistol", category: "Pistols", gold: 10, rng: "12\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "6", traits: "Hazard" },
  { name: "Bolt Pistol", category: "Pistols", gold: 10, rng: "12\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "5", traits: "" },
  { name: "Hand Flamer", category: "Pistols", gold: 20, rng: "-", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "4", traits: "Burn, Spew" },
  { name: "Inferno Pistol", category: "Pistols", gold: 40, rng: "6\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "8", traits: "Pierce" },
  { name: "Plasma Pistol", category: "Pistols", gold: 40, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "7", traits: "Blast 3\", Hazard" },
  { name: "Archaeotech Pistol", category: "Pistols", gold: 30, rng: "12\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "8", traits: "Hazard" },
  { name: "Needle Pistol", category: "Pistols", gold: 40, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "7", traits: "Poison" },
  { name: "Grav Pistol", category: "Pistols", gold: 40, rng: "12\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "", traits: "Grav" },
  { name: "Web Pistol", category: "Pistols", gold: 40, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "", traits: "Blast 3\", Web" },
];

const GUNS: WeaponCatalogEntry[] = [
  { name: "Bow", category: "Guns", gold: 0, rng: "12\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "3", traits: "" },
  { name: "Crossbow", category: "Guns", gold: 0, rng: "24\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "3", traits: "" },
  { name: "Musket", category: "Guns", gold: 0, rng: "-", kind: "ranged", baseDice: 1, hit: "", dmg: "3", traits: "Hazard, Spew" },
  { name: "Autogun", category: "Guns", gold: 10, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "3", traits: "" },
  { name: "Shotgun", category: "Guns", gold: 10, rng: "-", kind: "ranged", baseDice: 1, hit: "", dmg: "3", traits: "Spew" },
  { name: "Sniper Rifle", category: "Guns", gold: 20, rng: "36\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "5", traits: "Precise, Heavy" },
  { name: "Lasgun", category: "Guns", gold: 5, rng: "24\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "3", traits: "Precise" },
  { name: "Long Las", category: "Guns", gold: 10, rng: "36\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "3", traits: "Precise" },
  { name: "Radium Carbine", category: "Guns", gold: 15, rng: "12\"", kind: "ranged", baseDice: 3, hit: "AGL", dmg: "3", traits: "" },
  { name: "Radium Jezzail", category: "Guns", gold: 25, rng: "48\"", kind: "ranged", baseDice: 3, hit: "PRS", dmg: "3", traits: "Precise, Heavy" },
  { name: "Arc Rifle", category: "Guns", gold: 15, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "6", traits: "Hazard" },
  { name: "Boltgun", category: "Guns", gold: 15, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "5", traits: "" },
  { name: "Flamer", category: "Guns", gold: 20, rng: "-", kind: "ranged", baseDice: 1, hit: "", dmg: "5", traits: "Burn, Spew" },
  { name: "Meltagun", category: "Guns", gold: 40, rng: "12\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "8", traits: "Pierce" },
  { name: "Plasma Gun", category: "Guns", gold: 40, rng: "24\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "7", traits: "Blast 3\", Hazard" },
  { name: "Archaeotech Rifle", category: "Guns", gold: 30, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "8", traits: "Hazard" },
  { name: "Needler", category: "Guns", gold: 40, rng: "36\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "7", traits: "Precise, Poison" },
  { name: "Graviton Gun", category: "Guns", gold: 40, rng: "18\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "", traits: "Grav" },
  { name: "Webber", category: "Guns", gold: 40, rng: "24\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "", traits: "Blast 3\", Web" },
  { name: "Ion Blaster", category: "Guns", gold: 30, rng: "18\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "6", traits: "Pierce" },
];

const CANNONS: WeaponCatalogEntry[] = [
  { name: "Heavy Stubber", category: "Cannons", gold: 20, rng: "36\"", kind: "ranged", baseDice: 5, hit: "STR", dmg: "3", traits: "Heavy" },
  { name: "Ripper Gun", category: "Cannons", gold: 20, rng: "18\"", kind: "ranged", baseDice: 3, hit: "STR", dmg: "5", traits: "Heavy" },
  { name: "Grenade Launcher", category: "Cannons", gold: 20, rng: "24\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "3", traits: "Blast 3\", Heavy" },
  { name: "Missile Launcher", category: "Cannons", gold: 40, rng: "48\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "6", traits: "Blast 5\", Heavy" },
  { name: "Las-Volley", category: "Cannons", gold: 20, rng: "18\"", kind: "ranged", baseDice: 2, hit: "STR", dmg: "5", traits: "Precise, Heavy" },
  { name: "Lascannon", category: "Cannons", gold: 60, rng: "48\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "9", traits: "Precise, Heavy" },
  { name: "Heavy Bolter", category: "Cannons", gold: 30, rng: "36\"", kind: "ranged", baseDice: 3, hit: "STR", dmg: "5", traits: "Heavy" },
  { name: "Heavy Arc Rifle", category: "Cannons", gold: 30, rng: "36\"", kind: "ranged", baseDice: 2, hit: "STR", dmg: "8", traits: "Hazard, Heavy" },
  { name: "Heavy Flamer", category: "Cannons", gold: 30, rng: "-", kind: "ranged", baseDice: 1, hit: "", dmg: "6", traits: "Burn, Spew, Heavy" },
  { name: "Multi-Melta", category: "Cannons", gold: 60, rng: "18\"", kind: "ranged", baseDice: 2, hit: "STR", dmg: "8", traits: "Pierce, Heavy" },
  { name: "Plasma Cannon", category: "Cannons", gold: 60, rng: "36\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "7", traits: "Blast 5\", Hazard, Heavy" },
  { name: "Harpoon Launcher", category: "Cannons", gold: 30, rng: "24\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "8", traits: "Heavy, Pierce" },
  { name: "Archaeotech Cannon", category: "Cannons", gold: 50, rng: "36\"", kind: "ranged", baseDice: 4, hit: "STR", dmg: "8", traits: "Hazard, Heavy" },
  { name: "Psycannon", category: "Cannons", gold: 50, rng: "36\"", kind: "ranged", baseDice: 2, hit: "WIL", dmg: "6", traits: "Heavy" },
];

const GRENADES: WeaponCatalogEntry[] = [
  { name: "Frag Grenade", category: "Grenades", gold: 5, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "3", traits: "Blast 3\"" },
  { name: "Krak Grenade", category: "Grenades", gold: 10, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "6", traits: "" },
  { name: "Smoke Grenade", category: "Grenades", gold: 10, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "", traits: "Smoke in 5\" Blast" },
  { name: "Plasma Grenade", category: "Grenades", gold: 40, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "7", traits: "Blast 5\", Hazard" },
  { name: "Melta Bomb", category: "Grenades", gold: 40, rng: "-", kind: "ranged", baseDice: 1, hit: "STR", dmg: "8", traits: "Remote, Pierce" },
  { name: "Molotov Cocktail", category: "Grenades", gold: 0, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "3", traits: "Burn" },
];

const AELDARI: WeaponCatalogEntry[] = [
  { name: "Shuriken Pistol", category: "Aeldari", gold: 10, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "5", traits: "Pierce" },
  { name: "Neuro Disruptor", category: "Aeldari", gold: 50, rng: "-", kind: "ranged", baseDice: 1, hit: "", dmg: "9", traits: "Spew" },
  { name: "Splinter Pistol", category: "Aeldari", gold: 15, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "4", traits: "Pierce, Poison" },
  { name: "Phantasm Grenades", category: "Aeldari", gold: 50, rng: "STR\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "", traits: "Blast 5\", Craze" },
  { name: "Agonizer", category: "Aeldari", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "AGL", dmg: "7", traits: "Pierce, Poison" },
  { name: "Witchblade", category: "Aeldari", gold: 40, rng: "1\"", kind: "melee", baseDice: 0, hit: "WIL", dmg: "6", traits: "Parry" },
  { name: "Shuriken Catapult", category: "Aeldari", gold: 20, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "5", traits: "Pierce" },
  { name: "Shuriken Cannon", category: "Aeldari", gold: 20, rng: "24\"", kind: "ranged", baseDice: 2, hit: "STR", dmg: "5", traits: "Pierce" },
  { name: "Ranger Long Rifle", category: "Aeldari", gold: 40, rng: "48\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "5", traits: "Precise, Pierce" },
  { name: "Wraithcannon", category: "Aeldari", gold: 50, rng: "18\"", kind: "ranged", baseDice: 1, hit: "STR", dmg: "8", traits: "Pierce, Heavy" },
  { name: "Singing Spear", category: "Aeldari", gold: 50, rng: "2\"", kind: "melee", baseDice: 0, hit: "WIL", dmg: "8", traits: "" },
];

const OTHER_XENOS: WeaponCatalogEntry[] = [
  { name: "Khrave Ether-Blade", category: "Other Xenos", gold: 30, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "Craze" },
  { name: "Scythian Venom Talon", category: "Other Xenos", gold: 40, rng: "1\"", kind: "melee", baseDice: 0, hit: "AGL", dmg: "7", traits: "Parry, Craze" },
  { name: "Galthite Lacerator", category: "Other Xenos", gold: 50, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "8", traits: "Pierce" },
  { name: "Kroot Hunting Rifle", category: "Other Xenos", gold: 30, rng: "36\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "4", traits: "Precise" },
  { name: "Hrud Fusil", category: "Other Xenos", gold: 50, rng: "48\"", kind: "ranged", baseDice: 1, hit: "WIL", dmg: "8", traits: "Precise" },
  { name: "Xenarch Death-Arc", category: "Other Xenos", gold: 60, rng: "12\"", kind: "ranged", baseDice: 4, hit: "AGL", dmg: "8", traits: "-20 to Injury Roll" },
  { name: "Necron Gauss Flayer", category: "Other Xenos", gold: 40, rng: "30\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "6", traits: "Pierce" },
  { name: "Extinction Carbine", category: "Other Xenos", gold: 40, rng: "36\"", kind: "ranged", baseDice: 1, hit: "AGL", dmg: "7", traits: "Blast 3\", Craze" },
  { name: "Londaxi Tribalest", category: "Other Xenos", gold: 40, rng: "18\"", kind: "ranged", baseDice: 3, hit: "STR", dmg: "6", traits: "Pierce" },
  { name: "Darkstar Glaive", category: "Other Xenos", gold: 50, rng: "2\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "8", traits: "-20 to Injury Roll" },
  { name: "Necron Warscythe", category: "Other Xenos", gold: 75, rng: "2\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "8", traits: "Pierce, Varied" },
];

const ORK: WeaponCatalogEntry[] = [
  { name: "Choppa", category: "Ork", gold: 5, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "5", traits: "" },
  { name: "Grotwhip", category: "Ork", gold: 15, rng: "3\"", kind: "melee", baseDice: 0, hit: "AGL", dmg: "4", traits: "Precise" },
  { name: "Power Klaw", category: "Ork", gold: 50, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "Shock" },
  { name: "Snazzgun", category: "Ork", gold: 30, rng: "24\"", kind: "ranged", baseDice: 4, hit: "STR", dmg: "6", traits: "Heavy" },
  { name: "Tankhammer", category: "Ork", gold: 50, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "Shock" },
];

const CHAOS: WeaponCatalogEntry[] = [
  { name: "Screamer Pistol", category: "Chaos", gold: 60, rng: "12\"", kind: "ranged", baseDice: 1, hit: "PRS", dmg: "7", traits: "Psyk" },
  { name: "Daemon Weapon", category: "Chaos", gold: 100, rng: "1\"", kind: "melee", baseDice: 0, hit: "STR", dmg: "9", traits: "1-3 Daemon Traits" },
  { name: "Sonic Blaster", category: "Chaos", gold: 60, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "7", traits: "Psyk" },
  { name: "Plague Belcher", category: "Chaos", gold: 60, rng: "-", kind: "ranged", baseDice: 1, hit: "", dmg: "7", traits: "Spew, Poison" },
  { name: "Daemon Pistol", category: "Chaos", gold: 100, rng: "12\"", kind: "ranged", baseDice: 2, hit: "PRS", dmg: "9", traits: "1-3 Daemon Traits" },
  { name: "Daemon Gun", category: "Chaos", gold: 100, rng: "24\"", kind: "ranged", baseDice: 2, hit: "AGL", dmg: "9", traits: "1-3 Daemon Traits" },
];

export const WEAPON_CATALOG: WeaponCatalogEntry[] = [
  ...MELEE_ONE_HANDED,
  ...MELEE_TWO_HANDED,
  ...PISTOLS,
  ...GUNS,
  ...CANNONS,
  ...GRENADES,
  ...AELDARI,
  ...OTHER_XENOS,
  ...ORK,
  ...CHAOS,
];

export function weaponFromCatalog(entry: WeaponCatalogEntry): Weapon {
  return {
    id: makeId("w"),
    name: entry.name,
    rng: entry.rng,
    kind: entry.kind,
    baseDice: entry.baseDice,
    hit: entry.hit,
    dmg: entry.dmg,
    traits: entry.traits,
    atkBonus: 0,
    hitBonus: 0,
    dmgBonus: 0,
  };
}

export function searchWeaponCatalog(query: string): WeaponCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return WEAPON_CATALOG;
  return WEAPON_CATALOG.filter(
    (w) => w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q) || w.traits.toLowerCase().includes(q)
  );
}
