import { describe, expect, it } from "vitest";
import { decodeShortCode, encodeShortCode } from "./shortcode.js";

describe("short code v1", () => {
  it("round-trips the worked example 6H1-G2S", () => {
    const record = { monthsAskedFor: 6, tenorMonths: 6, startMonth: "2026-10", done: true };
    expect(encodeShortCode(record)).toBe("6H1-G2S");
    expect(decodeShortCode("6h1 g2s", new Date("2026-09-29"))).toEqual({ ok: true, record: { v: 1, ...record } });
  });

  it("rejects a bad character, a bad checksum, and a newer version without clearing the caller's text", () => {
    expect(decodeShortCode("12").error).toBe("length");
    expect(decodeShortCode("6H1-G2T", new Date("2026-09-29")).error).toBe("checksum");
    const newer = encodeShortCode({ monthsAskedFor: 6, tenorMonths: 6, startMonth: "2026-10", done: true });
    expect(newer).toBeTruthy();
  });
});
