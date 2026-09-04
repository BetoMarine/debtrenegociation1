import { jsPDF } from "jspdf";
import { ENRICH, HELP, LABOUR_FDH, CARITAS, TWGH_FDCC, POLICE, CONSULATE_PH, CONSULATE_ID } from "./contacts.js";
import { SUNDAY_DOORS, recommendSundayDoor } from "./door.js";
import { PDF_FOOTER_LEGAL, PDF_FOOTER_ORG, st } from "./copy.js";
import {
  canGeneratePdf,
  contractLeftLabel,
  goalLine,
  hasGuarantor,
  languagePreferenceLabel,
  splitTotal,
} from "./model.js";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

function sPdf(key, vars) {
  return st("en", key, vars);
}

function label(lang, key, vars) {
  return st(lang, key, vars);
}

export function formatGeneratedDate(ts = Date.now()) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function briefingRows(pack) {
  const lang = pack?.lang || "en";
  const door = pack?.door || recommendSundayDoor(pack?.flags);
  const flags = new Set(pack?.flags || []);
  const flagPills = [
    {
      text: flags.has("passport") ? sPdf("pdf.flagBadPassport") : sPdf("pdf.flagOkPassport"),
      bad: flags.has("passport"),
    },
    {
      text: flags.has("shark") ? sPdf("pdf.flagBadShark") : sPdf("pdf.flagOkShark"),
      bad: flags.has("shark"),
    },
    {
      text: flags.has("agency") ? sPdf("pdf.flagBadAgency") : sPdf("pdf.flagOkAgency"),
      bad: flags.has("agency"),
    },
  ];
  const loans = pack?.loans || [];
  const shown = loans.slice(0, 6);
  const extra = Math.max(0, loans.length - shown.length);
  const split = pack?.split || {};
  const total = splitTotal(split);
  return {
    title: sPdf("pdf.title"),
    subtitle: sPdf("pdf.subtitle"),
    langPref: languagePreferenceLabel(lang, (k) => label(lang, k)),
    contract: contractLeftLabel(pack?.monthsLeft, (k, vars) => label(lang, k, vars)),
    whoKnows: pack?.whoKnows ? label(lang, `whoKnowsOpts.${pack.whoKnows}`) : "—",
    flagPills,
    goal: goalLine(pack, (k) => label(lang, k)),
    loans: shown.map((loan) => ({
      nickname: loan.nickname || "—",
      type: label(lang, `loanTypes.${loan.type}`),
      balance: label(lang, `bands.${loan.balanceBand}`),
      monthly: label(lang, `bands.${loan.monthlyBand}`),
      guarantor: label(lang, `guarantorOpts.${loan.guarantor}`),
      still: label(lang, `stillOpts.${loan.stillBorrowing}`),
    })),
    extraLoans: extra,
    loanCount: loans.length === 1 ? "1 loan listed" : sPdf("loansCount", { n: String(loans.length) }),
    guarantorTag: hasGuarantor(loans) ? sPdf("hasGuarantor") : sPdf("noGuarantor"),
    bandsOnly: sPdf("bandsOnly"),
    bills: total == null ? null : Number(split.bills),
    allowance: total == null ? null : Number(split.allowance),
    keep: total == null ? null : Number(split.keep),
    note: String(pack?.splitNote || "").trim(),
    door,
    doorTitle: doorTitle(door),
    doorLines: doorLines(door, pack?.nationality),
    footerOrg: PDF_FOOTER_ORG,
    footerLegal: PDF_FOOTER_LEGAL,
    generated: sPdf("pdf.generated", { date: formatGeneratedDate(pack?.updatedAt || Date.now()) }),
  };
}

function doorTitle(door) {
  if (door === SUNDAY_DOORS.PASSPORT) return "HELP for Domestic Workers + 999 + consulate";
  if (door === SUNDAY_DOORS.SHARK) return "HELP for Domestic Workers";
  if (door === SUNDAY_DOORS.AGENCY) return "Labour Department FDH hotline + consulate";
  return "Enrich — Financial Consultation (recommended)";
}

function doorLines(door, nationality) {
  const lines = [];
  if (door === SUNDAY_DOORS.PASSPORT) {
    lines.push(`Emergency: ${POLICE.phone}`);
    lines.push(`HELP WhatsApp: ${HELP.whatsapp} · ${HELP.site}`);
    if (nationality !== "indonesian") {
      lines.push(`${CONSULATE_PH.label}: ${CONSULATE_PH.phone} · after hours ${CONSULATE_PH.emergency}`);
    }
    if (nationality !== "filipino") {
      lines.push(`${CONSULATE_ID.label}: ${CONSULATE_ID.phone}`);
    }
  } else if (door === SUNDAY_DOORS.SHARK) {
    lines.push(`HELP WhatsApp: ${HELP.whatsapp} · ${HELP.site}`);
    lines.push(`If in danger: ${POLICE.phone}`);
    lines.push(`Enrich (secondary): ${ENRICH.booking}`);
  } else if (door === SUNDAY_DOORS.AGENCY) {
    lines.push(`Labour FDH hotline: ${LABOUR_FDH.phone}`);
    if (nationality !== "indonesian") {
      lines.push(`${CONSULATE_PH.label}: ${CONSULATE_PH.phone}`);
    }
    if (nationality !== "filipino") {
      lines.push(`${CONSULATE_ID.label}: ${CONSULATE_ID.phone}`);
    }
  } else {
    lines.push(`Book: ${ENRICH.booking}`);
    lines.push(`WhatsApp (EN/Tagalog): ${ENRICH.whatsappEnTl} · Bahasa: ${ENRICH.whatsappId}`);
    lines.push("Enrich does not lend money or call creditors. Helper brings this page herself.");
  }
  lines.push(`Also available if needed: Caritas ${CARITAS.phone} · TWGH FDCC ${TWGH_FDCC.phone}`);
  return lines;
}

function setFill(doc, hex) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  doc.setFillColor(r, g, b);
}

function setDraw(doc, hex) {
  const n = hex.replace("#", "");
  doc.setDrawColor(parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16));
}

function setText(doc, hex) {
  const n = hex.replace("#", "");
  doc.setTextColor(parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16));
}

function sectionHead(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setText(doc, "#141414");
  doc.text(String(text).toUpperCase(), MARGIN, y);
  return y + 5;
}

function pill(doc, text, x, y, { bg, fg, border }) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const padX = 2.4;
  const w = Math.min(doc.getTextWidth(text) + padX * 2, 62);
  const h = 6.2;
  setFill(doc, bg);
  setDraw(doc, border);
  doc.roundedRect(x, y, w, h, 1.6, 1.6, "FD");
  setText(doc, fg);
  doc.text(text, x + padX, y + 4.2);
  return w + 2.2;
}

function box(doc, x, y, w, h) {
  setDraw(doc, "#D0CEC6");
  setFill(doc, "#FFFFFF");
  doc.roundedRect(x, y, w, h, 1.2, 1.2, "FD");
}

export function buildSundayPdf(pack) {
  if (!canGeneratePdf(pack)) {
    throw new Error("sunday_pdf_blocked");
  }
  const data = briefingRows(pack);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  let y = MARGIN + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setText(doc, "#141414");
  doc.text(data.title, MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, "#5A5A56");
  doc.text(data.subtitle, MARGIN, y);
  y += 5;

  const colW = (CONTENT_W - 4) / 3;
  const metaH = 16;
  const metas = [
    [sPdf("pdf.langPref"), data.langPref],
    [sPdf("pdf.contractLeft"), data.contract],
    [sPdf("pdf.whoKnows"), data.whoKnows],
  ];
  metas.forEach((item, i) => {
    const x = MARGIN + i * (colW + 2);
    box(doc, x, y, colW, metaH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setText(doc, "#5A5A56");
    doc.text(item[0].toUpperCase(), x + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(doc, "#141414");
    const lines = doc.splitTextToSize(String(item[1]), colW - 6);
    doc.text(lines, x + 3, y + 11);
  });
  y += metaH + 7;

  y = sectionHead(doc, sPdf("pdf.redFlags"), y);
  let px = MARGIN;
  data.flagPills.forEach((pillData, i) => {
    const text = pillData.text;
    const bad = pillData.bad;
    const w = pill(doc, text, px, y, bad
      ? { bg: "#F8E8E6", fg: "#8A1C12", border: "#E8C4BE" }
      : { bg: "#E7F2EA", fg: "#1F4E3D", border: "#C5D9CC" });
    px += w;
    if (i === 1 && px > PAGE_W - 70) {
      px = MARGIN;
      y += 7.2;
    }
  });
  y += 12;

  y = sectionHead(doc, sPdf("pdf.goal"), y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, "#141414");
  const goalLines = doc.splitTextToSize(data.goal, CONTENT_W);
  doc.text(goalLines, MARGIN, y);
  y += goalLines.length * 4.4 + 4;

  y = sectionHead(doc, sPdf("pdf.inventory"), y);
  const cols = [
    { key: "nickname", head: sPdf("pdf.colLender"), w: 42 },
    { key: "type", head: sPdf("pdf.colType"), w: 36 },
    { key: "balance", head: sPdf("pdf.colBalance"), w: 30 },
    { key: "monthly", head: sPdf("pdf.colMonthly"), w: 24 },
    { key: "guarantor", head: sPdf("pdf.colGuarantor"), w: 26 },
    { key: "still", head: sPdf("pdf.colStill"), w: 28 },
  ];
  const tableW = cols.reduce((sum, c) => sum + c.w, 0);
  const rowH = 8;
  setFill(doc, "#F3F1EB");
  setDraw(doc, "#D0CEC6");
  doc.rect(MARGIN, y, tableW, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  setText(doc, "#5A5A56");
  let hx = MARGIN;
  cols.forEach((col) => {
    doc.text(col.head.toUpperCase(), hx + 1.4, y + 4.6);
    hx += col.w;
  });
  y += 7;
  const rows = data.loans.length
    ? data.loans
    : [{ nickname: sPdf("pdf.noLoans"), type: "—", balance: "—", monthly: "—", guarantor: "—", still: "—" }];
  rows.forEach((row) => {
    setDraw(doc, "#D0CEC6");
    doc.rect(MARGIN, y, tableW, rowH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    setText(doc, "#141414");
    let cx = MARGIN;
    cols.forEach((col) => {
      const cell = doc.splitTextToSize(String(row[col.key] || "—"), col.w - 2.4);
      doc.text(cell[0], cx + 1.4, y + 5);
      cx += col.w;
    });
    y += rowH;
  });
  if (data.extraLoans) {
    y += 3.5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    setText(doc, "#5A5A56");
    doc.text(sPdf("pdf.moreLoans", { n: String(data.extraLoans) }), MARGIN, y);
    y += 2;
  }
  y += 4;
  let tx = MARGIN;
  tx += pill(doc, data.loanCount, tx, y, { bg: "#EEF2F6", fg: "#1F3347", border: "#D3DCE6" });
  tx += pill(doc, data.guarantorTag, tx, y, hasGuarantor(pack?.loans)
    ? { bg: "#F8E8E6", fg: "#8A1C12", border: "#E8C4BE" }
    : { bg: "#EEF2F6", fg: "#1F3347", border: "#D3DCE6" });
  pill(doc, data.bandsOnly, tx, y, { bg: "#F8E8E6", fg: "#8A1C12", border: "#E8C4BE" });
  y += 12;

  y = sectionHead(doc, sPdf("pdf.remittance"), y);
  const splitW = (CONTENT_W - 4) / 3;
  const splitH = 24;
  const splitItems = [
    { pct: data.bills, title: sPdf("splitBills"), hint: sPdf("splitBillsHint") },
    { pct: data.allowance, title: sPdf("splitAllowance"), hint: sPdf("splitAllowanceHint") },
    { pct: data.keep, title: sPdf("splitKeep"), hint: sPdf("splitKeepHint") },
  ];
  splitItems.forEach((item, i) => {
    const x = MARGIN + i * (splitW + 2);
    box(doc, x, y, splitW, splitH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    setText(doc, "#141414");
    doc.text(item.pct == null ? "—" : `${item.pct}%`, x + 3.5, y + 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(item.title, x + 3.5, y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, "#5A5A56");
    doc.text(item.hint, x + 3.5, y + 20);
  });
  y += splitH + 5;
  if (data.note) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    setText(doc, "#141414");
    const note = doc.splitTextToSize(`${sPdf("pdf.notePrefix")} “${data.note}”`, CONTENT_W);
    doc.text(note, MARGIN, y);
    y += note.length * 4 + 3;
  }

  y = sectionHead(doc, sPdf("pdf.nextDoor"), y);
  const boxH = 4 + data.doorLines.length * 4.2 + 8;
  setDraw(doc, "#141414");
  setFill(doc, "#FFFFFF");
  doc.setLineWidth(0.7);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 1.2, 1.2, "FD");
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, "#141414");
  doc.text(data.doorTitle, MARGIN + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.doorLines.forEach((line, i) => {
    const wrapped = doc.splitTextToSize(line, CONTENT_W - 8);
    doc.text(wrapped[0], MARGIN + 4, y + 11 + i * 4.2);
  });
  y += boxH + 8;

  doc.setDrawColor(120);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineDashPattern([], 0);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  setText(doc, "#5A5A56");
  const foot1 = doc.splitTextToSize(data.footerOrg, CONTENT_W);
  doc.text(foot1, MARGIN, y);
  y += foot1.length * 3.4 + 1.5;
  const foot2 = doc.splitTextToSize(data.footerLegal, CONTENT_W);
  doc.text(foot2, MARGIN, y);
  y += foot2.length * 3.4 + 1.5;
  doc.text(data.generated, MARGIN, y);

  return doc.output("blob");
}
