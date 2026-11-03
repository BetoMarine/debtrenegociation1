import { jsPDF } from "jspdf";
import { pdfRows, todayRows } from "./dates.js";

/**
 * The download is the same dated spine as the on-screen sheet, plus You today.
 */
export function buildSliceOPdf(state) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });
  const left = 18;
  const right = 192;
  let y = 20;
  const plain = (text) =>
    String(text || "")
      .replace(/\u2192/g, "->")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2019/g, "'");

  const line = (text, size, weight, color = [15, 23, 42]) => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const parts = doc.splitTextToSize(plain(text), right - left);
    doc.text(parts, left, y);
    y += parts.length * (size * 0.45) + 2;
  };

  line("Fortune plan \u00b7 dated timeline", 16, "bold");
  line("This plan stays on this phone. Erase any time.", 10, "normal", [71, 85, 105]);
  y += 2;
  line("YOU TODAY", 12, "bold");
  for (const row of todayRows(state)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(plain(row.label), left, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(plain(row.value), right, y, { align: "right" });
    y += 7;
  }
  y += 3;
  line("DATED TIMELINE", 12, "bold");
  for (const row of pdfRows(state)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(plain(row.label), left, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 118, 110);
    doc.text(plain(row.date), right, y, { align: "right" });
    y += 6;
    if (row.note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const note = doc.splitTextToSize(plain(row.note), right - left);
      doc.text(note, left, y);
      y += note.length * 4 + 2;
    } else {
      y += 2;
    }
  }
  y += 4;
  line(
    "Same order as on the phone. Not advice. We do not advise, sell, or arrange. Model mixes are a benchmark, not a product to buy.",
    9,
    "normal",
    [100, 116, 139],
  );
  return doc;
}
