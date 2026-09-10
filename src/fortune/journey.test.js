import { describe, expect, it } from "vitest";
import { applyTheme, newFortunePlan } from "./model.js";
import {
  currentStage,
  emphasizeStage,
  inferStage,
  journeyItems,
  JOURNEY_STAGES,
  layoutJourneyPins,
} from "./journey.js";

describe("Step 3 journey path", () => {
  it("orders the ladder Fix → Stabilize → Plan → Invest", () => {
    expect(JOURNEY_STAGES).toEqual(["fix", "stabilize", "plan", "invest"]);
  });

  it("rebuild puts Today, Fix, then the emergency fund before living goals, including Invest", () => {
    const plan = applyTheme(
      { ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" },
      "rebuild",
    );
    plan.debtHeat = "heavy";
    const items = journeyItems(plan, { netPct: 22, milestonePct: [40, 55, 60, 35], hardFail: false });
    expect(items[0].kind).toBe("today");
    expect(items[0].stage).toBe("fix");
    expect(items[1].stage).toBe("fix");
    expect(items[1].name).toMatch(/fire/i);
    expect(items.some((i) => i.stage === "stabilize" && i.name === "Emergency fund")).toBe(true);
    const living = items.filter((i) => i.kind === "goal");
    expect(living.length).toBe(4);
    expect(living.filter((i) => i.stage === "plan").length).toBe(3);
    expect(living.some((i) => i.stage === "invest" && /growth pot/i.test(i.name))).toBe(true);
    expect(living.every((i) => i.pct != null)).toBe(true);
    const floor = items.find((i) => i.stage === "stabilize");
    expect(floor.pct).toBe(22);
    expect(floor.months).toBe(6);
    expect(floor.months).toBeLessThan(living[0].months);
    expect(currentStage(plan)).toBe("fix");
    expect(emphasizeStage(plan)).toBe("fix");
  });

  it("spaces beats in even columns so labels do not stack", () => {
    const plan = applyTheme(newFortunePlan(), "rebuild");
    const laid = layoutJourneyPins(journeyItems(plan, { netPct: 40, milestonePct: [50, 50, 50, 40] }));
    expect(laid[0].leftPct).toBe(0);
    expect(laid[laid.length - 1].leftPct).toBe(100);
    const slots = laid.map((i) => i.slot);
    expect(slots).toEqual(slots.map((_, i) => i));
    const gaps = laid.slice(1).map((item, i) => item.leftPct - laid[i].leftPct);
    gaps.forEach((g) => expect(g).toBeGreaterThan(8));
  });

  it("does not paint a floor percent until the forecast lands", () => {
    const plan = applyTheme(newFortunePlan(), "rebuild");
    const items = journeyItems(plan, null);
    expect(items.find((i) => i.kind === "floor").pct).toBeNull();
    expect(items.filter((i) => i.kind === "goal").every((i) => i.pct == null)).toBe(true);
  });

  it("steady skips Fix and still pins a floor % on the path", () => {
    const plan = applyTheme(newFortunePlan(), "steady");
    const items = journeyItems(plan, { netPct: 71, milestonePct: [80, 70, 50] });
    expect(items.some((i) => i.stage === "fix" && i.kind === "action")).toBe(false);
    expect(items.find((i) => i.kind !== "today").stage).toBe("stabilize");
    expect(items.some((i) => i.kind === "goal" && i.pct === 80)).toBe(true);
    expect(currentStage(plan)).toBe("stabilize");
    expect(emphasizeStage(plan)).toBe("stabilize");
  });

  it("grow user goals can land in Plan or Invest, with a floor pin first in time", () => {
    const plan = {
      ...applyTheme(newFortunePlan(), "grow"),
      milestones: [
        { id: "trip", name: "Trip", amount: 40000, months: 10, stage: "plan" },
        { id: "house", name: "New house", amount: 15_000_000, months: 36 },
      ],
    };
    const items = journeyItems(plan, { netPct: 10, milestonePct: [90, 0], hardFail: true, livingPct: 10 });
    expect(inferStage(plan.milestones[1])).toBe("invest");
    expect(items.find((i) => i.id === "house").stage).toBe("invest");
    expect(items.find((i) => i.id === "trip").pct).toBe(90);
    expect(items.find((i) => i.id === "house").pct).toBe(0);
    expect(emphasizeStage(plan, { livingPct: 10 })).toBe("plan");
  });

  it("names the board stage from the first incomplete beat", () => {
    const rebuildFire = applyTheme({ ...newFortunePlan(), debtHeat: "heavy" }, "rebuild");
    rebuildFire.debtHeat = "heavy";
    expect(currentStage(rebuildFire)).toBe("fix");
    const rebuild = applyTheme(newFortunePlan(), "rebuild");
    expect(currentStage(rebuild)).toBe("stabilize");
    const steady = applyTheme(newFortunePlan(), "steady");
    expect(currentStage(steady)).toBe("stabilize");
    const funded = {
      ...steady,
      money: { ...steady.money, savings: 500000, savingsBand: "400_800" },
    };
    expect(currentStage(funded, { livingPct: 40 })).toBe("plan");
  });
});
