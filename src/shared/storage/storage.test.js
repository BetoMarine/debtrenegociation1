import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { ATT, KV, LEGACY_KV, monthStamp } from "./keys.js";
import { openNamedDb, requestResult, txDone } from "./idb.js";
import { LEGACY_DB_NAMES, migrateNamespacesV1, snapshotDb } from "./migrate-ns-v1.js";
import { noteMeaningfulSave, resetPersistForTests } from "./persist.js";
import { eraseFortune, eraseRightDoor, eraseSunday } from "./erase.js";
import { openedFortuneState, reduce } from "../../fortune/v3/flow.js";
import { resetFtRd, loadFtRd } from "../../fortune/rd-host.js";
import { openScope, resetStorageForTests, StorageScopeError } from "./store.js";
import { webPrefixFor } from "./ns-policy.js";
import { sessionGet, sessionSet } from "./web.js";
import * as db from "../../db.js";

const LIVE = LEGACY_DB_NAMES[0];

async function drop(name) {
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

async function seed(name, { kv = {}, attachments = {}, events = [] } = {}) {
  const database = await openNamedDb(name);
  const tx = database.transaction(["kv", "attachments", "events"], "readwrite");
  for (const [key, value] of Object.entries(kv)) tx.objectStore("kv").put(value, key);
  for (const [key, value] of Object.entries(attachments)) tx.objectStore("attachments").put(value, key);
  for (const event of events) tx.objectStore("events").add(event);
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

function legacyProfile() {
  return {
    kv: {
      [LEGACY_KV.pack]: {
        id: "local",
        fullName: "Ada",
        documents: [{ key: "identity", attachmentIds: ["uuid-1"] }],
      },
      [LEGACY_KV.lang]: "zh",
      [LEGACY_KV.sundayPack]: { id: "sunday", note: "keep" },
      [LEGACY_KV.sundayLang]: "en",
      [LEGACY_KV.fortunePlan]: { id: "fortune-local", fixMonths: 6, milestones: [] },
      [LEGACY_KV.fortuneForecast]: { seed: 1 },
      [LEGACY_KV.fortuneUi]: { loginTeaseDismissed: true },
      [LEGACY_KV.fortuneFireHandoff]: { source: LIVE, months: 6, name: "Debt renegotiation", createdAt: 1 },
    },
    attachments: {
      "uuid-1": new Blob(["photo"], { type: "image/png" }),
    },
    events: [
      { type: "app_open", at: 1 },
      { type: "pack_created", at: 2 },
      { type: "fortune_started", at: 3 },
      { type: "sunday_started", at: 4 },
    ],
  };
}

async function namespacedProfile(name) {
  await seed(name, {
    ...legacyProfile(),
    kv: {
      ...legacyProfile().kv,
      [KV.rdPack]: { id: "rd" },
      [KV.rdLang]: "zh",
      [KV.rdExport]: { v: 1, exportedAt: "2026-08-01" },
      [KV.ftPlan]: { id: "ft", stage1: { status: "asked", startMonth: "2026-10" } },
      [KV.ftForecast]: { seed: 2 },
      [KV.ftUi]: { ok: true },
      [KV.ftRdPack]: { secret: true },
      [KV.ftRdLang]: "en",
      [KV.ftHandoff]: { source: LIVE },
      [KV.sunPack]: { id: "sun" },
      [KV.sunLang]: "en",
      [KV.metaNs]: { v: 1, at: "2026-09" },
    },
    attachments: {
      ...legacyProfile().attachments,
      [`${ATT.rd}kept`]: new Blob(["rd"], { type: "image/png" }),
      [`${ATT.ft}kept`]: new Blob(["ft"], { type: "image/png" }),
    },
  });
}

beforeEach(async () => {
  resetStorageForTests();
  resetPersistForTests();
  delete globalThis.__PYL_STORAGE_NS__;
  delete globalThis.__PYL_RUN_MIGRATION__;
  delete globalThis.__PYL_PERSIST__;
  await drop("ns-fixture");
  await drop(LIVE);
  await drop("pyl-preview-pr4");
  await drop("pyl-preview-pr8");
});

describe("namespace migration", () => {
  it("copies legacy keys once, keeps them byte-identical, and no-ops the second run", async () => {
    globalThis.__PYL_STORAGE_NS__ = "ns-fixture";
    const profile = legacyProfile();
    await seed("ns-fixture", profile);
    const database = await openNamedDb("ns-fixture");
    const before = await snapshotDb(database);
    const first = await migrateNamespacesV1(database);
    const afterFirst = await snapshotDb(database);
    const second = await migrateNamespacesV1(database);
    const afterSecond = await snapshotDb(database);
    database.close();
    expect(first.migrated).toBe(true);
    expect(second).toEqual({ migrated: false, reason: "marker" });

    const kv = await readKv("ns-fixture");
    expect(kv[LEGACY_KV.pack]).toEqual(profile.kv[LEGACY_KV.pack]);
    expect(kv[LEGACY_KV.fortunePlan]).toEqual(profile.kv[LEGACY_KV.fortunePlan]);
    expect(kv[LEGACY_KV.fortuneFireHandoff]).toEqual(profile.kv[LEGACY_KV.fortuneFireHandoff]);
    expect(kv[KV.rdPack].documents[0].attachmentIds).toEqual([`${ATT.rd}uuid-1`]);
    expect(kv[KV.rdLang]).toBe("zh");
    expect(kv[KV.sunPack]).toEqual(profile.kv[LEGACY_KV.sundayPack]);
    expect(kv[KV.ftPlan].schemaVersion).toBe(2);
    expect(kv[KV.ftPlan].stage1.status).toBe("asked");
    expect(kv[KV.ftPlan].stage1.source).toBe("legacy");
    expect(kv[KV.metaNs].v).toBe(1);
    expect(kv[KV.metaNs].at).toMatch(/^\d{4}-\d{2}$/);

    const legacySlice = (snap) => {
      const parsed = JSON.parse(snap);
      const keep = {};
      for (const key of Object.keys(profile.kv)) keep[key] = parsed.kv[key];
      keep.attachments = { "uuid-1": parsed.attachments["uuid-1"] };
      return JSON.stringify(keep);
    };
    expect(legacySlice(afterFirst)).toBe(legacySlice(before));
    expect(legacySlice(afterSecond)).toBe(legacySlice(before));
    expect(afterSecond).toBe(afterFirst);
  });

  it("aborts before the marker and commits nothing", async () => {
    const database = await openNamedDb("ns-fixture");
    const tx = database.transaction("kv", "readwrite");
    tx.objectStore("kv").put({ id: "local" }, LEGACY_KV.pack);
    await txDone(tx);
    const before = await snapshotDb(database);
    const result = await migrateNamespacesV1(database, { abortBeforeCommit: true });
    const after = await snapshotDb(database);
    database.close();
    expect(result.reason).toBe("aborted");
    expect(after).toBe(before);
  });

  it("leaves a seeded live-named database byte-identical when a preview namespace boots", async () => {
    await seed(LIVE, legacyProfile());
    const live = await openNamedDb(LIVE);
    const before = await snapshotDb(live);
    live.close();
    globalThis.__PYL_STORAGE_NS__ = "pyl-preview-pr4";
    const { getPack } = await import("../../db.js");
    expect(await getPack()).toBeNull();
    const again = await openNamedDb(LIVE);
    const after = await snapshotDb(again);
    again.close();
    expect(after).toBe(before);
    expect(webPrefixFor("pyl-preview-pr4")).toBe("pyl-preview-pr4:");
    expect(webPrefixFor(LIVE)).toBe("pyl:");
  });
});

describe("erase scopes", () => {
  async function useFixture() {
    globalThis.__PYL_STORAGE_NS__ = "ns-fixture";
    await namespacedProfile("ns-fixture");
    resetStorageForTests();
  }

  it("Right Door clear deletes only RD keys, RD attachments, and legacy twins", async () => {
    await useFixture();
    await eraseRightDoor();
    const kv = await readKv("ns-fixture");
    expect(kv[KV.rdPack]).toBeUndefined();
    expect(kv[KV.rdLang]).toBeUndefined();
    expect(kv[KV.rdExport]).toBeUndefined();
    expect(kv[LEGACY_KV.pack]).toBeUndefined();
    expect(kv[LEGACY_KV.lang]).toBeUndefined();
    expect(kv[KV.ftPlan].id).toBe("ft");
    expect(kv[KV.ftRdPack].secret).toBe(true);
    expect(kv[KV.sunPack].id).toBe("sun");
    expect(kv[KV.metaNs].v).toBe(1);
    expect(kv[LEGACY_KV.fortunePlan].id).toBe("fortune-local");
    const database = await openNamedDb("ns-fixture");
    const snap = JSON.parse(await snapshotDb(database));
    database.close();
    expect(snap.attachments[`${ATT.rd}kept`]).toBeUndefined();
    expect(snap.attachments["uuid-1"]).toBeUndefined();
    expect(snap.attachments[`${ATT.ft}kept`]).toBeTruthy();
    const types = snap.events.map((event) => event.type);
    expect(types).not.toContain("pack_created");
    expect(types).toContain("fortune_started");
    expect(types).toContain("sunday_started");
    expect(types).toContain("app_open");
  });

  it("Fortune erase deletes ft keys, writes ft:erasedAt, and keeps rd:export", async () => {
    await useFixture();
    await eraseFortune();
    const kv = await readKv("ns-fixture");
    expect(kv[KV.ftPlan]).toBeUndefined();
    expect(kv[KV.ftForecast]).toBeUndefined();
    expect(kv[KV.ftUi]).toBeUndefined();
    expect(kv[KV.ftRdPack]).toBeUndefined();
    expect(kv[KV.ftRdLang]).toBeUndefined();
    expect(kv[KV.ftHandoff]).toBeUndefined();
    expect(kv[KV.ftErasedAt]).toBe(monthStamp());
    expect(kv[KV.rdExport].exportedAt).toBe("2026-08-01");
    expect(kv[KV.rdPack].id).toBe("rd");
    expect(kv[KV.sunPack].id).toBe("sun");
    expect(kv[LEGACY_KV.fortunePlan]).toBeUndefined();
    expect(kv[LEGACY_KV.fortuneFireHandoff]).toBeUndefined();
    expect(kv[LEGACY_KV.pack].id).toBe("local");
    const database = await openNamedDb("ns-fixture");
    const snap = JSON.parse(await snapshotDb(database));
    database.close();
    expect(snap.attachments[`${ATT.ft}kept`]).toBeUndefined();
    expect(snap.attachments[`${ATT.rd}kept`]).toBeTruthy();
    const types = snap.events.map((event) => event.type);
    expect(types).not.toContain("fortune_started");
    expect(types).toContain("pack_created");
    expect(types).toContain("sunday_started");
  });

  it("Right Door erase keeps Fortune stage and resume for Keep or Start clear", async () => {
    await useFixture();
    const ft = openScope("ft.app");
    const plan = {
      ...(await ft.get(KV.ftPlan)),
      templateId: "balanced",
      stage1: { status: "none", source: "ft-rd-steps", route: "bank" },
    };
    await ft.put(KV.ftPlan, plan);
    await ft.put(KV.ftUi, { lastByStage: { fix: "s03a" }, exitKept: false });
    await eraseRightDoor();
    const kv = await readKv("ns-fixture");
    expect(kv[KV.rdPack]).toBeUndefined();
    expect(kv[KV.rdExport]).toBeUndefined();
    expect(kv[KV.ftPlan].stage1.source).toBe("ft-rd-steps");
    expect(kv[KV.ftPlan].templateId).toBe("balanced");
    expect(kv[KV.ftUi].lastByStage.fix).toBe("s03a");
    expect(kv[KV.ftRdPack].secret).toBe(true);
    expect(kv[KV.sunPack].id).toBe("sun");
    const choice = reduce(openedFortuneState({ plan: kv[KV.ftPlan], ui: kv[KV.ftUi], manualExport: true }), {
      type: "cover-continue",
    });
    expect(choice.screen).toBe("choice");
    expect(choice.plan.templateId).toBe("balanced");
  });

  it("Fortune erase clears stage and resume and leaves Right Door and Sunday", async () => {
    await useFixture();
    const ft = openScope("ft.app");
    await ft.put(KV.ftUi, { lastByStage: { fix: "s03a" } });
    await ft.put(KV.ftPlan, {
      ...(await ft.get(KV.ftPlan)),
      stage1: { status: "asked", source: "rd-export", route: "bank", startMonth: "2026-10", tenorMonths: 6 },
    });
    await eraseFortune();
    const kv = await readKv("ns-fixture");
    expect(kv[KV.ftPlan]).toBeUndefined();
    expect(kv[KV.ftUi]).toBeUndefined();
    expect(kv[KV.ftRdPack]).toBeUndefined();
    expect(kv[KV.rdExport].exportedAt).toBe("2026-08-01");
    expect(kv[KV.rdPack].id).toBe("rd");
    expect(kv[KV.sunPack].id).toBe("sun");
    const opened = openedFortuneState({ plan: kv[KV.ftPlan], ui: kv[KV.ftUi], pendingErase: true });
    expect(opened.screen).toBe("e1");
    expect(opened.ui.lastByStage).toEqual({});
    expect(opened.plan.stage1.status).toBe("none");
    const map = reduce(opened, { type: "e1-ok" });
    expect(map.screen).toBe("map");
    expect(reduce(map, { type: "map-go" }).screen).toBe("s01");
  });

  it("a Fortune start-clear drops Fortune's own answers and does not wipe Right Door or Sunday", async () => {
    await useFixture();
    const steps = openScope("ft.rdSteps");
    await steps.put(KV.ftRdPack, {
      fullName: "Ada",
      tenorMonths: "9",
      reason: "job_ended",
      letter: "Please hold the account.",
      letterTouched: true,
      askedRoute: "idrp",
      documents: [{ key: "hardship_proof", attachmentIds: [`${ATT.ft}photo`] }],
    });
    await steps.putAtt(`${ATT.ft}photo`, new Blob(["x"], { type: "image/png" }));
    const view = await resetFtRd();
    expect(view.fullName).toBe("");
    expect(view.proof).toBe(0);
    expect(await loadFtRd()).toMatchObject({ fullName: "", proof: 0, letter: "" });
    expect(await steps.getAtt(`${ATT.ft}photo`)).toBeNull();
    const kv = await readKv("ns-fixture");
    expect(kv[KV.ftPlan].id).toBe("ft");
    expect(kv[KV.rdPack].id).toBe("rd");
    expect(kv[KV.rdExport].exportedAt).toBe("2026-08-01");
    expect(kv[KV.sunPack].id).toBe("sun");
  });

  it("Sunday clear deletes only Sunday keys and legacy twins", async () => {
    await useFixture();
    await eraseSunday();
    const kv = await readKv("ns-fixture");
    expect(kv[KV.sunPack]).toBeUndefined();
    expect(kv[KV.sunLang]).toBeUndefined();
    expect(kv[LEGACY_KV.sundayPack]).toBeUndefined();
    expect(kv[LEGACY_KV.sundayLang]).toBeUndefined();
    expect(kv[KV.rdPack].id).toBe("rd");
    expect(kv[KV.ftPlan].id).toBe("ft");
    expect(kv[KV.metaNs].v).toBe(1);
    const database = await openNamedDb("ns-fixture");
    const snap = JSON.parse(await snapshotDb(database));
    database.close();
    expect(snap.events.map((event) => event.type)).not.toContain("sunday_started");
    expect(snap.events.map((event) => event.type)).toContain("pack_created");
  });

  it("a preview erase does not change the seeded live database", async () => {
    await seed(LIVE, legacyProfile());
    const live = await openNamedDb(LIVE);
    const before = await snapshotDb(live);
    live.close();
    globalThis.__PYL_STORAGE_NS__ = "pyl-preview-pr8";
    await eraseFortune();
    await eraseRightDoor();
    await eraseSunday();
    const again = await openNamedDb(LIVE);
    const after = await snapshotDb(again);
    again.close();
    expect(after).toBe(before);
  });
});

describe("scope allowlists", () => {
  it("fails closed and lets import read rd:export only", async () => {
    globalThis.__PYL_STORAGE_NS__ = "ns-fixture";
    const steps = openScope("ft.rdSteps");
    await steps.put(KV.ftRdPack, { ok: 1 });
    await expect(steps.get(KV.rdPack)).rejects.toBeInstanceOf(StorageScopeError);
    await expect(openScope("ft.map").get(KV.rdExport)).rejects.toBeInstanceOf(StorageScopeError);
    await expect(openScope("ft.import").get(KV.ftRdPack)).rejects.toBeInstanceOf(StorageScopeError);
    const importer = openScope("ft.import");
    await importer.put(KV.rdExport, { v: 1 });
    expect(await importer.get(KV.rdExport)).toEqual({ v: 1 });
    expect(await steps.get(KV.ftRdPack)).toEqual({ ok: 1 });
  });

  it("does not export an unscoped wipe of every store", () => {
    expect(db.wipeAll).toBeUndefined();
  });

  it("asks for persistence only after a meaningful save", async () => {
    globalThis.__PYL_STORAGE_NS__ = "ns-fixture";
    let calls = 0;
    globalThis.__PYL_PERSIST__ = () => {
      calls += 1;
      return Promise.resolve(true);
    };
    expect(await db.getPack()).toBeNull();
    expect(calls).toBe(0);
    await db.savePack({ id: "local" });
    expect(calls).toBe(1);
    await db.saveFortunePlan({ id: "fortune-local" });
    expect(calls).toBe(1);
    expect(noteMeaningfulSave).toBeTypeOf("function");
  });
});

describe("web storage prefix", () => {
  it("prefixes session keys and never clears storage", () => {
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    };
    globalThis.__PYL_STORAGE_NS__ = "pyl-preview-pr3";
    sessionSet("pyl.from", "fortune");
    expect(sessionGet("pyl.from")).toBe("fortune");
    expect([...store.keys()]).toEqual(["pyl-preview-pr3:pyl.from"]);
    expect(String(sessionSet).includes("clear")).toBe(false);
  });
});
