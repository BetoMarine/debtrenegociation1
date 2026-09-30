import { missingAttachments } from "../docs.js";
import { packImpliedFixMonths } from "../handoff.js";
import { RD_PRODUCT } from "../shared/product-id.js";
import { KV, monthStamp } from "../shared/storage/keys.js";
import { noteMeaningfulSave } from "../shared/storage/persist.js";
import { monthsAskedBucket } from "../shared/shortcode.js";
import { openScope } from "../shared/storage/store.js";

/** Minimal rd:export fields. Anything else is rejected. */
export const RD_EXPORT_FIELDS = [
  "v",
  "source",
  "monthsAskedFor",
  "tenorMonths",
  "startMonth",
  "endMonth",
  "done",
  "doneAt",
  "exportedAt",
];

const TENORS = new Set([3, 6, 9, 12]);
const MONTH = /^(\d{4})-(\d{2})$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function shiftMonth(ym, delta) {
  const match = MONTH.exec(String(ym || ""));
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const index = Number(match[1]) * 12 + (month - 1) + delta;
  if (index < 0) return null;
  const year = Math.floor(index / 12);
  const next = (index % 12) + 1;
  return `${year}-${String(next).padStart(2, "0")}`;
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthAfterInstant(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return shiftMonth(monthStamp(date), 1);
}

/**
 * Recompute endMonth and reject a record that carries anything else,
 * or an end month that does not match start + tenor − 1.
 */
export function acceptRdExport(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const keys = Object.keys(record);
  if (keys.length !== RD_EXPORT_FIELDS.length) return null;
  if (RD_EXPORT_FIELDS.some((key) => !Object.prototype.hasOwnProperty.call(record, key))) return null;
  if (record.v !== 1 || record.source !== RD_PRODUCT) return null;
  const tenorMonths = Number(record.tenorMonths);
  if (!TENORS.has(tenorMonths)) return null;
  const monthsAskedFor = Number(record.monthsAskedFor);
  if (monthsAskedFor !== monthsAskedBucket(tenorMonths)) return null;
  if (!MONTH.test(String(record.startMonth || ""))) return null;
  const endMonth = shiftMonth(record.startMonth, tenorMonths - 1);
  if (!endMonth || record.endMonth !== endMonth) return null;
  if (typeof record.done !== "boolean") return null;
  if (record.done) {
    if (!MONTH.test(String(record.doneAt || ""))) return null;
  } else if (record.doneAt != null) return null;
  if (!DAY.test(String(record.exportedAt || ""))) return null;
  return {
    v: 1,
    source: RD_PRODUCT,
    monthsAskedFor,
    tenorMonths,
    startMonth: record.startMonth,
    endMonth,
    done: record.done,
    doneAt: record.done ? record.doneAt : null,
    exportedAt: record.exportedAt,
  };
}

/**
 * Month after pack.sentAt, or the month after the export when the letter is not sent.
 * No name, phone, document, or amount fields.
 */
export function buildRdExport(pack, now = new Date()) {
  const tenorMonths = Number(pack?.situation?.tenorMonths);
  const monthsAskedFor = packImpliedFixMonths(pack);
  if (!TENORS.has(tenorMonths) || monthsAskedFor == null) return null;
  const when = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(when.getTime())) return null;
  const startMonth = pack?.sentAt ? monthAfterInstant(pack.sentAt) : shiftMonth(monthStamp(when), 1);
  if (!startMonth) return null;
  const done = missingAttachments(pack?.documents).length === 0;
  return acceptRdExport({
    v: 1,
    source: RD_PRODUCT,
    monthsAskedFor,
    tenorMonths,
    startMonth,
    endMonth: shiftMonth(startMonth, tenorMonths - 1),
    done,
    doneAt: done ? monthStamp(when) : null,
    exportedAt: isoDate(when),
  });
}

export async function readRdExport() {
  return openScope("rd.app").get(KV.rdExport);
}

/** Persist a minimal export. Rejects extra fields and a mismatched end month. */
export async function saveRdExport(record) {
  const accepted = acceptRdExport(record);
  if (!accepted) return null;
  await openScope("rd.app").put(KV.rdExport, accepted);
  noteMeaningfulSave();
  return accepted;
}
