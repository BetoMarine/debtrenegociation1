/**
 * Your future life as one timeline. Stretches come only from numbers already saved.
 * Forecast returns here are the locked 5 / 6 / 7 / 8. The 15 Sep template μ
 * (12 / 15 / 20 / 35) stays on the engine and is not what this PDF prints.
 */
import { jsPDF } from "jspdf";
import { CASH_BENCHMARK } from "../templates.js";
import { timeToGoal } from "../timeToGoal.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Locked forecast returns 5 / 6 / 7 / 8, and the locked bad-year losses
 * 10 / 15 / 20 / 25. Those losses are not returns. The old 12 / 15 / 20 / 35
 * rates and the 16 / 20 / 28 / 45 swings are not printed.
 */
export const FORECAST_RETURNS = [
  {
    id: "firm",
    label: "Firm",
    mu: 0.05,
    badYear: "Bad year about 10%",
    mix: "30% stocks / 45% bonds / 10% REIT / 15% cash",
  },
  { id: "balanced", label: "Balanced", mu: 0.06, badYear: "Bad year about 15%" },
  { id: "growth", label: "Growth", mu: 0.07, badYear: "Bad year about 20%" },
  { id: "frontier", label: "Frontier", mu: 0.08, badYear: "Bad year about 25%" },
];

function forecastById(id) {
  return FORECAST_RETURNS.find((row) => row.id === id);
}

function formatDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function addMonths(date, count) {
  const next = new Date(date.getFullYear(), date.getMonth(), 1);
  next.setMonth(next.getMonth() + count);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), last));
  return next;
}

function grouped(n) {
  return Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Helvetica on the PDF has no arrow or en dash. The words stay the same. */
function pdfSafe(text) {
  return String(text || "")
    .replace(/\u2192/g, "to")
    .replace(/[\u2013\u2014]/g, "-");
}

export function portfolioReturns() {
  return FORECAST_RETURNS.map((row) => {
    const pct = Math.round(row.mu * 100);
    const parts = [`${row.label} · ${pct}% a year`];
    if (row.badYear) parts.push(row.badYear);
    if (row.mix) parts.push(row.mix);
    return { id: row.id, label: row.label, mu: row.mu, line: parts.join(" · ") };
  });
}

export function forecastReturn(id) {
  return forecastById(id) || forecastById("balanced");
}

/** Months a chosen model reaches a goal sooner than cash. */
export function earlierText(label, surplus, goalAmount, mu) {
  const cut = shortenBy(surplus, goalAmount, mu);
  if (!cut) return "";
  const word = cut.monthsSooner === 1 ? "month" : "months";
  return `${label} shortens this by ${cut.monthsSooner} ${word}`;
}

/** Months Balanced at the locked 6% reaches a goal sooner than cash. */
export function boostTextFor(surplus, goalAmount) {
  const balanced = forecastById("balanced");
  return earlierText(balanced.label, surplus, goalAmount, balanced.mu);
}

/**
 * The amount on the line, grown once at the model's yearly rate.
 * Twelve months of 5% is that amount times 1.05, not a monthly deposit at 5%/12.
 */
export function moreMoneyFor(surplus, months, mu) {
  if (!(surplus > 0) || !(months > 0) || !(mu > 0)) return null;
  const cash = Math.round(surplus * months);
  if (!(cash > 0)) return null;
  const grown = Math.round(cash * (1 + mu));
  if (!(grown > cash)) return null;
  return { cash, grown, extra: grown - cash, months };
}

export function moreMoneyText(label, surplus, months, mu) {
  const row = moreMoneyFor(surplus, months, mu);
  if (!row) return "";
  const pct = Math.round(mu * 100);
  return `${label} · ${pct}% a year · ${grouped(row.cash)} becomes ${grouped(row.grown)}`;
}

export function shortenBy(surplus, goalAmount, mu) {
  if (!(surplus > 0) || !(goalAmount > 0) || !(mu > 0)) return null;
  const result = timeToGoal(CASH_BENCHMARK.mu, mu, {
    goal: goalAmount,
    principal: 0,
    monthlySave: surplus,
  });
  if (result.monthsSooner == null || result.monthsSooner <= 0 || result.monthsInvest == null) return null;
  return result;
}

const BAR_COLORS = {
  stress: [196, 92, 38],
  fund: [27, 107, 107],
  goal: [
    [47, 84, 150],
    [46, 125, 90],
    [122, 74, 162],
    [180, 83, 9],
  ],
  boost: [180, 130, 40],
};

function monthsBetween(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return 0;
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/**
 * Ordered stretches for the phone lines and the colored PDF.
 * A stretch with no saved numbers is left out.
 */
export function timelineBlocks(snap) {
  const asOf = snap.asOf instanceof Date ? snap.asOf : new Date();
  const blocks = [];
  let cursor = asOf;
  let goalColor = 0;

  for (const span of snap.stressed || []) {
    if (!span || !(span.months > 0) || !span.label) continue;
    const end = addMonths(cursor, span.months);
    const word = span.months === 1 ? "month" : "months";
    blocks.push({
      kind: "stress",
      title: span.label,
      lines: [`${formatDate(cursor)} - ${formatDate(end)}`, `${span.months} ${word} before saving starts`],
      months: span.months,
      rgb: BAR_COLORS.stress,
    });
    cursor = end;
  }

  const fund = snap.fund;
  if (fund && fund.monthly > 0 && fund.months > 0 && fund.target > 0) {
    const end = addMonths(cursor, fund.months);
    const lines = [`Save ${grouped(fund.monthly)} x ${fund.months} months`, `${formatDate(cursor)} - ${formatDate(end)}`];
    if (fund.byText) lines.push(fund.byText);
    blocks.push({
      kind: "fund",
      title: "Emergency fund",
      lines,
      months: fund.months,
      rgb: BAR_COLORS.fund,
    });
    cursor = end;
  }

  for (const goal of snap.goals || []) {
    if (!goal?.name || !(goal.amount > 0) || !goal.dateText) continue;
    const when = goal.date instanceof Date ? goal.date : null;
    const span = when ? Math.max(1, monthsBetween(asOf, when)) : 1;
    blocks.push({
      kind: "goal",
      title: goal.name,
      lines: [`Until ${goal.dateText}`, grouped(goal.amount)],
      months: span,
      rgb: BAR_COLORS.goal[goalColor % BAR_COLORS.goal.length],
    });
    goalColor += 1;
  }

  if (snap.boostOpen && forecastById(snap.boostPick)) {
    const picked = forecastById(snap.boostPick);
    const mode = snap.boostMode === "more" ? "more" : "sooner";
    for (const goal of snap.goals || []) {
      if (!goal?.name || !(goal.amount > 0)) continue;
      if (mode === "more") {
        const when = goal.date instanceof Date ? goal.date : null;
        const span = when ? monthsBetween(asOf, when) : 0;
        const text = moreMoneyText(picked.label, snap.surplus, span, picked.mu);
        if (!text) continue;
        blocks.push({
          kind: "boost",
          title: `${picked.label} on ${goal.name}`,
          lines: [text],
          months: Math.max(1, span),
          rgb: BAR_COLORS.boost,
        });
        continue;
      }
      const cut = shortenBy(snap.surplus, goal.amount, picked.mu);
      if (!cut) continue;
      const basis = goal.date instanceof Date ? goal.date : cursor;
      const sooner = addMonths(basis, -cut.monthsSooner);
      const word = cut.monthsSooner === 1 ? "month" : "months";
      blocks.push({
        kind: "boost",
        title: `${picked.label} shortens ${goal.name}`,
        lines: [`${cut.monthsSooner} ${word} sooner`, `Ends ${formatDate(sooner)}`],
        months: cut.monthsSooner,
        rgb: BAR_COLORS.boost,
      });
    }
  }

  return blocks;
}

/**
 * One ordered timeline. A stretch with no saved numbers is left out.
 * Horizon words match the phone: Today → age 70. No end age is invented.
 */
export function timelineLines(snap) {
  const lines = [
    "Your future life",
    pdfSafe(snap.horizon || "Today → age 70"),
    pdfSafe(snap.disclaimer || "Not advice. Not a guarantee."),
    "",
  ];
  const blocks = timelineBlocks(snap);
  blocks.forEach((block, index) => {
    lines.push(`${index + 1}. ${block.title}`);
    for (const line of block.lines) lines.push(line);
    lines.push("");
  });
  if (blocks.some((block) => block.kind === "boost")) {
    lines.push("Model portfolios");
    for (const row of portfolioReturns()) lines.push(row.line);
  }
  return lines;
}

function fillPage(doc) {
  doc.setFillColor(247, 241, 230);
  doc.rect(0, 0, 210, 297, "F");
}

function paintStrip(doc, y, blocks) {
  const x0 = 16;
  const totalW = 178;
  const total = blocks.reduce((sum, block) => sum + Math.max(1, block.months), 0) || 1;
  doc.setFillColor(228, 208, 194);
  doc.roundedRect(x0, y, totalW, 10, 2, 2, "F");
  let x = x0;
  for (const block of blocks) {
    const width = (Math.max(1, block.months) / total) * totalW;
    const use = Math.min(width, x0 + totalW - x);
    if (use <= 0.4) break;
    doc.setFillColor(block.rgb[0], block.rgb[1], block.rgb[2]);
    doc.rect(x, y, use, 10, "F");
    x += use;
  }
}

/**
 * Colored timeline graphic. Dates, the fund stretch, each goal, then the boost.
 * The page is cream with saturated bars, not a text-only sheet and not a black frame.
 */
export function buildFutureLifePdf(snap) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const blocks = timelineBlocks(snap);
  fillPage(doc);
  let y = 16;
  doc.setTextColor(27, 22, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Your future life", 16, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(92, 86, 112);
  doc.text(pdfSafe(snap.horizon || "Today → age 70"), 16, y);
  y += 5;
  doc.text(pdfSafe(snap.disclaimer || "Not advice. Not a guarantee."), 16, y);
  y += 8;

  if (blocks.length) {
    paintStrip(doc, y, blocks);
    y += 16;
  }

  const maxMonths = Math.max(1, ...blocks.map((block) => block.months || 1));
  for (const block of blocks) {
    if (y > 248) {
      doc.addPage();
      fillPage(doc);
      y = 16;
    }
    const width = 26 + (Math.max(1, block.months) / maxMonths) * 120;
    doc.setFillColor(block.rgb[0], block.rgb[1], block.rgb[2]);
    doc.roundedRect(16, y, width, 12, 2, 2, "F");
    y += 17;
    doc.setTextColor(27, 22, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(pdfSafe(block.title), 16, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(92, 86, 112);
    for (const line of block.lines) {
      doc.text(pdfSafe(line), 16, y);
      y += 5;
    }
    y += 4;
  }

  if (blocks.some((block) => block.kind === "boost")) {
    if (y > 250) {
      doc.addPage();
      fillPage(doc);
      y = 16;
    }
    doc.setTextColor(27, 22, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Model portfolios", 16, y);
    y += 6;
    portfolioReturns().forEach((row, index) => {
      const swatch = [BAR_COLORS.stress, BAR_COLORS.fund, BAR_COLORS.goal[0], BAR_COLORS.boost][index] || BAR_COLORS.boost;
      doc.setFillColor(swatch[0], swatch[1], swatch[2]);
      doc.roundedRect(16, y - 3.5, 8, 5, 1, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(27, 22, 51);
      doc.text(pdfSafe(row.line), 28, y);
      y += 7;
    });
  }

  return doc;
}
