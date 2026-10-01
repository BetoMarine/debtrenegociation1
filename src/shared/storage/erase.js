import { ATT, FT_EVENT_PREFIX, KV, LEGACY_KV, RD_EVENT_TYPES, SUN_EVENT_PREFIX, monthStamp } from "./keys.js";
import { cursorEach, prefixRange, txDone } from "./idb.js";
import { openAppDb } from "./store.js";

const FORTUNE_KV_KEYS = [
  KV.ftPlan,
  KV.ftForecast,
  KV.ftUi,
  KV.ftRdPack,
  KV.ftRdLang,
  KV.ftHandoff,
  LEGACY_KV.fortunePlan,
  LEGACY_KV.fortuneForecast,
  LEGACY_KV.fortuneUi,
  LEGACY_KV.fortuneFireHandoff,
];

function deleteKeysNow(store, keys) {
  for (const key of keys) store.delete(key);
}

async function deletePrefix(store, prefix) {
  await cursorEach(store, prefixRange(prefix), (cursor) => {
    cursor.delete();
  });
}

async function deleteUnprefixedAttachments(store) {
  await cursorEach(store, null, (cursor) => {
    const key = String(cursor.key);
    if (key.startsWith(ATT.rd) || key.startsWith(ATT.ft) || key.startsWith(ATT.sun)) return;
    cursor.delete();
  });
}

async function deleteEvents(store, pred) {
  await cursorEach(store, null, (cursor) => {
    if (pred(cursor.value)) cursor.delete();
  });
}

/**
 * Start every request before the first await. A transaction that waits
 * between requests can commit early and roll the deletes back.
 */
async function runErase(start) {
  const db = await openAppDb();
  try {
    const tx = db.transaction(["kv", "attachments", "events"], "readwrite");
    const pending = start(tx);
    if (pending && typeof pending.then === "function") await pending;
    await txDone(tx);
  } finally {
    db.close();
  }
}

async function runEraseRetry(start) {
  try {
    await runErase(start);
  } catch {
    await runErase(start);
  }
}

function eraseRightDoorWork(tx) {
  const kv = tx.objectStore("kv");
  const atts = tx.objectStore("attachments");
  const events = tx.objectStore("events");
  deleteKeysNow(kv, [KV.rdPack, KV.rdLang, KV.rdExport, LEGACY_KV.pack, LEGACY_KV.lang]);
  const rd = new Set(RD_EVENT_TYPES);
  return Promise.all([
    deletePrefix(atts, ATT.rd),
    deleteUnprefixedAttachments(atts),
    deleteEvents(events, (event) => rd.has(event?.type)),
  ]);
}

function eraseFortuneWork(tx) {
  const kv = tx.objectStore("kv");
  const atts = tx.objectStore("attachments");
  const events = tx.objectStore("events");
  deleteKeysNow(kv, FORTUNE_KV_KEYS);
  kv.put(monthStamp(), KV.ftErasedAt);
  return Promise.all([
    deletePrefix(atts, ATT.ft),
    deleteEvents(events, (event) => String(event?.type || "").startsWith(FT_EVENT_PREFIX)),
  ]);
}

function eraseSundayWork(tx) {
  const kv = tx.objectStore("kv");
  const events = tx.objectStore("events");
  deleteKeysNow(kv, [KV.sunPack, KV.sunLang, LEGACY_KV.sundayPack, LEGACY_KV.sundayLang]);
  return deleteEvents(events, (event) => String(event?.type || "").startsWith(SUN_EVENT_PREFIX));
}

/** Standalone Right Door. Does not clear the attachments store. */
export async function eraseRightDoor() {
  await runEraseRetry(eraseRightDoorWork);
}

/** Fortune only. Leaves ft:erasedAt as a month stamp and keeps rd:export. */
export async function eraseFortune() {
  await runEraseRetry(eraseFortuneWork);
}

export async function eraseSunday() {
  await runEraseRetry(eraseSundayWork);
}
