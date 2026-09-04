import { describe, expect, it } from "vitest";
import { DOORS, recommendDoor } from "./door.js";

describe("recommendDoor", () => {
  it("returns other when empty", () => {
    expect(recommendDoor([])).toBe(DOORS.OTHER);
    expect(recommendDoor(null)).toBe(DOORS.OTHER);
  });

  it("routes two or more creditors to IDRP", () => {
    expect(
      recommendDoor([
        { type: "hsbc" },
        { type: "citi" },
      ]),
    ).toBe(DOORS.IDRP);
    expect(
      recommendDoor([
        { type: "hang_seng" },
        { type: "boc" },
        { type: "other" },
      ]),
    ).toBe(DOORS.IDRP);
  });

  it("routes a single HSBC account to the published workout path", () => {
    expect(recommendDoor([{ type: "hsbc" }])).toBe(DOORS.HSBC_WORKOUT);
  });

  it("routes a single Citi account to CitiPhone, not an invented unit", () => {
    expect(recommendDoor([{ type: "citi" }])).toBe(DOORS.CITI);
  });

  it("routes Hang Seng, BOC, other, or a money lender alone to the statement number", () => {
    expect(recommendDoor([{ type: "hang_seng" }])).toBe(DOORS.OTHER);
    expect(recommendDoor([{ type: "boc" }])).toBe(DOORS.OTHER);
    expect(recommendDoor([{ type: "other" }])).toBe(DOORS.OTHER);
    expect(recommendDoor([{ type: "money_lender" }])).toBe(DOORS.OTHER);
  });
});
