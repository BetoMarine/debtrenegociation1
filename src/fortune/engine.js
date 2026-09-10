/**
 * Owned client-side Monte Carlo for Fortune Teller.
 *
 * Browser-first so GitHub Pages needs no server secrets. A later backend can
 * accept the same PlanInput and return the same Forecast via POST /simulate —
 * swap the body of `runForecast` in simulate.js without changing the UI.
 *
 * Not Envizage. Not a product sale. Illustrative paths only.
 */

import { CASH_BENCHMARK, getTemplate } from "./templates.js";

export const DEFAULT_PATHS = 1000;
export const DEFAULT_INFLATION = 0.045;
export const DEFAULT_SEED = 20260909;
export const MAX_HORIZON = 240;
export const DEFAULT_BORROW_APR = 0.065;
export const DEFAULT_BORROW_MONTHS = 36;

export const VERDICTS = ["wrecked", "stretched", "living_heavy", "net_heavy", "shared"];

export function mulberry32(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rng) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function resolveHorizon(plan) {
  const miles = (plan.milestones || []).map((m) => Math.max(1, Math.round(Number(m.months) || 1)));
  const last = miles.length ? Math.max(...miles) : 36;
  const netMonths = Math.max(0, Number(plan.net?.emergencyMonths) || 0);
  return Math.min(MAX_HORIZON, Math.max(36, last + 12, netMonths + 12));
}

export function inflate(amount, month, inflationOn, annual) {
  if (!inflationOn || !annual) return amount;
  return amount * (1 + annual / 12) ** month;
}

export function netTargetAt(plan, month, inflationOn, annual) {
  const spend = Math.max(0, Number(plan.money?.spendMonthly) || 0);
  const months = Math.max(0, Number(plan.net?.emergencyMonths) || 0);
  const floor = Math.max(0, Number(plan.net?.floorHkd) || 0);
  const nominal = Math.max(floor, months * spend);
  return inflate(nominal, month, inflationOn, annual);
}

export function monthlyDebtService(debts) {
  const bal = Math.max(0, Number(debts) || 0);
  if (bal <= 0) return 0;
  return Math.min(bal, Math.max(800, bal * 0.02));
}

export function verdictOf(livingPct, netPct) {
  if (livingPct <= 20 || netPct <= 20) return "wrecked";
  if (livingPct >= 70 && netPct >= 70) return "shared";
  if (livingPct >= 55 && netPct < 45) return "living_heavy";
  if (netPct >= 55 && livingPct < 45) return "net_heavy";
  return "stretched";
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

export function killTestInput() {
  return {
    theme: "grow",
    money: {
      incomeMonthly: 0,
      spendMonthly: 25000,
      savings: 0,
      debts: 0,
    },
    milestones: [{ id: "house", name: "New house", amount: 15_000_000, months: 24 }],
    net: { emergencyMonths: 6, floorHkd: 300000 },
    templateId: "growth",
    inflationOn: true,
    seed: 1,
  };
}

function isAbsurdUnfunded(plan) {
  const livingSum = (plan.milestones || []).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const income = Number(plan.money?.incomeMonthly) || 0;
  const savings = Number(plan.money?.savings) || 0;
  return income <= 0 && savings <= 0 && livingSum >= 15_000_000;
}

/**
 * @param {object} plan  resolved PlanInput (numeric money, months from now)
 * @param {object} [options]
 * @param {number} [options.paths]
 * @param {number} [options.seed]
 * @param {object} [options.template]  override μ/σ
 * @param {number} [options.inflation]
 * @param {string} [options.borrowMilestoneId]  force-fund this goal with a loan if short
 * @param {number} [options.borrowApr]
 * @param {number} [options.borrowMonths]
 * @returns {object} Forecast
 */
export function runMonteCarlo(plan, options = {}) {
  const paths = Math.max(80, Math.min(Number(options.paths) || DEFAULT_PATHS, 2500));
  const seed = options.seed ?? plan.seed ?? DEFAULT_SEED;
  const rng = mulberry32(seed);
  const template = options.template || getTemplate(plan.templateId);
  const muM = (template.mu || 0) / 12;
  const sigM = (template.sigma || 0) / Math.sqrt(12);
  const inflationOn = plan.inflationOn !== false && options.inflation !== 0;
  const inf = options.inflation == null ? DEFAULT_INFLATION : Number(options.inflation);
  const horizon = Math.min(MAX_HORIZON, Number(options.horizon) || resolveHorizon(plan));

  const income = Math.max(0, Number(plan.money?.incomeMonthly) || 0);
  const spend = Math.max(0, Number(plan.money?.spendMonthly) || 0);
  const savings = Math.max(0, Number(plan.money?.savings) || 0);
  const debts = Math.max(0, Number(plan.money?.debts) || 0);
  const debtService = monthlyDebtService(debts);

  const borrowId = options.borrowMilestoneId || null;
  const borrowApr = options.borrowApr ?? DEFAULT_BORROW_APR;
  const borrowTenor = options.borrowMonths ?? DEFAULT_BORROW_MONTHS;
  const borrowPmtFactor =
    borrowApr <= 0
      ? 1 / borrowTenor
      : (borrowApr / 12) / (1 - (1 + borrowApr / 12) ** -borrowTenor);

  const milestones = (plan.milestones || []).map((m, index) => ({
    index,
    id: m.id || `m${index}`,
    name: m.name || "Goal",
    amount: Math.max(0, Number(m.amount) || 0),
    months: Math.max(1, Math.min(horizon, Math.round(Number(m.months) || 1))),
  }));
  const order = milestones.map((_, i) => i).sort((a, b) => milestones[a].months - milestones[b].months || a - b);

  const livingHits = new Array(milestones.length).fill(0);
  const shortfalls = new Array(milestones.length).fill(0).map(() => []);
  let netHits = 0;
  const terminals = [];
  let livingPathSum = 0;
  let borrowInterestSum = 0;
  let borrowInterestN = 0;

  for (let p = 0; p < paths; p++) {
    let pot = savings;
    let loanBal = 0;
    let loanLeft = 0;
    let loanPmt = 0;
    let pathInterest = 0;
    const funded = new Array(milestones.length).fill(false);
    let next = 0;

    for (let t = 1; t <= horizon; t++) {
      let pmt = 0;
      if (loanBal > 0 && loanLeft > 0) {
        pmt = Math.min(loanBal, loanPmt);
        const interest = loanBal * (borrowApr / 12);
        pathInterest += Math.min(interest, pmt);
        loanBal = Math.max(0, loanBal + interest - pmt);
        loanLeft -= 1;
        if (loanLeft <= 0) loanBal = 0;
      }

      pot += income - spend - debtService - pmt;
      if (pot > 0) {
        const r = muM + sigM * gaussian(rng);
        pot *= 1 + r;
      }

      while (next < order.length && milestones[order[next]].months === t) {
        const i = order[next];
        const mile = milestones[i];
        const due = inflate(mile.amount, t, inflationOn, inf);
        const gap = Math.max(0, due - pot);
        shortfalls[i].push(gap);

        if (borrowId && mile.id === borrowId) {
          funded[i] = true;
          if (pot >= due) {
            pot -= due;
          } else {
            loanBal += gap;
            loanLeft = borrowTenor;
            loanPmt = loanBal * borrowPmtFactor;
            pot = 0;
          }
        } else if (pot >= due && due > 0) {
          pot -= due;
          funded[i] = true;
        } else if (due === 0) {
          funded[i] = true;
        }
        next += 1;
      }
    }

    const need = netTargetAt(plan, horizon, inflationOn, inf);
    if (pot >= need) netHits += 1;
    terminals.push(pot);
    const hits = funded.filter(Boolean).length;
    livingPathSum += milestones.length ? hits / milestones.length : 1;
    funded.forEach((ok, i) => {
      if (ok) livingHits[i] += 1;
    });
    if (borrowId) {
      borrowInterestSum += pathInterest;
      borrowInterestN += 1;
    }
  }

  const livingPct = milestones.length ? (100 * livingPathSum) / paths : 100;
  const netPct = (100 * netHits) / paths;
  const milestonePct = milestones.map((_, i) => (100 * livingHits[i]) / paths);
  const verdict = verdictOf(livingPct, netPct);
  const absurd = isAbsurdUnfunded(plan);
  const hardFail = verdict === "wrecked" || absurd || (livingPct < 15 && netPct < 15);

  return {
    livingPct: round1(livingPct),
    netPct: round1(netPct),
    milestonePct: milestonePct.map(round1),
    verdict,
    hardFail,
    youAreSet: false,
    medianWealth: Math.round(median(terminals)),
    p10Wealth: Math.round(percentile(terminals, 0.1)),
    p90Wealth: Math.round(percentile(terminals, 0.9)),
    horizonMonths: horizon,
    paths,
    seed,
    templateId: template.id,
    mu: template.mu,
    sigma: template.sigma,
    medianShortfall: milestones.map((_, i) => Math.round(median(shortfalls[i]))),
    meanBorrowInterest: borrowInterestN ? Math.round(borrowInterestSum / borrowInterestN) : 0,
    inflationOn,
    inflation: inf,
    runAt: Date.now(),
  };
}

export function compareSaveBorrow(plan, milestoneId, options = {}) {
  const save = runMonteCarlo(plan, { ...options, borrowMilestoneId: null });
  const borrow = runMonteCarlo(plan, { ...options, borrowMilestoneId: milestoneId });
  const idx = (plan.milestones || []).findIndex((m) => m.id === milestoneId);
  return {
    milestoneId,
    save,
    borrow,
    extraInterest: borrow.meanBorrowInterest,
    typicalGap: idx >= 0 ? save.medianShortfall[idx] : 0,
    livingSave: idx >= 0 ? save.milestonePct[idx] : save.livingPct,
    livingBorrow: idx >= 0 ? borrow.milestonePct[idx] : borrow.livingPct,
    netSave: save.netPct,
    netBorrow: borrow.netPct,
  };
}

export function compareTemplateVsCash(plan, options = {}) {
  const chosen = runMonteCarlo(plan, options);
  const cash = runMonteCarlo(plan, { ...options, template: CASH_BENCHMARK });
  return { chosen, cash };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
