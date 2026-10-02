import { describe, expect, it } from "vitest";
import {
  FORTUNE_DATA_KEYS,
  LIVE_DB_NAME,
  assertWipeDatabase,
  databaseForFortuneWipe,
  isPreviewPath,
  storageDbNameFromPath,
} from "./db.js";

describe("preview storage isolation", () => {
  it("keeps live URLs on the live database", () => {
    expect(storageDbNameFromPath("/")).toBe(LIVE_DB_NAME);
    expect(storageDbNameFromPath("/debtrenegociation1/")).toBe(LIVE_DB_NAME);
    expect(storageDbNameFromPath("/debtrenegociation1/fortune/")).toBe(LIVE_DB_NAME);
    expect(storageDbNameFromPath("/debtrenegociation1/fortune/index.html")).toBe(LIVE_DB_NAME);
    expect(storageDbNameFromPath("/fortune/")).toBe(LIVE_DB_NAME);
  });

  it("gives this preview its own database name", () => {
    const path = "/debtrenegociation1/preview/pr-33/fortune/index.html";
    expect(isPreviewPath(path)).toBe(true);
    expect(storageDbNameFromPath(path)).toBe("pyl-preview-pr33");
    expect(storageDbNameFromPath(path)).not.toBe(LIVE_DB_NAME);
    expect(storageDbNameFromPath("/preview/pr-33/")).toBe("pyl-preview-pr33");
    expect(storageDbNameFromPath("/debtrenegociation1/preview/pr-28/index.html")).toBe("pyl-preview-pr28");
  });

  it("refuses a preview erase that would open the live database", () => {
    const preview = "/debtrenegociation1/preview/pr-33/fortune/index.html";
    expect(databaseForFortuneWipe(preview)).toBe("pyl-preview-pr33");
    expect(() => assertWipeDatabase(LIVE_DB_NAME, preview)).toThrow(/live database/);
    expect(assertWipeDatabase("pyl-preview-pr33", preview)).toBe("pyl-preview-pr33");
    expect(databaseForFortuneWipe("/debtrenegociation1/fortune/")).toBe(LIVE_DB_NAME);
    expect(assertWipeDatabase(LIVE_DB_NAME, "/debtrenegociation1/fortune/")).toBe(LIVE_DB_NAME);
  });

  it("fortune wipe keys stay fortune-only", () => {
    expect(FORTUNE_DATA_KEYS).toEqual([
      "fortunePlan",
      "fortuneForecast",
      "fortuneUi",
      "fortuneFireHandoff",
      "fortuneSliceA",
    ]);
    expect(FORTUNE_DATA_KEYS).not.toContain("pack");
    expect(FORTUNE_DATA_KEYS).not.toContain("sundayPack");
  });

});
