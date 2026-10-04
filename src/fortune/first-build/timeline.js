/**
 * Your future life as one timeline. Stretches come only from numbers already saved.
 * Portfolio returns are the existing forecast mixes. This file does not change them.
 */
import { jsPDF } from "jspdf";
import { CASH_BENCHMARK, TEMPLATES, formatMuSigma } from "../templates.js";
import { timeToGoal } from "../timeToGoal.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PORTFOLIO_IDS = ["firm", "balanced", "growth", "frontier"];

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
  return PORTFOLIO_IDS.map((id) => {
    const template = TEMPLATES[id];
    return { id, label: template.label, mu: template.mu, line: `${template.label} · ${formatMuSigma(template)}` };
  });
}

/** Months the existing default mix (Balanced) reaches a goal sooner than cash. */
export function boostTextFor(surplus, goalAmount) {
  const cut = shortenBy(surplus, goalAmount, TEMPLATES.balanced.mu);
  if (!cut) return "";
  const word = cut.monthsSooner === 1 ? "month" : "months";
  return `${TEMPLATES.balanced.label} shortens this by ${cut.monthsSooner} ${word}`;
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

/**
 * One ordered timeline. A stretch with no saved numbers is left out.
 * Horizon words match the phone: Today → age 70. No end age is invented.
 */
export function timelineLines(snap) {
  const asOf = snap.asOf instanceof Date ? snap.asOf : new Date();
  const lines = [
    "Your future life",
    pdfSafe(snap.horizon || "Today → age 70"),
    pdfSafe(snap.disclaimer || "Not advice. Not a guarantee."),
    "",
  ];
  let cursor = asOf;
  let n = 1;

  for (const span of snap.stressed || []) {
    if (!span || !(span.months > 0) || !span.label) continue;
    const end = addMonths(cursor, span.months);
    lines.push(`${n}. ${span.label}`);
    lines.push(`${formatDate(cursor)} - ${formatDate(end)}`);
    lines.push(`${span.months} ${span.months === 1 ? "month" : "months"} before saving starts`);
    lines.push("");
    cursor = end;
    n += 1;
  }

  const fund = snap.fund;
  if (fund && fund.monthly > 0 && fund.months != null && fund.months >= 0 && fund.target > 0) {
    const end = addMonths(cursor, fund.months);
    lines.push(`${n}. Emergency fund`);
    lines.push(`Save ${grouped(fund.monthly)} x ${fund.months} months`);
    lines.push(`${formatDate(cursor)} - ${formatDate(end)}`);
    if (fund.byText) lines.push(fund.byText);
    lines.push("");
    cursor = end;
    n += 1;
  }

  for (const goal of snap.goals || []) {
    if (!goal?.name || !(goal.amount > 0) || !goal.dateText) continue;
    lines.push(`${n}. ${goal.name}`);
    lines.push(`Until ${goal.dateText}`);
    lines.push(grouped(goal.amount));
    lines.push("");
    n += 1;
  }

  if (snap.boostOpen) {
    for (const goal of snap.goals || []) {
      const cut = shortenBy(snap.surplus, goal.amount, TEMPLATES.balanced.mu);
      if (!cut) continue;
      const sooner = addMonths(goal.date instanceof Date ? goal.date : cursor, -cut.monthsSooner);
      lines.push(`${n}. ${TEMPLATES.balanced.label} shortens ${goal.name}`);
      lines.push(`${cut.monthsSooner} ${cut.monthsSooner === 1 ? "month" : "months"} sooner`);
      lines.push(`Ends ${formatDate(sooner)}`);
      lines.push("");
      n += 1;
    }
    if (lines.some((line) => line.includes("shortens"))) {
      lines.push("Model portfolios");
      for (const row of portfolioReturns()) lines.push(row.line);
    }
  }

  return lines;
}

export function buildFutureLifePdf(snap) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const lines = timelineLines(snap);
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(lines[0] || "Your future life", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const line of lines.slice(1)) {
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
    if (!line) {
      y += 3;
      continue;
    }
    doc.text(line, 14, y);
    y += 6;
  }
  return doc;
}
