import { describe, expect, it } from "vitest";
import {
  canGeneratePdf,
  newSundayPack,
  splitIsValid,
  splitTotal,
  triageComplete,
} from "./model.js";

describe("Sunday Pack model", () => {
  it("blocks PDF until there is a loan, unless this is a crisis pack", () => {
    const pack = newSundayPack("en");
    pack.privacyAccepted = true;
    expect(canGeneratePdf(pack)).toBe(false);
    pack.loans = [{ nickname: "Happy Finance", type: "hk_money_lender" }];
    expect(canGeneratePdf(pack)).toBe(true);
    const crisis = newSundayPack("en");
    crisis.privacyAccepted = true;
    crisis.flags = ["passport"];
    expect(canGeneratePdf(crisis)).toBe(true);
  });

  it("requires remittance parts to sum to 100", () => {
    expect(splitTotal({ bills: "40", allowance: "35", keep: "25" })).toBe(100);
    expect(splitIsValid({ bills: "40", allowance: "35", keep: "25" })).toBe(true);
    expect(splitIsValid({ bills: "40", allowance: "35", keep: "20" })).toBe(false);
    expect(splitIsValid({ bills: "", allowance: "50", keep: "50" })).toBe(false);
  });

  it("treats none-of-above as a completed triage", () => {
    expect(triageComplete({ flags: [], noneOfAbove: true })).toBe(true);
    expect(triageComplete({ flags: ["shark"], noneOfAbove: false })).toBe(true);
    expect(triageComplete({ flags: [], noneOfAbove: false })).toBe(false);
  });
});
