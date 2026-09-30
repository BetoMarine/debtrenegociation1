import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { a2FoundState } from "../fortune/import/found.js";
import { applyBroughtIn } from "../fortune/v3/flow.js";
import { newFortunePlan } from "../fortune/model.js";
import { getRdExport, saveRdExport } from "../db.js";
import { LEGACY_DB_NAMES } from "../shared/storage/migrate-ns-v1.js";
import { KV } from "../shared/storage/keys.js";
import { openNamedDb, requestResult, txDone } from "../shared/storage/idb.js";
import { openScope, resetStorageForTests, StorageScopeError } from "../shared/storage/store.js";
import { RD_PRODUCT } from "../shared/product-id.js";
import { decodeShortCode, encodeShortCode } from "../shared/shortcode.js";
import { RD_EXPORT_FIELDS, acceptRdExport, buildRdExport } from "./export.js";

const PREVIEW = "pyl-preview-pr31";
const LIVE = LEGACY_DB_NAMES[0];
const NOW = new Date(2026, 8, 29, 15, 0, 0);

function readyPack(extra = {}) {
  return {
    fullName: "Ada",
    hkid: "A123456(7)",
    phone: "91234567",
    letter: "Hello",
    door: "idrp",
    sentAt: null,
    situation: { tenorMonths: "6", tenorStored: true },
    documents: [
      { key: "hardship_proof", attachmentIds: ["p1"] },
      { key: "bank_statements", attachmentIds: ["s1", "s2", "s3"] },
    ],
    ...extra,
  };
}

async function drop(name) {
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

async function seed(name, kv) {
  const database = await openNamedDb(name);
  const tx = database.transaction("kv", "readwrite");
  for (const [key, value] of Object.entries(kv)) tx.objectStore("kv").put(value, key);
  await txDone(tx);
  database.close();
}

async function readKv(name) {
  const database = await openNamedDb(name);
  const tx = database.transaction("kv", "readonly");
  const keys = await requestResult(tx.objectStore("kv").getAllKeys());
  const out = {};
  for (const key of keys) out[String(key)] = await requestResult(tx.objectStore("kv").get(key));
  await txDone(tx);
  database.close();
  return out;
}

beforeEach(async () => {
  resetStorageForTests();
  delete globalThis.__PYL_STORAGE_NS__;
  await drop(PREVIEW);
  await drop(LIVE);
});

describe("rd:export record", () => {
  it("builds the minimal record and the worked short code", () => {
    const record = buildRdExport(readyPack(), NOW);
    expect(record).toEqual({
      v: 1,
      source: RD_PRODUCT,
      monthsAskedFor: 6,
      tenorMonths: 6,
      startMonth: "2026-10",
      endMonth: "2027-03",
      done: true,
      doneAt: "2026-09",
      exportedAt: "2026-09-29",
    });
    expect(Object.keys(record)).toEqual(RD_EXPORT_FIELDS);
    expect(record.hkid).toBeUndefined();
    expect(JSON.stringify(record)).not.toMatch(/Ada|A123|9123/);
    expect(encodeShortCode(record)).toBe("6H1-G2S");
    expect(decodeShortCode("6H1-G2S", NOW).record.startMonth).toBe("2026-10");
  });

  it("uses the month after sentAt and rejects extra fields or a bad end month", () => {
    const sent = buildRdExport(readyPack({ sentAt: new Date(2026, 7, 2).getTime() }), NOW);
    expect(sent.startMonth).toBe("2026-09");
    expect(sent.endMonth).toBe("2027-02");
    expect(acceptRdExport({ ...sent, name: "Ada" })).toBeNull();
    expect(acceptRdExport({ ...sent, endMonth: "2027-04" })).toBeNull();
    expect(acceptRdExport({ ...sent, hkid: "A123" })).toBeNull();
  });
});

describe("preview namespace round trip", () => {
  it("lets Fortune A2 read the preview export and leaves the live database unchanged", async () => {
    const liveExport = { v: 1, exportedAt: "2026-01-02", marker: "live" };
    await seed(LIVE, { [KV.rdExport]: liveExport, [KV.ftErasedAt]: "2026-01" });
    const before = await readKv(LIVE);

    globalThis.__PYL_STORAGE_NS__ = PREVIEW;
    const record = buildRdExport(readyPack(), NOW);
    expect(await saveRdExport({ ...record, phone: "900" })).toBeNull();
    expect(await getRdExport()).toBeNull();
    expect(await saveRdExport(record)).toEqual(record);

    const importer = openScope("ft.import");
    const seen = await importer.get(KV.rdExport);
    expect(a2FoundState({ rdExport: seen }).found).toBe(true);
    await expect(importer.get(KV.rdPack)).rejects.toBeInstanceOf(StorageScopeError);
    const plan = applyBroughtIn(newFortunePlan(), seen, "rd-export", "2026-09");
    expect(plan.stage1).toMatchObject({
      source: "rd-export",
      monthsAskedFor: 6,
      tenorMonths: 6,
      startMonth: "2026-10",
      done: true,
    });
    expect(JSON.stringify(plan.stage1)).not.toMatch(/Ada|hkid|phone/);

    expect(await readKv(LIVE)).toEqual(before);
    expect((await readKv(PREVIEW))[KV.rdPack]).toBeUndefined();
  });
});
