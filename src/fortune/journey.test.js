import { describe, expect, it } from "vitest";
import { applyTheme, newFortunePlan } from "./model.js";
import {
  applyStageOrder,
  currentStage,
  emphasizeStage,
  holdStatus,
  inferStage,
  journeyItems,
  JOURNEY_STAGES,
  layoutJourneyPins,
  stageRollup,
  stageStack,
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

describe("Step 3 vertical stage stack", () => {
  it("always renders Fix → Stabilize → Plan → Invest, including a thin Invest", () => {
    const plan = applyTheme(newFortunePlan(), "grow");
    const stack = stageStack(plan, { netPct: 40, milestonePct: [], livingPct: 20 });
    expect(stack.map((s) => s.id)).toEqual(["fix", "stabilize", "plan", "invest"]);
    expect(stack).toHaveLength(4);
    const invest = stack.find((s) => s.id === "invest");
    expect(invest).toBeTruthy();
    expect(invest.thin).toBe(true);
    expect(invest.rows).toEqual([]);
    expect(stack.find((s) => s.id === "stabilize").thin).toBe(false);
  });

  it("expands the current stage and labels a rollup as the mean of row %", () => {
    const plan = applyTheme(newFortunePlan(), "rebuild");
    plan.debtHeat = "none";
    const forecast = { netPct: 42, milestonePct: [70, 50, 30, 10], livingPct: 40, hardFail: false };
    const stack = stageStack(plan, forecast);
    const here = stack.find((s) => s.current);
    expect(here.id).toBe("stabilize");
    expect(here.expanded).toBe(true);
    expect(stack.filter((s) => s.expanded)).toHaveLength(1);
    const planStage = stack.find((s) => s.id === "plan");
    expect(planStage.rollup).toBe(50);
    expect(stageRollup([{ pct: 70 }, { pct: 50 }, { pct: 30 }])).toBe(50);
    expect(stageRollup([{ pct: null }, { pct: undefined }])).toBeNull();
  });

  it("keeps Invest on a rebuild board and reorders living goals inside a stage", () => {
    const plan = applyTheme(newFortunePlan(), "rebuild");
    const stack = stageStack(plan, { netPct: 20, milestonePct: [40, 55, 60, 35] });
    expect(stack.find((s) => s.id === "invest").thin).toBe(false);
    expect(stack.find((s) => s.id === "invest").rows.some((r) => /growth pot/i.test(r.name))).toBe(true);
    const planIds = stack.find((s) => s.id === "plan").rows.map((r) => r.id);
    expect(planIds.length).toBeGreaterThanOrEqual(2);
    const flipped = applyStageOrder(plan.milestones, "plan", [...planIds].reverse());
    expect(flipped.find((m) => m.id === planIds[0]).boardOrder).toBeGreaterThan(
      flipped.find((m) => m.id === planIds[planIds.length - 1]).boardOrder,
    );
    const resorted = stageStack({ ...plan, milestones: flipped }, { netPct: 20, milestonePct: [40, 55, 60, 35] });
    expect(resorted.find((s) => s.id === "plan").rows.map((r) => r.id)).toEqual([...planIds].reverse());
  });

  it("keeps wrecked honesty and appends floor-first when the floor is thin", () => {
    const plan = applyTheme(newFortunePlan(), "rebuild");
    plan.money = { ...plan.money, savingsBand: "0", savings: 0 };
    const wrecked = holdStatus(plan, { verdict: "wrecked", hardFail: true, netPct: 4, livingPct: 2 });
    expect(wrecked.hard).toBe(true);
    expect(wrecked.floorFirst).toBe(true);
    const funded = {
      ...plan,
      money: { ...plan.money, savings: 500000, savingsBand: "400_800" },
      debtHeat: "none",
    };
    const holds = holdStatus(funded, { verdict: "shared", hardFail: false, netPct: 80, livingPct: 75 });
    expect(holds.floorFirst).toBe(false);
    expect(holds.tone).toBe("shared");
  });
});
