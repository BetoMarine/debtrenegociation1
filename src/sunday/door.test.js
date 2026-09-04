import { describe, expect, it } from "vitest";
import { SUNDAY_DOORS, hasCrisisFlags, recommendSundayDoor } from "./door.js";

describe("recommendSundayDoor", () => {
  it("defaults to Enrich when there are no crisis flags", () => {
    expect(recommendSundayDoor([])).toBe(SUNDAY_DOORS.ENRICH);
    expect(recommendSundayDoor(["none"])).toBe(SUNDAY_DOORS.ENRICH);
    expect(hasCrisisFlags([])).toBe(false);
  });

  it("routes passport/coercion first", () => {
    expect(recommendSundayDoor(["passport"])).toBe(SUNDAY_DOORS.PASSPORT);
    expect(recommendSundayDoor(["agency", "shark", "passport"])).toBe(SUNDAY_DOORS.PASSPORT);
  });

  it("routes shark/threats to HELP ahead of agency fees and Enrich", () => {
    expect(recommendSundayDoor(["shark"])).toBe(SUNDAY_DOORS.SHARK);
    expect(recommendSundayDoor(["agency", "shark"])).toBe(SUNDAY_DOORS.SHARK);
  });

  it("routes illegal agency fees to Labour + consulate", () => {
    expect(recommendSundayDoor(["agency"])).toBe(SUNDAY_DOORS.AGENCY);
  });
});
