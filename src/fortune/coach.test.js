import { describe, expect, it } from "vitest";
import {
  applyCoachAction,
  breakingMilestones,
  coachActions,
  coachCrumb,
  isEmptyPot,
  shouldShowCoach,
} from "./coach.js";
import { killTestInput, runMonteCarlo } from "./engine.js";
import { newFortunePlan } from "./model.js";

describe("Rebuild coach", () => {
  it("still hard-fails the kill-test with no you're-set flag", () => {
    const forecast = runMonteCarlo(killTestInput(), { paths: 400, seed: 1 });
    expect(forecast.hardFail).toBe(true);
    expect(forecast.verdict).toBe("wrecked");
    expect(forecast.youAreSet).toBe(false);
    expect(forecast.livingPct).toBeLessThan(5);
    expect(shouldShowCoach(forecast)).toBe(true);
  });

  it("on the kill-test, shows coach with money-first plus delay and cut", () => {
    const plan = {
      ...newFortunePlan(),
      ...killTestInput(),
      money: {
        incomeBand: "0",
        spendBand: "20_35",
        savingsBand: "0",
        debtsBand: "0",
        incomeMonthly: 0,
        savings: 0,
        spendMonthly: 25000,
        debts: 0,
      },
      milestones: [{ id: "house", name: "New house", amount: 15_000_000, months: 24 }],
    };
    const forecast = runMonteCarlo(killTestInput(), { paths: 200, seed: 1 });
    expect(isEmptyPot(plan)).toBe(true);
    const actions = coachActions(plan, forecast);
    expect(actions[0].id).toBe("edit-money");
    expect(actions[0].kind).toBe("primary");
    expect(actions.some((a) => a.id === "delay")).toBe(true);
    expect(actions.some((a) => a.id === "cut")).toBe(true);
    expect(actions.find((a) => a.id === "delay").label).toMatch(/New house/);
    const breaks = breakingMilestones(plan, forecast, 2);
    expect(breaks[0].id).toBe("house");
    expect(breaks[0].pct).toBeLessThan(5);
  });

  it("applying delay or cut still leaves the $0 pot wrecked and the crumb says income must rise", () => {
    const plan = {
      ...newFortunePlan(),
      ...killTestInput(),
      money: {
        incomeBand: "0",
        savingsBand: "0",
        spendBand: "20_35",
        debtsBand: "0",
        incomeMonthly: 0,
        savings: 0,
        spendMonthly: 25000,
        debts: 0,
      },
      milestones: [{ id: "house", name: "New house", amount: 15_000_000, months: 24 }],
    };
    const before = runMonteCarlo(killTestInput(), { paths: 150, seed: 1 });
    const delayed = applyCoachAction(plan, { id: "delay", goalId: "house", goalName: "New house" });
    expect(delayed.milestones[0].months).toBe(36);
    const afterDelay = runMonteCarlo(
      { ...killTestInput(), milestones: delayed.milestones },
      { paths: 150, seed: 1 },
    );
    expect(afterDelay.hardFail).toBe(true);
    expect(afterDelay.youAreSet).toBe(false);
    const crumb = coachCrumb({ id: "delay", goalName: "New house" }, before, afterDelay, true);
    expect(crumb).toMatch(/Delayed New house 12 months/);
    expect(crumb).toMatch(/Income or savings has to rise/);

    const cut = applyCoachAction(plan, { id: "cut", goalId: "house" });
    expect(cut.milestones[0].amount).toBe(12_000_000);
    const afterCut = runMonteCarlo({ ...killTestInput(), milestones: cut.milestones }, { paths: 150, seed: 1 });
    expect(afterCut.hardFail).toBe(true);
  });

  it("delay on a tight funded plan can lift Living", () => {
    const plan = {
      money: { incomeMonthly: 28000, spendMonthly: 24000, savings: 90000, debts: 0 },
      milestones: [{ id: "car", name: "Car", amount: 220000, months: 8 }],
      net: { emergencyMonths: 4, floorHkd: 80000 },
      templateId: "balanced",
      inflationOn: false,
      seed: 11,
    };
    const early = runMonteCarlo(plan, { paths: 400, seed: 11, inflation: 0 });
    const delayed = applyCoachAction(
      { ...newFortunePlan(), ...plan, milestones: [{ id: "car", name: "Car", amount: 220000, months: 8 }] },
      { id: "delay", goalId: "car" },
    );
    const later = runMonteCarlo(
      { ...plan, milestones: delayed.milestones },
      { paths: 400, seed: 11, inflation: 0 },
    );
    expect(later.livingPct).toBeGreaterThan(early.livingPct);
    expect(shouldShowCoach(early)).toBe(true);
    expect(coachActions({ ...newFortunePlan(), ...plan, milestones: plan.milestones }, early).some((a) => a.id === "delay")).toBe(
      true,
    );
  });

  it("shows coach for stretched as well as wrecked, never a you're-set headline", () => {
    expect(shouldShowCoach({ verdict: "stretched", hardFail: false, livingPct: 50, netPct: 50 })).toBe(true);
    expect(shouldShowCoach({ verdict: "shared", hardFail: false, livingPct: 80, netPct: 80 })).toBe(false);
    expect(shouldShowCoach({ verdict: "wrecked", hardFail: true, livingPct: 0, netPct: 0 })).toBe(true);
  });
});
