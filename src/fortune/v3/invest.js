/**
 * Invest returns v2 for the preview grow screen.
 * Bad-year loss is computed (return − 1.645 × swing), never typed on the card.
 * Balanced swing 0.12 is the table value that rounds to the approved 15% loss.
 * The spec file is not in this repo; if Linda's swing differs, change this table only.
 * The app never assigns a card.
 */

export const CASH_MU = 0.012;

export const INVEST_CARDS = [
  {
    id: "firm",
    label: "Firm",
    mu: 0.05,
    swing: 0.08,
    fiWeight: 0.45,
    leverageNotional: 1,
    mix: { stocks: 0.3, bonds: 0.45, reit: 0.1, cash: 0.15 },
    noteKey: "firmNote",
  },
  {
    id: "balanced",
    label: "Balanced",
    mu: 0.06,
    swing: 0.12,
    leverageNotional: 1,
    noteKey: "balancedNote",
  },
  {
    id: "growth",
    label: "Growth",
    mu: 0.07,
    swing: 0.17,
    leverageNotional: 1,
    noteKey: "growthNote",
  },
  {
    id: "frontier",
    label: "Frontier",
    mu: 0.08,
    swing: 0.19,
    leverageNotional: 1,
    noteKey: "frontierNote",
  },
];

/** Loss as a positive percent, nearest 5. */
export function badYearLossPercent(mu, swing) {
  const loss = -(Number(mu) - 1.645 * Number(swing));
  return Math.round(loss / 0.05) * 5;
}

export function cardById(id) {
  return INVEST_CARDS.find((card) => card.id === id) || null;
}

/** Advice-boundary guard. Nothing in the answers selects a card. */
export function assignedCard() {
  return null;
}
