import { ATT, KV, RD_EVENT_TYPES, SHARED_EVENT } from "./keys.js";
import { openNamedDb, requestResult, txDone } from "./idb.js";
import { shouldMigrateNamespaces, storageNs } from "./ns.js";

export class StorageScopeError extends Error {
  constructor(scope, key) {
    super(`StorageScopeError: ${scope} cannot access ${key}`);
    this.name = "StorageScopeError";
    this.scope = scope;
    this.key = key;
  }
}

const FT_READ = [KV.ftPlan, KV.ftForecast, KV.ftUi, KV.ftErasedAt];

const SCOPES = {
  "rd.app": {
    kv: new Set([KV.rdPack, KV.rdLang, KV.rdExport]),
    att: ATT.rd,
    events: new Set([...RD_EVENT_TYPES, SHARED_EVENT]),
  },
  "ft.rdSteps": {
    kv: new Set([KV.ftRdPack, KV.ftRdLang]),
    att: ATT.ft,
    events: new Set(),
  },
  "ft.map": {
    kv: new Set(FT_READ),
    att: null,
    events: new Set(),
  },
  "ft.engine": {
    kv: new Set(FT_READ),
    att: null,
    events: new Set(),
  },
  "ft.import": {
    kv: new Set([...FT_READ, KV.rdExport]),
    att: null,
    events: new Set(),
  },
  "ft.app": {
    kv: new Set([...FT_READ, KV.ftHandoff]),
    att: ATT.ft,
    events: new Set([SHARED_EVENT, "fortune_started", "fortune_forecast_run", "fortune_pdf", "fortune_export"]),
  },
  "sun.app": {
    kv: new Set([KV.sunPack, KV.sunLang]),
    att: null,
    events: new Set([
      SHARED_EVENT,
      "sunday_started",
      "sunday_triage_done",
      "sunday_pack_created",
      "sunday_door_chosen",
      "sunday_share_tapped",
    ]),
  },
};

export function scopeNames() {
  return Object.keys(SCOPES);
}

function assertKv(scope, name, key) {
  if (!scope.kv.has(key)) throw new StorageScopeError(name, key);
}

function assertAtt(scope, name, id) {
  if (!scope.att || !String(id || "").startsWith(scope.att)) throw new StorageScopeError(name, id);
}

let migratedFor = null;

export function resetStorageForTests() {
  migratedFor = null;
}

export async function openAppDb() {
  const name = storageNs();
  const db = await openNamedDb(name);
  if (migratedFor === name) return db;
  if (!shouldMigrateNamespaces()) return db;
  const { migrateNamespacesV1 } = await import("./migrate-ns-v1.js");
  try {
    await migrateNamespacesV1(db);
    migratedFor = name;
  } catch (error) {
    migratedFor = null;
    try {
      db.close();
    } catch {
      /* already closing */
    }
    throw error;
  }
  return db;
}

async function withStore(storeName, mode, fn) {
  const db = await openAppDb();
  try {
    const tx = db.transaction(storeName, mode);
    const result = await fn(tx.objectStore(storeName), tx);
    await txDone(tx);
    return result;
  } finally {
    db.close();
  }
}

export function openScope(name) {
  const scope = SCOPES[name];
  if (!scope) throw new StorageScopeError(name, "*");
  return {
    async get(key) {
      assertKv(scope, name, key);
      return withStore("kv", "readonly", (store) => requestResult(store.get(key)).then((v) => v ?? null));
    },
    async put(key, value) {
      assertKv(scope, name, key);
      await withStore("kv", "readwrite", (store) => requestResult(store.put(value, key)));
    },
    async remove(key) {
      assertKv(scope, name, key);
      await withStore("kv", "readwrite", (store) => requestResult(store.delete(key)));
    },
    async getAtt(id) {
      assertAtt(scope, name, id);
      return withStore("attachments", "readonly", (store) => requestResult(store.get(id)).then((v) => v ?? null));
    },
    async putAtt(id, blob) {
      assertAtt(scope, name, id);
      await withStore("attachments", "readwrite", (store) => requestResult(store.put(blob, id)));
    },
    async removeAtt(id) {
      assertAtt(scope, name, id);
      await withStore("attachments", "readwrite", (store) => requestResult(store.delete(id)));
    },
    async addEvent(event) {
      if (!scope.events.has(event?.type)) throw new StorageScopeError(name, event?.type || "");
      await withStore("events", "readwrite", (store) => requestResult(store.add(event)));
    },
  };
}

export async function readAllKv(dbName) {
  const db = await openNamedDb(dbName);
  try {
    const tx = db.transaction("kv", "readonly");
    const keys = await requestResult(tx.objectStore("kv").getAllKeys());
    const out = {};
    for (const key of keys) {
      out[key] = await requestResult(tx.objectStore("kv").get(key));
    }
    await txDone(tx);
    return out;
  } finally {
    db.close();
  }
}

export async function listEventsRaw() {
  return withStore("events", "readonly", (store) => requestResult(store.getAll()).then((rows) => rows || []));
}

export async function addSharedEvent(event) {
  await withStore("events", "readwrite", (store) => requestResult(store.add(event)));
}
