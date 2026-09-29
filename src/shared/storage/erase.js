import { ATT, FT_EVENT_PREFIX, KV, LEGACY_KV, RD_EVENT_TYPES, SUN_EVENT_PREFIX, monthStamp } from "./keys.js";
import { cursorEach, prefixRange, requestResult, txDone } from "./idb.js";
import { openAppDb } from "./store.js";

function deleteKeys(store, keys) {
  return Promise.all(keys.map((key) => requestResult(store.delete(key))));
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

async function runErase(work) {
  const db = await openAppDb();
  try {
    const tx = db.transaction(["kv", "attachments", "events"], "readwrite");
    await work(tx);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** Standalone Right Door. Does not clear the attachments store. */
export async function eraseRightDoor() {
  await runErase(async (tx) => {
    const kv = tx.objectStore("kv");
    const atts = tx.objectStore("attachments");
    const events = tx.objectStore("events");
    await deleteKeys(kv, [KV.rdPack, KV.rdLang, KV.rdExport, LEGACY_KV.pack, LEGACY_KV.lang]);
    await deletePrefix(atts, ATT.rd);
    await deleteUnprefixedAttachments(atts);
    const rd = new Set(RD_EVENT_TYPES);
    await deleteEvents(events, (event) => rd.has(event?.type));
  });
}

/** Fortune only. Leaves ft:erasedAt as a month stamp and keeps rd:export. */
export async function eraseFortune() {
  await runErase(async (tx) => {
    const kv = tx.objectStore("kv");
    const atts = tx.objectStore("attachments");
    const events = tx.objectStore("events");
    await deleteKeys(kv, [
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
    ]);
    await deletePrefix(atts, ATT.ft);
    await requestResult(kv.put(monthStamp(), KV.ftErasedAt));
    await deleteEvents(events, (event) => String(event?.type || "").startsWith(FT_EVENT_PREFIX));
  });
}

export async function eraseSunday() {
  await runErase(async (tx) => {
    const kv = tx.objectStore("kv");
    const events = tx.objectStore("events");
    await deleteKeys(kv, [KV.sunPack, KV.sunLang, LEGACY_KV.sundayPack, LEGACY_KV.sundayLang]);
    await deleteEvents(events, (event) => String(event?.type || "").startsWith(SUN_EVENT_PREFIX));
  });
}
