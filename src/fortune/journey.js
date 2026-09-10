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

function shortName(item) {
  if (item.kind === "floor") return "Floor";
  const name = String(item.name || "").trim();
  if (name.length <= 14) return name;
  const words = name.split(/\s+/);
  if (words.length > 2) return `${words.slice(0, 2).join(" ")}`;
  return `${name.slice(0, 13)}…`;
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
  const stabilizePct = forecast?.netPct != null ? Math.round(forecast.netPct) : null;
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
  const here = currentStage(plan, forecast);
  items.unshift({
    id: "journey-today",
    kind: "today",
    stage: here,
    name: "Today",
    months: 0,
    amount: 0,
    pct: null,
    draggable: false,
  });
  return items.map((item) => ({ ...item, shortName: shortName(item) }));
}

/** Even columns along today→future so pin labels never stack on mobile. */
export function layoutJourneyPins(items) {
  const n = Math.max(1, items.length);
  return items.map((item, i) => ({
    ...item,
    slot: i,
    slots: n,
    leftPct: n === 1 ? 50 : Math.round((i / (n - 1)) * 1000) / 10,
  }));
}

/**
 * First incomplete beat on the ladder, so the board can say “You're in Stabilize”
 * without relying on memory of Steps 1–2.
 */
export function currentStage(plan, forecast) {
  const snap = stabilizeSnapshot(plan);
  if (plan?.theme === "rebuild" && needsFireCard(plan?.debtHeat)) return "fix";
  if (!snap.ready) return "stabilize";
  const miles = plan?.milestones || [];
  const invest = miles.filter((m) => inferStage(m) === "invest");
  const planned = miles.filter((m) => inferStage(m) !== "invest");
  const living = forecast?.livingPct;
  if (planned.length && (living == null || living < 70)) return "plan";
  if (invest.length) return "invest";
  if (planned.length) return "plan";
  return "stabilize";
}

export function emphasizeStage(plan, forecast) {
  return currentStage(plan, forecast);
}
