export const CRUMB_KEYS = {
  dragNet: "drag_hurts_net",
  saveBorrow: "save_vs_borrow",
  compound: "compound_vs_cash",
  templateFloor: "template_floor",
};

export const CRUMB_COPY = {
  drag_hurts_net:
    "Pulling a living goal forward spends the pot earlier. The security net thins.",
  save_vs_borrow: "Saving waits. Borrowing buys the day — and the net pays the interest.",
  compound_vs_cash:
    "A growth mix compounds. Cash barely does. These are benchmarks, not a fund we sell.",
  template_floor:
    "Hold the floor first. Growth and Frontier wait until Stabilize is ready. Benchmarks only — not a fund we sell.",
};

export function crumbText(key) {
  return CRUMB_COPY[key] || "";
}

export function shouldShowCrumb(ui, key) {
  return !ui?.crumbsShown?.[key];
}

export function markCrumb(ui, key) {
  return {
    ...ui,
    crumbsShown: { ...(ui?.crumbsShown || {}), [key]: true },
  };
}
