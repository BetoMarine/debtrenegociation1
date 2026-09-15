import { describe, expect, it } from "vitest";
import { runMonteCarlo } from "./engine.js";
import { HOUSE_TARGET_WEIGHTS, MARK_SOURCES, SLEEVE_IDS, newMasterPortfolio, withMarks } from "./masterPortfolio.js";
import {
  SLEEVE_TICKERS,
  applyInvestMarksOnOpen,
  deriveInvestMuSigma,
  fixtureMarks,
  loadMarks,
  normalizeMarks,
  overlayInvestTemplate,
} from "./marks.js";
import { getTemplate } from "./templates.js";
import { planningMu } from "./strategyBooks.js";
import { isStabilizeReady } from "./stabilize.js";
import { appendRebalanceLog, emptyRebalanceLog, normalizeRebalanceEntry } from "./rebalanceLog.js";
import { stageStack } from "./journey.js";
import { applyTheme, newFortunePlan } from "./model.js";
import { renderStageStackHtml } from "./ui.js";
import { readFileSync } from "node:fs";

const THIN_REBUILD = {
  theme: "rebuild",
  money: { incomeMonthly: 22000, spendMonthly: 18000, savings: 0, debts: 400000 },
  milestones: [{ id: "growth", name: "First growth pot", amount: 25000, months: 36, stage: "invest" }],
  net: { emergencyMonths: 6, floorHkd: 120000 },
  templateId: "balanced",
  inflationOn: false,
  seed: 8,
};

const FUNDED_PLAN = {
  money: { incomeMonthly: 35000, spendMonthly: 20000, savings: 300000, debts: 0 },
  milestones: [{ id: "growth", name: "First growth pot", amount: 80000, months: 18, stage: "invest" }],
  net: { emergencyMonths: 6, floorHkd: 120000 },
  templateId: "balanced",
  inflationOn: false,
  seed: 8,
};

function coreForecast(forecast) {
  const { runAt, ...rest } = forecast;
  return rest;
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("Fortune 0.9.2 silent house-mix marks", () => {
  it("labels the bundled fixture as synthetic and lists the four sleeves", () => {
    const fixture = fixtureMarks();
    expect(fixture._comment).toMatch(/SYNTHETIC/i);
    expect(fixture._comment).toMatch(/Not Finnhub/i);
    expect(fixture.source).toBe("fixture");
    expect(Object.keys(fixture.sleeves).sort()).toEqual([...SLEEVE_IDS].sort());
    expect(MARK_SOURCES).toEqual(["fixture", "parked", "finnhub", "manual"]);
  });

  it("keeps locked house targets (cash 0.25, FI 0.40, stocks 0.25, reit 0.10)", () => {
    const house = newMasterPortfolio();
    expect(house.targetWeights).toEqual({
      cash: 0.25,
      fixedIncome: 0.4,
      stocks: 0.25,
      reit: 0.1,
    });
    expect(house.lastMarks).toBeNull();
    expect(house.source).toBeNull();
    const marked = withMarks(house, normalizeMarks(fixtureMarks()));
    expect(marked.source).toBe("fixture");
    expect(marked.lastMarks.sleeves.stocks.expectedReturn).toBe(0.11);
  });

  it("derives Invest μ/σ from sleeve returns × locked house targets", () => {
    const derived = deriveInvestMuSigma(fixtureMarks(), HOUSE_TARGET_WEIGHTS);
    const w = HOUSE_TARGET_WEIGHTS;
    const s = fixtureMarks().sleeves;
    const mu = w.stocks * s.stocks.expectedReturn + w.fixedIncome * s.fixedIncome.expectedReturn + w.reit * s.reit.expectedReturn + w.cash * s.cash.expectedReturn;
    const sigma = w.stocks * s.stocks.sigma + w.fixedIncome * s.fixedIncome.sigma + w.reit * s.reit.sigma + w.cash * s.cash.sigma;
    expect(derived.mu).toBeCloseTo(mu, 12);
    expect(derived.sigma).toBeCloseTo(sigma, 12);
    expect(derived.mu).not.toBe(getTemplate("balanced").mu);
    expect(derived.mu).toBeCloseTo(0.05, 6);
    expect(derived.mu).toBeLessThan(planningMu("firm"));
  });

  it("before Stabilize, silent overlay stays floor-honest ~5% and ignores card 12/15/20/35", () => {
    expect(isStabilizeReady(THIN_REBUILD)).toBe(false);
    const overlay = applyInvestMarksOnOpen(THIN_REBUILD, loadMarks());
    expect(overlay.applied).toBe(true);
    expect(overlay.options.template.id).toBe("balanced");
    expect(overlay.options.template.mu).toBeCloseTo(0.05, 6);
    expect(overlay.options.template.mu).not.toBe(planningMu("balanced"));
    expect(overlay.options.template.mu).toBeLessThan(planningMu("firm"));

    const baseline = runMonteCarlo(THIN_REBUILD, { paths: 400, seed: 8, inflation: 0 });
    const marked = runMonteCarlo(THIN_REBUILD, { paths: 400, seed: 8, inflation: 0, ...overlay.options });
    expect(baseline.mu).toBe(getTemplate("balanced").mu);
    expect(marked.mu).toBeCloseTo(0.05, 6);
    expect(marked.mu).not.toBe(baseline.mu);
  });

  it("after Stabilize, silent overlay follows the selected card's planning μ", () => {
    expect(isStabilizeReady(FUNDED_PLAN)).toBe(true);
    const balanced = applyInvestMarksOnOpen(FUNDED_PLAN, loadMarks());
    expect(balanced.applied).toBe(true);
    expect(balanced.options.template.mu).toBe(planningMu("balanced"));
    expect(balanced.options.template.mu).toBe(0.15);

    const growth = applyInvestMarksOnOpen({ ...FUNDED_PLAN, templateId: "growth" }, loadMarks());
    expect(growth.options.template.mu).toBe(0.2);
    const firm = applyInvestMarksOnOpen({ ...FUNDED_PLAN, templateId: "firm" }, loadMarks());
    expect(firm.options.template.mu).toBe(0.12);
    const frontier = applyInvestMarksOnOpen({ ...FUNDED_PLAN, templateId: "frontier" }, loadMarks());
    expect(frontier.options.template.mu).toBe(0.35);

    const baseline = runMonteCarlo(FUNDED_PLAN, { paths: 250, seed: 8, inflation: 0 });
    const marked = runMonteCarlo(FUNDED_PLAN, { paths: 250, seed: 8, inflation: 0, ...balanced.options });
    expect(marked.mu).toBe(baseline.mu);
  });

  it("open-hook without marks (or invalid marks) stays bit-identical to the 0.9.1 template path", () => {
    const baseline = runMonteCarlo(FUNDED_PLAN, { paths: 250, seed: 8, inflation: 0 });
    const skipped = applyInvestMarksOnOpen(FUNDED_PLAN, null);
    const missing = applyInvestMarksOnOpen(FUNDED_PLAN, loadMarks({ useFixture: false }));
    const invalid = applyInvestMarksOnOpen(FUNDED_PLAN, { source: "fixture", sleeves: { stocks: { expectedReturn: 0.2 } } });
    const badSource = applyInvestMarksOnOpen(FUNDED_PLAN, { ...fixtureMarks(), source: "live" });

    expect(skipped.applied).toBe(false);
    expect(skipped.options).toEqual({});
    expect(missing.applied).toBe(false);
    expect(invalid.applied).toBe(false);
    expect(badSource.applied).toBe(false);

    const same = runMonteCarlo(FUNDED_PLAN, { paths: 250, seed: 8, inflation: 0, ...skipped.options });
    const sameMissing = runMonteCarlo(FUNDED_PLAN, { paths: 250, seed: 8, inflation: 0, ...missing.options });
    expect(coreForecast(same)).toEqual(coreForecast(baseline));
    expect(coreForecast(sameMissing)).toEqual(coreForecast(baseline));
    expect(overlayInvestTemplate(FUNDED_PLAN, null)).toBeNull();
    expect(normalizeMarks(undefined)).toBeNull();
  });

  it("prefers valid cached/parked marks over the bundled fixture", () => {
    const parked = {
      asOf: "2026-09-01",
      source: "parked",
      sleeves: {
        stocks: { expectedReturn: 0.04 },
        fixedIncome: { expectedReturn: 0.04 },
        reit: { expectedReturn: 0.04 },
        cash: { expectedReturn: 0.04 },
      },
    };
    const loaded = loadMarks({ cached: parked });
    expect(loaded.source).toBe("parked");
    expect(deriveInvestMuSigma(loaded).mu).toBeCloseTo(0.04, 12);
    expect(deriveInvestMuSigma(loaded).sigma).toBeNull();
    const overlay = overlayInvestTemplate({ templateId: "steady" }, loaded);
    expect(overlay.mu).toBeCloseTo(0.04, 12);
    expect(overlay.sigma).toBe(getTemplate("firm").sigma);
    expect(overlay.sigma).toBe(getTemplate("steady").sigma);
  });

  it("keeps locked/interim projection proxies unused — no Finnhub client, no secrets", () => {
    expect(SLEEVE_TICKERS).toEqual({
      stocks: "2800.HK",
      fixedIncome: "2819.HK",
      reit: "0823.HK",
      cash: "CASH",
    });
    const marksSrc = readFileSync(new URL("./marks.js", import.meta.url), "utf8");
    const masterSrc = readFileSync(new URL("./masterPortfolio.js", import.meta.url), "utf8");
    const appSrc = readFileSync(new URL("./app.js", import.meta.url), "utf8");
    expect(marksSrc).toMatch(/Locked \(15 Sep 2026 by Beto\): stocks 2800\.HK, fixedIncome 2819\.HK, cash CASH/);
    expect(marksSrc).toMatch(/Interim: reit 0823\.HK/);
    expect(marksSrc).toMatch(/Hang Seng REIT/);
    expect(marksSrc).toMatch(/illustration only/i);
    expect(marksSrc).not.toMatch(/finnhub\.com/i);
    expect(marksSrc).not.toMatch(/apiKey|API_KEY|secret/i);
    expect(masterSrc).toMatch(/LOCKED house targets/);
    expect(masterSrc).toMatch(/15 Sep 2026 by Beto/);
    expect(masterSrc).toMatch(/Projection-only\. Not custody\. Not advice/);
    expect(masterSrc).not.toMatch(/INTERIM_TARGET_WEIGHTS/);
    expect(appSrc).toMatch(/applyInvestMarksOnOpen/);
    expect(appSrc).toMatch(/loadMarks\(\)/);
    expect(appSrc).not.toMatch(/finnhub\.com/i);
  });

  it("board stays silent on sleeves while the Invest placeholder copy is unchanged", () => {
    const plan = applyTheme(newFortunePlan(), "grow");
    const html = renderStageStackHtml(stageStack(plan, { netPct: 10, milestonePct: [], livingPct: 10 }), escape);
    expect(html).toMatch(/Suggested mix \(after floor\) — not a product/);
    expect(html).not.toMatch(/fixedIncome/);
    expect(html).not.toMatch(/\bREIT\b/i);
    expect(html).not.toMatch(/2800\.HK/);
    expect(html).not.toMatch(/house mix/i);
    expect(html).not.toMatch(/Finnhub/i);
  });
});

describe("rebalance log (shape only)", () => {
  it("appends {at, reason, fromWeights, toWeights} and ignores invalid rows", () => {
    const fromWeights = { ...HOUSE_TARGET_WEIGHTS };
    const toWeights = { ...HOUSE_TARGET_WEIGHTS, cash: 0.2, stocks: 0.3 };
    const first = appendRebalanceLog(emptyRebalanceLog(), {
      at: 1,
      reason: "manual",
      fromWeights,
      toWeights,
    });
    expect(first).toHaveLength(1);
    expect(first[0]).toEqual({
      at: 1,
      reason: "manual",
      fromWeights,
      toWeights,
    });
    const second = appendRebalanceLog(first, { reason: "missing-weights" });
    expect(second).toHaveLength(1);
    expect(normalizeRebalanceEntry(null)).toBeNull();
    expect(first).toHaveLength(1);
  });
});
