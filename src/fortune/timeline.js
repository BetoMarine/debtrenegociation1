/**
 * Readable plan timeline — calendar dates a stressed user can glance.
 * Not overlapping path pins. Projection-only for Invest growth.
 */
import { EF_MILESTONE_ID, INVEST_PLACEHOLDER_ID, INVEST_PLACEHOLDER_NAME } from "../handoff.js";
import { emergencyCurrentHkd, hkd, isLivingGoal, JOURNEY_STAGES, milestoneRole, monthYearLabel } from "./model.js";
import { planFixMonths, receivedFixMilestone, stabilizeSnapshot } from "./stabilize.js";
import { boostVsCash, effectiveInvestMu, planningMu, SILENT_INVEST_MU } from "./strategyBooks.js";
import { CASH_BENCHMARK, getTemplate } from "./templates.js";

/** Visible assumption when the pack has not picked 3 vs 6. */
export const FIX_ASSUMED_MONTHS = 6;

const CALENDAR_WHEN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20\d\d\b/;
const TENOR_ONLY = /^\s*\d+\s*[–-]\s*\d+\s*months\s*$/i;
const CHANCE_SLOPE = 0.35;

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
  return planFixMonths(plan);
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
    const pickMonths = true;
    const assumed = !(plan?.fixMonthsPicked || received.monthsKnown || plan?.fixMonthsUserPicked);
    const months = visibleFixMonths(plan);
    const startMonths = 0;
    const endMonths = months;
    const rangeLabel = monthRangeLabel(startMonths, endMonths, from);
    const endLabel = monthYearLabel(endMonths, from);
    return {
      present: true,
      kind: "fix",
      pickMonths,
      assumed,
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

/**
 * Save-path chance that moves with ±1 month. Not a fake 0 from a missing forecast.
 * Leftover-only so a sooner date is honestly harder.
 */
export function goalReachChance({
  amount,
  months,
  leftover,
  savings = 0,
  inflationOn = true,
  inflation = 0.045,
} = {}) {
  const need0 = Math.max(0, Number(amount) || 0);
  const tenor = Math.max(1, Math.round(Number(months) || 1));
  const flow = Number(leftover) || 0;
  const cash = Math.max(0, Number(savings) || 0);
  const inf = inflationOn === false ? 0 : Number(inflation) || 0;
  const need = need0 * (1 + inf / 12) ** tenor;
  if (need <= 0) {
    return { pct: 99, reason: "This goal has no cost pinned yet.", stuck: false };
  }
  if (!(flow > 0) && cash + 1e-9 < need) {
    return {
      pct: 0,
      reason: "This stays at 0% until leftover each month can cover it.",
      stuck: true,
    };
  }
  const needMonths = flow > 0 ? Math.max(0, (need - cash) / flow) : 0;
  if (flow > 0 && tenor + 1e-9 < needMonths * 0.5) {
    return {
      pct: 0,
      reason: "Even by then leftover is not enough for this goal. Later raises the chance.",
      stuck: true,
      needMonths,
    };
  }
  const delta = tenor - needMonths;
  const raw = 100 / (1 + Math.exp(-CHANCE_SLOPE * delta));
  const pct = Math.max(1, Math.min(99, Math.round(raw)));
  let reason;
  if (delta < -0.5) {
    reason = "By then leftover is not enough — a later date raises the chance.";
  } else if (delta < 2) {
    reason = "This date is tight. Later gives leftover more months to catch up.";
  } else {
    reason = "Leftover can cover this by then. Sooner means less time to save.";
  }
  return { pct, reason, stuck: false, needMonths };
}

export function goalImpactReason(deltaMonths, pctBefore, pctAfter) {
  const before = Number(pctBefore);
  const after = Number(pctAfter);
  if (after === 0 && before === 0) {
    return "Still 0% — leftover cannot cover this date yet.";
  }
  if (deltaMonths < 0 && after < before) {
    return "A month sooner means less time to save, so this is less likely.";
  }
  if (deltaMonths > 0 && after > before) {
    return "Waiting a month gives leftover more time, so this is more likely.";
  }
  if (deltaMonths < 0) {
    return "A month sooner means less time to save.";
  }
  return "Waiting a month gives leftover more time to catch up.";
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

/** Beto: directions only. Linda owns μ. Never imply Fortune executes the mix. */
const BOOST_HONEST = "Illustrative under assumed return — you act elsewhere.";

export function soonerLagPhrase(months) {
  const n = Math.max(0, Math.round(Number(months) || 0));
  if (n <= 0) return "0 months";
  const years = Math.floor(n / 12);
  const rem = n % 12;
  if (years > 0 && rem === 0) return horizonPhrase(n);
  if (years > 0) {
    const y = years === 1 ? "1 year" : `${years} years`;
    const m = rem === 1 ? "1 month" : `${rem} months`;
    return `${y} ${m}`;
  }
  return horizonPhrase(n);
}

export function investBoostLine({ name, templateLabel, mu, boost, silent } = {}) {
  const mix = templateLabel || "this mix";
  const rate = muPercentLabel(mu);
  const who = name ? String(name) : "this goal";
  const how = silent
    ? `Until the emergency fund is complete, if you invest this quieter mix (${rate})`
    : `If you invest this way under ${mix} (${rate})`;
  const potBit =
    boost?.cashPot != null && boost?.investPot != null && boost.investPot !== boost.cashPot
      ? ` At the cash-only date the mix pot is about ${hkd(boost.investPot)} vs ${hkd(boost.cashPot)} in cash.`
      : "";
  if (boost?.cashMonths == null && boost?.investMonths == null) {
    return `Needs leftover to see how much sooner ${mix} beats cash-only if you invest this way. ${BOOST_HONEST}`;
  }
  if (boost?.cashMonths == null && boost?.investMonths != null) {
    return `${how}, ${who} can land while cash-only cannot in this window.${potBit} ${BOOST_HONEST}`;
  }
  if (boost?.cashMonths == null || boost?.investMonths == null) {
    return `Needs leftover to see how much sooner ${mix} beats cash-only if you invest this way. ${BOOST_HONEST}`;
  }
  const sooner = Number(boost.soonerMonths) || 0;
  if (sooner <= 0) {
    return `${how}, ${who} lands in the same month as cash-only at this leftover.${potBit} ${BOOST_HONEST}`;
  }
  return `${how}, ${who} lands about ${soonerLagPhrase(sooner)} sooner than cash-only.${potBit} ${BOOST_HONEST}`;
}

function livingGoals(plan, forecast, from = new Date()) {
  const snap = stabilizeSnapshot(plan, from);
  const leftover = Math.max(0, Number(snap.surplus) || 0);
  const inflationOn = plan?.inflationOn !== false;
  return (plan?.milestones || [])
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => milestoneRole(m) === "living" || isLivingGoal(m))
    .map(({ m, i }) => {
      const months = Math.max(1, Math.round(Number(m.months) || 12));
      const amount = Number(m.amount) || 0;
      const chance = goalReachChance({
        amount,
        months,
        leftover,
        savings: 0,
        inflationOn,
      });
      return {
        id: m.id,
        name: m.name,
        stage: inferStage(m),
        months,
        amount,
        pct: chance.pct,
        reason: chance.reason,
        forecastPct: itemPct(forecast?.milestonePct?.[i]),
        draggable: true,
      };
    });
}

export function investSchedule(plan, forecast, from = new Date()) {
  const ef = efSchedule(plan, from);
  const goals = livingGoals(plan, forecast, from);
  const pots = goals.filter((g) => g.stage === "invest");
  const pot = pots[0] || null;
  const startSaveMonths = ef.endMonths;
  const enoughMonths = pot ? Math.max(startSaveMonths, pot.months) : Math.max(startSaveMonths, 36);
  const amount = pot ? pot.amount : 0;
  const horizonMonths = pot ? pot.months : 36;
  const templateId = plan?.templateId;
  const template = getTemplate(templateId);
  const silent = ef.ready === false;
  const mu = effectiveInvestMu(plan, from);
  const startSaveLabel = monthYearLabel(startSaveMonths, from);
  const enoughLabel = monthYearLabel(enoughMonths, from);
  const boostGoal =
    [...goals].sort((a, b) => b.amount - a.amount || a.months - b.months)[0] || pot;
  const boost = boostVsCash({
    target: boostGoal?.amount || amount,
    monthly: ef.surplus,
    principal: 0,
    investMu: mu,
    cashMu: CASH_BENCHMARK.mu,
  });
  const boostLine = investBoostLine({
    name: boostGoal?.name || pot?.name,
    templateLabel: template.label,
    mu,
    boost,
    silent,
  });
  const growthLine = boostLine;
  const thresholdLabel = amount > 0 ? hkd(amount) : "";
  const investStartLabel = enoughLabel;
  const whenLabel = `Start saving ${startSaveLabel} · enough ${enoughLabel}`;
  const cashLand =
    boost.cashMonths == null ? "" : monthYearLabel(startSaveMonths + boost.cashMonths, from);
  const mixLand =
    boost.investMonths == null ? "" : monthYearLabel(startSaveMonths + boost.investMonths, from);
  return {
    id: pot?.id || INVEST_PLACEHOLDER_ID,
    name: pot?.name || INVEST_PLACEHOLDER_NAME,
    placeholder: !pot,
    amount,
    pct: pot?.pct ?? null,
    reason: pot?.reason || "",
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
    boostLine,
    boost,
    cashLand,
    mixLand,
    grownTo: amount > 0 ? projectShelfGrowth(amount, horizonMonths, mu) : 0,
    mix: template.label,
    shelf: template.label,
    mu,
    silent,
    silentMu: SILENT_INVEST_MU,
    startMonths: startSaveMonths,
    months: enoughMonths,
  };
}

export function planSchedule(plan, forecast, from = new Date()) {
  const fix = fixSchedule(plan, from);
  const ef = efSchedule(plan, from);
  const goals = livingGoals(plan, forecast, from);
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
      fixKind: fix.kind,
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
        reason: goal.reason,
        amount: goal.amount,
      });
    });
  const invest = schedule.invest;
  const soonerValue =
    invest.boost?.soonerMonths == null
      ? invest.boostLine
      : invest.boost.soonerMonths > 0
        ? `${soonerLagPhrase(invest.boost.soonerMonths)} sooner than cash-only`
        : "Same month as cash-only";
  const potValue =
    invest.boost?.cashPot != null && invest.boost?.investPot != null
      ? `Mix ${hkd(invest.boost.investPot)} · cash ${hkd(invest.boost.cashPot)}`
      : "";
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
    { key: "mix", label: "Mix", value: invest.mix },
    { key: "boost", label: "Vs cash-only", value: soonerValue },
  ];
  if (potValue) {
    investFacts.push({ key: "pot", label: "At cash-only date", value: potValue });
  }
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
    boostLine: invest.boostLine,
    startSaveLabel: invest.startSaveLabel,
    enoughLabel: invest.enoughLabel,
    investStartLabel: invest.investStartLabel,
    thresholdLabel: invest.thresholdLabel,
    mix: invest.mix,
    shelf: invest.mix,
    draggable: invest.draggable,
    pct: invest.pct,
    reason: invest.reason,
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
