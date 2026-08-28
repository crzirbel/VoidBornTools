import type { RollLogEntry } from "./types";
import type { RollTable } from "./data/tables";
import { lookup } from "./data/tables";

function rollDie(sides: number): number {
  // Sides here means "faces 0..sides-1" for D10/D100-style percentile dice,
  // matching the rulebook's convention (D10 rolls 0-9).
  return Math.floor(Math.random() * sides);
}

export function rollD10(): number {
  return rollDie(10);
}

/** Rolls a D100 as two D10s (tens, units), matching tabletop percentile convention. */
export function rollD100(): number {
  const tens = rollD10();
  const units = rollD10();
  const result = tens * 10 + units;
  return result === 100 ? 0 : result;
}

export interface TestResult {
  dice: number[];
  best: number;
  target: number;
  outcome: "success" | "fail" | "crit-success" | "crit-fail";
}

/**
 * Roll N D10s against a target attribute value (roll equal/under = success).
 * Per the rulebook: 0 is always a Critical Fail, 1 is always a Critical Hit
 * (success), regardless of the target number.
 */
export function rollTest(target: number, numDice = 1): TestResult {
  const dice = Array.from({ length: Math.max(1, numDice) }, () => rollD10());
  // "Best" = most favorable single die: crit success > success > fail > crit fail
  const scored = dice.map((d) => {
    if (d === 0) return { d, rank: 0 };
    if (d === 1) return { d, rank: 3 };
    if (d <= target) return { d, rank: 2 };
    return { d, rank: 1 };
  });
  scored.sort((a, b) => b.rank - a.rank);
  const best = scored[0].d;

  let outcome: TestResult["outcome"];
  if (best === 0) outcome = "crit-fail";
  else if (best === 1) outcome = "crit-success";
  else if (best <= target) outcome = "success";
  else outcome = "fail";

  return { dice, best, target, outcome };
}

export interface PoolResult {
  dice: number[];
  total: number;
}

/** Roll N dice of a given size and sum them (e.g. damage pools). */
export function rollPool(count: number, sides: number): PoolResult {
  const dice = Array.from({ length: Math.max(1, count) }, () => rollDie(sides) + 1); // 1..sides
  return { dice, total: dice.reduce((a, b) => a + b, 0) };
}

export interface TableRollResult {
  roll: number;
  name: string;
  desc: string;
}

export function rollOnTable(table: RollTable): TableRollResult {
  const roll = table.die === "D100" ? rollD100() : rollD10();
  const entry = lookup(table, roll);
  return { roll, name: entry.name, desc: entry.desc };
}

export type FreeDieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface FreeDieRoll {
  sides: FreeDieSize;
  value: number;
}

export interface FreeRollResult {
  rolls: FreeDieRoll[];
  total: number;
}

/** Standard 1..sides die, distinct from the rulebook's 0-based D10 test convention. */
function rollStandardDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Percentile d100 as two D10s (tens 0/10/../90 + units 0-9), OBR dice-tray style. 00+0 = 100. */
function rollPercentileDie(): number {
  const tens = rollDie(10) * 10;
  const units = rollDie(10);
  const result = tens + units;
  return result === 0 ? 100 : result;
}

/** Roll a free-form pool of standard dice (the simple roller on the Tables tab). */
export function rollFreeDice(sizes: FreeDieSize[]): FreeRollResult {
  const rolls = sizes.map((sides) => ({
    sides,
    value: sides === 100 ? rollPercentileDie() : rollStandardDie(sides),
  }));
  const total = rolls.reduce((sum, r) => sum + r.value, 0);
  return { rolls, total };
}

export function buildFreeRollLogEntry(playerName: string, result: FreeRollResult): RollLogEntry {
  const breakdown = result.rolls.map((r) => `d${r.sides}: ${r.value}`).join(", ");
  return {
    id: makeLogId(),
    playerName,
    label: "Dice Roll",
    dice: result.rolls.map((r) => r.value),
    outcome: "info",
    detail: `${breakdown} — Total: ${result.total}`,
    timestamp: Date.now(),
  };
}

let logCounter = 0;
export function makeLogId(): string {
  logCounter += 1;
  return `${Date.now()}-${logCounter}`;
}

export function buildTestLogEntry(
  playerName: string,
  label: string,
  result: TestResult
): RollLogEntry {
  return {
    id: makeLogId(),
    playerName,
    label,
    dice: result.dice,
    target: result.target,
    outcome: result.outcome,
    timestamp: Date.now(),
  };
}

export function buildTableLogEntry(
  playerName: string,
  table: RollTable,
  result: TableRollResult
): RollLogEntry {
  return {
    id: makeLogId(),
    playerName,
    label: table.label,
    dice: [result.roll],
    outcome: "info",
    detail: `${result.name} — ${result.desc}`,
    timestamp: Date.now(),
  };
}

export function buildAttackLogEntry(
  playerName: string,
  label: string,
  result: import("./combat").AttackResult
): RollLogEntry {
  let outcome: RollLogEntry["outcome"];
  const anyCritFail = result.dice.some((d) => d.outcome === "crit-fail");
  if (result.hits === 0 && anyCritFail) outcome = "crit-fail";
  else if (result.crits > 0) outcome = "crit-success";
  else if (result.hits > 0) outcome = "success";
  else outcome = "fail";

  const hitWord = result.hits === 1 ? "hit" : "hits";
  const critNote = result.crits > 0 ? ` (${result.crits} critical)` : "";

  return {
    id: makeLogId(),
    playerName,
    label,
    dice: result.dice.map((d) => d.value),
    target: result.target,
    outcome,
    detail: `${result.hits} ${hitWord}${critNote}`,
    timestamp: Date.now(),
  };
}

export interface ChargeResult {
  die: number; // 1-10, standard physical d10
  bonus: number; // floor(die / 2)
  mov: number;
  total: number; // mov + bonus
}

/** Charge move: MOV + floor(d10 / 2), rolled on a standard 1-10 die. */
export function rollCharge(mov: number): ChargeResult {
  const die = rollStandardDie(10);
  const bonus = Math.floor(die / 2);
  return { die, bonus, mov, total: mov + bonus };
}

export function buildChargeLogEntry(playerName: string, result: ChargeResult): RollLogEntry {
  return {
    id: makeLogId(),
    playerName,
    label: "Charge",
    dice: [result.die],
    outcome: "info",
    detail: `d10: ${result.die} → +${result.bonus} move (MOV ${result.mov} + ${result.bonus} = ${result.total}")`,
    timestamp: Date.now(),
  };
}

export function buildLuckLogEntry(playerName: string, pass: boolean): RollLogEntry {
  return {
    id: makeLogId(),
    playerName,
    label: "Luck Coin",
    dice: [],
    outcome: pass ? "success" : "fail",
    detail: pass ? "Heads — Pass" : "Tails — Fail",
    timestamp: Date.now(),
  };
}
export function buildDamageLogEntry(
  playerName: string,
  label: string,
  result: import("./combat").DamageResult
): RollLogEntry {
  const woundWord = result.successes === 1 ? "wound" : "wounds";
  return {
    id: makeLogId(),
    playerName,
    label,
    dice: result.dice.map((d) => d.value),
    target: result.target,
    outcome: result.successes > 0 ? "success" : "fail",
    detail: `${result.successes} ${woundWord}`,
    timestamp: Date.now(),
  };
}
