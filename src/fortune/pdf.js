import { jsPDF } from "jspdf";
import { PDF_FOOTER_LEGAL, PDF_FOOTER_ORG, ft } from "./copy.js";
import { hkd, monthYearLabel, netNeedNow, resolveMoney } from "./model.js";
import { TEMPLATE_DISCLAIMER, formatMuSigma, getTemplate } from "./templates.js";
import { THEMES } from "./themes.js";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function formatGeneratedDate(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sheetRows(plan, forecast) {
  const money = resolveMoney(plan.money);
  const template = getTemplate(plan.templateId);
  const theme = THEMES[plan.theme];
  return {
    title: "Fortune Teller — implementation sheet",
    subtitle: "Living milestones vs a security net. Illustrative model only.",
    theme: theme?.label || "Custom",
    living: forecast ? `${forecast.livingPct}%` : "—",
    net: forecast ? `${forecast.netPct}%` : "—",
    verdict: forecast ? ft(`verdicts.${forecast.verdict}`) : "—",
    hardFail: !!forecast?.hardFail,
    template: template.label,
    mix: template.mix,
    muSigma: formatMuSigma(template),
    disclaimer: TEMPLATE_DISCLAIMER,
    income: hkd(money.incomeMonthly) + " / month",
    spend: hkd(money.spendMonthly) + " / month",
    savings: hkd(money.savings),
    debts: hkd(money.debts),
    netMonths: String(plan.net?.emergencyMonths ?? "—"),
    netFloor: hkd(plan.net?.floorHkd),
    netNeed: hkd(netNeedNow(plan)),
    milestones: (plan.milestones || []).slice(0, 6).map((m, i) => ({
      name: m.name,
      amount: hkd(m.amount),
      when: monthYearLabel(m.months),
      pct: forecast?.milestonePct?.[i] != null ? `${forecast.milestonePct[i]}%` : "—",
    })),
    extra: Math.max(0, (plan.milestones || []).length - 6),
    execute: "Execute this plan elsewhere with a licensed intermediary.",
    notAdvice: "Not regulated advice. Not a product sale. Not a fund we sell.",
    notHsbc: "Not affiliated with HSBC.",
    footerOrg: PDF_FOOTER_ORG,
    footerLegal: PDF_FOOTER_LEGAL,
    generated: `Drawn on this phone · ${formatGeneratedDate(plan.updatedAt || Date.now())}`,
    median: forecast ? hkd(forecast.medianWealth) : "—",
    paths: forecast ? `${forecast.paths} paths · seed ${forecast.seed}` : "",
  };
}

function hex(doc, color, which) {
  const n = color.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if (which === "fill") doc.setFillColor(r, g, b);
  else if (which === "draw") doc.setDrawColor(r, g, b);
  else doc.setTextColor(r, g, b);
}

function box(doc, x, y, w, h, fill = "#FFFFFF", stroke = "#D4CBB8") {
  hex(doc, fill, "fill");
  hex(doc, stroke, "draw");
  doc.roundedRect(x, y, w, h, 1.2, 1.2, "FD");
}

export function buildFortunePdf(plan, forecast) {
  const data = sheetRows(plan, forecast);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  let y = MARGIN + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  hex(doc, "#1B1633");
  doc.text(data.title, MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  hex(doc, "#5C5670");
  doc.text(data.subtitle, MARGIN, y);
  y += 7;

  const dialW = (CONTENT_W - 4) / 2;
  const livingFill = data.hardFail ? "#F8E8E6" : "#FFF6EE";
  const netFill = data.hardFail ? "#F8E8E6" : "#EEF6F6";
  box(doc, MARGIN, y, dialW, 22, livingFill, "#E4D0C2");
  box(doc, MARGIN + dialW + 4, y, dialW, 22, netFill, "#C9D9D9");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  hex(doc, "#C45C26");
  doc.text("LIVING", MARGIN + 4, y + 6);
  hex(doc, "#1B6B6B");
  doc.text("NET", MARGIN + dialW + 8, y + 6);
  doc.setFontSize(16);
  hex(doc, data.hardFail ? "#8F2A22" : "#1B1633");
  doc.text(data.living, MARGIN + 4, y + 16);
  doc.text(data.net, MARGIN + dialW + 8, y + 16);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  hex(doc, data.hardFail ? "#8F2A22" : "#1B1633");
  doc.text(data.verdict, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  hex(doc, "#5C5670");
  doc.text(`Theme: ${data.theme}  ·  Median pot: ${data.median}  ·  ${data.paths}`, MARGIN, y);
  y += 8;

  y = head(doc, "Money now (band mid-points)", y);
  const col = (CONTENT_W - 6) / 4;
  const metas = [
    ["Income", data.income],
    ["Spending", data.spend],
    ["Savings", data.savings],
    ["Debts", data.debts],
  ];
  metas.forEach((item, i) => {
    const x = MARGIN + i * (col + 2);
    box(doc, x, y, col, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    hex(doc, "#5C5670");
    doc.text(item[0].toUpperCase(), x + 2.5, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    hex(doc, "#1B1633");
    doc.text(doc.splitTextToSize(item[1], col - 5)[0], x + 2.5, y + 11);
  });
  y += 20;

  y = head(doc, "Living milestones", y);
  const cols = [
    { key: "name", w: 78 },
    { key: "amount", w: 40 },
    { key: "when", w: 36 },
    { key: "pct", w: 32 },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  hex(doc, "#F3EFE4", "fill");
  hex(doc, "#D4CBB8", "draw");
  doc.rect(MARGIN, y, tableW, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  hex(doc, "#5C5670");
  ["GOAL", "AMOUNT", "TARGET", "FUNDED"].reduce((x, label, i) => {
    doc.text(label, x + 1.4, y + 4.6);
    return x + cols[i].w;
  }, MARGIN);
  y += 7;
  const rows = data.milestones.length
    ? data.milestones
    : [{ name: "No living goals listed", amount: "—", when: "—", pct: "—" }];
  rows.forEach((row) => {
    hex(doc, "#D4CBB8", "draw");
    doc.rect(MARGIN, y, tableW, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    hex(doc, "#1B1633");
    let cx = MARGIN;
    cols.forEach((colDef) => {
      const cell = doc.splitTextToSize(String(row[colDef.key] || "—"), colDef.w - 2.4);
      doc.text(cell[0], cx + 1.4, y + 5.2);
      cx += colDef.w;
    });
    y += 8;
  });
  if (data.extra) {
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    hex(doc, "#5C5670");
    doc.text(`+ ${data.extra} more on the phone plan`, MARGIN, y);
    y += 2;
  }
  y += 6;

  y = head(doc, "Security net — emergency months / future floor", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  hex(doc, "#1B1633");
  doc.text(
    `${data.netMonths} months of spending, or at least ${data.netFloor} (need about ${data.netNeed} today).`,
    MARGIN,
    y,
  );
  y += 8;

  y = head(doc, "Portfolio template (benchmark, not a product)", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  hex(doc, "#1B1633");
  doc.text(`${data.template}  ·  ${data.muSigma}`, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  hex(doc, "#5C5670");
  doc.text(`${data.mix}  ·  ${data.disclaimer}`, MARGIN, y);
  y += 10;

  box(doc, MARGIN, y, CONTENT_W, 28, "#FFFBF4", "#1B1633");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  hex(doc, "#1B1633");
  doc.text(data.execute, MARGIN + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.notAdvice, MARGIN + 4, y + 13);
  doc.text(data.notHsbc, MARGIN + 4, y + 19);
  doc.text("You stay in control. We never contact a bank or intermediary for you.", MARGIN + 4, y + 25);
  y += 34;

  hex(doc, "#9A927E", "draw");
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineDashPattern([], 0);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  hex(doc, "#5C5670");
  const foot1 = doc.splitTextToSize(data.footerOrg, CONTENT_W);
  doc.text(foot1, MARGIN, y);
  y += foot1.length * 3.4 + 1.5;
  const foot2 = doc.splitTextToSize(data.footerLegal, CONTENT_W);
  doc.text(foot2, MARGIN, y);
  y += foot2.length * 3.4 + 1.5;
  doc.text(data.generated, MARGIN, y);

  return doc.output("blob");
}

function head(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  hex(doc, "#1B1633");
  doc.text(String(text).toUpperCase(), MARGIN, y);
  return y + 5;
}
