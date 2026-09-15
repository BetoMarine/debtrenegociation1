import { describe, expect, it } from "vitest";
import { EF_MILESTONE_ID, makeFireHandoff } from "../handoff.js";
import { runMonteCarlo } from "./engine.js";
import {
  applyTheme,
  clampGoalMonths,
  emergencySnapshot,
  migrateFortunePlan,
  newFortunePlan,
  setLivingGoalMonths,
  shiftLivingGoalMonths,
  toEnginePlan,
} from "./model.js";
import {
  monthsFromDrag,
  stageHorizonMonths,
  stageStack,
  TIME_DRAG_PX_PER_MONTH,
} from "./journey.js";
import { ensureFireSequence, receiveFireHandoff } from "./stabilize.js";
import { renderStageStackHtml } from "./ui.js";

function persistLike(plan, handoff = null) {
  return ensureFireSequence(migrateFortunePlan(plan), handoff);
}

function rebuildWithFix(months = 6) {
  const seeded = applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild");
  seeded.moneyCapturedAtStabilize = true;
  seeded.boardReached = true;
  seeded.net = { ...seeded.net, currentHkd: 0, floorHkd: 120000, emergencyMonths: 6 };
  return persistLike(seeded, makeFireHandoff({ source: "right-door", months }));
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standing case FT-DRAG-01 — status: testable */
describe("FT-DRAG-01 drag goals in time", () => {
  it("updates living-goal months inside the same stage and extends phase end to max(months)", () => {
    const plan = rebuildWithFix(6);
    const visit = plan.milestones.find((m) => /family visit/i.test(m.name));
    expect(visit.stage).toBe("plan");
    const before = stageStack(plan, null).find((s) => s.id === "plan");
    expect(before.horizon).toBe(stageHorizonMonths(before.rows));
    expect(visit.months).toBe(before.horizon);

    const next = persistLike(shiftLivingGoalMonths(plan, visit.id, 12));
    const moved = next.milestones.find((m) => m.id === visit.id);
    expect(moved.months).toBe(visit.months + 12);
    expect(moved.stage).toBe("plan");
    const after = stageStack(next, null).find((s) => s.id === "plan");
    expect(after.horizon).toBe(visit.months + 12);
    expect(after.rows.every((r) => r.stage === "plan")).toBe(true);
  });

  it("maps a vertical handle drag onto months (down = later, up = sooner)", () => {
    expect(TIME_DRAG_PX_PER_MONTH).toBe(12);
    expect(monthsFromDrag(8, 36)).toBe(11);
    expect(monthsFromDrag(8, -24)).toBe(6);
    expect(monthsFromDrag(2, -120)).toBe(1);
    expect(monthsFromDrag(230, 400)).toBe(240);
    expect(clampGoalMonths(0)).toBe(1);
  });

  it("does not let the user invent or retarget Fix, or mutate EF, by dragging time", () => {
    const plan = rebuildWithFix(3);
    const before = emergencySnapshot(plan);
    const fix = plan.milestones.find((m) => m.role === "fix");
    const floor = plan.milestones.find((m) => m.role === "floor");
    expect(setLivingGoalMonths(plan, fix.id, 18)).toBe(plan);
    expect(setLivingGoalMonths(plan, EF_MILESTONE_ID, 18)).toBe(plan);
    expect(shiftLivingGoalMonths(plan, floor.id, 6)).toBe(plan);

    const pot = plan.milestones.find((m) => /growth pot/i.test(m.name));
    const next = persistLike(shiftLivingGoalMonths(plan, pot.id, 6));
    const after = emergencySnapshot(next);
    expect(next.milestones.find((m) => m.role === "fix").months).toBe(3);
    expect(next.milestones.find((m) => m.role === "fix").stage).toBe("fix");
    expect(after.currentHkd).toBe(before.currentHkd);
    expect(after.floorHkd).toBe(before.floorHkd);
    expect(after.emergencyMonths).toBe(before.emergencyMonths);
    expect(after.floorId).toBe(EF_MILESTONE_ID);
    expect(next.milestones.find((m) => m.id === pot.id).stage).toBe("invest");
  });

  it("renders Sooner / Later on living rows and keeps dates/tenors visible", () => {
    const from = new Date(2026, 8, 14);
    const plan = rebuildWithFix(6);
    const html = renderStageStackHtml(stageStack(plan, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, from), escape);
    expect(html).toMatch(/data-time-delta="-1"/);
    expect(html).toMatch(/data-time-delta="1"/);
    expect(html).toMatch(/>Sooner</);
    expect(html).toMatch(/>Later</);
    expect(html).toMatch(/Drag to move in time/);
    expect(html).toMatch(/<strong>Debt renegotiation · 6 months<\/strong>/);
    expect(html).toMatch(/class="ft-row-when">Mar 2027</);
    expect(html).toMatch(/Emergency fund · now HK\$/);
    const fixBlock = html.match(/data-stage="fix"[\s\S]*?<\/section>/)[0];
    expect(fixBlock).not.toMatch(/data-time-delta/);
    expect(html).toMatch(/data-horizon="18"/);
    expect(html).toMatch(/to Mar 2028/);
  });

  it("delaying a tight living goal raises the modelled success %", () => {
    const money = { incomeMonthly: 28000, spendMonthly: 24000, savings: 90000, debts: 0 };
    const net = { emergencyMonths: 4, floorHkd: 80000 };
    const tight = {
      ...newFortunePlan(),
      money,
      net,
      templateId: "balanced",
      inflationOn: false,
      seed: 11,
      milestones: [{ id: "car", name: "Car", amount: 220000, months: 8, stage: "plan", role: "living" }],
    };
    const later = shiftLivingGoalMonths(tight, "car", 40);
    expect(later.milestones[0].months).toBe(48);
    expect(later.milestones[0].stage).toBe("plan");
    const early = runMonteCarlo(toEnginePlan(tight), { paths: 400, seed: 11, inflation: 0 });
    const delayed = runMonteCarlo(toEnginePlan(later), { paths: 400, seed: 11, inflation: 0 });
    expect(delayed.livingPct).toBeGreaterThan(early.livingPct);
  });
});

/** Standing case FT-OVERLAP-01 — status: testable */
describe("FT-OVERLAP-01 soft phase overlap", () => {
  it("lets Stabilize start at the end of Fix without hiding Plan or Invest", () => {
    const plan = rebuildWithFix(6);
    const stack = stageStack(plan, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 });
    expect(stack.map((s) => s.id)).toEqual(["fix", "stabilize", "plan", "invest"]);
    const fix = stack.find((s) => s.id === "fix");
    const stabilize = stack.find((s) => s.id === "stabilize");
    expect(fix.horizon).toBe(6);
    expect(stabilize.startMonths).toBeLessThanOrEqual(fix.horizon);
    expect(stabilize.overlapsPrevious).toBe(true);
    expect(stabilize.overlapsStage).toBe("fix");
    expect(stack.find((s) => s.id === "plan").expanded).toBe(true);
    expect(stack.find((s) => s.id === "invest").expanded).toBe(true);
  });

  it("allows a Plan goal inside the Fix window and keeps the spine as priority, not walls", () => {
    const plan = rebuildWithFix(6);
    const phone = plan.milestones.find((m) => /phone/i.test(m.name));
    expect(phone.months).toBe(8);
    const overlapped = persistLike(setLivingGoalMonths(plan, phone.id, 4));
    const moved = overlapped.milestones.find((m) => m.id === phone.id);
    expect(moved.months).toBe(4);
    expect(moved.stage).toBe("plan");
    expect(overlapped.milestones.find((m) => m.role === "fix").stage).toBe("fix");
    expect(overlapped.milestones.find((m) => m.role === "floor").stage).toBe("stabilize");

    const stack = stageStack(overlapped, { netPct: 20, milestonePct: [40, 55, 60, 35], livingPct: 30 });
    expect(stack.map((s) => s.id)).toEqual(["fix", "stabilize", "plan", "invest"]);
    const planStage = stack.find((s) => s.id === "plan");
    expect(planStage.startMonths).toBe(4);
    expect(planStage.overlapsPrevious).toBe(true);
    expect(planStage.rows.find((r) => r.id === phone.id).stage).toBe("plan");
    const html = renderStageStackHtml(stack, escape);
    expect(html).toMatch(/data-overlap="stabilize"/);
    expect(html).toMatch(/overlaps Stabilize/);
    expect(html).toMatch(/data-time-id="/);
  });

  it("lets Invest overlap Plan when the growth pot is pulled forward", () => {
    const plan = rebuildWithFix(6);
    const pot = plan.milestones.find((m) => /growth pot/i.test(m.name));
    const next = persistLike(setLivingGoalMonths(plan, pot.id, 12));
    expect(next.milestones.find((m) => m.id === pot.id).stage).toBe("invest");
    const stack = stageStack(next, { netPct: 20, milestonePct: [40, 55, 60, 35] });
    const invest = stack.find((s) => s.id === "invest");
    expect(invest.startMonths).toBe(12);
    expect(invest.overlapsPrevious).toBe(true);
    expect(invest.overlapsStage).toBe("plan");
    expect(invest.horizon).toBe(12);
  });
});

describe("receiveFireHandoff still owns Fix tenor", () => {
  it("keeps a 3-or-6 Fix even after living goals overlap that window", () => {
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "sunday", months: 3 }),
    );
    const phone = handed.milestones.find((m) => /phone/i.test(m.name));
    const next = setLivingGoalMonths(handed, phone.id, 2);
    expect(next.milestones.find((m) => m.role === "fix").months).toBe(3);
    expect(next.milestones.find((m) => m.id === phone.id).months).toBe(2);
    expect(next.milestones.find((m) => m.id === phone.id).stage).toBe("plan");
  });
});
