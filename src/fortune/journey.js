/**
 * Step 3 path: today → future, goals ordered Fix → Stabilize → Plan → Invest.
 * Pure module — timeline pins and stage labels. No DOM.
 */
import { needsFireCard, stabilizeSnapshot } from "./stabilize.js";

export const JOURNEY_STAGES = ["fix", "stabilize", "plan", "invest"];

export function stageRank(stage) {
  const i = JOURNEY_STAGES.indexOf(stage);
  return i < 0 ? JOURNEY_STAGES.indexOf("plan") : i;
}

export function inferStage(milestone) {
  if (JOURNEY_STAGES.includes(milestone?.stage)) return milestone.stage;
  const amount = Number(milestone?.amount) || 0;
  if (amount >= 500000) return "invest";
  return "plan";
}

/**
 * Pins for the today→future timeline. Time is the axis; stage is the ladder.
 * Rebuild always leads with Fix, then the emergency-fund pin, then living goals.
 */
export function journeyItems(plan, forecast, from = new Date()) {
  const items = [];
  const snap = stabilizeSnapshot(plan, from);
  const theme = plan?.theme;

  if (theme === "rebuild") {
    const fire = needsFireCard(plan?.debtHeat);
    items.push({
      id: "journey-fix",
      kind: "action",
      stage: "fix",
      name: fire ? "Fix the fire" : "Rebuild first",
      months: 1,
      amount: 0,
      pct: fire ? null : 100,
      draggable: false,
    });
  }

  const floorMonths = Math.max(2, Math.min(24, snap.targetMonths || 6));
  const fundedPct =
    snap.need > 0 ? Math.max(0, Math.min(100, Math.round((snap.money.savings / snap.need) * 100))) : 100;
  const stabilizePct = forecast?.netPct != null ? Math.round(forecast.netPct) : fundedPct;
  items.push({
    id: "journey-floor",
    kind: "floor",
    stage: "stabilize",
    name: "Emergency fund",
    months: floorMonths,
    amount: snap.need,
    pct: stabilizePct,
    draggable: false,
  });

  (plan?.milestones || []).forEach((m, i) => {
    const stage = inferStage(m);
    const raw = forecast?.milestonePct?.[i];
    items.push({
      id: m.id,
      kind: "goal",
      stage,
      name: m.name,
      months: Math.max(1, Math.round(Number(m.months) || 12)),
      amount: Number(m.amount) || 0,
      pct: raw != null && Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : null,
      draggable: true,
      milestoneIndex: i,
    });
  });

  items.sort((a, b) => a.months - b.months || stageRank(a.stage) - stageRank(b.stage) || a.name.localeCompare(b.name));
  return items;
}

export function emphasizeStage(plan) {
  if (plan?.theme === "rebuild") {
    return needsFireCard(plan?.debtHeat) ? "fix" : "stabilize";
  }
  if (plan?.theme === "grow") return "plan";
  return "stabilize";
}
