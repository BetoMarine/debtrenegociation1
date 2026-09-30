import { downloadBlob } from "../dom.js";
import { emptyDocuments, normalizeDocuments } from "../docs.js";
import { stageLineHtml } from "../rd/steps/chrome.js";
import { hostCopy } from "../shared/ft-host-copy.js";
import { ATT, KV, monthStamp } from "../shared/storage/keys.js";
import { noteMeaningfulSave } from "../shared/storage/persist.js";
import { openScope } from "../shared/storage/store.js";

export const FT_RD_HOST = "fortune";

export function fortuneStageLine(label) {
  return stageLineHtml(FT_RD_HOST, label);
}

function scope() {
  return openScope("ft.rdSteps");
}

function blankRecord() {
  return {
    fullName: "",
    tenorMonths: "6",
    reason: null,
    letter: "",
    letterTouched: false,
    askedRoute: null,
    documents: emptyDocuments(),
  };
}

function counts(documents) {
  const list = normalizeDocuments(documents);
  const have = (key) => list.find((row) => row.key === key)?.attachmentIds.length || 0;
  return {
    proof: have("hardship_proof"),
    statements: have("bank_statements"),
    identity: have("identity"),
    other: have("other"),
  };
}

export function viewFromRecord(record) {
  const src = record || blankRecord();
  return {
    fullName: src.fullName || "",
    tenorMonths: String(src.tenorMonths || "6"),
    reason: src.reason || null,
    letter: src.letter || "",
    letterTouched: !!src.letterTouched,
    ...counts(src.documents),
  };
}

async function readRecord() {
  const stored = await scope().get(KV.ftRdPack);
  return stored && typeof stored === "object" ? { ...blankRecord(), ...stored, documents: normalizeDocuments(stored.documents) } : blankRecord();
}

async function writeRecord(record) {
  await scope().put(KV.ftRdPack, record);
  noteMeaningfulSave();
  return record;
}

export async function loadFtRd() {
  return viewFromRecord(await readRecord());
}

/** Drops Fortune's own copy of this month's answers. Does not touch Right Door or Sunday. */
export async function resetFtRd() {
  const record = await readRecord();
  const ids = normalizeDocuments(record.documents).flatMap((row) => row.attachmentIds || []);
  for (const id of ids) {
    if (String(id).startsWith(ATT.ft)) await scope().removeAtt(id);
  }
  const blank = blankRecord();
  await writeRecord(blank);
  return viewFromRecord(blank);
}

export async function saveFtRd(patch) {
  const record = await readRecord();
  const next = {
    ...record,
    fullName: patch.fullName != null ? String(patch.fullName) : record.fullName,
    tenorMonths: patch.tenorMonths != null ? String(patch.tenorMonths) : record.tenorMonths,
    reason: patch.reason !== undefined ? patch.reason : record.reason,
    letter: patch.letter != null ? String(patch.letter) : record.letter,
    letterTouched: patch.letterTouched != null ? !!patch.letterTouched : record.letterTouched,
    askedRoute: patch.askedRoute !== undefined ? patch.askedRoute : record.askedRoute,
  };
  await writeRecord(next);
  return viewFromRecord(next);
}

export async function addFtPhoto(key, blob) {
  const record = await readRecord();
  const documents = normalizeDocuments(record.documents);
  const row = documents.find((item) => item.key === key);
  if (!row || !blob) return viewFromRecord(record);
  const id = `${ATT.ft}${crypto.randomUUID()}`;
  await scope().putAtt(id, blob);
  row.attachmentIds.push(id);
  record.documents = documents;
  await writeRecord(record);
  return viewFromRecord(record);
}

export function fortuneLetterText({ fullName, tenorMonths, askedRoute, reason, letter, letterTouched }) {
  if (letterTouched && String(letter || "").trim()) return String(letter);
  const name = String(fullName || "").trim() || "[Name]";
  const say = askedRoute === "hardship" ? hostCopy("en", "doorOtherSay") : hostCopy("en", "doorIdrpSay");
  return [name, hostCopy("en", "accountPlaceholder"), `Months to ask for: ${tenorMonths || 6}`, reason || "", say]
    .filter(Boolean)
    .join("\n\n");
}

export async function shareFortuneLetter(text) {
  const stamp = monthStamp();
  const name = `letter-${stamp}.pdf`;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(String(text || ""), 170);
  doc.text(lines, 18, 20);
  doc.setFontSize(9);
  doc.text(hostCopy("en", "complianceLender"), 18, 280);
  const blob = doc.output("blob");
  const file = new File([blob], name, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
    return;
  }
  downloadBlob(file);
}

export function letterFileName(date = new Date()) {
  return `letter-${monthStamp(date)}.pdf`;
}

/** Standalone R1 writes the export. This Fortune host never does. */
export function exportWriteAvailable() {
  return false;
}
