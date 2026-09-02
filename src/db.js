const DB_NAME = "right-door";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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
    creditors: [],
    situation: {
      whatChanged: "",
      when: "",
      incomeNow: "",
      canPay: "",
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
