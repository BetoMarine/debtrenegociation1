/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { newFortunePlan } from "../../fortune/model.js";
import { bootV3, resetFortuneWritesForTests, setFortuneWriteGateForTests } from "../../fortune/v3/boot.js";
import { ATT, KV } from "./keys.js";
import { openNamedDb, requestResult, txDone } from "./idb.js";
import { openScope, resetStorageForTests } from "./store.js";

const NS = "exit-boot";

async function drop(name) {
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

async function readKv() {
  const database = await openNamedDb(NS);
  const tx = database.transaction("kv", "readonly");
  const keys = await requestResult(tx.objectStore("kv").getAllKeys());
  const out = {};
  for (const key of keys) out[String(key)] = await requestResult(tx.objectStore("kv").get(key));
  await txDone(tx);
  database.close();
  return out;
}

async function click(act) {
  const button = document.querySelector(`[data-act="${act}"]`);
  expect(button, act).toBeTruthy();
  button.click();
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

function fortuneKeys(kv) {
  return Object.keys(kv)
    .filter((key) => key.startsWith("ft:") || key.startsWith("fortune"))
    .sort();
}

async function waitFor(pred, label) {
  for (let i = 0; i < 80; i += 1) {
    if (await pred()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(label);
}

beforeEach(async () => {
  resetStorageForTests();
  resetFortuneWritesForTests();
  globalThis.__PYL_STORAGE_NS__ = NS;
  sessionStorage.clear();
  await drop(NS);
  document.body.innerHTML = '<div id="app"></div>';
});

describe("cold open after erase", () => {
  it("resumes a sticky Fix screen until Start clear, and a Fortune erase does not wipe Right Door", async () => {
    const ft = openScope("ft.app");
    const rd = openScope("rd.app");
    const sun = openScope("sun.app");
    await ft.put(KV.ftPlan, {
      ...newFortunePlan(),
      templateId: "balanced",
      stage1: { ...newFortunePlan().stage1, status: "none", source: "ft-rd-steps", route: "bank" },
    });
    await ft.put(KV.ftUi, { lastByStage: { fix: "s03a" } });
    await openScope("ft.rdSteps").put(KV.ftRdPack, {
      fullName: "Ada",
      tenorMonths: "6",
      reason: "job_ended",
      letter: "",
      letterTouched: false,
      askedRoute: "idrp",
      documents: [{ key: "hardship_proof", attachmentIds: [`${ATT.ft}photo`] }],
    });
    await rd.put(KV.rdPack, { id: "rd" });
    await rd.put(KV.rdExport, { v: 1, exportedAt: "2026-08-01" });
    await sun.put(KV.sunPack, { id: "sun" });
    await rd.remove(KV.rdExport);
    await rd.remove(KV.rdPack);

    await bootV3(document.getElementById("app"));
    expect(document.body.textContent).toContain("Continue");
    await click("cover-continue");
    expect(document.querySelector("[data-choice]")?.getAttribute("data-choice")).toBe("mid");
    expect(document.querySelector("[data-act='keep-plan']")).toBeTruthy();
    expect(document.querySelector("[data-act='start-clear']")).toBeTruthy();
    expect(document.querySelector("[data-stage-line]")).toBeNull();

    await click("keep-plan");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("map");
    await click("map-go");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("s03a");

    document.body.innerHTML = '<div id="app"></div>';
    await bootV3(document.getElementById("app"));
    await click("cover-continue");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("map");
    await click("start-clear");
    expect(document.querySelector(".v3-primary")?.textContent?.startsWith("Start:")).toBe(true);
    await click("map-go");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("s01");

    const kept = await readKv();
    expect(kept[KV.ftPlan].stage1.status).toBe("none");
    expect(kept[KV.ftPlan].templateId).toBe("balanced");
    expect(kept[KV.ftUi].lastByStage.fix).toBe("s01");
    expect(kept[KV.ftRdPack].fullName).toBe("");
    expect(kept[KV.sunPack].id).toBe("sun");
    expect(kept[KV.rdPack]).toBeUndefined();
    expect(kept[KV.rdExport]).toBeUndefined();

    document.body.innerHTML = '<div id="app"></div>';
    sessionStorage.clear();
    await bootV3(document.getElementById("app"));
    await click("ask-erase");
    await click("confirm-erase");
    expect(document.body.textContent).toContain("Fortune Teller erased");
    const wiped = await readKv();
    expect(wiped[KV.ftPlan]).toBeUndefined();
    expect(wiped[KV.ftUi]).toBeUndefined();
    expect(wiped[KV.ftRdPack]).toBeUndefined();
    expect(wiped[KV.sunPack].id).toBe("sun");
    await click("e1-ok");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("where");
    expect(document.body.textContent).toContain("Where are you today?");

    document.body.innerHTML = '<div id="app"></div>';
    await bootV3(document.getElementById("app"));
    const cold = await readKv();
    expect(cold[KV.ftPlan]).toBeUndefined();
    expect(cold[KV.ftUi]).toBeUndefined();
    expect(cold[KV.sunPack].id).toBe("sun");
    expect(fortuneKeys(cold)).toEqual([KV.ftErasedAt]);
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("where");
    expect(document.querySelector("[data-act='cover-continue']")).toBeNull();
    expect(document.querySelector("[data-act='ask-erase']")).toBeNull();
    expect(document.body.textContent).toContain("Under money stress");
    expect(document.querySelector("[data-act='start-clear']")).toBeNull();
    expect(document.querySelector("[data-dig-in]")).toBeNull();
    await click("pick-where");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("s01");
    const resumed = await readKv();
    expect(resumed[KV.ftPlan].stage1.status).toBe("none");
    expect(resumed[KV.ftPlan].stage1.source).toBeNull();
    expect(resumed[KV.ftUi].lastByStage.fix).toBe("s01");
    expect(resumed[KV.sunPack].id).toBe("sun");
  });

  it("drops a cover save that is still open when erase begins, then stays clear after a cold boot", async () => {
    const ft = openScope("ft.app");
    const steps = openScope("ft.rdSteps");
    const rd = openScope("rd.app");
    const sun = openScope("sun.app");
    await ft.put(KV.ftPlan, {
      ...newFortunePlan(),
      templateId: "balanced",
      stage1: { ...newFortunePlan().stage1, status: "none", source: "ft-rd-steps", route: "bank" },
    });
    await ft.put(KV.ftUi, { lastByStage: { fix: "s03a" } });
    await steps.put(KV.ftRdPack, {
      fullName: "Ada",
      tenorMonths: "6",
      reason: "job_ended",
      letter: "please",
      letterTouched: true,
      askedRoute: "idrp",
    });
    await steps.putAtt(`${ATT.ft}photo`, new Blob(["photo"]));
    await rd.put(KV.rdPack, { id: "rd" });
    await rd.put(KV.rdExport, { v: 1, exportedAt: "2026-08-01" });
    await rd.putAtt(`${ATT.rd}keep`, new Blob(["rd"]));
    await sun.put(KV.sunPack, { id: "sun" });

    const seeded = await readKv();
    expect(seeded[KV.ftUi].lastByStage.fix).toBe("s03a");
    expect(seeded[KV.ftRdPack].fullName).toBe("Ada");

    await bootV3(document.getElementById("app"));
    let release;
    setFortuneWriteGateForTests(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    document.querySelector('[data-act="cover-continue"]').click();
    try {
      for (let i = 0; i < 20 && !release; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
      expect(typeof release).toBe("function");
      const extra = document.createElement("button");
      extra.setAttribute("data-act", "confirm-erase");
      document.getElementById("app").appendChild(extra);
      extra.click();
      release();
      release = null;
      await waitFor(async () => {
        const kv = await readKv();
        return fortuneKeys(kv).join() === KV.ftErasedAt && kv[KV.rdPack]?.id === "rd";
      }, "erase did not stay ahead of the cover save");
      for (let i = 0; i < 30; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
      await waitFor(() => document.body.textContent.includes("Fortune Teller erased"), "E1 did not show");
    } finally {
      release?.();
      setFortuneWriteGateForTests(null);
    }

    const wiped = await readKv();
    expect(fortuneKeys(wiped)).toEqual([KV.ftErasedAt]);
    expect(wiped[KV.ftPlan]).toBeUndefined();
    expect(wiped[KV.ftUi]).toBeUndefined();
    expect(wiped[KV.ftRdPack]).toBeUndefined();
    expect(wiped[KV.rdPack].id).toBe("rd");
    expect(wiped[KV.rdExport].exportedAt).toBe("2026-08-01");
    expect(wiped[KV.sunPack].id).toBe("sun");
    expect(await steps.getAtt(`${ATT.ft}photo`)).toBeNull();
    expect(await rd.getAtt(`${ATT.rd}keep`)).toBeTruthy();

    document.body.innerHTML = '<div id="app"></div>';
    await bootV3(document.getElementById("app"));
    expect(document.body.textContent).toContain("Fortune Teller erased");
    expect(fortuneKeys(await readKv())).toEqual([KV.ftErasedAt]);
    await click("e1-ok");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("where");
    expect(document.body.textContent).toContain("Where are you today?");
    expect(fortuneKeys(await readKv())).toEqual([KV.ftErasedAt]);

    document.body.innerHTML = '<div id="app"></div>';
    await bootV3(document.getElementById("app"));
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("where");
    expect(document.querySelector("[data-act='cover-continue']")).toBeNull();
    expect(document.querySelector("[data-act='ask-erase']")).toBeNull();
    expect(document.body.textContent).toContain("Under money stress");
    expect(fortuneKeys(await readKv())).toEqual([KV.ftErasedAt]);
    expect(document.querySelector("[data-act='start-clear']")).toBeNull();
    await click("pick-where");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("s01");

    document.body.innerHTML = '<div id="app"></div>';
    sessionStorage.clear();
    await bootV3(document.getElementById("app"));
    await click("ask-erase");
    await click("confirm-erase");
    expect(document.body.textContent).toContain("Fortune Teller erased");
    const second = await readKv();
    expect(fortuneKeys(second)).toEqual([KV.ftErasedAt]);
    expect(second[KV.rdPack].id).toBe("rd");
    expect(second[KV.sunPack].id).toBe("sun");
    await click("e1-ok");

    document.body.innerHTML = '<div id="app"></div>';
    await bootV3(document.getElementById("app"));
    expect(fortuneKeys(await readKv())).toEqual([KV.ftErasedAt]);
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("where");
    expect(document.querySelector("[data-act='cover-continue']")).toBeNull();
    expect(document.querySelector("[data-act='ask-erase']")).toBeNull();
    await click("pick-where");
    expect(document.querySelector("[data-screen]")?.getAttribute("data-screen")).toBe("s01");
    const after = await readKv();
    expect(after[KV.ftUi].lastByStage.fix).toBe("s01");
    expect(after[KV.ftPlan].stage1.status).toBe("none");
    expect(after[KV.ftPlan].stage1.source).toBeNull();
    expect(after[KV.rdExport].exportedAt).toBe("2026-08-01");
    expect(after[KV.sunPack].id).toBe("sun");
  });
});
