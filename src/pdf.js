import { jsPDF } from "jspdf";
import { STRINGS } from "./i18n.js";
import { labelType } from "./letter.js";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W_MM = PAGE_W - MARGIN * 2;
const PX_PER_MM = 4;
const CONTENT_W_PX = CONTENT_W_MM * PX_PER_MM;

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  const paragraphs = String(text || "").split("\n");
  for (const para of paragraphs) {
    if (!para) {
      lines.push("");
      continue;
    }
    const chars = [...para];
    let current = "";
    for (const ch of chars) {
      const trial = current + ch;
      if (ctx.measureText(trial).width > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawBlock(text, { fontSize = 12, weight = "400", color = "#141414" } = {}) {
  const lineHeight = fontSize * 1.45;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `${weight} ${fontSize}px "PingFang TC","PingFang HK","Noto Sans TC","Hiragino Sans GB","Songti TC",sans-serif`;
  ctx.font = font;
  const lines = wrapLines(ctx, text, CONTENT_W_PX);
  const height = Math.max(lineHeight, lines.length * lineHeight + 4);
  const scale = 2;
  canvas.width = CONTENT_W_PX * scale;
  canvas.height = height * scale;
  const draw = canvas.getContext("2d");
  draw.scale(scale, scale);
  draw.fillStyle = "#ffffff";
  draw.fillRect(0, 0, CONTENT_W_PX, height);
  draw.fillStyle = color;
  draw.font = font;
  draw.textBaseline = "top";
  lines.forEach((line, i) => {
    draw.fillText(line, 0, i * lineHeight);
  });
  return { canvas, heightMm: height / PX_PER_MM };
}

function addCanvas(doc, canvas, x, y, heightMm) {
  const data = canvas.toDataURL("image/png");
  doc.addImage(data, "PNG", x, y, CONTENT_W_MM, heightMm, undefined, "FAST");
}

function ensureSpace(doc, y, need) {
  if (y + need <= PAGE_H - MARGIN) return y;
  doc.addPage();
  return MARGIN;
}

function addText(doc, text, y, opts) {
  const block = drawBlock(text, opts);
  const nextY = ensureSpace(doc, y, block.heightMm);
  addCanvas(doc, block.canvas, MARGIN, nextY, block.heightMm);
  return nextY + block.heightMm + 2;
}

export async function buildPackPdf({ pack, lang, attachments }) {
  const s = STRINGS[lang] || STRINGS.zh;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  y = addText(doc, lang === "zh" ? "正確的門" : "Right Door", y, {
    fontSize: 11,
    color: "#B42318",
    weight: "600",
  });
  y = addText(
    doc,
    lang === "zh" ? "困難還款／綜合債務紓緩計劃信件包" : "Hardship / IDRP pack",
    y,
    { fontSize: 18, weight: "700" },
  );
  y = addText(
    doc,
    lang === "zh"
      ? "此信件由本人在手機上準備，由本人自行寄出。沒有中介代為聯絡。"
      : "I prepared this on my phone and I am sending it myself. No intermediary is contacting you.",
    y,
    { fontSize: 11, color: "#5A5A56" },
  );
  y += 2;
  y = addText(doc, pack.letter || "", y, { fontSize: 12 });

  y = ensureSpace(doc, y, 20);
  y += 4;
  y = addText(doc, s.docsTitle, y, { fontSize: 16, weight: "700" });
  const rows = (pack.documents || []).map((d) => {
    const mark = d.checked ? (lang === "zh" ? "已備妥" : "Ready") : lang === "zh" ? "未備妥" : "Not yet";
    return `• ${s.docs[d.key] || d.key} — ${mark}`;
  });
  y = addText(doc, rows.join("\n") || "—", y, { fontSize: 12 });

  if ((pack.creditors || []).length) {
    y = ensureSpace(doc, y, 20);
    y += 3;
    y = addText(doc, s.creditorsTitle, y, { fontSize: 16, weight: "700" });
    const lines = pack.creditors.map((c, i) => {
      const amt = (c.amount || "").trim();
      const base = `${i + 1}. ${c.nickname || "—"} (${labelType(c.type, lang)})`;
      return amt ? `${base} — ${amt}` : base;
    });
    y = addText(doc, lines.join("\n"), y, { fontSize: 12 });
  }

  const photos = (pack.documents || []).filter((d) => d.attachmentId && attachments[d.attachmentId]);
  for (const item of photos) {
    const blob = attachments[item.attachmentId];
    const dataUrl = await blobToDataUrl(blob);
    doc.addPage();
    let py = MARGIN;
    py = addText(doc, s.docs[item.key] || item.key, py, { fontSize: 13, weight: "700" });
    try {
      const dims = await imageSize(dataUrl);
      const maxW = CONTENT_W_MM;
      const maxH = PAGE_H - py - MARGIN;
      const ratio = Math.min(maxW / dims.w, maxH / dims.h);
      const w = dims.w * ratio;
      const h = dims.h * ratio;
      const format = blob.type && blob.type.includes("png") ? "PNG" : "JPEG";
      doc.addImage(dataUrl, format, MARGIN, py, w, h, undefined, "FAST");
    } catch {
      addText(doc, lang === "zh" ? "未能把照片放進 PDF。" : "Could not place this photo in the PDF.", py, {
        fontSize: 11,
      });
    }
  }

  return doc.output("blob");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function imageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => reject(new Error("image"));
    img.src = dataUrl;
  });
}

export async function compressImage(file, maxEdge = 1600) {
  const dataUrl = await blobToDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  return blob || file;
}
