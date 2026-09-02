import { jsPDF } from "jspdf";
import { STRINGS } from "./i18n.js";
import { attachmentIdsOf, normalizeDocuments } from "./docs.js";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
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

function drawBlock(text, { fontSize = 11, weight = "400", color = "#141414" } = {}) {
  const lineHeight = fontSize * 1.4;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `${weight} ${fontSize}px "PingFang TC","PingFang HK","Noto Sans TC","Hiragino Sans GB","Songti TC",sans-serif`;
  ctx.font = font;
  const lines = wrapLines(ctx, text, CONTENT_W_PX);
  const height = Math.max(lineHeight, lines.length * lineHeight + 2);
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
  const data = canvas.toDataURL("image/jpeg", 0.82);
  doc.addImage(data, "JPEG", x, y, CONTENT_W_MM, heightMm, undefined, "FAST");
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
  return nextY + block.heightMm + 1.2;
}

function addRule(doc, y) {
  const nextY = ensureSpace(doc, y, 3);
  doc.setDrawColor(20);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, nextY, PAGE_W - MARGIN, nextY);
  return nextY + 3;
}

function isHeading(line) {
  return (
    /^(CONFIDENTIAL|1\. |2\. |3\. |4\. |致：|TO:|借款人|Borrower|正式請求|Formal request|日期：|Date:)/.test(
      line,
    ) || /^機密/.test(line)
  );
}

export async function buildPackPdf({ pack, lang, attachments }) {
  const s = STRINGS[lang] || STRINGS.zh;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  y = addText(doc, "CONFIDENTIAL", y, { fontSize: 10, weight: "700", color: "#B42318" });
  y = addText(
    doc,
    lang === "zh" ? "正式請求：財務困難覆核" : "Formal request: financial hardship review",
    y,
    { fontSize: 16, weight: "700" },
  );
  y = addRule(doc, y);

  const body = String(pack.letter || "");
  const lines = body.split("\n");
  let skip = 0;
  if (lines[0] && /CONFIDENTIAL/i.test(lines[0])) skip += 1;
  if (lines[skip] === "") skip += 1;
  if (lines[skip] && /正式請求|Formal request/.test(lines[skip])) skip += 1;
  const rest = lines.slice(skip).join("\n").replace(/^\n+/, "");

  for (const para of rest.split("\n")) {
    if (para === "") {
      y += 1.5;
      continue;
    }
    if (isHeading(para)) {
      y += 1;
      y = addText(doc, para, y, { fontSize: 11.5, weight: "700" });
    } else {
      y = addText(doc, para, y, { fontSize: 11 });
    }
  }

  y = addRule(doc, y + 2);
  y = addText(
    doc,
    lang === "zh"
      ? "此檔由借款人在手機自行準備及寄出。附件只來自本機，未經上傳。"
      : "Prepared and sent by the borrower on their phone. Annexes are on-device only and were not uploaded.",
    y,
    { fontSize: 9, color: "#5A5A56" },
  );

  const docs = normalizeDocuments(pack.documents);
  for (const item of docs) {
    const ids = attachmentIdsOf(item);
    let index = 0;
    for (const id of ids) {
      const blob = attachments[id];
      if (!blob) continue;
      index += 1;
      const dataUrl = await blobToDataUrl(blob);
      doc.addPage();
      let py = MARGIN;
      py = addText(
        doc,
        lang === "zh" ? "附件" : "Annex",
        py,
        { fontSize: 10, weight: "700", color: "#B42318" },
      );
      py = addText(doc, `${s.docs[item.key] || item.key} (${index})`, py, {
        fontSize: 13,
        weight: "700",
      });
      try {
        const dims = await imageSize(dataUrl);
        const maxW = CONTENT_W_MM;
        const maxH = PAGE_H - py - MARGIN;
        const ratio = Math.min(maxW / dims.w, maxH / dims.h, 1);
        const w = dims.w * ratio;
        const h = dims.h * ratio;
        doc.addImage(dataUrl, "JPEG", MARGIN, py, w, h, undefined, "FAST");
      } catch {
        addText(
          doc,
          lang === "zh" ? "未能把此影像放進 PDF。" : "Could not place this image in the PDF.",
          py,
          { fontSize: 11 },
        );
      }
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

export async function compressImage(file, maxEdge = 1280) {
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
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.68));
  return blob || file;
}
