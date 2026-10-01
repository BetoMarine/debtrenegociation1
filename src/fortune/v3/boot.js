import { isStandalone } from "../../dom.js";
import { clearFortuneReferral } from "../../refer.js";
import { getFortunePlan, getFortuneUi, saveFortunePlan, saveFortuneUi, wipeFortune } from "../../db.js";
import { a2FoundState } from "../import/found.js";
import { migrateFortunePlan } from "../model.js";
import { KV } from "../../shared/storage/keys.js";
import { openScope } from "../../shared/storage/store.js";
import { isPreviewDeploy } from "../../shared/storage/ns.js";
import { sessionGet, sessionRemove, sessionSet } from "../../shared/storage/web.js";
import { emptyUi, openedFortuneState, reduce } from "./flow.js";
import { renderV3 } from "./render.js";
import { createWriteQueue } from "./write-queue.js";
import { addFtPhoto, fortuneLetterText, loadFtRd, resetFtRd, saveFtRd, shareFortuneLetter } from "../rd-host.js";

const writes = createWriteQueue();

export function resetFortuneWritesForTests() {
  writes.bump();
  writes.beforeWrite = null;
}

/** Test seam. Holds a save after it has joined the queue and before it writes. */
export function setFortuneWriteGateForTests(gate) {
  writes.beforeWrite = gate || null;
}

const ERASE_FLAG = "ft.eraseNotice";

function minimalExport(record) {
  if (!record || typeof record !== "object") return null;
  return {
    monthsAskedFor: record.monthsAskedFor ?? null,
    tenorMonths: record.tenorMonths ?? null,
    startMonth: record.startMonth || null,
    done: !!record.done,
    doneAt: record.doneAt || null,
    exportedAt: record.exportedAt || null,
  };
}

async function loadFound() {
  const importer = openScope("ft.import");
  const [rdExport, erasedAt] = await Promise.all([importer.get(KV.rdExport), importer.get(KV.ftErasedAt)]);
  const gate = a2FoundState({ rdExport, erasedAt });
  return {
    foundExport: gate.found || gate.manualCanFind ? minimalExport(rdExport) : null,
    manualExport: !gate.found,
    standalone: isStandalone(),
  };
}

export async function bootV3(root = document.getElementById("app")) {
  clearFortuneReferral();
  const storedPlan = await getFortunePlan();
  const storedUi = (await getFortuneUi()) || {};
  const found = await loadFound();
  const rd = await loadFtRd();
  const pending = sessionGet(ERASE_FLAG) === "1";
  let state = openedFortuneState({
    plan: storedPlan,
    ui: storedUi,
    rd,
    pendingErase: pending,
    ...found,
  });
  state.digIn = isPreviewDeploy();
  let escAt = 0;

  async function persist() {
    const seen = writes.epoch;
    await writes.enqueue(async () => {
      if (seen !== writes.epoch) return;
      const plan = state.plan;
      const ui = state.ui;
      const rd = {
        fullName: state.rd.fullName,
        tenorMonths: state.rd.tenorMonths,
        reason: state.rd.reason,
        letter: state.rd.letter,
        letterTouched: state.rd.letterTouched,
        askedRoute: state.ui.askedRoute,
      };
      if (writes.beforeWrite) await writes.beforeWrite();
      if (seen !== writes.epoch) return;
      const savedPlan = migrateFortunePlan(await saveFortunePlan(plan)) || plan;
      if (seen !== writes.epoch) return;
      state.plan = savedPlan;
      const savedUi = await saveFortuneUi(ui);
      if (seen !== writes.epoch) return;
      state.ui = { ...emptyUi(), ...savedUi, lastByStage: savedUi?.lastByStage || {} };
      const savedRd = await saveFtRd(rd);
      if (seen !== writes.epoch) return;
      state.rd = savedRd;
    });
  }

  function draw() {
    if (!root) return;
    root.replaceChildren(renderV3(state));
    const reveal = root.querySelector(".v3-reveal");
    if (reveal) reveal.focus();
  }

  async function apply(action) {
    if (action.type === "exit" && state.screen !== "e1") await persist();
    if (action.type === "confirm-erase") {
      sessionSet(ERASE_FLAG, "1");
      writes.bump();
      const standalone = state.standalone;
      const digIn = state.digIn;
      state = reduce(openedFortuneState({ standalone }), { type: "erased" });
      state.digIn = digIn;
      await writes.enqueue(() => wipeFortune());
      draw();
      return;
    }
    if (action.type === "start-clear" || action.type === "fresh") await writes.enqueue(() => resetFtRd());
    if (action.type === "e1-ok" || (action.type === "exit" && state.screen === "e1")) sessionRemove(ERASE_FLAG);
    state = reduce(state, action);
    if (action.type !== "exit" && action.type !== "e1-ok" && action.type !== "ask-erase") await persist();
    draw();
  }

  root?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-act]");
    if (!target || !root.contains(target)) return;
    const act = target.dataset.act;
    if (act === "next-letter-ready" && target.getAttribute("aria-disabled") === "true") return;
    if (act === "answer") return void apply({ type: "answer-01", id: target.dataset.id });
    if (act === "reason") return void apply({ type: "reason", id: target.dataset.id });
    if (act === "lenders") return void apply({ type: "lenders", count: Number(target.dataset.count) });
    if (act === "cushion") return void apply({ type: "cushion", months: Number(target.dataset.months) });
    if (act === "goal") return void apply({ type: "goal", id: target.dataset.id });
    if (act === "pick-card") return void apply({ type: "pick-card", id: target.dataset.id });
    if (act === "pick-where") return void apply({ type: "pick-where", id: target.dataset.id });
    if (act === "dig-in") return void apply({ type: "dig-in", id: target.dataset.id });
    if (act === "open-stage") return void apply({ type: "open-stage", stage: target.dataset.stage });
    if (act === "info") return void apply({ type: "info", id: target.dataset.id });
    if (act === "leave") return void apply({ type: "leave", href: target.dataset.href });
    if (act === "confirm-leave") {
      const href = state.sheet?.href;
      state = reduce(state, { type: "close-sheet" });
      draw();
      if (href) window.open(href, "_blank", "noopener");
      return;
    }
    if (act === "share-pdf") {
      const text = fortuneLetterText({
        ...state.rd,
        askedRoute: state.ui.askedRoute === "hardship" ? "hardship" : "idrp",
      });
      void shareFortuneLetter(text);
      return;
    }
    if (act === "save-dates") {
      const start = root.querySelector("#v3-start")?.value;
      const tenor = root.querySelector("#v3-tenor")?.value;
      return void apply({ type: "save-dates", startMonth: start, tenorMonths: tenor });
    }
    if (act === "save-savings") {
      const amount = root.querySelector("#v3-savings")?.value;
      return void apply({ type: "savings", amount });
    }
    if (act === "code-submit") {
      state = { ...state, codeDraft: root.querySelector("#v3-code")?.value || state.codeDraft };
      return void apply({ type: "code-submit" });
    }
    if (act === "pin") {
      state = { ...state, ui: { ...state.ui, goalAmount: root.querySelector("#v3-amount")?.value ?? state.ui.goalAmount } };
      return void apply({ type: "pin" });
    }
    return void apply({ type: act });
  });

  root?.addEventListener("input", (event) => {
    const id = event.target.id;
    if (id === "v3-name") {
      state = reduce(state, { type: "name", value: event.target.value });
      void persist();
    }
    if (id === "v3-letter") {
      state = reduce(state, { type: "letter-input", value: event.target.value });
      void persist();
    }
    if (id === "v3-code") state = { ...state, codeDraft: event.target.value, codeError: "" };
    if (id === "v3-amount") state = reduce(state, { type: "goal-amount", value: event.target.value });
  });

  root?.addEventListener("change", async (event) => {
    if (event.target.name === "tenor") {
      state = reduce(state, { type: "tenor", months: event.target.value });
      await persist();
    }
    const key = event.target.dataset?.doc;
    if (!key || !event.target.files?.length) return;
    for (const file of event.target.files) {
      state.rd = await addFtPhoto(key, file);
    }
    await persist();
    draw();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const now = Date.now();
    if (now - escAt < 800) {
      escAt = 0;
      void apply({ type: "exit" });
      return;
    }
    escAt = now;
  });

  draw();
}
