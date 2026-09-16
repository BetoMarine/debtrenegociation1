import { describe, expect, it } from "vitest";
import {
  FIX_GOAL_NAME,
  fixGoalLabel,
  isFireHandoff,
  makeFireHandoff,
  packImpliedFixMonths,
} from "./handoff.js";
import { receiveFireHandoff, receivedFixMilestone, ensureEmergencyFund } from "./fortune/stabilize.js";
import { newFortunePlan } from "./fortune/model.js";

describe("Fire Fix handoff", () => {
  it("names the Fix goal with 3 or 6 months, never a calendar date", () => {
    expect(fixGoalLabel({ months: 3, picked: true })).toBe("Debt renegotiation · 3 months");
    expect(fixGoalLabel({ months: 6, picked: true })).toBe("Debt renegotiation · 6 months");
    expect(fixGoalLabel({ months: 3, picked: false })).toBe("Debt renegotiation · 3 or 6 months");
    expect(fixGoalLabel({ months: 3, picked: true })).not.toMatch(/[A-Z][a-z]{2} 20\d\d/);
    expect(FIX_GOAL_NAME).toBe("Debt renegotiation");
  });

  it("Right Door creates the renegotiation milestone; Fortune does not invent it", () => {
    const fresh = newFortunePlan();
    expect(receivedFixMilestone(fresh)).toBeNull();
    expect(receiveFireHandoff(fresh, null).milestones.some((m) => m.role === "fix")).toBe(false);

    const created = makeFireHandoff({ source: "right-door", months: 6 });
    expect(created.name).toBe(FIX_GOAL_NAME);
    expect(isFireHandoff(created)).toBe(true);
    const received = receiveFireHandoff(fresh, created);
    const fix = receivedFixMilestone(received);
    expect(fix).toBeTruthy();
    expect(fix.name).toBe("Debt renegotiation · 6 months");
    expect(fix.months).toBe(6);
    expect(fix.stage).toBe("fix");
    expect(fix.source).toBe("right-door");
    expect(received.fixMonthsPicked).toBe(true);
  });

  it("maps pack tenor 3 to 3 and 6/9/12 to 6; missing tenor stays null", () => {
    expect(packImpliedFixMonths({ situation: { tenorMonths: "3", tenorStored: true } })).toBe(3);
    expect(packImpliedFixMonths({ situation: { tenorMonths: "6", tenorStored: true } })).toBe(6);
    expect(packImpliedFixMonths({ situation: { tenorMonths: "12", tenorStored: true } })).toBe(6);
    expect(packImpliedFixMonths({ fullName: "Ada", situation: { tenorMonths: "3" } })).toBe(3);
    expect(packImpliedFixMonths(null)).toBeNull();
    expect(packImpliedFixMonths({ situation: {} })).toBeNull();
    expect(packImpliedFixMonths({ situation: { tenorMonths: "6" } })).toBeNull();
  });

  it("Sunday handoff without tenor lets Fortune pick 3 vs 6 once", () => {
    const created = makeFireHandoff({ source: "sunday", months: null });
    const received = receiveFireHandoff(newFortunePlan(), created);
    const fix = receivedFixMilestone(received);
    expect(fix.source).toBe("sunday");
    expect(received.fixMonthsPicked).toBe(false);
    expect(fix.months).toBe(6);
    expect(fix.name).toBe("Debt renegotiation · 3 or 6 months");
  });

  it("keeps an emergency-fund milestone even when current amount is 0", () => {
    const plan = ensureEmergencyFund({
      ...newFortunePlan(),
      net: { emergencyMonths: 3, floorHkd: 0, currentHkd: 0 },
    });
    const floor = plan.milestones.find((m) => m.role === "floor");
    expect(floor).toBeTruthy();
    expect(floor.amount).toBe(0);
    expect(floor.stage).toBe("stabilize");
  });
});
