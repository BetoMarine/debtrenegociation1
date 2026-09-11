import { describe, expect, it } from "vitest";
import { killTestInput, runMonteCarlo } from "./engine.js";
import { applyTheme, newFortunePlan } from "./model.js";
import {
  canUnlockPhase2,
  fireLinkOrder,
  gateFortuneScreen,
  isBoardUnlocked,
  canOpenPlan,
  nextAfterStart,
  monthlySurplus,
  needsFireCard,
  prefersSunday,
  projectReachDate,
  stabilizeSnapshot,
} from "./stabilize.js";
import { shouldShowCoach } from "./coach.js";

describe("Rebuild fire triage", () => {
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

describe("Floor math", () => {
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

  it("lets a thin floor onto the board after Step 2 — honesty lives on the board", () => {
    const thin = {
      ...newFortunePlan(),
      privacyAccepted: true,
      theme: "rebuild",
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
    expect(gateFortuneScreen("board", thin)).toBe("next");
    expect(gateFortuneScreen("where", thin)).toBe("where");
    expect(gateFortuneScreen("theme", thin)).toBe("where");
    expect(gateFortuneScreen("triage", thin)).toBe("next");

    const reached = { ...thin, boardReached: true };
    expect(isBoardUnlocked(reached)).toBe(true);
    expect(gateFortuneScreen("board", reached)).toBe("board");
    expect(gateFortuneScreen("start", reached)).toBe("where");
    expect(canOpenPlan(reached)).toBe(true);
    expect(canOpenPlan(thin)).toBe(false);
    expect(nextAfterStart(reached)).toBe("where");
    expect(nextAfterStart({ privacyAccepted: false })).toBe("start");

    const funded = {
      ...thin,
      money: { ...thin.money, savings: 27000 * 3, savingsBand: "50_150" },
    };
    expect(stabilizeSnapshot(funded).ready).toBe(true);
    expect(canUnlockPhase2(funded)).toBe(true);
  });

  it("keeps the kill-test hard-fail and Rebuild coach on the board", () => {
    const forecast = runMonteCarlo(killTestInput(), { paths: 400, seed: 1 });
    expect(forecast.hardFail).toBe(true);
    expect(forecast.youAreSet).toBe(false);
    expect(shouldShowCoach(forecast)).toBe(true);
    const unlocked = {
      ...newFortunePlan(),
      ...killTestInput(),
      privacyAccepted: true,
      boardReached: true,
      debtHeat: "none",
    };
    expect(gateFortuneScreen("board", unlocked)).toBe("board");
    expect(isBoardUnlocked(unlocked)).toBe(true);
  });
});

describe("Theme after money is captured", () => {
  it("does not overwrite money captured on the floor screen", () => {
    const plan = applyTheme(
      {
        ...newFortunePlan(),
        moneyCapturedAtStabilize: true,
        money: {
          incomeBand: "15_30",
          spendBand: "10_20",
          leftoverBand: "lt5",
          savingsBand: "lt50",
          debtsBand: "0",
        },
        net: { emergencyMonths: 3, floorHkd: 80000 },
      },
      "grow",
    );
    expect(plan.theme).toBe("grow");
    expect(plan.money.incomeBand).toBe("15_30");
    expect(plan.net.floorHkd).toBe(80000);
    expect(plan.net.emergencyMonths).toBe(3);
  });
});
