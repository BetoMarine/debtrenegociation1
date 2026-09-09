import { describe, expect, it } from "vitest";
import { applyTheme, newFortunePlan, resolveMoney, THEME_IDS, THEMES, toEnginePlan } from "./model.js";
import { nextAfterStart } from "./stabilize.js";

describe("Fortune Teller plan model", () => {
  it("seeds a theme with editable living goals and a net", () => {
    const plan = applyTheme(newFortunePlan(), "young_family");
    expect(plan.theme).toBe("young_family");
    expect(plan.milestones.length).toBeGreaterThan(0);
    expect(plan.net.emergencyMonths).toBeGreaterThan(0);
    expect(plan.net.floorHkd).toBeGreaterThan(0);
    plan.milestones[0].name = "Custom micro-goal";
    expect(plan.milestones[0].name).toBe("Custom micro-goal");
  });

  it("resolves money-now bands to mid-point HKD for the engine", () => {
    const money = resolveMoney({
      incomeBand: "0",
      spendBand: "20_35",
      savingsBand: "0",
      debtsBand: "0",
    });
    expect(money.incomeMonthly).toBe(0);
    expect(money.savings).toBe(0);
    expect(money.spendMonthly).toBeGreaterThan(0);
  });

  it("lets numeric overrides win so the kill-test can pass exact zeros", () => {
    const engine = toEnginePlan({
      ...newFortunePlan(),
      money: {
        incomeBand: "80_120",
        spendBand: "35_50",
        savingsBand: "400_800",
        debtsBand: "0",
        incomeMonthly: 0,
        savings: 0,
        spendMonthly: 25000,
        debts: 0,
      },
      milestones: [{ id: "house", name: "New house", amount: 15_000_000, months: 24 }],
    });
    expect(engine.money.incomeMonthly).toBe(0);
    expect(engine.money.savings).toBe(0);
    expect(engine.milestones[0].amount).toBe(15_000_000);
  });

  it("puts I need to rebuild first, with a modest seed pack, not a house fantasy", () => {
    expect(THEME_IDS[0]).toBe("rebuild");
    expect(THEMES.rebuild.label).toMatch(/rebuild/i);
    const amounts = THEMES.rebuild.milestones.map((m) => m.amount);
    expect(Math.max(...amounts)).toBeLessThan(50000);
    expect(THEMES.rebuild.milestones.some((m) => /house/i.test(m.name))).toBe(false);
    expect(THEMES.rebuild.net.emergencyMonths).toBeGreaterThanOrEqual(6);
    const seeded = applyTheme(newFortunePlan(), "rebuild");
    expect(seeded.milestones.every((m) => m.amount < 50000)).toBe(true);
    const midStory = { ...newFortunePlan(), privacyAccepted: true, theme: "rebuild" };
    expect(nextAfterStart(midStory)).toBe("triage");
    expect(nextAfterStart({ ...midStory, debtHeat: "heavy" })).toBe("stabilize");
    expect(nextAfterStart({ ...midStory, phase2Unlocked: true })).toBe("board");
  });
});
