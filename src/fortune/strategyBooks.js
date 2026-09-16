/**
 * Locked Fortune growth-pot books — projection proxies only.
 * Not a fund we sell. Not custody. Not a buy list.
 */
import { isStabilizeReady } from "./stabilize.js";
import { CASH_BENCHMARK, TEMPLATE_IDS, canonicalTemplateId, getTemplate } from "./templates.js";

export const GATED_TEMPLATE_IDS = ["growth", "frontier"];

const PROXY = "Projection proxy only. Not a fund we sell.";

/** Family A chassis: public core, no leverage. Firm and Balanced share this DNA. */
const FAMILY_A = [
  { symbol: "2800.HK", sleeve: "stocks", note: `HK equity core. ${PROXY}` },
  { symbol: "2819.HK", sleeve: "fixedIncome", note: `HK bond index. ${PROXY}` },
  { symbol: "0823.HK", sleeve: "reit", note: `REIT sleeve (interim proxy). ${PROXY}` },
  { symbol: "CASH", sleeve: "cash", note: "Cash-like proxy. Not a deposit product." },
];

function familyAHoldings(weights) {
  return FAMILY_A.map((row) => ({ ...row, weight: weights[row.sleeve] }));
}

const BOOKS = {
  firm: {
    id: "firm",
    family: "A",
    leverageNotional: 1,
    fiWeight: 0.25,
    holdings: familyAHoldings({ stocks: 0.48, fixedIncome: 0.25, reit: 0.15, cash: 0.12 }),
  },
  balanced: {
    id: "balanced",
    family: "A",
    leverageNotional: 1,
    fiWeight: 0.3,
    holdings: familyAHoldings({ stocks: 0.5, fixedIncome: 0.3, reit: 0.12, cash: 0.08 }),
  },
  growth: {
    id: "growth",
    family: "B",
    leverageNotional: 1.25,
    fiWeight: 0.05,
    holdings: [
      { symbol: "2800.HK", sleeve: "stocks", weight: 0.4, note: `HK growth equity. ${PROXY}` },
      { symbol: "GLOBAL_EQ", sleeve: "stocks", weight: 0.3, note: `Global growth equity proxy. ${PROXY}` },
      { symbol: "3033.HK", sleeve: "satellite", weight: 0.2, note: `High-beta satellite (tech-like). ${PROXY}` },
      { symbol: "2819.HK", sleeve: "fixedIncome", weight: 0.05, note: `Token FI — almost no bonds. ${PROXY}` },
      { symbol: "CASH", sleeve: "cash", weight: 0.05, note: "Cash-like proxy. Not a deposit product." },
    ],
  },
  frontier: {
    id: "frontier",
    family: "C",
    leverageNotional: 2,
    fiWeight: 0,
    holdings: [
      { symbol: "2800.HK", sleeve: "stocks", weight: 0.3, note: `Growth core HK equity. ${PROXY}` },
      { symbol: "GLOBAL_EQ", sleeve: "stocks", weight: 0.25, note: `Growth core global proxy. ${PROXY}` },
      { symbol: "3033.HK", sleeve: "satellite", weight: 0.3, note: `Concentrated tech/AI-like. ${PROXY}` },
      { symbol: "CRYPTO_PROXY", sleeve: "satellite", weight: 0.1, note: `Crypto-like proxy. Speculative. ${PROXY}` },
      { symbol: "CASH", sleeve: "cash", weight: 0.05, note: "Cash-like proxy. Not a deposit product." },
    ],
  },
};

export function bookForTemplate(id) {
  return BOOKS[canonicalTemplateId(id)];
}

export function planningMu(id) {
  return getTemplate(id).mu;
}

/** House-mix floor index before the emergency fund is ready. ~5%. */
export const SILENT_INVEST_MU = 0.05;

/** Card μ after the emergency fund; silent ~0.05 until then. */
export function effectiveInvestMu(plan, from) {
  if (!isStabilizeReady(plan, from)) return SILENT_INVEST_MU;
  return planningMu(plan?.templateId);
}

/**
 * Months to reach a HKD target with a monthly contribution under annual μ.
 * Monthly compounding. Null if leftover cannot get there.
 */
export function timeToGoal({ target, monthly, mu, principal = 0 } = {}) {
  const need = Math.max(0, Number(target) || 0);
  const pmt = Number(monthly) || 0;
  const start = Math.max(0, Number(principal) || 0);
  const annual = Number(mu) || 0;
  if (need <= start + 1e-9) return 0;
  if (!(pmt > 0) && start + 1e-9 < need) return null;
  const r = annual / 12;
  if (!(r > 0)) {
    if (!(pmt > 0)) return null;
    return Math.max(1, Math.ceil((need - start) / pmt));
  }
  const num = need * r + pmt;
  const den = start * r + pmt;
  if (!(den > 0) || num / den <= 0) return null;
  const n = Math.log(num / den) / Math.log(1 + r);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n <= 1e-9) return 0;
  return Math.max(1, Math.ceil(n - 1e-9));
}

export function boostVsCash({ target, monthly, principal = 0, investMu, cashMu = CASH_BENCHMARK.mu } = {}) {
  const cashMonths = timeToGoal({ target, monthly, mu: cashMu, principal });
  const investMonths = timeToGoal({ target, monthly, mu: investMu, principal });
  if (cashMonths == null || investMonths == null) {
    return { cashMonths, investMonths, soonerMonths: null };
  }
  return {
    cashMonths,
    investMonths,
    soonerMonths: Math.max(0, cashMonths - investMonths),
  };
}

export function isGatedTemplate(id) {
  return GATED_TEMPLATE_IDS.includes(canonicalTemplateId(id));
}

/**
 * Whether Adjust may set this card. Growth/Frontier need Stabilize/EF floor OK.
 * Frontier still needs a UI warning before apply.
 */
export function resolveTemplatePick(plan, id) {
  const templateId = canonicalTemplateId(id);
  if (!TEMPLATE_IDS.includes(templateId)) {
    return { ok: false, templateId: canonicalTemplateId(plan?.templateId), reason: "unknown" };
  }
  if (isGatedTemplate(templateId) && !isStabilizeReady(plan)) {
    return { ok: false, templateId, reason: "floor" };
  }
  return { ok: true, templateId, warnFrontier: templateId === "frontier" };
}
