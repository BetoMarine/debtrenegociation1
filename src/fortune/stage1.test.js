import { describe, expect, it } from "vitest";
import { FIX_MILESTONE_ID } from "../handoff.js";
import { RD_PRODUCT } from "../shared/product-id.js";
import {
  askStage1Again,
  declineStage1,
  migrateFortunePlan,
  newFortunePlan,
  stage1Ticked,
} from "./model.js";
import { KV } from "../shared/storage/keys.js";

describe("fortunePlan schemaVersion 2 stage 1", () => {
  it("turns a legacy fix row into asked stage 1 without inventing cushion dates", () => {
    const plan = migrateFortunePlan({
      ...newFortunePlan(),
      schemaVersion: undefined,
      stage1: undefined,
      cushionStartedAt: undefined,
      cushionBuiltAt: undefined,
      milestones: [{ id: FIX_MILESTONE_ID, name: "Debt renegotiation", amount: 0, months: 6, source: RD_PRODUCT }],
    });
    expect(plan.schemaVersion).toBe(2);
    expect(plan.stage1).toMatchObject({
      source: "legacy",
      status: "asked",
      monthsAskedFor: 6,
      tenorMonths: 6,
      startMonth: null,
    });
    expect(plan.cushionStartedAt).toBeNull();
    expect(plan.cushionBuiltAt).toBeNull();
    expect(plan.milestones.find((m) => m.id === FIX_MILESTONE_ID).source).toBe(RD_PRODUCT);
  });

  it("does not tick a decline and does not touch cushion fields", () => {
    const start = {
      ...newFortunePlan(),
      cushionStartedAt: "2026-09",
      cushionBuiltAt: "2026-10",
      stage1: { ...newFortunePlan().stage1, status: "asked", startMonth: "2026-10", source: "rd-export" },
    };
    const declined = declineStage1(start, "idrp", "2026-11");
    expect(stage1Ticked(declined)).toBe(false);
    expect(declined.stage1.status).toBe("declined");
    expect(declined.stage1.declinedAt).toBe("2026-11");
    expect(declined.stage1.declinedRoutes).toEqual(["idrp"]);
    expect(declined.cushionStartedAt).toBe("2026-09");
    expect(declined.cushionBuiltAt).toBe("2026-10");
    expect(stage1Ticked(start)).toBe(true);
    expect(stage1Ticked({ stage1: { status: "none" } })).toBe(false);
  });

  it("asking again replaces the dates and returns status to asked", () => {
    const declined = declineStage1(
      { ...newFortunePlan(), stage1: { ...newFortunePlan().stage1, status: "asked", startMonth: "2026-10", doneAt: "2026-10" } },
      "hardship",
      "2026-11",
    );
    const again = askStage1Again(declined, { startMonth: "2027-01", doneAt: null, done: false });
    expect(again.stage1.status).toBe("asked");
    expect(again.stage1.startMonth).toBe("2027-01");
    expect(again.stage1.doneAt).toBeNull();
    expect(again.stage1.declinedAt).toBeNull();
    expect(again.stage1.agreedAt).toBeNull();
    expect(again.cushionStartedAt).toBe(declined.cushionStartedAt);
    expect(again.cushionBuiltAt).toBe(declined.cushionBuiltAt);
  });

  it("is idempotent", () => {
    const once = migrateFortunePlan({ id: "fortune-local", milestones: [] });
    const twice = migrateFortunePlan(once);
    expect(twice.stage1).toEqual(once.stage1);
    expect(twice.schemaVersion).toBe(2);
  });

  it("treats stage 1 as just another ft key when Fortune is erased", () => {
    const planKey = KV.ftPlan;
    expect(planKey).toBe("ft:plan");
    const erased = { [KV.ftErasedAt]: "2026-09" };
    expect(erased[planKey]).toBeUndefined();
  });
});
