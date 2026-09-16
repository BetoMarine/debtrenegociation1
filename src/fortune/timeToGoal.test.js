import { describe, expect, it } from "vitest";
import { CASH_BENCHMARK, TEMPLATES } from "./templates.js";
import { timeToGoal } from "./timeToGoal.js";

/** Independent FV check so tests do not mirror the helper's closed form. */
function fv(principal, monthlySave, mu, months) {
  const r = mu > 0 ? mu / 12 : 0;
  if (months <= 0) return principal;
  if (r <= 0) return principal + monthlySave * months;
  const growth = (1 + r) ** months;
  return principal * growth + (monthlySave * (growth - 1)) / r;
}

function firstMonthAtOrAbove({ goal, principal, monthlySave, mu, maxMonths = 1200 }) {
  if (principal >= goal) return 0;
  for (let n = 1; n <= maxMonths; n += 1) {
    if (fv(principal, monthlySave, mu, n) >= goal) return n;
  }
  return null;
}

describe("timeToGoal", () => {
  it("already funded: principal at or above goal is 0 months on both legs", () => {
    const hit = timeToGoal(CASH_BENCHMARK.mu, TEMPLATES.balanced.mu, {
      goal: 80000,
      principal: 80000,
      monthlySave: 2000,
    });
    expect(hit).toEqual({
      monthsCash: 0,
      monthsInvest: 0,
      monthsSooner: 0,
      yearsSooner: 0,
    });

    const over = timeToGoal(0.012, 0.2, { goal: 50000, principal: 60000 });
    expect(over.monthsCash).toBe(0);
    expect(over.monthsInvest).toBe(0);
    expect(over.monthsSooner).toBe(0);
    expect(over.yearsSooner).toBe(0);
  });

  it("cash vs invest: shelf μ reaches the goal sooner", () => {
    const opts = { goal: 100000, principal: 20000, monthlySave: 2000 };
    const cashMu = CASH_BENCHMARK.mu;
    const investMu = TEMPLATES.balanced.mu;
    const got = timeToGoal(cashMu, investMu, opts);

    const expectCash = firstMonthAtOrAbove({ ...opts, mu: cashMu });
    const expectInvest = firstMonthAtOrAbove({ ...opts, mu: investMu });
    expect(got.monthsCash).toBe(expectCash);
    expect(got.monthsInvest).toBe(expectInvest);
    expect(got.monthsInvest).toBeLessThan(got.monthsCash);
    expect(got.monthsSooner).toBe(got.monthsCash - got.monthsInvest);
    expect(got.yearsSooner).toBe(got.monthsSooner / 12);

    expect(fv(opts.principal, opts.monthlySave, cashMu, got.monthsCash)).toBeGreaterThanOrEqual(opts.goal);
    expect(fv(opts.principal, opts.monthlySave, cashMu, got.monthsCash - 1)).toBeLessThan(opts.goal);
    expect(fv(opts.principal, opts.monthlySave, investMu, got.monthsInvest)).toBeGreaterThanOrEqual(opts.goal);
    expect(fv(opts.principal, opts.monthlySave, investMu, got.monthsInvest - 1)).toBeLessThan(opts.goal);
  });

  it("zero μ is linear save only — both legs match", () => {
    const opts = { goal: 12000, principal: 0, monthlySave: 1000 };
    const got = timeToGoal(0, -0.04, opts);
    expect(got.monthsCash).toBe(12);
    expect(got.monthsInvest).toBe(12);
    expect(got.monthsSooner).toBe(0);
    expect(got.yearsSooner).toBe(0);

    const leftover = timeToGoal(0, 0, { goal: 10001, principal: 0, monthlySave: 2500 });
    expect(leftover.monthsCash).toBe(5);
    expect(leftover.monthsInvest).toBe(5);
  });

  it("unreachable within maxMonths (or with no save and no growth) returns nulls", () => {
    const noSave = timeToGoal(0, 0, { goal: 100000, principal: 1000, monthlySave: 0 });
    expect(noSave).toEqual({
      monthsCash: null,
      monthsInvest: null,
      monthsSooner: null,
      yearsSooner: null,
    });

    const capped = timeToGoal(0.012, 0.15, {
      goal: 1_000_000,
      principal: 1000,
      monthlySave: 100,
      maxMonths: 12,
    });
    expect(capped.monthsCash).toBeNull();
    expect(capped.monthsInvest).toBeNull();
    expect(capped.monthsSooner).toBeNull();
    expect(capped.yearsSooner).toBeNull();

    const cashOnly = timeToGoal(0, 0.12, {
      goal: 100000,
      principal: 50000,
      monthlySave: 0,
      maxMonths: 80,
    });
    expect(cashOnly.monthsCash).toBeNull();
    expect(cashOnly.monthsInvest).toBe(70);
    expect(cashOnly.monthsSooner).toBeNull();
    expect(cashOnly.yearsSooner).toBeNull();
  });

  it("monthly save only: no principal, zero μ, ceil((goal)/S)", () => {
    const even = timeToGoal(0, 0, { goal: 10000, principal: 0, monthlySave: 2500 });
    expect(even.monthsCash).toBe(4);
    expect(even.monthsInvest).toBe(4);
    expect(even.monthsSooner).toBe(0);

    const withPot = timeToGoal(0, 0, { goal: 10000, principal: 2500, monthlySave: 2500 });
    expect(withPot.monthsCash).toBe(3);
    expect(fv(2500, 2500, 0, 3)).toBeGreaterThanOrEqual(10000);
    expect(fv(2500, 2500, 0, 2)).toBeLessThan(10000);
  });

  it("guards NaN and non-positive goal with all-nulls", () => {
    expect(timeToGoal(0.012, 0.15, { goal: 0, principal: 10, monthlySave: 10 })).toEqual({
      monthsCash: null,
      monthsInvest: null,
      monthsSooner: null,
      yearsSooner: null,
    });
    expect(timeToGoal(0.012, 0.15, { goal: -1, monthlySave: 100 })).toEqual({
      monthsCash: null,
      monthsInvest: null,
      monthsSooner: null,
      yearsSooner: null,
    });
    expect(timeToGoal(Number.NaN, 0.15, { goal: 1000, monthlySave: 100 })).toEqual({
      monthsCash: null,
      monthsInvest: null,
      monthsSooner: null,
      yearsSooner: null,
    });
    expect(timeToGoal(0.012, 0.15, { goal: Number.NaN })).toEqual({
      monthsCash: null,
      monthsInvest: null,
      monthsSooner: null,
      yearsSooner: null,
    });
  });
});
