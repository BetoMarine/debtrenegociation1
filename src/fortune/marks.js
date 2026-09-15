/**
 * Cached / fixture sleeve marks for silent Invest μ.
 * Load only — no live ticker, no Finnhub call, no API key.
 */
import fixtureMarksJson from "./fixtures/sleeve-marks.json";
import { getTemplate } from "./templates.js";
import {
  HOUSE_TARGET_WEIGHTS,
  MARK_SOURCES,
  SLEEVE_IDS,
  newMasterPortfolio,
  withMarks,
} from "./masterPortfolio.js";

/**
 * Projection proxies for illustration only. Unused until Finnhub; no API key.
 * Do not fetch.
 *
 * Locked (15 Sep 2026 by Beto): stocks 2800.HK, fixedIncome 2819.HK, cash CASH.
 * Interim: reit 0823.HK — single-name proxy until Hang Seng REIT index/ETF is
 * confirmed before live Finnhub.
 */
export const SLEEVE_TICKERS = {
  stocks: "2800.HK",
  fixedIncome: "2819.HK",
  reit: "0823.HK",
  cash: "CASH",
};

const WEIGHT_SUM_TOLERANCE = 1e-6;

export function fixtureMarks() {
  return fixtureMarksJson;
}

/**
 * Validate / normalize marks. Missing or invalid → null (soft-fail to 0.9.1 templates).
 * Accepts expectedReturn, or mu / totalReturn as total-return proxies.
 */
export function normalizeMarks(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = MARK_SOURCES.includes(raw.source) ? raw.source : null;
  if (!source) return null;
  const sleeves = {};
  for (const id of SLEEVE_IDS) {
    const sleeve = raw.sleeves?.[id];
    if (!sleeve || typeof sleeve !== "object") return null;
    const expectedReturn = Number(sleeve.expectedReturn ?? sleeve.mu ?? sleeve.totalReturn);
    if (!Number.isFinite(expectedReturn)) return null;
    const sigmaRaw = sleeve.sigma;
    const sigma = sigmaRaw == null || sigmaRaw === "" ? null : Number(sigmaRaw);
    if (sigma != null && !(Number.isFinite(sigma) && sigma >= 0)) return null;
    sleeves[id] = { expectedReturn, sigma };
  }
  return {
    asOf: raw.asOf == null ? null : String(raw.asOf),
    source,
    sleeves,
  };
}

/** Cached first (if valid), else bundled synthetic fixture. Never network. */
export function loadMarks({ cached = null, useFixture = true } = {}) {
  const fromCache = normalizeMarks(cached);
  if (fromCache) return fromCache;
  if (useFixture) return normalizeMarks(fixtureMarks());
  return null;
}

export function loadMasterPortfolio({ cachedMarks = null, useFixture = true } = {}) {
  const marks = loadMarks({ cached: cachedMarks, useFixture });
  return withMarks(newMasterPortfolio(), marks);
}

function weightSum(weights) {
  return SLEEVE_IDS.reduce((sum, id) => sum + (Number(weights?.[id]) || 0), 0);
}

/**
 * House-mix μ (and σ when every sleeve has one) from sleeve returns × locked house targets.
 * Invalid weights or marks → null (caller keeps template μ).
 */
export function deriveInvestMuSigma(marks, weights = HOUSE_TARGET_WEIGHTS) {
  const normalized = marks?.sleeves ? marks : normalizeMarks(marks);
  if (!normalized) return null;
  const w = weights && typeof weights === "object" ? weights : HOUSE_TARGET_WEIGHTS;
  const sum = weightSum(w);
  if (!(sum > 0) || Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) return null;

  let mu = 0;
  let sigma = 0;
  let sigmaComplete = true;
  for (const id of SLEEVE_IDS) {
    const wi = Number(w[id]);
    if (!Number.isFinite(wi) || wi < 0) return null;
    const sleeve = normalized.sleeves[id];
    const er = Number(sleeve?.expectedReturn);
    if (!Number.isFinite(er)) return null;
    mu += wi * er;
    const sig = sleeve?.sigma;
    if (sig != null && Number.isFinite(Number(sig)) && Number(sig) >= 0) sigma += Number(sig) * wi;
    else sigmaComplete = false;
  }
  return { mu, sigma: sigmaComplete ? sigma : null };
}

/** Overlay keeps the user's template id / copy; only μ/σ move. */
export function overlayInvestTemplate(plan, marks, weights = HOUSE_TARGET_WEIGHTS) {
  const derived = deriveInvestMuSigma(marks, weights);
  if (!derived) return null;
  const base = getTemplate(plan?.templateId);
  return {
    ...base,
    mu: derived.mu,
    sigma: derived.sigma == null ? base.sigma : derived.sigma,
    marksSource: marks.source || null,
    marksAsOf: marks.asOf || null,
  };
}

/**
 * Apply-on-open hook. Valid fixture/cached marks → { applied, options.template }.
 * Missing/invalid marks → { applied: false, options: {} } so Monte Carlo is
 * bit-identical to the 0.9.1 template path.
 */
export function applyInvestMarksOnOpen(plan, marksInput) {
  const marks = normalizeMarks(marksInput);
  if (!marks) return { applied: false, options: {}, marks: null };
  const template = overlayInvestTemplate(plan, marks);
  if (!template) return { applied: false, options: {}, marks: null };
  return { applied: true, options: { template }, marks };
}
