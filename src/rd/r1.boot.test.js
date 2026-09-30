/**
 * @vitest-environment happy-dom
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRdExport, savePack } from "../db.js";
import { a2FoundState } from "../fortune/import/found.js";
import { KV } from "../shared/storage/keys.js";
import { openScope, resetStorageForTests } from "../shared/storage/store.js";
import { boot } from "../app.js";

const PREVIEW = "pyl-preview-pr44";

function readyPack() {
  return {
    id: "local",
    lang: "zh",
    reason: "job_ended",
    fullName: "Ada",
    hkid: "A123456(7)",
    phone: "91234567",
    creditors: [],
    situation: { tenorMonths: "6", tenorStored: true },
    letter: "Hello",
    letterTouched: true,
    door: "idrp",
    documents: [
      { key: "hardship_proof", attachmentIds: ["p1"] },
      { key: "bank_statements", attachmentIds: ["s1", "s2", "s3"] },
    ],
    status: "draft",
    sentAt: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

beforeEach(async () => {
  resetStorageForTests();
  globalThis.__PYL_STORAGE_NS__ = PREVIEW;
  document.body.innerHTML = '<div id="app"></div>';
  window.scrollTo = () => {};
  location.hash = "#/pack";
  await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(PREVIEW);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

describe("standalone R1 boot", () => {
  it("does not write on open, writes on the primary tap, and clears the code on exit", async () => {
    await savePack(readyPack());
    await boot();
    expect(document.querySelector("[data-r1=ask]")).toBeTruthy();
    expect(document.querySelector("[data-stage-line]")).toBeNull();
    expect(document.querySelector("[data-r1-code]")).toBeNull();
    expect(await getRdExport()).toBeNull();

    document.querySelector("[data-act=r1-primary]").click();
    await vi.waitFor(async () => {
      expect(await getRdExport()).toBeTruthy();
    });
    const code = document.querySelector("[data-r1-code]").textContent;
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/);
    const saved = await getRdExport();
    expect(saved.hkid).toBeUndefined();
    expect(JSON.stringify(saved)).not.toMatch(/Ada|A123|9123/);

    document.querySelector("[data-act=r1-exit]").click();
    await vi.waitFor(() => {
      expect(document.querySelector("[data-r1-code]")).toBeNull();
    });
    expect(document.body.textContent).not.toContain(code);
    expect((await getRdExport()).exportedAt).toBe(saved.exportedAt);

    const seen = await openScope("ft.import").get(KV.rdExport);
    expect(a2FoundState({ rdExport: seen }).found).toBe(true);
    expect(seen.startMonth).toBe(saved.startMonth);
  });
});
