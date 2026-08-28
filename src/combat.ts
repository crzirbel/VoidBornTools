import type { CharacterSheet, TestAttribute, Weapon, WeaponKind } from "./types";
import { rollD10 } from "./dice";

export interface ComputedBonuses {
  meleeAtkBonus: number;
  meleeHitBonus: number;
  rangedAtkBonus: number;
  rangedHitBonus: number;
  dmgBonus: number;
  savBonus: number;
  critThreshold: number;
  rerollRangedCritFail: boolean;
}

/** Sums the automatic effects of every ability on the sheet (abilities are always active once added - no equip toggle for them). */
export function computeBonuses(sheet: CharacterSheet): ComputedBonuses {
  const totals: ComputedBonuses = {
    meleeAtkBonus: 0,
    meleeHitBonus: 0,
    rangedAtkBonus: 0,
    rangedHitBonus: 0,
    dmgBonus: 0,
    savBonus: 0,
    critThreshold: 1,
    rerollRangedCritFail: false,
  };

  for (const ability of sheet.abilities) {
    const e = ability.effects;
    if (!e) continue;
    totals.meleeAtkBonus += e.meleeAtkBonus || 0;
    totals.meleeHitBonus += e.meleeHitBonus || 0;
    totals.rangedAtkBonus += e.rangedAtkBonus || 0;
    totals.rangedHitBonus += e.rangedHitBonus || 0;
    totals.dmgBonus += e.dmgBonus || 0;
    totals.savBonus += e.savBonus || 0;
    totals.critThreshold = Math.max(totals.critThreshold, e.critThreshold || 1);
    totals.rerollRangedCritFail = totals.rerollRangedCritFail || !!e.rerollRangedCritFail;
  }

  return totals;
}

/**
 * How many D10s a weapon's ATK pool gathers.
 * Melee: FGT + ability melee-ATK bonuses + this weapon's own ATK selector
 * (0 = "FGT", 1 = "FGT+1") + this weapon's Effects bonus.
 * Ranged: this weapon's own dice count (1-4) + ability ranged-ATK bonuses +
 * this weapon's Effects bonus. FGT never applies to ranged weapons.
 */
export function weaponAtkDiceCount(
  sheet: CharacterSheet,
  weapon: Weapon,
  bonuses: ComputedBonuses = computeBonuses(sheet)
): number {
  const count =
    weapon.kind === "melee"
      ? sheet.fgt + bonuses.meleeAtkBonus + weapon.baseDice + weapon.atkBonus
      : weapon.baseDice + bonuses.rangedAtkBonus + weapon.atkBonus;
  return Math.max(1, count);
}

/** The effective attribute value a weapon's HIT roll is tested against (before any situational modifier). */
export function weaponHitTarget(
  sheet: CharacterSheet,
  weapon: Weapon,
  bonuses: ComputedBonuses = computeBonuses(sheet)
): number {
  if (!weapon.hit) return 0;
  const key = weapon.hit.toLowerCase() as keyof CharacterSheet;
  const base = Number(sheet[key]) || 0;
  const abilityBonus = weapon.kind === "melee" ? bonuses.meleeHitBonus : bonuses.rangedHitBonus;
  return base + abilityBonus + weapon.hitBonus;
}

/** Effective SAV = base stat + ability bonuses (e.g. Wary, Master Crafted). */
export function effectiveSav(
  sheet: CharacterSheet,
  bonuses: ComputedBonuses = computeBonuses(sheet)
): number {
  return sheet.sav + bonuses.savBonus;
}

/**
 * Parses a weapon's DMG field, which accepts either a flat number ("5") or
 * an attribute-based formula ("STR+2", "AGL-1", or just "STR"). Pulls the
 * first number and first attribute code found anywhere in the string, so
 * either order works.
 */
export function parseDamageFormula(text: string): { base: number; attribute: TestAttribute | null } {
  const cleaned = (text || "").toUpperCase();
  const attrMatch = cleaned.match(/\b(STR|AGL|TGH|INT|WIL|PRS)\b/);
  const numMatch = cleaned.match(/-?\d+/);
  return {
    base: numMatch ? parseInt(numMatch[0], 10) : 0,
    attribute: attrMatch ? (attrMatch[1] as TestAttribute) : null,
  };
}

/** The effective target number a weapon's DMG roll is tested against. */
export function weaponDamageTarget(
  sheet: CharacterSheet,
  weapon: Weapon,
  bonuses: ComputedBonuses = computeBonuses(sheet)
): number {
  const { base, attribute } = parseDamageFormula(weapon.dmg);
  const attrValue = attribute ? Number(sheet[attribute.toLowerCase() as keyof CharacterSheet]) || 0 : 0;
  return base + attrValue + bonuses.dmgBonus + weapon.dmgBonus;
}

// ---- Situational (one-roll-only, never saved) HIT modifiers ----

export interface SituationalModifier {
  label: string;
  delta: number;
}

export const SHOOT_MODIFIERS: SituationalModifier[] = [
  { label: "Cover or Smoke", delta: -1 },
  { label: "Target Down", delta: -1 },
  { label: "Aim", delta: 1 },
  { label: "Laser Sight", delta: 1 },
  { label: "Large Target", delta: 1 },
];

export const FIGHT_MODIFIERS: SituationalModifier[] = [
  { label: "Cover or Smoke", delta: -1 },
  { label: "2+ Enemies", delta: -1 },
  { label: "Target Down", delta: 1 },
  { label: "Charge", delta: 1 },
  { label: "Large Target", delta: 1 },
];

export function modifiersForKind(kind: WeaponKind): SituationalModifier[] {
  return kind === "melee" ? FIGHT_MODIFIERS : SHOOT_MODIFIERS;
}

export interface AttackDie {
  value: number;
  outcome: "hit" | "crit-hit" | "fail" | "crit-fail";
}

export interface AttackResult {
  dice: AttackDie[];
  target: number;
  hits: number; // count of "hit" + "crit-hit" dice - each is a separate HIT to resolve
  crits: number;
}

/**
 * Attack roll: gather N D10s (the weapon's ATK pool) and roll each against
 * the HIT target. Every die that succeeds is a separate HIT (unlike a
 * standard Test, where extra dice just pick the best result). 0 is always a
 * Critical Fail. 1 is a Critical Hit by default, or up to `critThreshold`
 * with abilities like Scalpel ("critical hit on a 1 or 2"). If
 * `rerollCritFailOnce` is set (e.g. Trained, ranged only), any die that
 * rolls a 0 is rerolled a single time.
 */
export function rollAttack(
  numDice: number,
  target: number,
  critThreshold = 1,
  rerollCritFailOnce = false
): AttackResult {
  const classify = (value: number): AttackDie => {
    let outcome: AttackDie["outcome"];
    if (value === 0) outcome = "crit-fail";
    else if (value <= critThreshold) outcome = "crit-hit";
    else if (value <= target) outcome = "hit";
    else outcome = "fail";
    return { value, outcome };
  };

  let dice: AttackDie[] = Array.from({ length: Math.max(1, numDice) }, () => classify(rollD10()));

  if (rerollCritFailOnce) {
    dice = dice.map((d) => (d.outcome === "crit-fail" ? classify(rollD10()) : d));
  }

  const hits = dice.filter((d) => d.outcome === "hit" || d.outcome === "crit-hit").length;
  const crits = dice.filter((d) => d.outcome === "crit-hit").length;

  return { dice, target, hits, crits };
}

/**
 * How many DMG dice a given number of HITs produces. Normally 1 die per HIT;
 * a weapon with extraDmgDicePerHit (e.g. Gnawing: "roll 2 extra DMG dice" per
 * HIT) adds that many additional dice for every HIT that landed.
 */
export function weaponDamageDiceCount(hits: number, weapon: Weapon): number {
  return Math.max(0, hits) * (1 + (weapon.extraDmgDicePerHit || 0));
}

export interface DamageDie {
  value: number;
  success: boolean;
}

export interface DamageResult {
  dice: DamageDie[];
  target: number;
  successes: number;
}

/**
 * Damage roll: one D10 per successful HIT, equal/under the DMG target
 * succeeds. Unlike HIT, there's no critical success/fail on DMG rolls.
 */
export function rollDamage(numDice: number, target: number): DamageResult {
  const dice: DamageDie[] = Array.from({ length: Math.max(0, numDice) }, () => {
    const value = rollD10();
    return { value, success: value <= target };
  });
  return { dice, target, successes: dice.filter((d) => d.success).length };
}
