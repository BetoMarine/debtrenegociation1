import { describe, expect, it } from "vitest";
import { killTestInput, runMonteCarlo } from "./engine.js";
import { applyTheme, newFortunePlan } from "./model.js";
import {
  canUnlockPhase2,
  fireLinkOrder,
  gateFortuneScreen,
  isPhase2Unlocked,
  monthlySurplus,
  needsFireCard,
  prefersSunday,
  projectReachDate,
  stabilizeSnapshot,
} from "./stabilize.js";
import { shouldShowCoach } from "./coach.js";

describe("Phase 1 triage", () => {
  it("shows Right Door then Sunday Pack on heavy / missing-payment heat", () => {
    expect(needsFireCard("heavy")).toBe(true);
    expect(needsFireCard("paying")).toBe(false);
    expect(needsFireCard("none")).toBe(false);
    expect(fireLinkOrder("heavy")).toEqual(["right-door", "sunday"]);
  });

  it("prefers Sunday Pack when the heat is FDW-ish", () => {
    expect(needsFireCard("fdw")).toBe(true);
    expect(prefersSunday("fdw")).toBe(true);
    expect(fireLinkOrder("fdw")).toEqual(["sunday", "right-door"]);
  });
});

describe("Phase 1 stabilize", () => {
  it("projects a reach date when surplus is positive", () => {
    const from = new Date(2026, 8, 9);
    const plan = {
      ...newFortunePlan(),
      debtHeat: "none",
      stabilizeTargetMonths: 3,
      money: {
        incomeBand: "50_80",
        spendBand: "20_35",
        savingsBand: "0",
        debtsBand: "0",
      },
      net: { emergencyMonths: 3, floorHkd: 0 },
    };
    const snap = stabilizeSnapshot(plan, from);
    expect(snap.surplus).toBeGreaterThan(0);
    expect(snap.ready).toBe(false);
    expect(snap.reach.kind).toBe("date");
    expect(snap.reach.label).toMatch(/[A-Za-z]{3} 20\d\d/);
    expect(snap.reach.months).toBeGreaterThan(0);
  });

  it("says the floor is not moving when surplus is zero or negative", () => {
    const plan = {
      ...newFortunePlan(),
      debtHeat: "paying",
      stabilizeTargetMonths: 6,
      money: {
        incomeBand: "0",
        spendBand: "20_35",
        savingsBand: "0",
        debtsBand: "0",
        incomeMonthly: 0,
        spendMonthly: 25000,
        savings: 0,
        debts: 0,
      },
      net: { emergencyMonths: 6, floorHkd: 0 },
    };
    const snap = stabilizeSnapshot(plan);
    expect(snap.surplus).toBeLessThanOrEqual(0);
    expect(snap.reach.kind).toBe("stuck");
    expect(projectReachDate(0, 0, 150000).kind).toBe("stuck");
    expect(monthlySurplus({ incomeMonthly: 20000, spendMonthly: 20000, debts: 0 }, "none")).toBe(0);
  });

  it("unlocks Phase 2 after the floor threshold or an explicit thin-floor override", () => {
    const thin = {
      ...newFortunePlan(),
      stabilizeTargetMonths: 3,
      money: {
        incomeBand: "30_50",
        spendBand: "20_35",
        savingsBand: "0",
        debtsBand: "0",
        incomeMonthly: 40000,
        spendMonthly: 27000,
        savings: 0,
        debts: 0,
      },
      net: { emergencyMonths: 3, floorHkd: 0 },
    };
    expect(canUnlockPhase2(thin)).toBe(false);
    expect(gateFortuneScreen("board", { ...thin, privacyAccepted: true, theme: "rebuild" })).toBe("triage");
    expect(gateFortuneScreen("board", { ...thin, privacyAccepted: true, theme: "rebuild", debtHeat: "none" })).toBe(
      "stabilize",
    );

    const funded = {
      ...thin,
      money: { ...thin.money, savings: 27000 * 3, savingsBand: "50_150" },
    };
    expect(stabilizeSnapshot(funded).ready).toBe(true);
    expect(canUnlockPhase2(funded)).toBe(true);

    const override = { ...thin, privacyAccepted: true, theme: "rebuild", phase2Override: true };
    expect(canUnlockPhase2(override)).toBe(true);
    expect(isPhase2Unlocked(override)).toBe(true);
    expect(gateFortuneScreen("board", override)).toBe("board");
  });

  it("keeps the kill-test hard-fail and Rebuild coach in Phase 2", () => {
    const forecast = runMonteCarlo(killTestInput(), { paths: 400, seed: 1 });
    expect(forecast.hardFail).toBe(true);
    expect(forecast.youAreSet).toBe(false);
    expect(shouldShowCoach(forecast)).toBe(true);
    const unlocked = {
      ...newFortunePlan(),
      ...killTestInput(),
      privacyAccepted: true,
      phase2Unlocked: true,
      debtHeat: "none",
    };
    expect(gateFortuneScreen("board", unlocked)).toBe("board");
    expect(isPhase2Unlocked(unlocked)).toBe(true);
  });
});

describe("Phase 2 theme after stabilize", () => {
  it("does not overwrite money captured on the floor screen", () => {
    const plan = applyTheme(
      {
        ...newFortunePlan(),
        moneyCapturedAtStabilize: true,
        money: {
          incomeBand: "15_30",
          spendBand: "10_20",
          savingsBand: "lt50",
          debtsBand: "0",
        },
        net: { emergencyMonths: 3, floorHkd: 80000 },
      },
      "peak_career",
    );
    expect(plan.theme).toBe("peak_career");
    expect(plan.money.incomeBand).toBe("15_30");
    expect(plan.net.floorHkd).toBe(80000);
    expect(plan.net.emergencyMonths).toBe(3);
    expect(plan.milestones.length).toBeGreaterThan(0);
  });
});
