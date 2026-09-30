/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { el, escapeHtml } from "../dom.js";
import { t } from "../i18n.js";
import { reduce, freshState } from "../fortune/v3/flow.js";
import { sessionGet, sessionSet } from "../shared/storage/web.js";
import {
  R1_NOT_NOW_KEY,
  R1_ZH_REVIEW,
  applyR1Action,
  consumeQuickExitPress,
  r1CompletionKey,
  renderR1Screen,
  shouldShowR1,
} from "./r1.js";

const NOW = new Date(2026, 8, 29, 15, 0, 0);

function readyPack(extra = {}) {
  return {
    fullName: "Ada",
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

function draw(phase, code, handlers = {}) {
  const root = document.createElement("div");
  root.append(
    renderR1Screen({
      phase,
      code,
      s: (key) => t("en", key),
      el,
      escapeHtml,
      ...handlers,
    }),
  );
  return root;
}

beforeEach(() => {
  delete globalThis.__PYL_STORAGE_NS__;
  sessionStorage.clear();
});

describe("R1 nudge", () => {
  it("shows once for standalone after script and documents, and Not now is session-only", () => {
    const pack = readyPack();
    const key = r1CompletionKey(pack, NOW);
    expect(shouldShowR1({ pack, now: NOW })).toBe(true);
    expect(shouldShowR1({ host: "fortune", pack, now: NOW })).toBe(false);
    expect(shouldShowR1({ pack, notNow: true, now: NOW })).toBe(false);
    expect(shouldShowR1({ pack, offeredFor: key, now: NOW })).toBe(false);
    expect(shouldShowR1({ pack: readyPack({ documents: [] }), now: NOW })).toBe(false);
    expect(shouldShowR1({ pack: readyPack({ door: null }), now: NOW })).toBe(false);
    expect(R1_ZH_REVIEW).toBe("unreviewed");
    expect(t("zh", "r1.title")).toBe("這個月之後，下一步是什麼？");
    expect(t("en", "r1.title")).toBe("What's next, after this month?");
  });

  it("writes only on the primary tap", () => {
    const pack = readyPack();
    const session = vi.fn();
    expect(applyR1Action("open", { pack, now: NOW }).write).toBe(false);
    expect(applyR1Action("finish", { pack, now: NOW }).write).toBe(false);
    const later = applyR1Action("not-now", { pack, now: NOW, sessionSet: session });
    expect(later).toMatchObject({ write: false, record: null, code: "", next: "pack" });
    expect(session).toHaveBeenCalledWith(R1_NOT_NOW_KEY, "1");
    const primary = applyR1Action("primary", { pack, now: NOW });
    expect(primary.write).toBe(true);
    expect(primary.code).toBe("6H1-G2S");
    expect(primary.record.done).toBe(true);
    const app = readFileSync(join(process.cwd(), "src/app.js"), "utf8");
    expect(app.split("saveRdExport(").length - 1).toBe(1);
    const start = app.indexOf("async function onR1Primary");
    const end = app.indexOf("function onR1NotNow");
    expect(app.slice(start, end)).toContain("saveRdExport(");
    expect(app.slice(0, start)).not.toContain("saveRdExport(");
    expect(app.slice(end)).not.toContain("saveRdExport(");
  });

  it("prefixes the Not now key for a preview and for the main prefix", () => {
    globalThis.__PYL_STORAGE_NS__ = "pyl-preview-pr31";
    sessionSet(R1_NOT_NOW_KEY, "1");
    expect(sessionStorage.getItem("pyl-preview-pr31:rd:r1NotNow")).toBe("1");
    expect(sessionStorage.getItem("pyl:rd:r1NotNow")).toBeNull();
    expect(sessionGet(R1_NOT_NOW_KEY)).toBe("1");
    sessionStorage.clear();
    globalThis.__PYL_STORAGE_NS__ = "app-main";
    sessionSet(R1_NOT_NOW_KEY, "1");
    expect(sessionStorage.getItem("pyl:rd:r1NotNow")).toBe("1");
  });

  it("shows no stage line, and quick exit clears the short code", () => {
    let writes = 0;
    const ask = draw("ask", "", {
      onPrimary: () => {
        writes += 1;
      },
      onNotNow: () => {},
    });
    expect(ask.querySelector("[data-stage-line]")).toBeNull();
    expect(ask.textContent).toContain("What's next, after this month?");
    expect(ask.querySelector(".stage-line")).toBeNull();
    ask.querySelector("[data-act=r1-not-now]").click();
    expect(writes).toBe(0);
    ask.querySelector("[data-act=r1-primary]").click();
    expect(writes).toBe(1);

    let code = "6H1-G2S";
    const result = draw("code", code, {
      onExit: () => {
        code = applyR1Action("exit").code;
        result.replaceChildren();
      },
    });
    expect(result.querySelector("[data-r1-code]").textContent).toBe("6H1-G2S");
    expect(result.querySelector("[data-stage-line]")).toBeNull();
    result.querySelector("[data-act=r1-exit]").click();
    expect(code).toBe("");
    expect(result.textContent).not.toContain("6H1-G2S");
    expect(consumeQuickExitPress(1000, 1500).clear).toBe(true);
    expect(consumeQuickExitPress(1000, 2000).clear).toBe(false);
  });

  it("clears Fortune's typed code on quick exit", () => {
    const state = reduce(freshState({ screen: "code", codeDraft: "6H1-G2S", codeError: "length" }), { type: "exit" });
    expect(state.screen).toBe("cover");
    expect(state.codeDraft).toBe("");
    expect(state.codeError).toBe("");
  });
});
