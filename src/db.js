/** Live site database. Preview pages must not open this name. */
export const LIVE_DB_NAME = "right-door";
const DB_VERSION = 1;

function currentPath() {
  try {
    if (typeof location !== "undefined" && location && typeof location.pathname === "string") {
      return location.pathname;
    }
  } catch {
    /* Node tests have no location. */
  }
  return "/";
}

function envNamespace() {
  const raw = import.meta.env?.VITE_STORAGE_NS;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const globalNs = globalThis.__PYL_STORAGE_NS__;
  if (typeof globalNs === "string" && globalNs.trim()) return globalNs.trim();
  return "";
}

export function isPreviewPath(pathname) {
  return /\/preview\/pr-\d+(?:\/|$)/.test(String(pathname || ""));
}

/** Path-only name. Live URLs stay on the live database. */
export function storageDbNameFromPath(pathname) {
  const match = String(pathname || "").match(/\/preview\/pr-(\d+)(?:\/|$)/);
  if (match) return `pyl-preview-pr${match[1]}`;
  return LIVE_DB_NAME;
}

/**
 * Database for this page.
 * `VITE_STORAGE_NS` / `__PYL_STORAGE_NS__` wins (preview builds).
 * Otherwise `/preview/pr-N/` maps to `pyl-preview-prN`.
 */
export function storageDbName(pathname = currentPath()) {
  const fromEnv = envNamespace();
  if (fromEnv) return fromEnv;
  return storageDbNameFromPath(pathname);
}

/** Preview erase must refuse the live database even if name resolution regresses. */
export function assertWipeDatabase(name, pathname) {
  if (isPreviewPath(pathname) && name === LIVE_DB_NAME) {
    throw new Error("preview erase refused on the live database");
  }
  return name;
}

export function databaseForFortuneWipe(pathname = currentPath()) {
  return assertWipeDatabase(storageDbName(pathname), pathname);
}

function openNamedDb(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("attachments")) db.createObjectStore("attachments");
      if (!db.objectStoreNames.contains("events")) db.createObjectStore("events", { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb() {
  return openNamedDb(storageDbName());
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("aborted"));
  });
}

export async function getKv(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setKv(key, value) {
  const db = await openDb();
  const tx = db.transaction("kv", "readwrite");
  tx.objectStore("kv").put(value, key);
  await txDone(tx);
}

export async function getPack() {
  return getKv("pack");
}

export async function savePack(pack) {
  const next = { ...pack, updatedAt: Date.now() };
  await setKv("pack", next);
  return next;
}

export async function getLang() {
  return (await getKv("lang")) || "zh";
}

export async function setLang(lang) {
  await setKv("lang", lang);
}

export async function getSundayPack() {
  return getKv("sundayPack");
}

export async function saveSundayPack(pack) {
  const next = { ...pack, updatedAt: Date.now() };
  await setKv("sundayPack", next);
  return next;
}

export async function getSundayLang() {
  return (await getKv("sundayLang")) || "en";
}

export async function setSundayLang(lang) {
  await setKv("sundayLang", lang);
}

export async function wipeSundayPack() {
  const db = await openDb();
  const tx = db.transaction("kv", "readwrite");
  tx.objectStore("kv").delete("sundayPack");
  tx.objectStore("kv").delete("sundayLang");
  await txDone(tx);
}

export async function getFortunePlan() {
  return getKv("fortunePlan");
}

export async function saveFortunePlan(plan) {
  const next = { ...plan, updatedAt: Date.now() };
  await setKv("fortunePlan", next);
  return next;
}

export async function getFortuneForecast() {
  return getKv("fortuneForecast");
}

export async function saveFortuneForecast(forecast) {
  await setKv("fortuneForecast", forecast);
  return forecast;
}

export async function getFortuneHandoff() {
  return getKv("fortuneFireHandoff");
}

export async function saveFortuneHandoff(value) {
  await setKv("fortuneFireHandoff", value);
  return value;
}

export async function getFortuneUi() {
  return getKv("fortuneUi");
}

export async function saveFortuneUi(state) {
  await setKv("fortuneUi", state);
  return state;
}

/** Fortune Teller keys only. Right Door (`pack`) and Sunday Pack stay put. */
export const FORTUNE_DATA_KEYS = [
  "fortunePlan",
  "fortuneForecast",
  "fortuneUi",
  "fortuneFireHandoff",
  "fortuneSliceA",
];

export async function getFortuneSlice() {
  return getKv("fortuneSliceA");
}

export async function saveFortuneSlice(state) {
  await setKv("fortuneSliceA", state);
  return state;
}

/**
 * Clears Fortune Teller keys in this page's database only.
 * A preview page opens `pyl-preview-prN` (or `VITE_STORAGE_NS`) and never deletes live `right-door` keys.
 * Right Door (`pack`) and Sunday Pack stay put inside whichever database is open.
 */
export async function wipeFortune() {
  const db = await openNamedDb(databaseForFortuneWipe());
  const tx = db.transaction("kv", "readwrite");
  const store = tx.objectStore("kv");
  for (const key of FORTUNE_DATA_KEYS) store.delete(key);
  await txDone(tx);
}

/** Clears the Right Door vault only. sundayPack / sundayLang stay put. */
export async function wipeRightDoor() {
  const db = await openDb();
  const tx = db.transaction(["kv", "attachments"], "readwrite");
  tx.objectStore("kv").delete("pack");
  tx.objectStore("kv").delete("lang");
  tx.objectStore("attachments").clear();
  await txDone(tx);
}

export async function addEvent(event) {
  const db = await openDb();
  const tx = db.transaction("events", "readwrite");
  tx.objectStore("events").add(event);
  await txDone(tx);
}

export async function listEvents() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readonly");
    const req = tx.objectStore("events").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putAttachment(id, blob) {
  const db = await openDb();
  const tx = db.transaction("attachments", "readwrite");
  tx.objectStore("attachments").put(blob, id);
  await txDone(tx);
}

export async function getAttachment(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("attachments", "readonly");
    const req = tx.objectStore("attachments").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAttachment(id) {
  const db = await openDb();
  const tx = db.transaction("attachments", "readwrite");
  tx.objectStore("attachments").delete(id);
  await txDone(tx);
}

export async function wipeAll() {
  const db = await openDb();
  const tx = db.transaction(["kv", "attachments", "events"], "readwrite");
  tx.objectStore("kv").clear();
  tx.objectStore("attachments").clear();
  tx.objectStore("events").clear();
  await txDone(tx);
}

export function newPack(lang) {
  return {
    id: "local",
    lang,
    reason: null,
    fullName: "",
    hkid: "",
    phone: "",
    creditors: [],
    situation: {
      whatChanged: "",
      when: "",
      incomeItems: "",
      incomeAmount: "",
      expenseItems: "",
      expenseAmount: "",
      surplus: "",
      tenorMonths: "6",
      askInterestFreeze: false,
    },
    letter: "",
    letterTouched: false,
    door: null,
    documents: [],
    status: "draft",
    sentAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
