import type { WargearEntry } from "../types";
import { makeId } from "../types";

export interface WargearCatalogEntry {
  name: string;
  category: string;
  gold: number;
  description: string;
}

const ARMOR: WargearCatalogEntry[] = [
  { name: "Flak Armor", category: "Armor", gold: 10, description: "Gives wearer 2 SAV" },
  { name: "Mesh Armor", category: "Armor", gold: 20, description: "Gives wearer 3 SAV" },
  { name: "Carapace Armor", category: "Armor", gold: 40, description: "Gives wearer 4 SAV" },
  { name: "Power Armor", category: "Armor", gold: 60, description: "Gives wearer 5 SAV" },
  { name: "Terminator Armor", category: "Armor", gold: 120, description: "Gives wearer 6 SAV" },
  { name: "Refractor Field", category: "Armor", gold: 50, description: "Gives wearer 3 Invulnerable SAV" },
  { name: "Conversion Field", category: "Armor", gold: 100, description: "Gives wearer 5 Invulnerable SAV" },
  { name: "Combat Shield", category: "Armor", gold: 20, description: "Gives wearer SAV +1" },
  { name: "Boarding Shield", category: "Armor", gold: 20, description: "Grants Cover to the wearer" },
  { name: "Storm Shield", category: "Armor", gold: 20, description: "Gives wearer TGH +1" },
];

const WARGEAR: WargearCatalogEntry[] = [
  { name: "Eldar Cloak", category: "Wargear", gold: 20, description: "Grants Cover to the wearer" },
  { name: "Grapnel Launcher", category: "Wargear", gold: 20, description: "Move through the air in straight lines. Must end on solid ground" },
  { name: "Holy Water", category: "Wargear", gold: 20, description: "+1 to HIT for melee weapon" },
  { name: "Holy/Unholy Relic", category: "Wargear", gold: 20, description: "Automatically pass one PRS test of your choice" },
  { name: "Icon/Flag", category: "Wargear", gold: 20, description: "When activating this unit, you can choose to activate a second unit at the same time within 6\". Any broken models within 6\" also rally" },
  { name: "Jump Pack", category: "Wargear", gold: 20, description: "MOV becomes 12\", can fly" },
  { name: "Lascutter", category: "Wargear", gold: 20, description: "Move through walls or other terrain features" },
  { name: "Lucky Charm", category: "Wargear", gold: 20, description: "Can ignore first Wound per game to the model carrying the charm" },
  { name: "Medipack", category: "Wargear", gold: 20, description: "Ignore first Wound per game to a model within 3\", but not the bearer" },
  { name: "Rounds - Executioner", category: "Wargear", gold: 20, description: "Add Precise to a ranged weapon" },
  { name: "Rounds - Hellfire", category: "Wargear", gold: 20, description: "+1D10 ATK to a ranged weapon" },
  { name: "Rounds - Kraken", category: "Wargear", gold: 20, description: "Add Pierce to a ranged weapon" },
  { name: "Sight - Infra", category: "Wargear", gold: 20, description: "Ignore Cover for a ranged weapon" },
  { name: "Sight - Laser", category: "Wargear", gold: 20, description: "+1 HIT for a ranged weapon" },
  { name: "Stimms", category: "Wargear", gold: 20, description: "+2 to all rolls for one turn. -2 to all rolls for the next turn" },
  { name: "Vox Caster", category: "Wargear", gold: 20, description: "When activating this unit, you can choose to activate a second unit at the same time within 12\"" },
];

const BIONICS: WargearCatalogEntry[] = [
  { name: "Bionic Arm", category: "Bionics", gold: 100, description: "Removes the Amputated Arm Injury" },
  { name: "Bionic Ear", category: "Bionics", gold: 100, description: "Removes the Deafened Injury" },
  { name: "Bionic Eye", category: "Bionics", gold: 100, description: "Removes the Lost an Eye Injury" },
  { name: "Bionic Leg", category: "Bionics", gold: 100, description: "Removes the Amputated Leg Injury" },
  { name: "Bionic Organs", category: "Bionics", gold: 100, description: "Removes the Sepsis Injury" },
];

const MEDICAE: WargearCatalogEntry[] = [
  { name: "Mend Arm", category: "Medicae", gold: 50, description: "Removes the Broken Arm Injury" },
  { name: "Mend Leg", category: "Medicae", gold: 50, description: "Removes the Broken Leg Injury" },
  { name: "Metal Hip", category: "Medicae", gold: 50, description: "Removes the Smashed Hip Injury" },
  { name: "Rejuvenat", category: "Medicae", gold: 50, description: "Removes the Disfiguring Scars Injury" },
  { name: "Re-Education", category: "Medicae", gold: 50, description: "Removes the Amnesia Injury" },
];

const VEHICLES: WargearCatalogEntry[] = [
  { name: "Steed", category: "Vehicles", gold: 75, description: "MOV 9\", STR 4, AGL 5, TGH 4, FGT +1D10, SAV 3, 2 Seats" },
  { name: "Warbike", category: "Vehicles", gold: 75, description: "MOV 12\", STR 4, AGL 5, TGH 4, SAV 3, 2 Seats" },
  { name: "Warsuit", category: "Vehicles", gold: 100, description: "MOV 8\", STR 5, AGL 4, TGH 5, FGT +1D10, SAV 5, 1 Seat" },
  { name: "Ridgerunner", category: "Vehicles", gold: 125, description: "MOV 12\", STR 5, AGL 4, TGH 6, SAV 4, 6 Seats" },
  { name: "Taurox", category: "Vehicles", gold: 125, description: "MOV 10\", STR 5, AGL 3, TGH 6, SAV 4, 11 Seats" },
  { name: "Arvus Lighter", category: "Vehicles", gold: 200, description: "MOV 12\", STR 5, AGL 4, TGH 6, SAV 4, 11 Seats, Fly" },
  { name: "Goliath Truck", category: "Vehicles", gold: 200, description: "MOV 10\", STR 6, AGL 3, TGH 6, SAV 5, 8 Seats" },
  { name: "Cargo-8", category: "Vehicles", gold: 250, description: "MOV 10\", STR 7, AGL 3, TGH 7, SAV 6, 16 Seats" },
  { name: "Rhino", category: "Vehicles", gold: 500, description: "MOV 10\", STR 7, AGL 3, TGH 8, SAV 7, 11 Seats" },
  { name: "Gunship", category: "Vehicles", gold: 1000, description: "MOV 16\", STR 7, AGL 4, TGH 8, SAV 7, 16 Seats, Fly" },
];

const PETS: WargearCatalogEntry[] = [
  { name: "Rat", category: "Pets", gold: 10, description: "RNG 1\", ATK 1D10, HIT 3, DMG 3. Can access areas that are small" },
  { name: "Cyber-Mastiff", category: "Pets", gold: 20, description: "RNG 1\", ATK 2D10, HIT 4, DMG 4. Loyal Companion" },
  { name: "Cherubim", category: "Pets", gold: 20, description: "RNG 1\", ATK 1D10, HIT 3, DMG 3. Fly. +10 to rolls on the Wound Table" },
  { name: "Servo-skull", category: "Pets", gold: 30, description: "Fly. Can be equipped with a purchased gun" },
  { name: "Drakolithe", category: "Pets", gold: 30, description: "RNG 1\", ATK 3D10, HIT 5, DMG 5. Fly. Test WIL to see through eyes. Reroll Perils roll" },
  { name: "Psyber-Raven", category: "Pets", gold: 30, description: "RNG 1\", ATK 1D10, HIT 4, DMG 4" },
  { name: "Gyrinx", category: "Pets", gold: 30, description: "RNG 1\", ATK 2D10, HIT 4, DMG 4. +1D10 to Psychic Rolls. Reroll Perils roll" },
  { name: "Jokaero", category: "Pets", gold: 50, description: "RNG 24\", ATK 1D10, HIT 5, DMG 8. Weapons gain +2 DMG and one Trait" },
  { name: "Razorwing", category: "Pets", gold: 50, description: "RNG 1\", ATK 3D10, HIT 5, DMG 5. Fly" },
  { name: "Wyvach", category: "Pets", gold: 50, description: "RNG 1\", ATK 2D10, HIT 5, DMG 5. Fly. +1D10 to Psychic Rolls. Reroll Perils roll" },
];

const CONSUMABLES: WargearCatalogEntry[] = [
  { name: "Corpse Ale", category: "Consumables", gold: 5, description: "After 10 minutes, Drunk for D10 Hours (-1 AGL, -1 TGH, -1 PRS)" },
  { name: "Amasec", category: "Consumables", gold: 10, description: "Quickened (+2 AGL). After 10 minutes, Drunk for D10 Hours" },
  { name: "Fungus Hooch", category: "Consumables", gold: 10, description: "Bolstered (+2 STR). After 10 minutes, Drunk for D10 Hours" },
  { name: "Grog", category: "Consumables", gold: 10, description: "Emboldened (+2 PRS). After 10 minutes, Drunk for D10 Hours" },
  { name: "Navis Gyn", category: "Consumables", gold: 10, description: "Focused (+2 INT). After 10 minutes, Drunk for D10 Hours" },
  { name: "Rotgut", category: "Consumables", gold: 10, description: "Toughened (+2 TGH). After 10 minutes, Drunk for D10 Hours" },
  { name: "Rhum", category: "Consumables", gold: 10, description: "Boisterous (+2 WIL). After 10 minutes, Drunk for D10 Hours" },
  { name: "Devilberry Liqueur", category: "Consumables", gold: 20, description: "Enraged (+3 STR). After 10 minutes, Drunk for D10 Hours" },
  { name: "Gleece", category: "Consumables", gold: 20, description: "Hastened (+3 AGL). After 10 minutes, Drunk for D10 Hours" },
  { name: "Joiliq", category: "Consumables", gold: 20, description: "Galvanized (+3 TGH). After 10 minutes, Drunk for D10 Hours" },
  { name: "Black Cap Tea", category: "Consumables", gold: 5, description: "After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Khat Leaf", category: "Consumables", gold: 10, description: "Quickened (+2 AGL). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Grox-Horn Stew", category: "Consumables", gold: 10, description: "Bolstered (+2 STR). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Knife Grass", category: "Consumables", gold: 10, description: "Emboldened (+2 PRS). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Steelpalm Paste", category: "Consumables", gold: 10, description: "Focused (+2 INT). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Urchin Needle", category: "Consumables", gold: 10, description: "Toughened (+2 TGH). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Jellyfish Aspic", category: "Consumables", gold: 10, description: "Boisterous (+2 WIL). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Stinkhorn Soup", category: "Consumables", gold: 20, description: "Enlightened (+3 INT). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Priest's Bloodwort", category: "Consumables", gold: 20, description: "Shielded (+3 WIL). After 10 minutes, Hallucinate for D10 Minutes" },
  { name: "Laced Lho Stick", category: "Consumables", gold: 20, description: "Enigmatic (+3 PRS). After 10 minutes, Hallucinate for D10 Minutes" },
];

export const WARGEAR_CATALOG: WargearCatalogEntry[] = [
  ...ARMOR,
  ...WARGEAR,
  ...BIONICS,
  ...MEDICAE,
  ...VEHICLES,
  ...PETS,
  ...CONSUMABLES,
];

export function wargearFromCatalog(entry: WargearCatalogEntry): WargearEntry {
  return {
    id: makeId("wg"),
    name: entry.name,
    quantity: 1,
    description: entry.description,
  };
}

export function searchWargearCatalog(query: string): WargearCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return WARGEAR_CATALOG;
  return WARGEAR_CATALOG.filter(
    (w) => w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q) || w.description.toLowerCase().includes(q)
  );
}
