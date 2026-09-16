/**
 * Step 3 board: Fix → Stabilize → Plan → Invest as a vertical stage stack.
 * Pure module — stage rows, rollups, and labels. No DOM.
 */
import { INVEST_PLACEHOLDER_ID, INVEST_PLACEHOLDER_NAME, EF_MILESTONE_ID, fixGoalLabel } from "../handoff.js";
import { clampGoalMonths, emergencyCurrentHkd, isLivingGoal, milestoneRole, monthYearLabel } from "./model.js";
import { fireFixMonths, needsFireCard, receivedFixMilestone, stabilizeSnapshot } from "./stabilize.js";
import { planSchedule, whenLabelForRow } from "./timeline.js";

export const JOURNEY_STAGES = ["fix", "stabilize", "plan", "invest"];

/** Vertical drag on a row handle: down = later, up = sooner. Phone-sized. */
export const TIME_DRAG_PX_PER_MONTH = 12;

export function stageRank(stage) {
  const i = JOURNEY_STAGES.indexOf(stage);
  return i < 0 ? JOURNEY_STAGES.indexOf("plan") : i;
}

/** Map a pointer drag (px) onto a new months value. Does not change stage. */
export function monthsFromDrag(startMonths, deltaY, pxPerMonth = TIME_DRAG_PX_PER_MONTH) {
  const px = Number(pxPerMonth) > 0 ? Number(pxPerMonth) : TIME_DRAG_PX_PER_MONTH;
  const delta = Math.round(Number(deltaY) / px);
  return clampGoalMonths((Number(startMonths) || 12) + delta);
}

function rowTenors(rows) {
  return (rows || [])
    .map((row) => Math.round(Number(row?.months)))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

/** Phase end = max(months) of goals in the stage. Empty stage → null. */
export function stageHorizonMonths(rows) {
  const months = rowTenors(rows);
  return months.length ? Math.max(...months) : null;
}

export function stageStartMonths(rows) {
  const months = (rows || [])
    .map((row) => {
      if (Number.isFinite(Number(row?.startMonths))) return Math.round(Number(row.startMonths));
      return Math.round(Number(row?.months));
    })
    .filter((n) => Number.isFinite(n) && n >= 0);
  return months.length ? Math.min(...months) : null;
}

/** Sequence is priority, not hiding — Plan/Invest stay open with Fix + EF. */
export function defaultOpenStages() {
  return new Set(JOURNEY_STAGES);
}

export function inferStage(milestone) {
  if (JOURNEY_STAGES.includes(milestone?.stage)) return milestone.stage;
  const amount = Number(milestone?.amount) || 0;
  if (amount >= 500000) return "invest";
  return "plan";
}

function shortName(item) {
  if (item.kind === "floor") return "EF now";
  const name = String(item.name || "").trim();
  // Fix titles carry “3 months” / “6 months” — do not drop that to a date or a stub.
  if (item.kind === "action" || item.stage === "fix") return name;
  if (name.length <= 14) return name;
  const words = name.split(/\s+/);
  if (words.length > 2) return `${words.slice(0, 2).join(" ")}`;
  return `${name.slice(0, 13)}…`;
}

/**
 * Date or range shown under every board row. Calendar month/year — never a tenor-only string.
 * Never replaces the Fix 3/6-month title.
 */
export function rowWhenLabel(item, from = new Date(), schedule = null) {
  if (!item) return "";
  if (schedule) return whenLabelForRow(item, schedule, from);
  if (item.kind === "action" || item.stage === "fix") {
    const start = Number.isFinite(Number(item.startMonths)) ? Number(item.startMonths) : 0;
    const end = Math.max(start, Math.round(Number(item.months) || 0));
    return `${monthYearLabel(start, from)} → ${monthYearLabel(end, from)}`.replace(
      /^(.+) → \1$/,
      "$1",
    );
  }
  if (item.kind === "floor") {
    const start = Number.isFinite(Number(item.startMonths)) ? Number(item.startMonths) : 0;
    const end = Math.max(start, Math.round(Number(item.months) || 0));
    if (item.ready) return `Complete now · ${monthYearLabel(end, from)}`;
    return `Start ${monthYearLabel(start, from)} · complete ${monthYearLabel(end, from)}`;
  }
  const months = Math.max(0, Math.round(Number(item.months) || 0));
  if (!Number.isFinite(months)) return "";
  const date = monthYearLabel(months, from);
  if (item.kind === "today") return date;
  if (item.stage === "invest" || item.kind === "placeholder") {
    const start = Number.isFinite(Number(item.startMonths)) ? Number(item.startMonths) : months;
    return `Start saving ${monthYearLabel(start, from)} · enough ${date}`;
  }
  return date;
}

function itemPct(raw) {
  return raw != null && Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : null;
}

/**
 * All beats including Today. Kept so existing tests and forecast wiring stay stable.
 * The home board uses stageStack() — not a multi-pin path chart.
 */
export function journeyItems(plan, forecast, from = new Date()) {
  const items = [];
  const snap = stabilizeSnapshot(plan, from);
  const theme = plan?.theme;
  const schedule = planSchedule(plan, forecast, from);

  const received = receivedFixMilestone(plan);
  if (received) {
    const stored = fireFixMonths(plan);
    const picked = !!plan.fixMonthsPicked || !!received.monthsKnown;
    items.push({
      id: received.id,
      kind: "action",
      stage: "fix",
      name: fixGoalLabel({ months: stored, picked }),
      months: schedule.fix.endMonths,
      startMonths: schedule.fix.startMonths,
      amount: 0,
      pct: null,
      draggable: false,
      pickMonths: !picked,
      assumed: schedule.fix.assumed,
    });
  } else if (theme === "rebuild") {
    items.push({
      id: "journey-fix",
      kind: "action",
      stage: "fix",
      name: "Rebuild first",
      months: schedule.fix.endMonths || 1,
      startMonths: 0,
      amount: 0,
      pct: 100,
      draggable: false,
      pickMonths: false,
    });
  }

  const stabilizePct = forecast?.netPct != null ? Math.round(forecast.netPct) : null;
  const currentHkd = emergencyCurrentHkd(plan);
  items.push({
    id: EF_MILESTONE_ID,
    kind: "floor",
    stage: "stabilize",
    name: "Emergency fund",
    months: schedule.ef.endMonths,
    startMonths: schedule.ef.startMonths,
    amount: currentHkd,
    need: snap.need,
    pct: stabilizePct,
    draggable: false,
    ready: schedule.ef.ready,
  });

  (plan?.milestones || []).forEach((m, i) => {
    if (milestoneRole(m) === "fix" || milestoneRole(m) === "floor") return;
    const stage = inferStage(m);
    const months = Math.max(1, Math.round(Number(m.months) || 12));
    const invest = stage === "invest" ? schedule.invest : null;
    items.push({
      id: m.id,
      kind: "goal",
      stage,
      name: m.name,
      months,
      startMonths: months,
      amount: Number(m.amount) || 0,
      pct: itemPct(forecast?.milestonePct?.[i]),
      draggable: true,
      milestoneIndex: i,
      boardOrder: Number.isFinite(Number(m.boardOrder)) ? Number(m.boardOrder) : i,
      growthLine: invest?.growthLine,
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
    startMonths: 0,
    amount: 0,
    pct: null,
    draggable: false,
  });
  return items.map((item) => ({
    ...item,
    shortName: shortName(item),
    whenLabel: rowWhenLabel(item, from, schedule),
  }));
}

/** Even columns — kept for tests / any leftover path layout. Not the home board. */
export function layoutJourneyPins(items) {
  const n = Math.max(1, items.length);
  return items.map((item, i) => ({
    ...item,
    slot: i,
    slots: n,
    leftPct: n === 1 ? 50 : Math.round((i / (n - 1)) * 1000) / 10,
  }));
}

function stackRowOrder(a, b) {
  if (!!a.draggable !== !!b.draggable) return a.draggable ? 1 : -1;
  const months = (Number(a.months) || 0) - (Number(b.months) || 0);
  if (months) return months;
  const ao = Number(a.boardOrder);
  const bo = Number(b.boardOrder);
  if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
}

/** Rows for the vertical stack: no Today pin, floor labeled with months. */
export function stackRows(plan, forecast, from = new Date()) {
  return journeyItems(plan, forecast, from)
    .filter((item) => item.kind !== "today")
    .map((item) => {
      if (item.kind !== "floor") return item;
      const now = Number(item.amount) || 0;
      return {
        ...item,
        name: `Emergency fund · now HK$${now.toLocaleString("en-HK")}`,
        shortName: "EF now",
      };
    });
}

/** Mean of known row percentages. Null until a forecast lands — never a fake 0. */
export function stageRollup(rows) {
  const nums = (rows || [])
    .map((row) => row?.pct)
    .filter((pct) => pct != null && Number.isFinite(Number(pct)))
    .map((pct) => Number(pct));
  if (!nums.length) return null;
  return Math.round(nums.reduce((sum, pct) => sum + pct, 0) / nums.length);
}

/**
 * Locked four-section board. Sequence is priority (You're in …), not hiding.
 * All stages start open so Plan/Invest goals stay visible with Fix + EF.
 */
export function stageStack(plan, forecast, { open } = {}, from = new Date()) {
  const here = currentStage(plan, forecast);
  const rows = stackRows(plan, forecast, from);
  const openSet = open instanceof Set ? open : null;
  let prevEnd = null;
  let prevId = null;
  return JOURNEY_STAGES.map((id, index) => {
    let stageRows = rows.filter((row) => row.stage === id).sort(stackRowOrder);
    if (id === "invest" && stageRows.length === 0) {
      const schedule = planSchedule(plan, forecast, from);
      const invest = schedule.invest;
      stageRows = [
        {
          id: INVEST_PLACEHOLDER_ID,
          kind: "placeholder",
          stage: "invest",
          name: INVEST_PLACEHOLDER_NAME,
          months: invest.enoughMonths,
          startMonths: invest.startSaveMonths,
          amount: 0,
          pct: null,
          draggable: false,
          growthLine: invest.growthLine,
          whenLabel: invest.whenLabel,
        },
      ];
    }
    const current = here === id;
    const startMonths = stageStartMonths(stageRows);
    const horizon = stageHorizonMonths(stageRows);
    const overlapsPrevious = prevEnd != null && startMonths != null && startMonths <= prevEnd;
    const section = {
      id,
      index: index + 1,
      total: JOURNEY_STAGES.length,
      current,
      expanded: openSet ? openSet.has(id) : true,
      rollup: stageRollup(stageRows),
      rows: stageRows,
      thin: stageRows.length === 0,
      startMonths,
      horizon,
      horizonLabel: horizon != null ? monthYearLabel(horizon, from) : "",
      overlapsPrevious,
      overlapsStage: overlapsPrevious ? prevId : null,
    };
    prevEnd = horizon;
    prevId = id;
    return section;
  });
}

export function applyStageOrder(milestones, stage, orderedIds) {
  const next = (milestones || []).map((m) => ({ ...m }));
  const wanted = new Set(orderedIds || []);
  let n = 0;
  (orderedIds || []).forEach((id) => {
    const found = next.find((m) => m.id === id);
    if (found && inferStage(found) === stage) {
      found.boardOrder = n;
      n += 1;
    }
  });
  next.forEach((m) => {
    if (inferStage(m) === stage && !wanted.has(m.id)) {
      m.boardOrder = n;
      n += 1;
    }
  });
  return next;
}

/**
 * One-line hold status. Wrecked + thin/fix/stabilize appends “floor first”
 * without softening the honesty line.
 */
export function holdStatus(plan, forecast) {
  if (!forecast) return { pending: true, tone: "wait", floorFirst: false, verdict: null, hard: false };
  const hard = !!forecast.hardFail;
  const verdict = forecast.verdict || (hard ? "wrecked" : "shared");
  const snap = stabilizeSnapshot(plan);
  const here = currentStage(plan, forecast);
  const wrecked = hard || verdict === "wrecked";
  const floorFirst = wrecked && (!snap.ready || here === "stabilize" || here === "fix");
  return {
    pending: false,
    tone: hard ? "wreck" : verdict,
    floorFirst,
    verdict,
    hard,
  };
}

/**
 * First incomplete beat on the ladder, so the board can say “You're in Stabilize”
 * without relying on memory of Steps 1–2.
 */
export function currentStage(plan, forecast) {
  if (receivedFixMilestone(plan)) return "fix";
  const snap = stabilizeSnapshot(plan);
  if (plan?.theme === "rebuild" && needsFireCard(plan?.debtHeat)) return "fix";
  if (!snap.ready) return "stabilize";
  const miles = (plan?.milestones || []).filter((m) => isLivingGoal(m));
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
