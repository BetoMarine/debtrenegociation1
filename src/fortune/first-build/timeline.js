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
      when: cursor,
      end,
      dateText: formatDate(cursor),
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
      when: cursor,
      end,
      dateText: formatDate(end),
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
      when: when || asOf,
      end: when || asOf,
      dateText: goal.dateText,
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
          when: when || asOf,
          end: when || asOf,
          dateText: when ? formatDate(when) : "",
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
        when: sooner,
        end: sooner,
        dateText: formatDate(sooner),
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

const PAPER = [255, 252, 247];
const PURPLE = [91, 42, 134];
const TEAL = [15, 122, 110];
const RED = [176, 58, 46];
const INK = [28, 24, 38];
const MUTED = [92, 86, 104];
const HAIR = [226, 220, 214];
const LEFT = 16;
const RIGHT = 194;

function sameDay(a, b) {
  return a instanceof Date && b instanceof Date && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * One vertical rail. Dates live here. Boost is the same day as the emergency
 * fund, or later — never earlier on this rail.
 */
export function planRail(snap) {
  const asOf = snap?.asOf instanceof Date ? snap.asOf : new Date();
  const blocks = timelineBlocks(snap || {});
  const dossier = snap?.dossier || {};
  const events = [];

  const path = dossier.path;
  if (path?.kind === "pack") {
    events.push({
      kind: "pack",
      rank: 1,
      when: asOf,
      dateText: formatDate(asOf),
      title: "Plan start · Sunday Pack opens",
      lines: ["Today · Pack build begins"],
    });
  } else if (path?.kind === "rd") {
    events.push({
      kind: "rd",
      rank: 1,
      when: asOf,
      dateText: formatDate(asOf),
      title: "Plan start · Right Door opens",
      lines: ["Today · installment over 30% of income"],
    });
  } else {
    events.push({
      kind: "today",
      rank: 0,
      when: asOf,
      dateText: formatDate(asOf),
      title: "Today",
      lines: ["Plan start"],
    });
  }

  if (path?.monitorWhen instanceof Date) {
    events.push({
      kind: "monitor",
      rank: 3,
      when: path.monitorWhen,
      dateText: formatDate(path.monitorWhen),
      title: "Pack monitor due",
      lines: ["Package monitoring · 3-month check"],
    });
  }

  for (const block of blocks) {
    if (block.kind !== "stress" || !(block.when instanceof Date)) continue;
    events.push({
      kind: "stress",
      rank: 2,
      when: block.when,
      dateText: block.dateText || formatDate(block.when),
      title: block.title,
      lines: block.lines.slice(),
    });
  }

  const fund = blocks.find((block) => block.kind === "fund");
  let efWhen = dossier.efWhen instanceof Date ? dossier.efWhen : fund?.end instanceof Date ? fund.end : null;
  if (!efWhen && dossier.showEf) efWhen = asOf;
  if (efWhen) {
    const lines = fund ? fund.lines.filter((line) => !/^By /.test(line)) : [];
    if (!lines.length) lines.push("Emergency fund on this plan");
    events.push({
      kind: "ef",
      rank: 4,
      when: efWhen,
      dateText: formatDate(efWhen),
      title: "Emergency fund · Done-by",
      lines,
    });
  }

  for (const block of blocks) {
    if (block.kind !== "goal") continue;
    let when = block.when instanceof Date ? block.when : asOf;
    if (efWhen && when.getTime() < efWhen.getTime()) when = efWhen;
    events.push({
      kind: "goal",
      rank: 5,
      when,
      dateText: formatDate(when),
      title: `Goal · ${block.title} · plan starts`,
      lines: block.lines.filter((line) => !String(line).startsWith("Until ")),
    });
  }

  const boostBlocks = blocks.filter((block) => block.kind === "boost");
  if (dossier.showBoost || snap?.boostOpen || snap?.boostPick || boostBlocks.length) {
    let when = efWhen || asOf;
    const later = boostBlocks
      .map((block) => block.when)
      .filter((date) => date instanceof Date && (!efWhen || date.getTime() >= efWhen.getTime()));
    if (later.length) when = later.reduce((soonest, date) => (date.getTime() < soonest.getTime() ? date : soonest));
    if (efWhen && when.getTime() < efWhen.getTime()) when = efWhen;
    const lines = ["After the emergency fund is started. Never before on this rail."];
    for (const block of boostBlocks) {
      for (const line of block.lines) {
        if (String(line).startsWith("Ends ")) continue;
        lines.push(line);
      }
    }
    events.push({
      kind: "boost",
      rank: 6,
      when,
      dateText: formatDate(when),
      title: "Boost / Invest unlock",
      lines,
    });
  }

  events.sort((a, b) => a.when - b.when || a.rank - b.rank);
  return events.map((event) => ({ ...event, sameAsEf: Boolean(efWhen && sameDay(event.when, efWhen) && event.kind !== "ef") }));
}

function paintPaper(doc) {
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, 210, 297, "F");
}

function masthead(doc, snap, continued) {
  doc.setFillColor(...PURPLE);
  doc.roundedRect(LEFT, 12, 10, 10, 2, 2, "F");
  doc.setTextColor(255, 252, 247);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FT", 18.2, 18.3);

  doc.setTextColor(...PURPLE);
  doc.setFontSize(8.5);
  doc.text("PLAN YOUR LIFE  ·  FORTUNE TELLER", 30, 16.2);

  const asOf = snap.asOf instanceof Date ? snap.asOf : new Date();
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  doc.text(`Generated ${formatDate(asOf)}`, RIGHT, 15, { align: "right" });

  doc.setTextColor(...INK);
  doc.setFontSize(18);
  doc.text(pdfSafe(snap.dossier?.title || "My plan"), LEFT, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(continued ? "Single timeline · all dated events" : "Personal life plan · simulation for education", LEFT, 37.5);

  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.7);
  doc.line(LEFT, 42, RIGHT, 42);
  return 48;
}

function sectionLabel(doc, y, text, color = PURPLE) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...color);
  doc.text(text, LEFT, y);
  return y + 6;
}

function paintPrivacy(doc, y, text) {
  doc.setFillColor(246, 242, 250);
  doc.roundedRect(LEFT, y, RIGHT - LEFT, 8, 1.2, 1.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70, 58, 88);
  doc.text(pdfSafe(text), LEFT + 3, y + 5.2);
  return y + 12;
}

function paintYouToday(doc, y, today) {
  y = sectionLabel(doc, y, "YOU TODAY  ·  CURRENT LIFE");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("ITEM", LEFT, y);
  doc.text("HK$", RIGHT, y, { align: "right" });
  y += 2;
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y, RIGHT, y);
  y += 5.5;

  for (const row of today?.rows || []) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(row.label), LEFT, y);
    const tone = row.tone === "out" ? RED : row.tone === "in" ? TEAL : INK;
    doc.setTextColor(...tone);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(row.value), RIGHT, y, { align: "right" });
    y += 2.2;
    doc.setDrawColor(...HAIR);
    doc.setLineWidth(0.15);
    doc.line(LEFT, y, RIGHT, y);
    y += 5.2;
  }

  if (today?.net) {
    doc.setFillColor(232, 246, 242);
    doc.roundedRect(LEFT, y - 3.6, RIGHT - LEFT, today.equation ? 12 : 8, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEAL);
    doc.text(pdfSafe(today.net.label), LEFT + 3, y + 1);
    doc.text(pdfSafe(today.net.value), RIGHT - 3, y + 1, { align: "right" });
    if (today.equation) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 90, 84);
      doc.text(pdfSafe(today.equation), LEFT + 3, y + 6);
    }
    y += today.equation ? 16 : 12;
  }
  return y;
}

function paintTile(doc, x, y, w, h, label, value) {
  doc.setDrawColor(214, 206, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 1.4, 1.4, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(pdfSafe(label), x + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(pdfSafe(value || "—"), x + 3, y + 11);
}

function paintDebt(doc, y, debt) {
  if (!debt) return y;
  const w = (RIGHT - LEFT - 4) / 2;
  const h = 16;
  const tiles = [
    ["DEBT TYPE", debt.type],
    ["TOTAL OWED", debt.owed],
    ["INSTALLMENT / MO", debt.installment],
    ["OVERDUE", debt.overdue],
  ].filter((tile) => tile[1]);
  for (let i = 0; i < tiles.length; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    paintTile(doc, LEFT + col * (w + 4), y + row * (h + 3), w, h, tiles[i][0], tiles[i][1]);
  }
  const rows = Math.ceil(tiles.length / 2);
  return y + rows * (h + 3) + 2;
}

function paintPath(doc, y, path) {
  if (!path) return y;
  doc.setFillColor(243, 236, 248);
  doc.roundedRect(LEFT, y, RIGHT - LEFT, 10, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PURPLE);
  const title = pdfSafe(path.title);
  doc.text(title, LEFT + 3, y + 6.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(58, 48, 72);
  const gap = doc.getTextWidth(title) + 6;
  const body = doc.splitTextToSize(pdfSafe(path.body), RIGHT - LEFT - gap - 6);
  doc.text(body[0] || "", LEFT + 3 + gap, y + 6.2);
  return y + 14;
}

function paintRail(doc, y, events) {
  y = sectionLabel(doc, y, "YOUR PLAN TIMELINE", TEAL);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("One spine only. Card fields feed these dates.", LEFT, y);
  y += 7;
  if (!events.length) return y;

  const spineX = 22;
  const textX = 30;
  const slots = [];
  let cursor = y;
  for (const event of events) {
    const lines = (event.lines || []).filter(Boolean);
    const height = 6 + lines.length * 4 + 4;
    slots.push({ event, y: cursor, lines, height });
    cursor += height;
  }
  const last = slots[slots.length - 1];
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.8);
  doc.line(spineX, slots[0].y - 1, spineX, last.y + 1);

  for (const slot of slots) {
    const event = slot.event;
    const dot = event.kind === "ef" ? TEAL : PURPLE;
    doc.setFillColor(...dot);
    doc.circle(spineX, slot.y, 1.7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...(event.kind === "ef" ? TEAL : PURPLE));
    const date = pdfSafe(event.dateText);
    doc.text(date, textX, slot.y + 1);
    const dateW = doc.getTextWidth(date);
    doc.setTextColor(...INK);
    doc.text(pdfSafe(`  ·  ${event.title}`), textX + dateW, slot.y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    let lineY = slot.y + 5.4;
    for (const line of slot.lines) {
      doc.text(pdfSafe(line), textX, lineY);
      lineY += 4;
    }
  }
  return cursor + 2;
}

function cardHeight(doc, card, width) {
  let rows = 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const row of card.rows || []) {
    const lines = doc.splitTextToSize(pdfSafe(`${row.label}: ${row.value}`), width - 8);
    rows += lines.length * 3.6;
  }
  if (card.portfolios) rows += portfolioReturns().length * 7.2;
  rows += 7;
  return Math.max(36, rows);
}

function paintCard(doc, x, y, w, h, card) {
  doc.setDrawColor(214, 206, 220);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 1.6, 1.6, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...TEAL);
  doc.text(pdfSafe(card.kicker || ""), x + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(pdfSafe(card.title || ""), x + 3, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(48, 44, 58);
  let ly = y + 16;
  for (const row of card.rows || []) {
    const lines = doc.splitTextToSize(pdfSafe(`${row.label}: ${row.value}`), w - 8);
    doc.text(lines, x + 3, ly);
    ly += lines.length * 3.6;
  }
  if (card.portfolios) {
    ly += 1;
    for (const row of portfolioReturns()) {
      const lines = doc.splitTextToSize(pdfSafe(row.line), w - 8);
      doc.text(lines, x + 3, ly);
      ly += lines.length * 3.6;
    }
  }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 120, 145);
  doc.text("Dates: see timeline", x + 3, y + h - 3.5);
}

function paintCards(doc, y, cards) {
  if (!cards?.length) return { y, rest: [] };
  if (y > 250) return { y, rest: cards };
  y = sectionLabel(doc, y, "PLAN CARDS  ·  FULL FIELDS");
  const gap = 4;
  const colW = (RIGHT - LEFT - gap) / 2;
  let rowY = y;
  for (let i = 0; i < cards.length; i += 2) {
    const left = cards[i];
    const right = cards[i + 1];
    const h = Math.max(cardHeight(doc, left, colW), right ? cardHeight(doc, right, colW) : 0);
    if (rowY + h > 274) return { y: rowY, rest: cards.slice(i) };
    paintCard(doc, LEFT, rowY, colW, h, left);
    if (right) paintCard(doc, LEFT + colW + gap, rowY, colW, h, right);
    rowY += h + gap;
  }
  return { y: rowY, rest: [] };
}

function paintDisclaimer(doc) {
  doc.setDrawColor(...HAIR);
  doc.setLineWidth(0.2);
  doc.line(LEFT, 280, RIGHT, 280);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 114, 128);
  doc.text("Not advice. Not a guarantee. Simulation for education only. Not a loan offer.", LEFT, 285);
}

/**
 * A4 plan sheet. Page 1 is the header, privacy, and You today.
 * Page 2 is one dated rail, then the card fields. Dates stay on the rail.
 */
export function buildFutureLifePdf(snap) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const safe = snap || {};
  const dossier = safe.dossier || {};
  paintPaper(doc);
  let y = masthead(doc, safe, false);
  if (dossier.privacy) y = paintPrivacy(doc, y, dossier.privacy);
  y = paintYouToday(doc, y, dossier.youToday);
  y = paintDebt(doc, y + 1, dossier.debt);
  y = paintPath(doc, y, dossier.path);
  if (y < 268) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const note = doc.splitTextToSize(
      "All dated milestones live on the single timeline. Section bodies do not repeat free-floating dates.",
      RIGHT - LEFT,
    );
    doc.text(note, LEFT, y + 2);
  }
  paintDisclaimer(doc);

  doc.addPage();
  paintPaper(doc);
  y = masthead(doc, safe, true);
  y = paintRail(doc, y, planRail(safe));
  let rest = dossier.cards || [];
  let guard = 0;
  while (rest.length && guard < 6) {
    guard += 1;
    const painted = paintCards(doc, y, rest);
    if (painted.rest.length === rest.length) {
      doc.addPage();
      paintPaper(doc);
      y = masthead(doc, safe, true);
      continue;
    }
    y = painted.y;
    rest = painted.rest;
  }

  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${page} of ${total}`, RIGHT, 20.5, { align: "right" });
    doc.setFontSize(7);
    doc.text(`${page} / ${total}`, RIGHT, 290, { align: "right" });
  }
  return doc;
}
