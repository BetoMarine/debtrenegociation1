import { describe, expect, it } from "vitest";
import { EVENT_TYPES, countEvents, isAllowedEvent, makeEvent } from "./events.js";

describe("events", () => {
  it("only allows the published enums", () => {
    for (const type of EVENT_TYPES) {
      expect(isAllowedEvent(type)).toBe(true);
    }
    expect(isAllowedEvent("name_entered")).toBe(false);
    expect(() => makeEvent("hkid_captured")).toThrow();
  });

  it("stores no free-text payload", () => {
    const event = makeEvent("door_chosen", "idrp");
    expect(event).toEqual({ type: "door_chosen", at: event.at, enum: "idrp" });
    expect(JSON.stringify(event)).not.toMatch(/HKID|amount|letter|name/i);
    expect(() => makeEvent("status_tapped", "a very long free-text story about money")).toThrow();
  });

  it("counts only known types", () => {
    const counts = countEvents([
      { type: "app_open" },
      { type: "app_open" },
      { type: "share_tapped" },
      { type: "secret_leak" },
    ]);
    expect(counts.app_open).toBe(2);
    expect(counts.share_tapped).toBe(1);
    expect(counts).not.toHaveProperty("secret_leak");
  });
});
