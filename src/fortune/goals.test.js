import { describe, expect, it } from "vitest";
import { EF_MILESTONE_ID } from "../handoff.js";
import {
  applyTheme,
  emergencyCurrentHkd,
  emergencySnapshot,
  migrateFortunePlan,
  newFortunePlan,
  normalizeMilestone,
  upsertLivingGoal,
} from "./model.js";
import { ensureFireSequence, ensureEmergencyFund } from "./stabilize.js";
import { stageStack } from "./journey.js";

function persistLike(plan, handoff = null) {
  return ensureFireSequence(migrateFortunePlan(plan), handoff);
}

function rebuildBoard(currentHkd = 25000) {
  const seeded = applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "none" }, "rebuild");
  seeded.moneyCapturedAtStabilize = true;
  seeded.boardReached = true;
  seeded.net = { ...seeded.net, currentHkd, floorHkd: 120000, emergencyMonths: 6 };
  return persistLike(seeded);
}

describe("Growth pot pin vs emergency fund [FT-EF-01]", () => {
  it("FT-EF-01: editing the First growth pot amount does not change EF amount or EF goal", () => {
    const plan = rebuildBoard(25000);
    const before = emergencySnapshot(plan);
    const pot = plan.milestones.find((m) => /first growth pot/i.test(m.name));
    expect(pot).toBeTruthy();
    expect(pot.id).not.toBe(EF_MILESTONE_ID);
    expect(pot.stage).toBe("invest");

    const pinned = persistLike(
      upsertLivingGoal(plan, { name: pot.name, amount: "88000", months: pot.months }, pot.id),
    );
    const after = emergencySnapshot(pinned);
    const pots = pinned.milestones.filter((m) => /first growth pot/i.test(m.name));
    const floor = pinned.milestones.find((m) => m.id === EF_MILESTONE_ID || m.role === "floor");
    const edited = pots[0];

    expect(pots).toHaveLength(1);
    expect(edited.amount).toBe(88000);
    expect(edited.stage).toBe("invest");
    expect(edited.id).toBe(pot.id);
    expect(edited.id).not.toBe(EF_MILESTONE_ID);
    expect(emergencyCurrentHkd(pinned)).toBe(25000);
    expect(after.currentHkd).toBe(before.currentHkd);
    expect(after.floorHkd).toBe(before.floorHkd);
    expect(after.emergencyMonths).toBe(before.emergencyMonths);
    expect(after.floorId).toBe(EF_MILESTONE_ID);
    expect(after.floorName).toMatch(/Emergency fund/i);
    expect(floor.amount).toBe(25000);
    expect(floor.stage).toBe("stabilize");
  });

  it("pin does not duplicate First growth pot (upsert, not append)", () => {
    const plan = rebuildBoard(12000);
    const pot = plan.milestones.find((m) => /first growth pot/i.test(m.name));
    const once = persistLike(
      upsertLivingGoal(plan, { name: pot.name, amount: "40000", months: pot.months }, pot.id),
    );
    const twice = persistLike(
      upsertLivingGoal(once, { name: pot.name, amount: "40000", months: pot.months }, pot.id),
    );
    const pots = twice.milestones.filter((m) => /first growth pot/i.test(m.name));
    expect(pots).toHaveLength(1);
    expect(pots[0].id).toBe(pot.id);
    expect(pots[0].amount).toBe(40000);
    const investRows = stageStack(twice, { netPct: 20, milestonePct: [] })
      .find((s) => s.id === "invest")
      .rows.filter((r) => /first growth pot/i.test(r.name));
    const planRows = stageStack(twice, { netPct: 20, milestonePct: [] })
      .find((s) => s.id === "plan")
      .rows.filter((r) => /first growth pot/i.test(r.name));
    expect(investRows).toHaveLength(1);
    expect(planRows).toHaveLength(0);
    expect(emergencyCurrentHkd(twice)).toBe(12000);
  });

  it("repairs a growth pot that lost invest stage instead of injecting a second one", () => {
    const plan = rebuildBoard(8000);
    const pot = plan.milestones.find((m) => /first growth pot/i.test(m.name));
    const broken = {
      ...plan,
      milestones: plan.milestones.map((m) =>
        m.id === pot.id ? { ...m, stage: "plan", amount: 88000 } : m,
      ),
    };
    broken.milestones.push(
      normalizeMilestone({ name: "First growth pot", amount: 25000, months: 36, stage: "invest" }),
    );
    const repaired = persistLike(broken);
    const pots = repaired.milestones.filter((m) => /first growth pot/i.test(m.name));
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(88000);
    expect(pots[0].stage).toBe("invest");
    expect(emergencyCurrentHkd(repaired)).toBe(8000);
    expect(repaired.milestones.filter((m) => m.role === "floor" || m.id === EF_MILESTONE_ID)).toHaveLength(1);
  });

  it("refuses to mutate the EF milestone through the living-goal pin handler", () => {
    const plan = rebuildBoard(0);
    const before = emergencySnapshot(plan);
    const next = persistLike(
      upsertLivingGoal(plan, { name: "First growth pot", amount: "99999", months: 36 }, EF_MILESTONE_ID),
    );
    const after = emergencySnapshot(next);
    expect(after.currentHkd).toBe(before.currentHkd);
    expect(after.floorAmount).toBe(0);
    expect(after.floorId).toBe(EF_MILESTONE_ID);
    expect(next.milestones.find((m) => m.role === "floor").name).toMatch(/Emergency fund/i);
    expect(next.milestones.filter((m) => /first growth pot/i.test(m.name))).toHaveLength(1);
    expect(emergencyCurrentHkd(next)).toBe(0);
  });
});

describe("ensureEmergencyFund identity", () => {
  it("keeps a distinct Stabilize EF even when a living goal tried to reuse the EF id", () => {
    const plan = ensureEmergencyFund({
      ...newFortunePlan(),
      net: { emergencyMonths: 6, floorHkd: 120000, currentHkd: 14000 },
      milestones: [
        { id: EF_MILESTONE_ID, name: "First growth pot", amount: 88000, months: 36, stage: "invest", role: "living" },
      ],
    });
    const floor = plan.milestones.find((m) => m.role === "floor");
    const living = plan.milestones.filter((m) => m.role === "living");
    expect(floor.id).toBe(EF_MILESTONE_ID);
    expect(floor.amount).toBe(14000);
    expect(floor.name).toBe("Emergency fund");
    expect(living.every((m) => m.id !== EF_MILESTONE_ID)).toBe(true);
    expect(living.some((m) => /growth pot/i.test(m.name) && m.amount === 88000)).toBe(true);
  });
});
