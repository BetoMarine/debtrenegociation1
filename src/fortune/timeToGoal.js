/**
 * Projection-only. Not advice. Not custody.
 *
 * Time-to-goal under a cash μ vs an invest (shelf) μ so UI and crumbs share
 * one BOOST comparison: how many months sooner the goal is reached.
 */

const UNREACHABLE = {
  monthsCash: null,
  monthsInvest: null,
  monthsSooner: null,
  yearsSooner: null,
};

function finiteNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function monthlyRate(mu) {
  return mu > 0 ? mu / 12 : 0;
}

/** Ordinary annuity + grown principal. r ≤ 0 is linear save only. */
function futureValue(principal, monthlySave, monthlyRate, months) {
  if (months <= 0) return principal;
  if (monthlyRate <= 0) return principal + monthlySave * months;
  const growth = (1 + monthlyRate) ** months;
  return principal * growth + (monthlySave * (growth - 1)) / monthlyRate;
}

/**
 * Smallest integer months n such that FV(n) >= goal, or null if unreachable
 * within maxMonths. Already funded → 0.
 */
function monthsToGoal(mu, { goal, principal = 0, monthlySave = 0, maxMonths = 1200 } = {}) {
  if (principal >= goal) return 0;
  const r = monthlyRate(mu);
  const cap = Math.floor(maxMonths);
  if (cap < 0) return null;

  let n;
  if (r <= 0) {
    if (monthlySave <= 0) return null;
    n = Math.ceil((goal - principal) / monthlySave);
  } else {
    const denom = principal + monthlySave / r;
    if (denom <= 0) return null;
    const ratio = (goal + monthlySave / r) / denom;
    if (ratio <= 1) return 0;
    n = Math.ceil(Math.log(ratio) / Math.log(1 + r) - 1e-12);
  }

  if (!Number.isFinite(n) || n < 0) return null;
  n = Math.max(0, n);
  if (n > cap) n = cap;

  while (n > 0 && futureValue(principal, monthlySave, r, n - 1) >= goal) n -= 1;
  while (n <= cap && futureValue(principal, monthlySave, r, n) < goal) n += 1;
  if (n > cap || futureValue(principal, monthlySave, r, n) < goal) return null;
  return n;
}

/**
 * Projection-only. Not advice. Not custody.
 * @param {number} cashMu - annual e.g. 0.012
 * @param {number} investMu - annual e.g. card μ
 * @param {object} opts
 * @param {number} opts.goal - target amount G (>0)
 * @param {number} [opts.principal=0] - starting pot P
 * @param {number} [opts.monthlySave=0] - monthly contribution S (≥0)
 * @param {number} [opts.maxMonths=1200] - cap search
 * @returns {{ monthsCash: number|null, monthsInvest: number|null, monthsSooner: number|null, yearsSooner: number|null }}
 * null months = unreachable within maxMonths (or already at/above goal → 0 months)
 */
export function timeToGoal(cashMu, investMu, { goal, principal = 0, monthlySave = 0, maxMonths = 1200 } = {}) {
  const g = finiteNumber(goal);
  const p = finiteNumber(principal);
  const s = finiteNumber(monthlySave);
  const cap = finiteNumber(maxMonths);
  const cash = finiteNumber(cashMu);
  const invest = finiteNumber(investMu);
  if (g == null || g <= 0 || p == null || s == null || cap == null || cash == null || invest == null) {
    return { ...UNREACHABLE };
  }

  const args = {
    goal: g,
    principal: Math.max(0, p),
    monthlySave: Math.max(0, s),
    maxMonths: cap,
  };
  const monthsCash = monthsToGoal(cash, args);
  const monthsInvest = monthsToGoal(invest, args);
  const monthsSooner =
    monthsCash == null || monthsInvest == null ? null : monthsCash - monthsInvest;
  const yearsSooner = monthsSooner == null ? null : monthsSooner / 12;
  return { monthsCash, monthsInvest, monthsSooner, yearsSooner };
}
