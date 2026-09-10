/**
 * Floor math + Step 2 routing. Pure module.
 * Rebuild still does fire triage + floor-first; the board is not gated on a funded floor.
 */
import { monthYearLabel, resolveMoney } from "./model.js";

export const DEBT_HEAT_IDS = ["none", "paying", "heavy", "fdw"];

export const DEBT_SERVICE_RATE = 0.03;
export const HEAVY_DEBT_SERVICE_RATE = 0.05;

export const BONE_MARKS = [1, 3, 6];

export function isDebtHeat(id) {
  return DEBT_HEAT_IDS.includes(id);
}

export function needsFireCard(heat) {
  return heat === "heavy" || heat === "fdw";
}

export function prefersSunday(heat) {
  return heat === "fdw";
}

/** Right Door first for banked heat; Sunday Pack first for FDW stress. */
export function fireLinkOrder(heat) {
  if (!needsFireCard(heat)) return [];
  return prefersSunday(heat) ? ["sunday", "right-door"] : ["right-door", "sunday"];
}

export function debtServiceMonthly(money, heat) {
  const debts = Number(money?.debts) || 0;
  if (debts <= 0) return 0;
  const rate = heat === "heavy" ? HEAVY_DEBT_SERVICE_RATE : DEBT_SERVICE_RATE;
  return Math.round(debts * rate);
}

export function monthlySurplus(money, heat) {
  if (money?.leftoverMonthly != null && Number.isFinite(Number(money.leftoverMonthly))) {
    return Math.round(Number(money.leftoverMonthly));
  }
  const income = Number(money?.incomeMonthly) || 0;
  const spend = Number(money?.spendMonthly) || 0;
  return Math.round(income - spend - debtServiceMonthly(money, heat));
}

export function fundTargetHkd({ spendMonthly, targetMonths, floorHkd }) {
  const fromMonths = Math.max(0, Number(targetMonths) || 0) * Math.max(0, Number(spendMonthly) || 0);
  return Math.max(fromMonths, Math.max(0, Number(floorHkd) || 0));
}

export function monthsFunded(savings, spendMonthly) {
  const spend = Number(spendMonthly) || 0;
  const cash = Math.max(0, Number(savings) || 0);
  if (spend <= 0) return cash > 0 ? 6 : 0;
  return cash / spend;
}

export function boneProgress(fundedMonths) {
  const n = Number(fundedMonths) || 0;
  return BONE_MARKS.map((mark) => ({ mark, hit: n + 1e-9 >= mark }));
}

export function projectReachDate(surplus, savings, need, from = new Date()) {
  if (!(Number(need) > 0)) {
    return { kind: "no-target", months: null, label: null };
  }
  const cash = Math.max(0, Number(savings) || 0);
  if (cash + 1e-9 >= need) {
    return { kind: "ready", months: 0, label: monthYearLabel(0, from) };
  }
  const flow = Number(surplus) || 0;
  if (flow <= 0) {
    return { kind: "stuck", months: null, label: null };
  }
  const months = Math.max(1, Math.ceil((need - cash) / flow));
  return { kind: "date", months, label: monthYearLabel(months, from) };
}

export function stabilizeTargetMonths(plan) {
  const n = Number(plan?.stabilizeTargetMonths);
  return n === 3 ? 3 : 6;
}

export function stabilizeSnapshot(plan, from = new Date()) {
  const money = resolveMoney(plan?.money || {});
  const heat = isDebtHeat(plan?.debtHeat) ? plan.debtHeat : "none";
  const targetMonths = stabilizeTargetMonths(plan);
  const floorHkd = Math.max(0, Number(plan?.net?.floorHkd) || 0);
  const need = fundTargetHkd({
    spendMonthly: money.spendMonthly,
    targetMonths,
    floorHkd,
  });
  const surplus = monthlySurplus(money, heat);
  const funded = monthsFunded(money.savings, money.spendMonthly);
  const reach = projectReachDate(surplus, money.savings, need, from);
  const ready = need > 0 && money.savings + 1e-9 >= need;
  return {
    money,
    heat,
    targetMonths,
    floorHkd,
    need,
    surplus,
    debtService: debtServiceMonthly(money, heat),
    fundedMonths: funded,
    bones: boneProgress(funded),
    reach,
    ready,
  };
}

export function isBoardUnlocked(plan) {
  return !!(plan?.boardReached || plan?.phase2Unlocked || plan?.phase2Override);
}

/** @deprecated Use isBoardUnlocked — kept so older tests/callers still compile. */
export function isPhase2Unlocked(plan) {
  return isBoardUnlocked(plan);
}

export function canUnlockPhase2(plan) {
  if (isBoardUnlocked(plan)) return true;
  return stabilizeSnapshot(plan).ready;
}

const STEP1 = new Set(["where", "theme"]);
const STEP2 = new Set(["next", "triage", "stabilize"]);
const HOME = new Set(["board", "goal-edit", "net-edit", "compare", "sheet", "more", "adjust", "money"]);

export function canonicalScreen(name) {
  if (name === "theme") return "where";
  if (name === "triage" || name === "stabilize" || name === "money") return "next";
  return name;
}

export function nextAfterStart(plan) {
  if (isBoardUnlocked(plan) && plan?.theme) return "board";
  if (plan?.theme) return "next";
  return "where";
}

export function gateFortuneScreen(name, plan) {
  if (!name || name === "start" || name === "counters") return name;
  if (!plan?.privacyAccepted) return "start";
  const screen = canonicalScreen(name);
  if (STEP1.has(name) || screen === "where") return "where";
  if (!plan?.theme) return "where";
  if (STEP2.has(name) || screen === "next") return "next";
  if (HOME.has(screen)) {
    if (!isBoardUnlocked(plan)) return "next";
    return screen;
  }
  return nextAfterStart(plan);
}
