/** Portfolio templates are benchmarks, not products we sell. */

export const LEGACY_TEMPLATE_MAP = { steady: "firm" };

export const TEMPLATES = {
  firm: {
    id: "firm",
    label: "Firm",
    mu: 0.12,
    sigma: 0.16,
    mix: "48% stocks · 25% FI · 15% REIT · 12% cash",
    note: "Not a deposit. Equity-led, not bond-safe. Not a fund we sell.",
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    mu: 0.15,
    sigma: 0.2,
    mix: "50% stocks · 30% FI · 12% REIT · 8% cash",
    note: "Shared public core with Firm, different weights. Not a fund we sell.",
  },
  growth: {
    id: "growth",
    label: "Growth",
    mu: 0.2,
    sigma: 0.28,
    mix: "70% global+HK growth · 20% high-beta · 5% FI · 5% cash",
    note: "Illustrates a ~1.25× levered equity sleeve. Swing can be sharp. Not a fund we sell.",
  },
  frontier: {
    id: "frontier",
    label: "Frontier",
    mu: 0.35,
    sigma: 0.45,
    mix: "55% growth core · 40% tech/AI-like · 5% cash · 0% FI",
    note: "Speculative. Illustrates ~2× leverage and concentrated tech/AI-like risk. Not a fund we sell.",
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

/** Cash-like benchmark used only for the compound-vs-cash crumb / compare. */
export const CASH_BENCHMARK = {
  id: "cash",
  label: "Cash-like",
  mu: 0.012,
  sigma: 0.008,
  mix: "100% cash-like",
  note: "Illustrative. Not a product.",
};

export const TEMPLATE_DISCLAIMER = "Illustrative, not a fund we sell.";

export function canonicalTemplateId(id) {
  const mapped = LEGACY_TEMPLATE_MAP[id] || id;
  return TEMPLATE_IDS.includes(mapped) ? mapped : "balanced";
}

export function getTemplate(id) {
  return TEMPLATES[canonicalTemplateId(id)];
}

export function formatMuSigma(template) {
  const mu = ((template?.mu ?? 0) * 100).toFixed(1);
  const sig = ((template?.sigma ?? 0) * 100).toFixed(0);
  return `Assumed ${mu}% a year · ${sig}% swing`;
}

/** FI share from a mix string. Missing “N% FI” reads as 0 (Frontier). */
export function mixFiPercent(mix) {
  const hit = String(mix || "").match(/(\d+(?:\.\d+)?)\s*%\s*FI\b/i);
  return hit ? Number(hit[1]) : 0;
}
