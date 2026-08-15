import type { AbilityEffects, AbilityEntry } from "../types";
import { emptyAbilityEffects, makeId } from "../types";

export interface AbilityCatalogEntry {
  name: string;
  role: string;
  roll: number;
  description: string;
  effects: AbilityEffects;
}

// All 100 named abilities from the 10 Role tables. Only a handful (Scalpel,
// Wary, Master Crafted, Trained, Blast Away) map cleanly onto the sheet's
// automated Effects fields - the rest are procedural/conditional/narrative
// and stay name+description only, same as the rulebook presents them.
export const ABILITY_CATALOG: AbilityCatalogEntry[] = [
  { name: "Reaper", role: "Chirurgeon", roll: 0, description: "Test INT. An enemy within 6” must reroll on the Injury Table", effects: emptyAbilityEffects() },
  { name: "Medic", role: "Chirurgeon", roll: 1, description: "Test INT. An ally within 6“ can reroll on the Injury Table", effects: emptyAbilityEffects() },
  { name: "Drugs", role: "Chirurgeon", roll: 2, description: "Test INT. If passed, +2 STR and +2 TGH for 2 turns (you or ally)", effects: emptyAbilityEffects() },
  { name: "Haste", role: "Chirurgeon", roll: 3, description: "Test INT. If passed, +4” MOV for the next 2 turns (you or ally)", effects: emptyAbilityEffects() },
  { name: "Focus", role: "Chirurgeon", roll: 4, description: "Test INT. If passed, +2 INT and PRS for the next 2 turns (you or ally)", effects: emptyAbilityEffects() },
  { name: "Scalpel", role: "Chirurgeon", roll: 5, description: "Your attacks critical hit on a 1 or 2 instead of just a 1", effects: { ...emptyAbilityEffects(), critThreshold: 2 } },
  { name: "Weak Spots", role: "Chirurgeon", roll: 6, description: "All of your weapons gain the Piercing Trait", effects: emptyAbilityEffects() },
  { name: "Wary", role: "Chirurgeon", roll: 7, description: "Permanently have a +2 SAV in addition to your armor.", effects: { ...emptyAbilityEffects(), savBonus: 2 } },
  { name: "Plague Doctor", role: "Chirurgeon", roll: 8, description: "Your crew recovers from Disease immediately.", effects: emptyAbilityEffects() },
  { name: "Spores", role: "Chirurgeon", roll: 9, description: "Test INT. Enemy within 12” must roll on the Hallucination Table.", effects: emptyAbilityEffects() },
  { name: "Escape Artist", role: "Deputy", roll: 0, description: "Can never be captured", effects: emptyAbilityEffects() },
  { name: "Tail", role: "Deputy", roll: 1, description: "You have a knack for finding your quarry in urban areas", effects: emptyAbilityEffects() },
  { name: "Trick Shot", role: "Deputy", roll: 2, description: "Can shoot targets you cannot see", effects: emptyAbilityEffects() },
  { name: "Partner", role: "Deputy", roll: 3, description: "Can activate with another ally during their turn", effects: emptyAbilityEffects() },
  { name: "Halt!", role: "Deputy", roll: 4, description: "Test PRS. If passed, target must remain stationary next turn.", effects: emptyAbilityEffects() },
  { name: "Grapple", role: "Deputy", roll: 5, description: "Test STR. If passed, target is subdued and can’t MOV.", effects: emptyAbilityEffects() },
  { name: "Crowd Control", role: "Deputy", roll: 6, description: "Test PRS. If passed, groups of people must listen to your orders", effects: emptyAbilityEffects() },
  { name: "Police Work", role: "Deputy", roll: 7, description: "If you spend time investigating a secret, you will find the answer.", effects: emptyAbilityEffects() },
  { name: "Chase", role: "Deputy", roll: 8, description: "If in a Chase, you close distance at twice the speed as normal.", effects: emptyAbilityEffects() },
  { name: "Clues", role: "Deputy", roll: 9, description: "You notice things that others may not when investigating.", effects: emptyAbilityEffects() },
  { name: "Smyth", role: "Enginseer", roll: 0, description: "Can choose a Round to load in your ranged weapons each game", effects: emptyAbilityEffects() },
  { name: "Gear Head", role: "Enginseer", roll: 1, description: "You can choose a Wargear item at the start of each game", effects: emptyAbilityEffects() },
  { name: "Repair", role: "Enginseer", roll: 2, description: "Can repair weapons, armor, and vehicles when damaged", effects: emptyAbilityEffects() },
  { name: "Cleave", role: "Enginseer", roll: 3, description: "Can attack two nearby enemies in Melee. Roll ATK twice", effects: emptyAbilityEffects() },
  { name: "Scrap Code", role: "Enginseer", roll: 4, description: "Test INT. If passed you can insert a virus into a mechanical system", effects: emptyAbilityEffects() },
  { name: "Hijack", role: "Enginseer", roll: 5, description: "Test INT. If passed you gain control over a mechanical thing", effects: emptyAbilityEffects() },
  { name: "Master Crafted", role: "Enginseer", roll: 6, description: "Your weapons gain +1 DMG and our armor gain +1 SAV.", effects: { ...emptyAbilityEffects(), dmgBonus: 1, savBonus: 1 } },
  { name: "Sapper", role: "Enginseer", roll: 7, description: "Your ranged weapons gain Blast 3” as a trait.", effects: emptyAbilityEffects() },
  { name: "Tech Expert", role: "Enginseer", roll: 8, description: "You remove the Hazardous Trait from all weapons.", effects: emptyAbilityEffects() },
  { name: "Machine Spirit", role: "Enginseer", roll: 9, description: "You may use your INT when rolling to HIT.", effects: emptyAbilityEffects() },
  { name: "Quick Step", role: "Hunter", roll: 0, description: "Can setup anywhere on the map that is 6\" from an enemy", effects: emptyAbilityEffects() },
  { name: "Fade Away", role: "Hunter", roll: 1, description: "Action to disappear. Next turn deploy 6\" away from enemies", effects: emptyAbilityEffects() },
  { name: "Climber", role: "Hunter", roll: 2, description: "Can move up and down walls as if they were flat ground", effects: emptyAbilityEffects() },
  { name: "Eagle Eye", role: "Hunter", roll: 3, description: "+6\" to range of your ranged weapons", effects: emptyAbilityEffects() },
  { name: "Tracker", role: "Hunter", roll: 4, description: "You have an uncanny ability to find your prey in the wild.", effects: emptyAbilityEffects() },
  { name: "Sausage Make", role: "Hunter", roll: 5, description: "You can make food out of your kills. +2 TGH for 30 minutes", effects: emptyAbilityEffects() },
  { name: "Predict Weather", role: "Hunter", roll: 6, description: "Can re-roll on the Weather table each game", effects: emptyAbilityEffects() },
  { name: "Catfall", role: "Hunter", roll: 7, description: "Do not take damage on a fall, regardless of the height.", effects: emptyAbilityEffects() },
  { name: "Old Foe", role: "Hunter", roll: 8, description: "Gain Hatred against an enemy type of your choice (or roll)", effects: emptyAbilityEffects() },
  { name: "Beast Master", role: "Hunter", roll: 9, description: "Gain a pet of your choice. It can also gain advancements.", effects: emptyAbilityEffects() },
  { name: "Flames", role: "Mystic", roll: 0, description: "Test WIL. Torrent, DMG 6, Burn", effects: emptyAbilityEffects() },
  { name: "Blast", role: "Mystic", roll: 1, description: "Test WIL. 24” RNG, Blast 5”, DMG 6, Burn", effects: emptyAbilityEffects() },
  { name: "Stasis", role: "Mystic", roll: 2, description: "Test WIL. If passed, target can’t act this turn or next", effects: emptyAbilityEffects() },
  { name: "Gate", role: "Mystic", roll: 3, description: "Test WIL. If passed, open gate between 2 locations for 10 min", effects: emptyAbilityEffects() },
  { name: "Shift", role: "Mystic", roll: 4, description: "Test WIL. If passed, move person or object up to 12\"", effects: emptyAbilityEffects() },
  { name: "Precog", role: "Mystic", roll: 5, description: "Test WIL. If passed, you take two extra actions next turn", effects: emptyAbilityEffects() },
  { name: "Doom", role: "Mystic", roll: 6, description: "Test WIL. If passed, target must test Morale or flee the battle", effects: emptyAbilityEffects() },
  { name: "Link", role: "Mystic", roll: 7, description: "Test WIL. If passed, two other allies activate right after you", effects: emptyAbilityEffects() },
  { name: "Visions", role: "Mystic", roll: 8, description: "Test WIL. If passed, target must roll on the Hallucination table", effects: emptyAbilityEffects() },
  { name: "Control", role: "Mystic", roll: 9, description: "Test WIL. If passed, target acts under your control for 2 rounds", effects: emptyAbilityEffects() },
  { name: "Inspire", role: "Orator", roll: 0, description: "Allies within 12” automatically pass PRS checks", effects: emptyAbilityEffects() },
  { name: "Guide", role: "Orator", roll: 1, description: "Allies within 6” can re-roll HIT rolls", effects: emptyAbilityEffects() },
  { name: "Direct", role: "Orator", roll: 2, description: "After the fight starts, you can use an action to redeploy an ally", effects: emptyAbilityEffects() },
  { name: "Smooth Talker", role: "Orator", roll: 3, description: "You have a way with words. Can convince people of things.", effects: emptyAbilityEffects() },
  { name: "Rabble Rouser", role: "Orator", roll: 4, description: "Test PRS. If passed, large groups are swayed to riot.", effects: emptyAbilityEffects() },
  { name: "Calm Down", role: "Orator", roll: 5, description: "Test PRS. If passed, enemies within 12” can’t attack you.", effects: emptyAbilityEffects() },
  { name: "Pulpit Smah", role: "Orator", roll: 6, description: "Test PRS. If passed, you cause Fear for the next 2 turns.", effects: emptyAbilityEffects() },
  { name: "Terror", role: "Orator", roll: 7, description: "Force enemy to take a Morale test. If failed, they flea the fight.", effects: emptyAbilityEffects() },
  { name: "Peace", role: "Orator", roll: 8, description: "Test PRS. If passed, immediately end hostility against your crew.", effects: emptyAbilityEffects() },
  { name: "Bring em Down", role: "Orator", roll: 9, description: "Allies within 6” can re-roll DMG rolls", effects: emptyAbilityEffects() },
  { name: "Plain", role: "Peasant", roll: 0, description: "Does not leave an impression on anyone. Auto-pass Hide tests", effects: emptyAbilityEffects() },
  { name: "Hard", role: "Peasant", roll: 1, description: "Reroll the first WND roll you make each game", effects: emptyAbilityEffects() },
  { name: "Iron Jaw", role: "Peasant", roll: 2, description: "Reroll WND rolls when in close combat.", effects: emptyAbilityEffects() },
  { name: "Squat Blood", role: "Peasant", roll: 3, description: "Cannot be Poisoned", effects: emptyAbilityEffects() },
  { name: "Sturdy", role: "Peasant", roll: 4, description: "Re-roll SAV rolls of 0", effects: emptyAbilityEffects() },
  { name: "Last Stand", role: "Peasant", roll: 5, description: "Before being Injured, you make an attack with any weapon", effects: emptyAbilityEffects() },
  { name: "Shroom Farmer", role: "Peasant", roll: 6, description: "Test INT to coat weapon with fungi. Target or you hallucinate.", effects: emptyAbilityEffects() },
  { name: "Folk Hero", role: "Peasant", roll: 7, description: "When rolling for an Advance, you can roll on other Role tables", effects: emptyAbilityEffects() },
  { name: "Daemon Weapon", role: "Peasant", roll: 8, description: "You start play with a Daemon Weapon you inherited…", effects: emptyAbilityEffects() },
  { name: "Family Ties", role: "Peasant", roll: 9, description: "When in peril, your Bond will show up when you most need them", effects: emptyAbilityEffects() },
  { name: "Biologi", role: "Savant", roll: 0, description: "You know the weaknesses of your enemies. Test PRS to ignore SAV", effects: emptyAbilityEffects() },
  { name: "Haggler", role: "Savant", roll: 1, description: "Acquire gear for significant discounts per GM discretion.", effects: emptyAbilityEffects() },
  { name: "Form Filler", role: "Savant", roll: 2, description: "You always have the right form and can fill it out very quickly", effects: emptyAbilityEffects() },
  { name: "Scavvy", role: "Savant", roll: 3, description: "Find things in the rubble that others might miss. DM discretion.", effects: emptyAbilityEffects() },
  { name: "Cold Trade", role: "Savant", roll: 4, description: "Know a guy off world to gain rare goods. Access Cold Market.", effects: emptyAbilityEffects() },
  { name: "Confuse", role: "Savant", roll: 5, description: "Test INT. If passed, enemy can’t attack for 2 rounds", effects: emptyAbilityEffects() },
  { name: "Setup", role: "Savant", roll: 6, description: "Your enemies roll critical Fails on a 0 or 9", effects: emptyAbilityEffects() },
  { name: "Xeno-Study", role: "Savant", roll: 7, description: "You know important facts about various Xenos specimens.", effects: emptyAbilityEffects() },
  { name: "I know a guy…", role: "Savant", roll: 8, description: "When you need a particular tool or piece of gear, you have it", effects: emptyAbilityEffects() },
  { name: "Intel", role: "Savant", roll: 9, description: "You always have the right intel at the right time for your crew", effects: emptyAbilityEffects() },
  { name: "Trained", role: "Warrior", roll: 0, description: "When shooting, re-roll a HIT roll of 0", effects: { ...emptyAbilityEffects(), rerollRangedCritFail: true } },
  { name: "Hold!", role: "Warrior", roll: 1, description: "If you do not move this turn, automatic HIT.", effects: emptyAbilityEffects() },
  { name: "Blaster", role: "Warrior", roll: 2, description: "When shooting a target within 6\", automatic HIT.", effects: emptyAbilityEffects() },
  { name: "Dual Shot", role: "Warrior", roll: 3, description: "Can shoot two pistols at once", effects: emptyAbilityEffects() },
  { name: "Hulk", role: "Warrior", roll: 4, description: "Can carry a Heavy weapon with one hand. You can  move and shoot.", effects: emptyAbilityEffects() },
  { name: "Berserk", role: "Warrior", roll: 5, description: "Attack with 2 melee weapons at once", effects: emptyAbilityEffects() },
  { name: "Terror", role: "Warrior", roll: 6, description: "Gain the Fear ability in combat (see Presence section of rules).", effects: emptyAbilityEffects() },
  { name: "Riposte", role: "Warrior", roll: 7, description: "If you successfully Parry, you can take a free Fight action.", effects: emptyAbilityEffects() },
  { name: "Mighty", role: "Warrior", roll: 8, description: "Can wield two-handed melee weapons with one hand.", effects: emptyAbilityEffects() },
  { name: "Savage", role: "Warrior", roll: 9, description: "If  enemy is wounded in combat, can make another Charge action.", effects: emptyAbilityEffects() },
  { name: "Pious", role: "Zealot", roll: 0, description: "Automatically HIT when attacking a Daemon or Heretic", effects: emptyAbilityEffects() },
  { name: "Steady", role: "Zealot", roll: 1, description: "Automatically pass Morale Tests made for yourself.", effects: emptyAbilityEffects() },
  { name: "Preach", role: "Zealot", roll: 2, description: "Test PRS. If passed, enemies w/in 6” can’t attack for 2 turns.", effects: emptyAbilityEffects() },
  { name: "Brawler", role: "Zealot", roll: 3, description: "Attack with your bare fists, but DMG is STR+2 instead of STR", effects: emptyAbilityEffects() },
  { name: "Rage", role: "Zealot", roll: 4, description: "Gain Piercing and Parry when using your fists for melee", effects: emptyAbilityEffects() },
  { name: "Smelly", role: "Zealot", roll: 5, description: "You are treated as if cause Fear due to the horrible smell.", effects: emptyAbilityEffects() },
  { name: "Toss", role: "Zealot", roll: 6, description: "Test STR in Melee. If passed you can throw your enemy 6 inches", effects: emptyAbilityEffects() },
  { name: "Holy Fire", role: "Zealot", roll: 7, description: "You cover your weapons in flames. Melee weapons gain Burn.", effects: emptyAbilityEffects() },
  { name: "Blast Away", role: "Zealot", roll: 8, description: "You gain +1D10 to your ranged weapons ATK.", effects: { ...emptyAbilityEffects(), rangedAtkBonus: 1 } },
  { name: "Devout", role: "Zealot", roll: 9, description: "Cannot be corrupted by the Warp or its inhabitants", effects: emptyAbilityEffects() },
];

export function abilityFromCatalog(entry: AbilityCatalogEntry): AbilityEntry {
  return {
    id: makeId("ab"),
    name: entry.name,
    description: entry.description,
    effects: { ...entry.effects },
  };
}

export function searchAbilityCatalog(query: string): AbilityCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ABILITY_CATALOG;
  return ABILITY_CATALOG.filter(
    (a) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
  );
}
