/**
 * Rebuild coach: honest fail plus one-tap next steps.
 * Pure module — no DOM. Used by the board and unit tests.
 */
import { hkd, resolveMoney } from "./model.js";
import { TEMPLATES } from "./templates.js";

export function shouldShowCoach(forecast) {
  if (!forecast) return false;
  return !!(forecast.hardFail || forecast.verdict === "wrecked" || forecast.verdict === "stretched");
}

export function isEmptyPot(plan) {
  const money = resolveMoney(plan?.money || {});
  return money.incomeMonthly <= 0 && money.savings <= 0;
}

export function breakingMilestones(plan, forecast, n = 2) {
  const miles = plan?.milestones || [];
  const scored = miles.map((m, i) => ({
    id: m.id,
    name: m.name,
    amount: Number(m.amount) || 0,
    months: Number(m.months) || 1,
    pct: Number(forecast?.milestonePct?.[i] ?? 0),
    shortfall: Number(forecast?.medianShortfall?.[i] ?? 0),
  }));
  scored.sort(
    (a, b) => a.pct - b.pct || b.shortfall - a.shortfall || a.months - b.months || b.amount - a.amount,
  );
  const weak = scored.filter((m) => m.pct < 95 || m.shortfall > 0);
  return (weak.length ? weak : scored).slice(0, n);
}

export function focusMilestone(plan, forecast) {
  return breakingMilestones(plan, forecast, 1)[0] || null;
}

function nextGrowthTemplate(templateId) {
  if (templateId === "steady") return "growth";
  if (templateId === "balanced") return "frontier";
  return null;
}

/**
 * Ordered coach actions. Empty pot (0 income + 0 savings) puts money bands first;
 * delay/cut remain so the board never looks like a dead end.
 */
export function coachActions(plan, forecast) {
  const empty = isEmptyPot(plan);
  const focus = focusMilestone(plan, forecast);
  const actions = [];

  if (empty) {
    actions.push({
      key: "edit-money",
      id: "edit-money",
      kind: "primary",
      label: "Add income or savings",
    });
  }

  if (focus) {
    actions.push({
      key: `delay:${focus.id}`,
      id: "delay",
      kind: empty ? "secondary" : "primary",
      goalId: focus.id,
      goalName: focus.name,
      label: `Delay ${focus.name} 12 months`,
    });
    actions.push({
      key: `cut:${focus.id}`,
      id: "cut",
      kind: "secondary",
      goalId: focus.id,
      goalName: focus.name,
      label: `Cut ${focus.name} 20%`,
    });
  }

  if ((plan?.milestones || []).length > 0) {
    actions.push({
      key: "push-all",
      id: "push-all",
      kind: "secondary",
      label: "Push all living goals +6 months",
    });
  }

  const nextT = nextGrowthTemplate(plan?.templateId);
  if (nextT) {
    const tmpl = TEMPLATES[nextT];
    actions.push({
      key: `template:${nextT}`,
      id: "template",
      kind: "secondary",
      templateId: nextT,
      label: `Try ${tmpl.label} mix — illustrative, not a fund we sell`,
    });
  }

  if (!empty) {
    actions.push({
      key: "edit-money",
      id: "edit-money",
      kind: "secondary",
      label: "Raise savings or income",
    });
  }

  const months = Number(plan?.net?.emergencyMonths) || 0;
  if (months >= 2) {
    actions.push({
      key: "soften-net",
      id: "soften-net",
      kind: "secondary",
      label: "Ease the net by 2 emergency months",
    });
  }
  actions.push({
    key: "edit-net",
    id: "edit-net",
    kind: "secondary",
    label: "Edit the security net",
  });

  return actions;
}

/** Board chips: one primary plus at most two more. */
export function boardCoachActions(plan, forecast) {
  return coachActions(plan, forecast).slice(0, 3);
}

export function applyCoachAction(plan, action) {
  if (!plan || !action) return plan;
  const next = {
    ...plan,
    milestones: (plan.milestones || []).map((m) => ({ ...m })),
    net: { ...(plan.net || {}) },
    money: { ...(plan.money || {}) },
  };
  if (action.id === "delay") {
    const m = next.milestones.find((x) => x.id === action.goalId);
    if (m) m.months = Math.min(240, Math.max(1, Math.round(Number(m.months) || 1) + 12));
  }
  if (action.id === "cut") {
    const m = next.milestones.find((x) => x.id === action.goalId);
    if (m) m.amount = Math.max(0, Math.round((Number(m.amount) || 0) * 0.8));
  }
  if (action.id === "push-all") {
    next.milestones.forEach((m) => {
      m.months = Math.min(240, Math.max(1, Math.round(Number(m.months) || 1) + 6));
    });
  }
  if (action.id === "template" && action.templateId) {
    next.templateId = action.templateId;
  }
  if (action.id === "soften-net") {
    next.net.emergencyMonths = Math.max(0, Math.round(Number(next.net.emergencyMonths) || 0) - 2);
  }
  return next;
}

export function coachBreakLines(plan, forecast) {
  const living = Math.round(forecast?.livingPct ?? 0);
  const net = Math.round(forecast?.netPct ?? 0);
  const lines = [`Living ${living}% · Net ${net}%`];
  const breaks = breakingMilestones(plan, forecast, 2);
  breaks.forEach((m) => {
    const gap = m.shortfall > 0 ? ` · typical gap ${hkd(m.shortfall)}` : "";
    lines.push(`${m.name}: ${Math.round(m.pct)}% funded${gap}`);
  });
  return lines;
}

export function coachCrumb(action, before, after, stillEmpty) {
  const b = Math.round(before?.livingPct ?? 0);
  const a = Math.round(after?.livingPct ?? 0);
  const nb = Math.round(before?.netPct ?? 0);
  const na = Math.round(after?.netPct ?? 0);
  const stillWrecked = after?.hardFail || after?.verdict === "wrecked";
  const moneyNote = stillEmpty && stillWrecked ? " Income or savings has to rise." : "";
  if (action?.id === "delay") {
    return `Delayed ${action.goalName || "that goal"} 12 months — Living ${b}% → ${a}%.${moneyNote}`;
  }
  if (action?.id === "cut") {
    return `Cut ${action.goalName || "that goal"} by 20% — Living ${b}% → ${a}%.${moneyNote}`;
  }
  if (action?.id === "push-all") {
    return `Pushed living goals six months — Living ${b}% → ${a}%.${moneyNote}`;
  }
  if (action?.id === "template") {
    const name = TEMPLATES[action.templateId]?.label || "a growth mix";
    return `Tried ${name} — Living ${b}% → ${a}%. Illustrative, not a fund we sell.`;
  }
  if (action?.id === "soften-net") {
    return `Eased the net by two months — Net ${nb}% → ${na}%.`;
  }
  return "";
}
