// Resolution tables from Departmento Colonia (Void Born) rules, pages ~16-20+.
// Each table entry maps a die roll (or roll range) to a name + description.

export interface TableEntry {
  range: [number, number]; // inclusive, matches roll value(s)
  name: string;
  desc: string;
}

export interface RollTable {
  id: string;
  label: string;
  die: "D10" | "D100";
  entries: TableEntry[];
}

export const CRITICAL_HIT: RollTable = {
  id: "critical-hit",
  label: "Critical Hit",
  die: "D10",
  entries: [
    { range: [0, 0], name: "Head Shot", desc: "No SAV, DMG, or TGH roll. Enemy is Dead." },
    { range: [1, 1], name: "Blitz", desc: "May make ATK action again once this one is resolved." },
    { range: [2, 2], name: "Through Defenses", desc: "No SAV allowed." },
    { range: [3, 3], name: "Catastrophic", desc: "DMG automatically passes." },
    { range: [4, 4], name: "Debilitating", desc: "If TGH is rolled, these automatically fail. Proceed to Injury." },
    { range: [5, 5], name: "Penetrating", desc: "-2 to SAV." },
    { range: [6, 6], name: "Crippling", desc: "+2 to DMG." },
    { range: [7, 7], name: "Deep Wound", desc: "-2 to TGH." },
    { range: [8, 8], name: "Deadly", desc: "-20 on the Injury Table roll if the enemy is wounded." },
    { range: [9, 9], name: "Weak Spot", desc: "DMG doubles up to 9 when resolving these HITs." },
  ],
};

export const CRITICAL_FAIL: RollTable = {
  id: "critical-fail",
  label: "Critical Fail",
  die: "D10",
  entries: [
    { range: [0, 0], name: "Explosion", desc: "Something explodes. 5\" Blast on you, 5 DMG." },
    { range: [1, 1], name: "Destroyed", desc: "Weapon is destroyed." },
    { range: [2, 2], name: "Broken", desc: "Weapon is broken but can be repaired during Downtime." },
    { range: [3, 3], name: "Dropped", desc: "Drop your weapon on the ground. Can recover after Melee." },
    { range: [4, 4], name: "Overstep", desc: "Your enemy may make a free ATK against you if in range." },
    { range: [5, 5], name: "Wild Miss", desc: "All your HIT dice fail this turn even if some originally hit." },
    { range: [6, 6], name: "Tripped", desc: "You are Down." },
    { range: [7, 7], name: "Exposed", desc: "-2 SAV until your next turn." },
    { range: [8, 8], name: "Injured", desc: "Immediately roll on the Injury Table with a +20 to the roll." },
    { range: [9, 9], name: "Warp Rift", desc: "You missed so bad, you cleaved a rift in the material world. Roll on the Perils of the Warp Table." },
  ],
};

export const INJURY: RollTable = {
  id: "injury",
  label: "Injury Table",
  die: "D100",
  entries: [
    { range: [0, 19], name: "Dead", desc: "You are killed in action. All weapons and equipment are lost." },
    { range: [20, 29], name: "Captured", desc: "Regain consciousness to find yourself captured by the enemy." },
    { range: [30, 31], name: "Amputated Leg", desc: "MOV -2\". *Can be fixed with Bionics." },
    { range: [32, 33], name: "Amputated Arm", desc: "STR -2. Cannot use 2-Handed weapons. *Can be fixed with Bionics." },
    { range: [34, 35], name: "Lost an Eye", desc: "AGL -2. *Can be fixed with Bionics." },
    { range: [36, 37], name: "Sepsis", desc: "TGH -2. *Can be fixed with Bionics." },
    { range: [38, 39], name: "Chronic Brain Injury", desc: "INT -2. *Can be fixed with Bionics." },
    { range: [40, 41], name: "Deafened", desc: "PRS -2. *Can be fixed with Bionics." },
    { range: [42, 43], name: "Soul Break", desc: "WIL -2. Roll Corruption." },
    { range: [44, 45], name: "Broken Leg", desc: "MOV -1\". *Can be healed by a Medicae." },
    { range: [46, 47], name: "Broken Arm", desc: "STR -1. *Can be healed by a Medicae." },
    { range: [48, 49], name: "Smashed Hip", desc: "AGL -1. *Can be healed by a Medicae." },
    { range: [50, 51], name: "Cracked Ribs", desc: "TGH -1. *Can be healed by a Medicae." },
    { range: [52, 53], name: "Concussion", desc: "INT -1. *Can be healed by a Medicae." },
    { range: [54, 55], name: "Warp Tainted", desc: "WIL -1." },
    { range: [56, 57], name: "Disfiguring Scars", desc: "PRS -1. *Can be healed by a Medicae." },
    { range: [58, 60], name: "Amnesia", desc: "Lose one random Ability." },
    { range: [61, 63], name: "Disarmed", desc: "Weapons are lost." },
    { range: [64, 66], name: "Shattered Armor", desc: "Armor destroyed." },
    { range: [67, 69], name: "Flee!", desc: "Wargear is left behind." },
    { range: [70, 71], name: "Escaped", desc: "Lose all gear." },
    { range: [72, 73], name: "Doomed", desc: "Roll on the Corruption Table." },
    { range: [74, 89], name: "Full Recovery", desc: "Unconscious but awake with no impacts." },
    { range: [90, 90], name: "Hastened", desc: "MOV +1\"." },
    { range: [91, 91], name: "Emboldened", desc: "STR +1." },
    { range: [92, 92], name: "Extra Vigilant", desc: "AGL +1." },
    { range: [93, 93], name: "Hardened", desc: "TGH +1." },
    { range: [94, 94], name: "Sharpened Mind", desc: "INT +1." },
    { range: [95, 95], name: "Warp Touched", desc: "WIL +1." },
    { range: [96, 96], name: "Impressive Scars", desc: "PRS +1." },
    { range: [97, 97], name: "Mangled", desc: "Gain Fear." },
    { range: [98, 98], name: "Empowered", desc: "Gain a Psychic Power." },
    { range: [99, 99], name: "Lesson Learned", desc: "Gain an Ability." },
  ],
};

export const VEHICLE_DAMAGE: RollTable = {
  id: "vehicle-damage",
  label: "Vehicle Damage Table",
  die: "D10",
  entries: [
    { range: [0, 0], name: "Destroyed", desc: "The vehicle is destroyed. Blast 5\", DMG = Vehicle TGH. Occupants also take hits." },
    { range: [1, 1], name: "Disabled", desc: "No long-term effects, but the vehicle can't be used anymore this game." },
    { range: [2, 2], name: "Propulsion Stutter", desc: "MOV -2\"." },
    { range: [3, 3], name: "Engine Malfunction", desc: "STR -2." },
    { range: [4, 4], name: "Steering Stuck", desc: "AGL -2." },
    { range: [5, 5], name: "Pierced Shell", desc: "TGH -2." },
    { range: [6, 6], name: "Cracked Hull", desc: "SAV -2." },
    { range: [7, 7], name: "Gun Breakdown", desc: "Weapons Broken." },
    { range: [8, 8], name: "Ejected", desc: "All current occupants are ejected D10\" in a random direction. Roll for each separately." },
    { range: [9, 9], name: "Captured", desc: "The vehicle and its occupants are captured by the enemy for their own use." },
  ],
};

export const HALLUCINATIONS: RollTable = {
  id: "hallucinations",
  label: "Hallucinations",
  die: "D10",
  entries: [
    { range: [0, 0], name: "Bugbugsbugsbugs!", desc: "You drop to the floor (Down), flailing and screaming as you try to remove the bugs." },
    { range: [1, 1], name: "My Hands", desc: "You think your hands have turned to tentacles or the flesh is melting off. Immediately drop what you are holding." },
    { range: [2, 2], name: "They're coming through the walls!", desc: "You see gruesome aliens or daemons coming through the walls, ceiling, ground. You open fire in a random direction, hitting the closest target." },
    { range: [3, 3], name: "Nobody can see me", desc: "You believe you are invisible. Act accordingly. Nothing can shake your conviction." },
    { range: [4, 4], name: "I can fly", desc: "You begin flapping your arms and trying to fly. If there is a ledge or cliff nearby, you will jump off of it." },
    { range: [5, 5], name: "They've got it in for me", desc: "Overcome with paranoia, believing even your comrades are against you. You move toward cover and Hide until you shake the paranoia." },
    { range: [6, 6], name: "It's Poison", desc: "You believe the air is toxic and collapse to the floor as if dead (Down). Those around you must PRS test or also think you are dead." },
    { range: [7, 7], name: "I'll take you all on!", desc: "Filled with burning rage, you immediately gain Frenzy and charge the nearest fighter, even if an ally." },
    { range: [8, 8], name: "I'm only little", desc: "You believe you have shrunk to half normal size. All allies and enemies now cause Fear." },
    { range: [9, 9], name: "It's on me!", desc: "You believe something is crawling up your leg. You make an immediate attack with your weapon that targets yourself." },
  ],
};

export const PERILS_OF_THE_WARP: RollTable = {
  id: "perils",
  label: "Perils of the Warp",
  die: "D10",
  entries: [
    { range: [0, 0], name: "Death", desc: "The Warp consumes you and your body. Your soul has been taken by the Gods." },
    { range: [1, 1], name: "Safe", desc: "You evaded the attention of the Chaos Gods for now..." },
    { range: [2, 2], name: "Dark Summoning", desc: "A Lesser Daemon pops into existence near the Psyker and attacks." },
    { range: [3, 3], name: "Corruption", desc: "The influence of the warp pollutes your mind and soul. Roll on the Corruption table." },
    { range: [4, 4], name: "Soul Sear", desc: "Warp power courses through the Psyker's body. Powers become unusable for the rest of this game." },
    { range: [5, 5], name: "Corruption", desc: "The influence of the warp pollutes your mind and soul. Roll on the Corruption table." },
    { range: [6, 6], name: "Cataclysmic Blast", desc: "7 DMG, 5\" Blast on the Psyker. All the Psyker's gear is destroyed." },
    { range: [7, 7], name: "Corruption", desc: "The influence of the warp pollutes your mind and soul. Roll on the Corruption table." },
    { range: [8, 8], name: "Daemonhost", desc: "The Psyker must immediately pass another WIL Test or permanently become a Daemonhost!" },
    { range: [9, 9], name: "Corruption", desc: "The influence of the warp pollutes your mind and soul. Roll on the Corruption table." },
  ],
};

export const CORRUPTION: RollTable = {
  id: "corruption",
  label: "Corruption",
  die: "D100",
  entries: [
    // Source PDF lists 00-09 then jumps to 11-13, leaving roll 10 uncovered.
    // Folded 10 into Psychic Awakening to close the gap; adjust here if you'd rather it fall elsewhere.
    { range: [0, 10], name: "Psychic Awakening", desc: "Gain a Psychic Power and may reroll your Perils of the Warp roll when you desire." },
    { range: [11, 13], name: "Lolling Tongue", desc: "-1 PRS. Your tongue is long and extended like a dopey dog. Speaking is possible but hard." },
    { range: [14, 16], name: "Corpulent Growth", desc: "-1\" MOV. Your belly grows distended and drags." },
    { range: [17, 19], name: "Distended Fingers", desc: "Can't be Disarmed. Your fingers become distended and grippy, making it impossible to drop things." },
    { range: [20, 20], name: "Hooves", desc: "+1\" MOV. Hooves sprout from where your feet used to be." },
    { range: [21, 23], name: "Emaciated", desc: "-1 STR. You are gaunt and bony. Despite overeating, you don't gain any more weight." },
    { range: [24, 26], name: "Extra Mouth", desc: "Can't Hide. You grow an extra mouth somewhere on your body, whispering and screaming in an unknown language." },
    { range: [27, 29], name: "Glowing Skin", desc: "Effective lumen of a stablight. Your skin always glows faintly. Can be covered by clothing." },
    { range: [30, 30], name: "Extra Arm", desc: "Can hold up to three weapons. A third arm sprouts from one of your armpits, fully functional and can be Injured." },
    { range: [31, 33], name: "Uneven Horns", desc: "+1 SAV, -1 PRS. You sprout a set of goat horns, twisting in various directions." },
    { range: [34, 36], name: "Irrational Nausea", desc: "-1 TGH. You feel sick at otherwise innocuous sights, sounds, or smells. When you encounter it, you are Down." },
    { range: [37, 39], name: "Searing Blood", desc: "When you fail a SAV in melee, your opponent takes an automatic HIT with DMG = your TGH." },
    { range: [40, 40], name: "Extra Eye", desc: "Can see into the Warp. An eye appears somewhere on your body and sees things you cannot." },
    { range: [41, 43], name: "Festering Wound", desc: "-1 TGH. One of your old wounds returns and refuses to heal, no matter what you do." },
    { range: [44, 46], name: "Weeping Pus", desc: "-1 INT. The smell of pus oozing from your body is a constant distraction to you and others." },
    { range: [47, 49], name: "Awful Cravings", desc: "-2 STR when unsatiated. You develop an overwhelming desire to consume an inedible or unacceptable substance (Arbitrator chooses)." },
    { range: [50, 50], name: "Scorpion Tail", desc: "Extra Attack in Melee. 1\", STR, DMG 7, Poison." },
    { range: [51, 53], name: "Iron Skin", desc: "Armor, SAV 3. Your skin grows thick and leathery, deflecting some weapon damage." },
    { range: [54, 56], name: "Great Claw", desc: "1\", STR, DMG 6. You grow a great claw from one arm. Not good for climbing." },
    { range: [57, 59], name: "Phantom Memories", desc: "-1 INT. You have memories of events that, according to everyone else, never happened." },
    { range: [60, 60], name: "Dark Prophecies", desc: "-1 PRS. Once a day when wounded, you may claim to have foreseen this moment and negate an Injury Table roll." },
    { range: [61, 63], name: "Blackouts", desc: "You suffer from unexplainable blackouts at the worst timing. When the Arbitrator says, test WIL to stay alert." },
    { range: [64, 66], name: "Inescapable Itch", desc: "-1 INT. You constantly feel like something revolting is crawling on or under your skin." },
    { range: [67, 69], name: "Hateful Impulses", desc: "Gain Hatred. You gain impulses to kill or maim a group or species that has done you no harm (Arbitrator chooses)." },
    { range: [70, 70], name: "Photonic Irregularity", desc: "You do not appear in mirrors, reflections, or video recordings using the visual light spectrum." },
    { range: [71, 73], name: "Caustic Breath", desc: "Spew, 4 STR, Piercing. You stink, always. Your breath can corrode metal when directed." },
    { range: [74, 76], name: "Enfeebled", desc: "-1 STR. Chaos hangs on you, sucking your life force into the Warp when you are sleeping." },
    { range: [77, 79], name: "Ill Fortuned", desc: "No Luck Coins at start of game. Chance seems to mock you at the most crucial opportunities." },
    { range: [80, 89], name: "Warp Patron", desc: "Unlimited Luck Coins. When you flip your luck coin and get tails, roll Corruption in addition to failing." },
    { range: [90, 90], name: "Living Shadow", desc: "Your shadow does not match your movements and looms large regardless of light." },
    { range: [91, 93], name: "Tortured Visions", desc: "-1 WIL. The warp invades your waking and sleeping thoughts, showing horrid revelations." },
    { range: [94, 96], name: "Unending Malice", desc: "-1 INT. You want to cause harm to random people and objects, even causing dire responses." },
    { range: [97, 99], name: "Totally Unhinged", desc: "-1 WIL. You have gone fully mad. Must test WIL each game to act normally. Otherwise Frenzy." },
  ],
};

export const ALL_TABLES: RollTable[] = [
  CRITICAL_HIT,
  CRITICAL_FAIL,
  INJURY,
  VEHICLE_DAMAGE,
  HALLUCINATIONS,
  PERILS_OF_THE_WARP,
  CORRUPTION,
];

export function lookup(table: RollTable, roll: number): TableEntry {
  const entry = table.entries.find((e) => roll >= e.range[0] && roll <= e.range[1]);
  if (!entry) {
    throw new Error(`No entry found for roll ${roll} on table ${table.label}`);
  }
  return entry;
}
