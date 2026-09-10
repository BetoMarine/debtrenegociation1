import { describe, expect, it } from "vitest";
import { applyTheme, newFortunePlan } from "./model.js";
import { emphasizeStage, inferStage, journeyItems, JOURNEY_STAGES } from "./journey.js";

describe("Step 3 journey path", () => {
  it("orders the ladder Fix → Stabilize → Plan → Invest", () => {
    expect(JOURNEY_STAGES).toEqual(["fix", "stabilize", "plan", "invest"]);
  });

  it("rebuild puts Fix then the emergency fund before living goals", () => {
    const plan = applyTheme(
      { ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" },
      "rebuild",
    );
    plan.debtHeat = "heavy";
    const items = journeyItems(plan, { netPct: 22, milestonePct: [40, 55, 60], hardFail: false });
    expect(items[0].stage).toBe("fix");
    expect(items[0].name).toMatch(/fire/i);
    expect(items.some((i) => i.stage === "stabilize" && i.name === "Emergency fund")).toBe(true);
    const living = items.filter((i) => i.kind === "goal");
    expect(living.length).toBe(3);
    expect(living.every((i) => i.stage === "plan")).toBe(true);
    expect(living.every((i) => i.pct != null)).toBe(true);
    const floor = items.find((i) => i.stage === "stabilize");
    expect(floor.pct).toBe(22);
    expect(emphasizeStage(plan)).toBe("fix");
  });

  it("steady skips Fix and still pins a floor % on the path", () => {
    const plan = applyTheme(newFortunePlan(), "steady");
    const items = journeyItems(plan, { netPct: 71, milestonePct: [80, 70, 50] });
    expect(items.some((i) => i.stage === "fix")).toBe(false);
    expect(items[0].stage).toBe("stabilize");
    expect(items.some((i) => i.kind === "goal" && i.pct === 80)).toBe(true);
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
    const items = journeyItems(plan, { netPct: 10, milestonePct: [90, 0], hardFail: true });
    expect(inferStage(plan.milestones[1])).toBe("invest");
    expect(items.find((i) => i.id === "house").stage).toBe("invest");
    expect(items.find((i) => i.id === "trip").pct).toBe(90);
    expect(items.find((i) => i.id === "house").pct).toBe(0);
    expect(emphasizeStage(plan)).toBe("plan");
  });
});
