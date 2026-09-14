/**
 * House master portfolio — projection-only. Never custody.
 * Mix disclosure UI is out of scope for 0.9.2; this model feeds silent Invest μ.
 */

export const SLEEVE_IDS = ["stocks", "fixedIncome", "reit", "cash"];

/**
 * Interim target weights until Beto/Linda lock the house mix.
 * Not a product we sell. Not advice. Projection-only.
 *
 *   cash        0.25
 *   fixedIncome 0.40
 *   stocks      0.25
 *   reit        0.10
 */
export const INTERIM_TARGET_WEIGHTS = {
  cash: 0.25,
  fixedIncome: 0.4,
  stocks: 0.25,
  reit: 0.1,
};

/** lastMarks.source — "finnhub" is reserved; 0.9.2 never fetches. */
export const MARK_SOURCES = ["fixture", "parked", "finnhub", "manual"];

export function emptyLastMarks() {
  return {
    asOf: null,
    source: null,
    sleeves: {
      stocks: null,
      fixedIncome: null,
      reit: null,
      cash: null,
    },
  };
}

export function newMasterPortfolio() {
  return {
    sleeveIds: [...SLEEVE_IDS],
    /** Interim until Beto/Linda lock. */
    targetWeights: { ...INTERIM_TARGET_WEIGHTS },
    lastMarks: null,
    asOf: null,
    source: null,
  };
}

export function withMarks(portfolio, marks) {
  const base = portfolio && typeof portfolio === "object" ? portfolio : newMasterPortfolio();
  if (!marks) {
    return { ...base, lastMarks: null, asOf: null, source: null };
  }
  return {
    ...base,
    lastMarks: marks,
    asOf: marks.asOf ?? null,
    source: MARK_SOURCES.includes(marks.source) ? marks.source : null,
  };
}
