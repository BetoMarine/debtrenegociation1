import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { offshoreKey } from "./logic.js";
import { DATA_KEY, freshState } from "./store.js";

const screens = readFileSync(new URL("./screens.js", import.meta.url), "utf8");
const sw = readFileSync(new URL("../../public/offshore/sw.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../../offshore/index.html", import.meta.url), "utf8");

describe("Offshore version locks", () => {
  it("keeps a separate offshore-data store", () => {
    expect(DATA_KEY).toBe("offshore-data");
    expect(["pack", "sundayPack", "fortunePlan", "fortuneForecast"]).not.toContain(DATA_KEY);
    expect(offshoreKey("offshore-data")).toBe(true);
    expect(offshoreKey("offshore-shell-1")).toBe(true);
    expect(offshoreKey("right-door")).toBe(false);
    expect(offshoreKey("sundayPack")).toBe(false);
    expect(offshoreKey("fortunePlan")).toBe(false);
    expect(freshState().sundayPack).toEqual({ started: false });
  });

  it("sends helpers debt support to this repo’s Sunday Pack", () => {
    expect(screens).toContain("https://betomarine.github.io/debtrenegociation1/sunday/");
    expect(screens).not.toContain("github.io/Offshore");
  });

  it("keeps passport and paper questions out of the Fix shrink step", () => {
    const fixStart = screens.indexOf("f01(state)");
    const fixEnd = screens.indexOf("f04(state)");
    const fix = screens.slice(fixStart, fixEnd);
    expect(fix).not.toMatch(/passport/i);
    expect(screens).toMatch(/Does anyone hold your passport, phone or card/);
    expect(screens).toMatch(/Check a loan’s papers/);
    expect(screens).toMatch(/Nothing invented/);
  });

  it("scopes its own service worker to offshore caches", () => {
    expect(sw).toMatch(/startsWith\('offshore-'\)/);
    expect(sw).not.toMatch(/fortune|sundayPack|right-door/);
    expect(html).toContain('data-offshore-app="offshore"');
    expect(html).toContain("offshore-shell-guard");
    expect(html).toContain("/src/offshore/main.js");
  });
});
