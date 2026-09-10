/** Portfolio templates are benchmarks, not products we sell. */

export const TEMPLATES = {
  steady: {
    id: "steady",
    label: "Steady",
    mu: 0.035,
    sigma: 0.05,
    mix: "20% growth-like · 60% FI · 20% cash",
    note: "Smoother path. Less upside, less wreckage.",
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    mu: 0.055,
    sigma: 0.1,
    mix: "50% growth-like · 40% FI · 10% cash",
    note: "A middle path. Still a benchmark, not a product.",
  },
  growth: {
    id: "growth",
    label: "Growth",
    mu: 0.08,
    sigma: 0.16,
    mix: "75% growth-like · 20% FI · 5% cash",
    note: "More swing. Living goals may land earlier — or miss.",
  },
  frontier: {
    id: "frontier",
    label: "Frontier",
    mu: 0.11,
    sigma: 0.24,
    mix: "40% tech-AI-like · 40% FI · 20% cash",
    note: "Illustrative mix only. Not a fund we sell.",
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

export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES.balanced;
}

export function formatMuSigma(template) {
  const mu = ((template?.mu ?? 0) * 100).toFixed(1);
  const sig = ((template?.sigma ?? 0) * 100).toFixed(0);
  return `Assumed ${mu}% a year · ${sig}% swing`;
}
