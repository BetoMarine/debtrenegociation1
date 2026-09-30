import { ATT, KV, LEGACY_KV, monthStamp } from "./keys.js";
import { requestResult, txDone } from "./idb.js";

/**
 * Live IndexedDB name, main-build chunk only.
 * Preview builds replace this module so the name never ships in a preview bundle.
 */
export const LEGACY_DB_NAMES = ["right-door"];

function rewriteAttachmentIds(pack) {
  if (!pack || typeof pack !== "object" || !Array.isArray(pack.documents)) return pack;
  return {
    ...pack,
    documents: pack.documents.map((doc) => ({
      ...doc,
      attachmentIds: (doc.attachmentIds || []).map((id) => {
        const raw = String(id);
        return raw.startsWith(ATT.rd) ? raw : `${ATT.rd}${raw}`;
      }),
    })),
  };
}

async function copyIfAbsent(store, from, to, map) {
  const existing = await requestResult(store.get(to));
  if (existing != null) return false;
  const value = await requestResult(store.get(from));
  if (value == null) return false;
  const next = map ? await map(value, store) : value;
  await requestResult(store.put(next, to));
  return true;
}

/**
 * One readwrite transaction. Legacy keys are read and never written.
 * A second run sees meta:nsMigration and writes nothing.
 */
export async function migrateNamespacesV1(db, options = {}) {
  const { migrateFortunePlan } = await import("../../fortune/model.js");
  const { receiveFireHandoff } = await import("../../fortune/stabilize.js");
  const tx = db.transaction(["kv", "attachments"], "readwrite");
  let aborted = false;
  try {
    const kv = tx.objectStore("kv");
    const atts = tx.objectStore("attachments");
    const marker = await requestResult(kv.get(KV.metaNs));
    if (marker) {
      await txDone(tx);
      return { migrated: false, reason: "marker" };
    }

    await copyIfAbsent(kv, LEGACY_KV.pack, KV.rdPack, async (pack) => rewriteAttachmentIds(pack));
    await copyIfAbsent(kv, LEGACY_KV.lang, KV.rdLang);
    await copyIfAbsent(kv, LEGACY_KV.sundayPack, KV.sunPack);
    await copyIfAbsent(kv, LEGACY_KV.sundayLang, KV.sunLang);
    await copyIfAbsent(kv, LEGACY_KV.fortuneForecast, KV.ftForecast);
    await copyIfAbsent(kv, LEGACY_KV.fortuneUi, KV.ftUi);
    await copyIfAbsent(kv, LEGACY_KV.fortunePlan, KV.ftPlan, async (plan, store) => {
      const hadStage1 = plan?.stage1 && typeof plan.stage1 === "object";
      let next = migrateFortunePlan(plan);
      const handoff = await requestResult(store.get(LEGACY_KV.fortuneFireHandoff));
      if (handoff) next = receiveFireHandoff(next, handoff);
      if (!hadStage1) next = migrateFortunePlan({ ...next, stage1: null });
      return next;
    });

    const keys = await requestResult(atts.getAllKeys());
    for (const key of keys) {
      const id = String(key);
      if (id.startsWith(ATT.rd) || id.startsWith(ATT.ft) || id.startsWith(ATT.sun)) continue;
      const dest = `${ATT.rd}${id}`;
      const existing = await requestResult(atts.get(dest));
      if (existing != null) continue;
      const blob = await requestResult(atts.get(key));
      if (blob == null) continue;
      await requestResult(atts.put(blob, dest));
    }

    if (options.abortBeforeCommit) {
      aborted = true;
      tx.abort();
      await txDone(tx).catch(() => {});
      return { migrated: false, reason: "aborted" };
    }

    await requestResult(kv.put({ v: 1, at: monthStamp() }, KV.metaNs));
    await txDone(tx);
    return { migrated: true };
  } catch (error) {
    if (!aborted) {
      try {
        tx.abort();
      } catch {
        /* already aborted */
      }
    }
    throw error;
  }
}

export async function snapshotDb(db) {
  const tx = db.transaction(["kv", "attachments", "events"], "readonly");
  const kvStore = tx.objectStore("kv");
  const attStore = tx.objectStore("attachments");
  const eventStore = tx.objectStore("events");
  const kvKeys = await requestResult(kvStore.getAllKeys());
  const kv = {};
  for (const key of kvKeys) kv[String(key)] = await requestResult(kvStore.get(key));
  const attKeys = await requestResult(attStore.getAllKeys());
  const attachments = {};
  for (const key of attKeys) {
    const value = await requestResult(attStore.get(key));
    attachments[String(key)] = await blobBytes(value);
  }
  const events = (await requestResult(eventStore.getAll())) || [];
  await txDone(tx);
  return stableString({ kv, attachments, events });
}

async function blobBytes(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value instanceof Blob) {
    const buf = await value.arrayBuffer();
    return { type: value.type, bytes: [...new Uint8Array(buf)] };
  }
  if (value instanceof ArrayBuffer) return { bytes: [...new Uint8Array(value)] };
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export function stableString(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}
