import { describe, expect, it } from "vitest";
import {
  compareSaveBorrow,
  compareTemplateVsCash,
  killTestInput,
  runMonteCarlo,
  verdictOf,
} from "./engine.js";
import { CASH_BENCHMARK, TEMPLATES } from "./templates.js";

describe("Fortune Teller Monte Carlo", () => {
  it("hard-fails the absurd kill-test: 0 income, 0 savings, HK$15M house", () => {
    const forecast = runMonteCarlo(killTestInput(), { paths: 400, seed: 1 });
    expect(forecast.livingPct).toBeLessThan(5);
    expect(forecast.netPct).toBeLessThan(5);
    expect(forecast.hardFail).toBe(true);
    expect(forecast.verdict).toBe("wrecked");
    expect(forecast.youAreSet).toBe(false);
    expect(forecast.milestonePct[0]).toBeLessThan(5);
  });

  it("never reports a green you're-set flag, even on a comfortable plan", () => {
    const forecast = runMonteCarlo(
      {
        money: { incomeMonthly: 80000, spendMonthly: 30000, savings: 900000, debts: 0 },
        milestones: [{ id: "trip", name: "Trip", amount: 40000, months: 8 }],
        net: { emergencyMonths: 6, floorHkd: 180000 },
        templateId: "steady",
        inflationOn: true,
        seed: 7,
      },
      { paths: 300, seed: 7 },
    );
    expect(forecast.youAreSet).toBe(false);
    expect(forecast.livingPct).toBeGreaterThan(80);
    expect(forecast.netPct).toBeGreaterThan(80);
    expect(forecast.verdict).toBe("shared");
    expect(forecast.hardFail).toBe(false);
  });

  it("funds a small living goal when surplus and savings are enough", () => {
    const forecast = runMonteCarlo(
      {
        money: { incomeMonthly: 50000, spendMonthly: 20000, savings: 500000, debts: 0 },
        milestones: [{ id: "car", name: "Car", amount: 80000, months: 6 }],
        net: { emergencyMonths: 3, floorHkd: 60000 },
        templateId: "steady",
        inflationOn: false,
        seed: 3,
      },
      { paths: 250, seed: 3, inflation: 0 },
    );
    expect(forecast.livingPct).toBeGreaterThan(90);
    expect(forecast.milestonePct[0]).toBeGreaterThan(90);
    expect(forecast.netPct).toBeGreaterThan(80);
  });

  it("dragging a tight goal earlier lowers the Living dial", () => {
    const money = { incomeMonthly: 28000, spendMonthly: 24000, savings: 90000, debts: 0 };
    const net = { emergencyMonths: 4, floorHkd: 80000 };
    const late = runMonteCarlo(
      {
        money,
        milestones: [{ id: "car", name: "Car", amount: 220000, months: 48 }],
        net,
        templateId: "balanced",
        inflationOn: false,
        seed: 11,
      },
      { paths: 500, seed: 11, inflation: 0 },
    );
    const early = runMonteCarlo(
      {
        money,
        milestones: [{ id: "car", name: "Car", amount: 220000, months: 8 }],
        net,
        templateId: "balanced",
        inflationOn: false,
        seed: 11,
      },
      { paths: 500, seed: 11, inflation: 0 },
    );
    expect(early.livingPct).toBeLessThan(late.livingPct);
    expect(late.livingPct - early.livingPct).toBeGreaterThan(15);
  });

  it("pulling a large living goal forward can hurt the Net dial", () => {
    const base = {
      money: { incomeMonthly: 45000, spendMonthly: 30000, savings: 280000, debts: 0 },
      net: { emergencyMonths: 8, floorHkd: 240000 },
      templateId: "steady",
      inflationOn: false,
      seed: 21,
    };
    const later = runMonteCarlo(
      { ...base, milestones: [{ id: "wed", name: "Wedding", amount: 220000, months: 36 }] },
      { paths: 400, seed: 21, inflation: 0 },
    );
    const sooner = runMonteCarlo(
      { ...base, milestones: [{ id: "wed", name: "Wedding", amount: 220000, months: 6 }] },
      { paths: 400, seed: 21, inflation: 0 },
    );
    expect(sooner.netPct).toBeLessThanOrEqual(later.netPct);
  });

  it("templates change the projection: higher μ raises median terminal wealth", () => {
    const plan = {
      money: { incomeMonthly: 40000, spendMonthly: 20000, savings: 200000, debts: 0 },
      milestones: [{ id: "trip", name: "Trip", amount: 30000, months: 12 }],
      net: { emergencyMonths: 4, floorHkd: 80000 },
      inflationOn: false,
      seed: 5,
    };
    const steady = runMonteCarlo(plan, { paths: 600, seed: 5, template: TEMPLATES.steady, inflation: 0 });
    const frontier = runMonteCarlo(plan, { paths: 600, seed: 5, template: TEMPLATES.frontier, inflation: 0 });
    expect(frontier.medianWealth).toBeGreaterThan(steady.medianWealth);
    expect(frontier.mu).toBeGreaterThan(steady.mu);
  });

  it("seeded runs are deterministic", () => {
    const plan = {
      money: { incomeMonthly: 30000, spendMonthly: 18000, savings: 120000, debts: 0 },
      milestones: [{ id: "x", name: "X", amount: 40000, months: 10 }],
      net: { emergencyMonths: 3, floorHkd: 50000 },
      templateId: "balanced",
      seed: 99,
    };
    const a = runMonteCarlo(plan, { paths: 200, seed: 99 });
    const b = runMonteCarlo(plan, { paths: 200, seed: 99 });
    expect(a.livingPct).toBe(b.livingPct);
    expect(a.netPct).toBe(b.netPct);
    expect(a.medianWealth).toBe(b.medianWealth);
  });

  it("save-vs-borrow: borrowing can lift that milestone and charge the net", () => {
    const plan = {
      money: { incomeMonthly: 32000, spendMonthly: 26000, savings: 40000, debts: 0 },
      milestones: [{ id: "car", name: "Car", amount: 180000, months: 10 }],
      net: { emergencyMonths: 6, floorHkd: 150000 },
      templateId: "steady",
      inflationOn: false,
      seed: 4,
    };
    const cmp = compareSaveBorrow(plan, "car", { paths: 350, seed: 4, inflation: 0 });
    expect(cmp.livingBorrow).toBeGreaterThan(cmp.livingSave);
    expect(cmp.livingBorrow).toBe(100);
    expect(cmp.netBorrow).toBeLessThanOrEqual(cmp.netSave);
    expect(cmp.typicalGap).toBeGreaterThan(0);
  });

  it("compound vs cash: the chosen template beats a cash-like path on median wealth", () => {
    const plan = {
      money: { incomeMonthly: 35000, spendMonthly: 20000, savings: 300000, debts: 0 },
      milestones: [],
      net: { emergencyMonths: 6, floorHkd: 120000 },
      templateId: "growth",
      inflationOn: false,
      seed: 8,
    };
    const { chosen, cash } = compareTemplateVsCash(plan, { paths: 400, seed: 8, inflation: 0 });
    expect(chosen.medianWealth).toBeGreaterThan(cash.medianWealth);
    expect(cash.mu).toBe(CASH_BENCHMARK.mu);
  });

  it("maps low dials to wrecked and never to a you're-set verdict", () => {
    expect(verdictOf(0, 0)).toBe("wrecked");
    expect(verdictOf(80, 80)).toBe("shared");
    expect(verdictOf(70, 20)).toBe("wrecked");
    expect(["wrecked", "stretched", "living_heavy", "net_heavy", "shared"]).toContain(verdictOf(60, 60));
  });
});
