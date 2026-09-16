import { describe, expect, it } from "vitest";
import {
  applyTheme,
  FIRST_GROWTH_POT_AMOUNT,
  LEGACY_FIRST_GROWTH_POT_AMOUNT,
  migrateFortunePlan,
  newFortunePlan,
  resolveMoney,
  THEME_IDS,
  THEMES,
  toEnginePlan,
} from "./model.js";
import { nextAfterStart, gateFortuneScreen, isBoardUnlocked } from "./stabilize.js";

describe("Fortune Teller plan model", () => {
  it("seeds a theme with editable living goals and a net", () => {
    const plan = applyTheme(newFortunePlan(), "steady");
    expect(plan.theme).toBe("steady");
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
    expect(THEME_IDS).toEqual(["rebuild", "steady", "grow"]);
    expect(THEMES.rebuild.label).toMatch(/rebuild/i);
    const planGoals = THEMES.rebuild.milestones.filter((m) => m.stage !== "invest");
    expect(Math.max(...planGoals.map((m) => m.amount))).toBeLessThan(50000);
    expect(THEMES.rebuild.milestones.find((m) => m.stage === "invest").amount).toBe(FIRST_GROWTH_POT_AMOUNT);
    expect(THEMES.rebuild.milestones.some((m) => /house/i.test(m.name))).toBe(false);
    expect(THEMES.rebuild.net.emergencyMonths).toBeGreaterThanOrEqual(6);
    const seeded = applyTheme(newFortunePlan(), "rebuild");
    expect(seeded.milestones.filter((m) => m.stage !== "invest").every((m) => m.amount < 50000)).toBe(true);
    expect(seeded.milestones.some((m) => /first growth pot/i.test(m.name) && m.amount === FIRST_GROWTH_POT_AMOUNT)).toBe(
      true,
    );
    const midStory = { ...newFortunePlan(), privacyAccepted: true, theme: "rebuild" };
    expect(nextAfterStart(midStory)).toBe("where");
    expect(nextAfterStart({ ...midStory, debtHeat: "heavy" })).toBe("where");
    expect(nextAfterStart({ ...midStory, boardReached: true })).toBe("where");
    expect(gateFortuneScreen("start", midStory)).toBe("where");
    expect(gateFortuneScreen("board", { ...midStory, boardReached: true })).toBe("board");
  });

  it("maps leftover bands into spend so the pot contribution is the leftover", () => {
    const money = resolveMoney({
      incomeBand: "30_50",
      leftoverBand: "5_10",
      savingsBand: "lt50",
      debtsBand: "0",
    });
    expect(money.leftoverMonthly).toBe(7500);
    expect(money.spendMonthly).toBe(money.incomeMonthly - money.leftoverMonthly);
  });

  it("migrates peak_career to grow without dropping custom goals", () => {
    const engine = toEnginePlan({
      ...newFortunePlan(),
      theme: "peak_career",
      privacyAccepted: true,
      phase2Unlocked: true,
      milestones: [{ id: "x", name: "Keep me", amount: 9000, months: 10 }],
    });
    expect(engine.theme).toBe("grow");
    expect(engine.milestones[0].name).toBe("Keep me");
    expect(isBoardUnlocked({ phase2Unlocked: true })).toBe(true);
    expect(gateFortuneScreen("board", { privacyAccepted: true, theme: "grow", boardReached: true })).toBe("board");
  });

  it("adds a First growth pot to rebuild plans that never had one, sized so leftover 5–10k beats cash", () => {
    const plan = migrateFortunePlan({
      ...newFortunePlan(),
      theme: "rebuild",
      milestones: [{ id: "phone", name: "Phone", amount: 4000, months: 8, stage: "plan" }],
    });
    const pot = plan.milestones.find((m) => m.stage === "invest" && /growth pot/i.test(m.name));
    expect(pot).toBeTruthy();
    expect(pot.amount).toBe(FIRST_GROWTH_POT_AMOUNT);
    expect(plan.milestones.filter((m) => m.stage !== "invest").every((m) => m.amount < 50000)).toBe(true);
  });

  it("rewrites a stored HK$25,000 default pot so leftover 5–10k still shows a real BOOST sooner", () => {
    const plan = migrateFortunePlan({
      ...newFortunePlan(),
      theme: "rebuild",
      milestones: [
        { id: "phone", name: "Phone", amount: 4000, months: 8, stage: "plan" },
        {
          id: "growth",
          name: "First growth pot",
          amount: LEGACY_FIRST_GROWTH_POT_AMOUNT,
          months: 36,
          stage: "invest",
        },
      ],
    });
    const pots = plan.milestones.filter((m) => /first growth pot/i.test(m.name));
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(FIRST_GROWTH_POT_AMOUNT);
    expect(pots[0].stage).toBe("invest");
  });

  it("rewrites a stored Fix title so 3 or 6 months is on the name, not only a date", () => {
    const plan = migrateFortunePlan({
      ...newFortunePlan(),
      theme: "rebuild",
      fixMonths: 3,
      fixMonthsPicked: true,
      milestones: [
        { id: "fix-renegotiate", name: "Debt renegotiation", amount: 0, months: 3, stage: "fix", role: "fix" },
      ],
    });
    const fix = plan.milestones.find((m) => m.role === "fix");
    expect(fix.name).toBe("Debt renegotiation · 3 months");
    expect(fix.name).not.toMatch(/[A-Z][a-z]{2} 20\d\d/);
  });

  it("keeps a user 6-month pick when the pack milestone still says 3", () => {
    const plan = migrateFortunePlan({
      ...newFortunePlan(),
      theme: "rebuild",
      fixMonths: 6,
      fixMonthsPicked: true,
      fixMonthsUserPicked: true,
      milestones: [
        {
          id: "fix-renegotiate",
          name: "Debt renegotiation · 3 months",
          amount: 0,
          months: 3,
          stage: "fix",
          role: "fix",
          monthsKnown: true,
        },
      ],
    });
    const fix = plan.milestones.find((m) => m.role === "fix");
    expect(plan.fixMonths).toBe(6);
    expect(fix.months).toBe(6);
    expect(fix.name).toBe("Debt renegotiation · 6 months");
  });

  it("migrates a stored Steady mix to Firm so old plans keep a shelf card", () => {
    const plan = migrateFortunePlan({
      ...newFortunePlan(),
      templateId: "steady",
    });
    expect(plan.templateId).toBe("firm");
    const unknown = migrateFortunePlan({
      ...newFortunePlan(),
      templateId: "mystery",
    });
    expect(unknown.templateId).toBe("balanced");
  });
});
