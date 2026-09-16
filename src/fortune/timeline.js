/**
 * Readable plan timeline — calendar dates a stressed user can glance.
 * Not overlapping path pins. Projection-only for Invest growth.
 */
import { EF_MILESTONE_ID, INVEST_PLACEHOLDER_ID, INVEST_PLACEHOLDER_NAME } from "../handoff.js";
import { emergencyCurrentHkd, hkd, isLivingGoal, JOURNEY_STAGES, milestoneRole, monthYearLabel } from "./model.js";
import { fireFixMonths, receivedFixMilestone, stabilizeSnapshot } from "./stabilize.js";
import { planningMu } from "./strategyBooks.js";
import { getTemplate } from "./templates.js";

/** Visible assumption when the pack has not picked 3 vs 6. */
export const FIX_ASSUMED_MONTHS = 6;

const CALENDAR_WHEN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20\d\d\b/;
const TENOR_ONLY = /^\s*\d+\s*[–-]\s*\d+\s*months\s*$/i;

export function isReadableCalendarWhen(label) {
  const text = String(label || "");
  if (!text || TENOR_ONLY.test(text)) return false;
  return CALENDAR_WHEN.test(text);
}

export function monthRangeLabel(startMonths, endMonths, from = new Date()) {
  const start = monthYearLabel(Math.max(0, Number(startMonths) || 0), from);
  const end = monthYearLabel(Math.max(0, Number(endMonths) || 0), from);
  return start === end ? start : `${start} → ${end}`;
}

function inferStage(milestone) {
  if (JOURNEY_STAGES.includes(milestone?.stage)) return milestone.stage;
  const amount = Number(milestone?.amount) || 0;
  if (amount >= 500000) return "invest";
  return "plan";
}

function itemPct(raw) {
  return raw != null && Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : null;
}

export function visibleFixMonths(plan) {
  const received = receivedFixMilestone(plan);
  const picked = !!plan?.fixMonthsPicked || !!received?.monthsKnown;
  if (picked) return fireFixMonths(plan);
  if (received || plan?.theme === "rebuild") return FIX_ASSUMED_MONTHS;
  return 0;
}

export function monthsToFundFloor(plan, from = new Date()) {
  const snap = stabilizeSnapshot(plan, from);
  const cash = emergencyCurrentHkd(plan);
  if (snap.ready || cash + 1e-9 >= snap.need) return 0;
  const gap = Math.max(0, snap.need - cash);
  const flow = Number(snap.surplus) || 0;
  if (flow > 0) return Math.max(1, Math.ceil(gap / flow));
  return Math.max(1, snap.targetMonths || 6);
}

export function fixSchedule(plan, from = new Date()) {
  const received = receivedFixMilestone(plan);
  if (received) {
    const pickMonths = !(plan?.fixMonthsPicked || received.monthsKnown);
    const months = visibleFixMonths(plan);
    const startMonths = 0;
    const endMonths = months;
    const rangeLabel = monthRangeLabel(startMonths, endMonths, from);
    const endLabel = monthYearLabel(endMonths, from);
    return {
      present: true,
      kind: "fix",
      pickMonths,
      assumed: pickMonths,
      months,
      startMonths,
      endMonths,
      startLabel: monthYearLabel(startMonths, from),
      endLabel,
      rangeLabel,
      finishesLabel: `Finishes ${endLabel}`,
      whenLabel: rangeLabel,
    };
  }
  if (plan?.theme === "rebuild") {
    const startMonths = 0;
    const endMonths = 1;
    const rangeLabel = monthRangeLabel(startMonths, endMonths, from);
    const endLabel = monthYearLabel(endMonths, from);
    return {
      present: true,
      kind: "rebuild",
      pickMonths: false,
      assumed: false,
      months: 1,
      startMonths,
      endMonths,
      startLabel: monthYearLabel(startMonths, from),
      endLabel,
      rangeLabel,
      finishesLabel: `Finishes ${endLabel}`,
      whenLabel: rangeLabel,
    };
  }
  return {
    present: false,
    kind: null,
    pickMonths: false,
    assumed: false,
    months: 0,
    startMonths: 0,
    endMonths: 0,
    startLabel: "",
    endLabel: "",
    rangeLabel: "",
    finishesLabel: "",
    whenLabel: "",
  };
}

export function efSchedule(plan, from = new Date()) {
  const snap = stabilizeSnapshot(plan, from);
  const fix = fixSchedule(plan, from);
  const current = emergencyCurrentHkd(plan);
  const saveMonths = monthsToFundFloor(plan, from);
  const ready = saveMonths === 0;
  const stuck = !ready && !(Number(snap.surplus) > 0);
  const startMonths = ready ? 0 : (fix.present ? fix.endMonths : 0);
  const endMonths = ready ? 0 : startMonths + saveMonths;
  const startLabel = monthYearLabel(startMonths, from);
  const endLabel = monthYearLabel(endMonths, from);
  const surplus = Math.max(0, Math.round(Number(snap.surplus) || 0));
  const whenLabel = ready
    ? `Complete now · ${endLabel}`
    : `Start ${startLabel} · complete ${endLabel}`;
  const contributeLabel = !ready && surplus > 0 ? `${hkd(surplus)} a month until complete` : "";
  return {
    startMonths,
    endMonths,
    saveMonths,
    targetMonths: snap.targetMonths,
    ready,
    stuck,
    current,
    need: snap.need,
    surplus,
    startLabel,
    endLabel,
    rangeLabel: monthRangeLabel(startMonths, endMonths, from),
    whenLabel,
    contributeLabel,
  };
}

/** Annual μ compounded over a month tenor. Projection-only. */
export function projectShelfGrowth(amount, months, mu) {
  const principal = Math.max(0, Number(amount) || 0);
  const tenor = Math.max(0, Number(months) || 0);
  const rate = Number(mu) || 0;
  return Math.round(principal * (1 + rate) ** (tenor / 12));
}

export function horizonPhrase(months) {
  const n = Math.max(0, Math.round(Number(months) || 0));
  if (n > 0 && n % 12 === 0) {
    const years = n / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  if (n === 1) return "1 month";
  return `${n} months`;
}

export function muPercentLabel(mu) {
  const pct = (Number(mu) || 0) * 100;
  const shown = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${shown}% a year`;
}

export function shelfGrowthLine({ amount, months, templateId } = {}) {
  const template = getTemplate(templateId);
  const mu = planningMu(templateId);
  const fromHkd = Math.max(0, Math.round(Number(amount) || 0));
  const tenor = Math.max(1, Math.round(Number(months) || 36));
  if (fromHkd <= 0) {
    return `Pin a growth amount to see how it grows under ${template.label} (${muPercentLabel(mu)}). Projection only.`;
  }
  const grown = projectShelfGrowth(fromHkd, tenor, mu);
  return `Over ${horizonPhrase(tenor)}, ${hkd(fromHkd)} grows to about ${hkd(grown)} under ${template.label} (${muPercentLabel(mu)}). Projection only.`;
}

function livingGoals(plan, forecast) {
  return (plan?.milestones || [])
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => milestoneRole(m) === "living" || isLivingGoal(m))
    .map(({ m, i }) => ({
      id: m.id,
      name: m.name,
      stage: inferStage(m),
      months: Math.max(1, Math.round(Number(m.months) || 12)),
      amount: Number(m.amount) || 0,
      pct: itemPct(forecast?.milestonePct?.[i]),
      draggable: true,
    }));
}

export function investSchedule(plan, forecast, from = new Date()) {
  const ef = efSchedule(plan, from);
  const goals = livingGoals(plan, forecast);
  const pots = goals.filter((g) => g.stage === "invest");
  const pot = pots[0] || null;
  const startSaveMonths = ef.endMonths;
  const enoughMonths = pot ? Math.max(startSaveMonths, pot.months) : Math.max(startSaveMonths, 36);
  const amount = pot ? pot.amount : 0;
  const horizonMonths = pot ? pot.months : 36;
  const templateId = plan?.templateId;
  const template = getTemplate(templateId);
  const mu = planningMu(templateId);
  const startSaveLabel = monthYearLabel(startSaveMonths, from);
  const enoughLabel = monthYearLabel(enoughMonths, from);
  const growthLine = shelfGrowthLine({ amount, months: horizonMonths, templateId });
  const thresholdLabel = amount > 0 ? hkd(amount) : "";
  const investStartLabel = enoughLabel;
  const whenLabel = `Start saving ${startSaveLabel} · enough ${enoughLabel}`;
  return {
    id: pot?.id || INVEST_PLACEHOLDER_ID,
    name: pot?.name || INVEST_PLACEHOLDER_NAME,
    placeholder: !pot,
    amount,
    pct: pot?.pct ?? null,
    draggable: !!pot,
    startSaveMonths,
    enoughMonths,
    horizonMonths,
    startSaveLabel,
    enoughLabel,
    investStartLabel,
    thresholdLabel,
    whenLabel,
    growthLine,
    grownTo: amount > 0 ? projectShelfGrowth(amount, horizonMonths, mu) : 0,
    shelf: template.label,
    mu,
    startMonths: startSaveMonths,
    months: enoughMonths,
  };
}

export function planSchedule(plan, forecast, from = new Date()) {
  const fix = fixSchedule(plan, from);
  const ef = efSchedule(plan, from);
  const goals = livingGoals(plan, forecast);
  const planGoals = goals.filter((g) => g.stage === "plan");
  const invest = investSchedule(plan, forecast, from);
  return { from, fix, ef, planGoals, invest };
}

/**
 * Ordered beats for the glance timeline. Answers Fix / EF / Plan / Invest
 * without hunting through stage cards.
 */
export function goalImpactLabel(months, pct, from = new Date()) {
  const date = monthYearLabel(Math.max(1, Math.round(Number(months) || 1)), from);
  if (pct == null || !Number.isFinite(Number(pct))) return `${date} · …`;
  return `${date} · ${Math.round(Number(pct))}%`;
}

export function planTimeline(plan, forecast, from = new Date()) {
  const schedule = planSchedule(plan, forecast, from);
  const beats = [];
  if (schedule.fix.present) {
    const fix = schedule.fix;
    beats.push({
      id: receivedFixMilestone(plan)?.id || "journey-fix",
      kind: "fix",
      stage: "fix",
      title: "Fix",
      name: fix.kind === "rebuild" ? "Rebuild first" : "Debt renegotiation",
      months: fix.endMonths,
      startMonths: fix.startMonths,
      endMonths: fix.endMonths,
      whenLabel: fix.rangeLabel,
      rangeLabel: fix.rangeLabel,
      finishesLabel: fix.finishesLabel,
      assumed: fix.assumed,
      pickMonths: fix.pickMonths,
      fixMonths: fix.months,
      draggable: false,
      pct: null,
      facts: [
        { key: "start", label: "Start", value: fix.startLabel },
        { key: "end", label: "End", value: fix.endLabel },
      ],
    });
  }
  const ef = schedule.ef;
  beats.push({
    id: EF_MILESTONE_ID,
    kind: "floor",
    stage: "stabilize",
    title: "Emergency fund",
    name: "Emergency fund",
    months: ef.endMonths,
    startMonths: ef.startMonths,
    endMonths: ef.endMonths,
    whenLabel: ef.whenLabel,
    rangeLabel: ef.rangeLabel,
    targetMonths: ef.targetMonths,
    ready: ef.ready,
    stuck: ef.stuck,
    contributeLabel: ef.contributeLabel,
    draggable: false,
    pct: forecast?.netPct != null ? Math.round(forecast.netPct) : null,
    facts: ef.ready
      ? [{ key: "complete", label: "Complete", value: ef.endLabel }]
      : [
          { key: "start", label: "Start", value: ef.startLabel },
          { key: "complete", label: "Complete", value: ef.endLabel },
        ],
  });
  schedule.planGoals
    .slice()
    .sort((a, b) => a.months - b.months || a.name.localeCompare(b.name))
    .forEach((goal) => {
      beats.push({
        id: goal.id,
        kind: "goal",
        stage: "plan",
        title: "Goals",
        name: goal.name,
        months: goal.months,
        startMonths: goal.months,
        endMonths: goal.months,
        whenLabel: goalImpactLabel(goal.months, goal.pct, from),
        rangeLabel: monthYearLabel(goal.months, from),
        draggable: true,
        pct: goal.pct,
        amount: goal.amount,
      });
    });
  const invest = schedule.invest;
  const investFacts = [
    { key: "start-save", label: "Start saving", value: invest.startSaveLabel },
    {
      key: "threshold",
      label: "Enough to invest",
      value: invest.thresholdLabel
        ? `${invest.thresholdLabel} · ${invest.enoughLabel}`
        : invest.enoughLabel,
    },
    { key: "invest-start", label: "Invest start", value: invest.investStartLabel },
    { key: "shelf", label: "Shelf", value: invest.shelf },
  ];
  beats.push({
    id: invest.id,
    kind: "invest",
    stage: "invest",
    title: "Invest",
    name: invest.name,
    months: invest.enoughMonths,
    startMonths: invest.startSaveMonths,
    endMonths: invest.enoughMonths,
    whenLabel: invest.whenLabel,
    rangeLabel: monthRangeLabel(invest.startSaveMonths, invest.enoughMonths, from),
    growthLine: invest.growthLine,
    startSaveLabel: invest.startSaveLabel,
    enoughLabel: invest.enoughLabel,
    investStartLabel: invest.investStartLabel,
    thresholdLabel: invest.thresholdLabel,
    shelf: invest.shelf,
    draggable: invest.draggable,
    pct: invest.pct,
    amount: invest.amount,
    placeholder: invest.placeholder,
    facts: investFacts,
  });
  return { ...schedule, beats };
}

export function whenLabelForRow(item, schedule, from = new Date()) {
  if (!item) return "";
  if (item.kind === "today") return monthYearLabel(0, from);
  if (item.kind === "action" || item.stage === "fix") {
    return schedule?.fix?.whenLabel || monthRangeLabel(0, item.months, from);
  }
  if (item.kind === "floor") return schedule?.ef?.whenLabel || "";
  if (item.kind === "placeholder" || item.stage === "invest") {
    return schedule?.invest?.whenLabel || "";
  }
  const months = Math.max(1, Math.round(Number(item.months) || 0));
  if (!Number.isFinite(months) || months < 1) return "";
  if (item.kind === "goal") return goalImpactLabel(months, item.pct, from);
  return monthYearLabel(months, from);
}
