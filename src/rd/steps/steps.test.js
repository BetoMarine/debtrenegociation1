/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { el, escapeHtml } from "../../dom.js";
import { DOORS, recommendDoor } from "../../door.js";
import { DOCUMENT_DEFS, missingAttachments, normalizeDocuments } from "../../docs.js";
import { t } from "../../i18n.js";
import { stageWord, STAGE_WORDS } from "../../shared/stage-words.js";
import { renderRdStep } from "./index.js";
import { stageLineHtml } from "./chrome.js";

function ctx(host) {
  const pack = {
    reason: null,
    creditors: [],
    situation: { tenorMonths: "6" },
    documents: [],
    letter: "",
    status: "draft",
    door: DOORS.OTHER,
  };
  return {
    host,
    stageId: "fix",
    stageWord: stageWord("en", "fix"),
    pack,
    lang: "en",
    busy: false,
    notice: "",
    draftCreditor: { nickname: "", type: "hsbc", amount: "", ref: "" },
    s: (key, vars) => t("en", key, vars, { host }),
    el,
    escapeHtml,
    shell(body) {
      document.body.innerHTML = '<div id="app"></div>';
      document.getElementById("app").append(body);
    },
    nav: () => el(`<div class="nav"></div>`),
    go() {},
    render() {},
    ensurePack: async () => pack,
    savePack: async (next) => next,
    syncLetter() {},
    persistFireHandoff: async () => {},
    recommendDoor,
    DOORS,
    hrefs: () => ({ hkma: "https://example.invalid/hkma", hkmaGuide: "https://example.invalid/guide", hsbc: "https://example.invalid/hsbc", citi: "https://example.invalid/citi" }),
    DOCUMENT_DEFS,
    missingAttachments,
    normalizeDocuments,
    putAttachment: async () => {},
    getAttachment: async () => null,
    deleteAttachment: async () => {},
    compressImage: async (file) => file,
    isFortuneReferral: () => false,
    fortuneReturnCtaHtml: () => "",
    reminderState: () => null,
    STATUSES: ["draft"],
    TYPES: ["hsbc"],
    REASONS: ["job_ended"],
    setStatus() {},
    handlePdf() {},
    finishAssessment: async () => {},
  };
}

describe("RD steps host chrome", () => {
  it("renders a stage line only for the fortune host, using the shared stage words", () => {
    expect(stageLineHtml("standalone", STAGE_WORDS.en.fix)).toBe("");
    for (const id of Object.keys(STAGE_WORDS.en)) {
      const html = stageLineHtml("fortune", STAGE_WORDS.en[id]);
      document.body.innerHTML = html;
      expect(document.querySelector("[data-stage-line]").textContent).toBe(STAGE_WORDS.en[id]);
    }
    for (const step of ["reason", "situation", "door", "documents", "pack"]) {
      renderRdStep(step, ctx("standalone"));
      expect(document.querySelector("[data-stage-line]")).toBeNull();
      renderRdStep(step, ctx("fortune"));
      expect(document.querySelector("[data-stage-line]").textContent).toBe(STAGE_WORDS.en.fix);
    }
  });
});
