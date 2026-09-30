import { describe, expect, it } from "vitest";
import { a2FoundState } from "./found.js";

const exp = (exportedAt) => ({ v: 1, exportedAt, monthsAskedFor: 6, tenorMonths: 6 });

describe("A2 found state", () => {
  it("(a) export month before erase stays hidden until the manual tap", () => {
    const state = a2FoundState({ rdExport: exp("2026-08-15"), erasedAt: "2026-09" });
    expect(state.found).toBe(false);
    expect(state.manualCanFind).toBe(true);
  });

  it("(b) a newer export month is the found state", () => {
    expect(a2FoundState({ rdExport: exp("2026-10-02"), erasedAt: "2026-09" }).found).toBe(true);
  });

  it("(c) an export with no erase marker is the found state", () => {
    expect(a2FoundState({ rdExport: exp("2026-09-01") }).found).toBe(true);
  });

  it("the same month needs the manual tap", () => {
    const state = a2FoundState({ rdExport: exp("2026-09-29"), erasedAt: "2026-09" });
    expect(state.found).toBe(false);
    expect(state.manualCanFind).toBe(true);
  });

  it("(d) a preview namespace does not read a live export", () => {
    const live = { rdExport: exp("2026-10-01"), erasedAt: "2026-01" };
    const previewNs = "pyl-preview-pr12";
    const seen = previewNs.startsWith("pyl-preview-") ? {} : live;
    const state = a2FoundState(seen);
    expect(state.found).toBe(false);
    expect(state.path).toBe("nothing");
    expect(live.rdExport.exportedAt).toBe("2026-10-01");
  });
});
