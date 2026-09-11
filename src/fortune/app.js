import { CRUMB_KEYS, markCrumb, shouldShowCrumb } from "./crumbs.js";
import { applyCoachAction, coachActions, coachCrumb, isEmptyPot } from "./coach.js";
import { ft } from "./copy.js";
import { compareSaveBorrow } from "./engine.js";
import {
  canOpenPlan,
  gateFortuneScreen,
  isBoardUnlocked,
  nextAfterStart,
  stabilizeTargetMonths,
} from "./stabilize.js";
import { applyStageOrder, currentStage, holdStatus, stageStack } from "./journey.js";
import { FORTUNE_SCREENS, dialTone, holdLineText, renderFortune } from "./ui.js";
import {
  applyTheme,
  defaultUiState,
  emptyDraftGoal,
  migrateFortunePlan,
  migrateUiState,
  newFortunePlan,
  normalizeMilestone,
  toEnginePlan,
} from "./model.js";
import { buildFortunePdf } from "./pdf.js";
import { runForecast } from "./simulate.js";
import {
  addEvent,
  getFortuneForecast,
  getFortunePlan,
  getFortuneUi,
  listEvents,
  saveFortuneForecast,
  saveFortunePlan,
  saveFortuneUi,
  wipeFortune,
} from "../db.js";
import { downloadBlob, el, escapeHtml, isStandalone } from "../dom.js";
import { countEvents, makeEvent } from "../events.js";
import { productHref } from "../paths.js";
import { pylWordmarkHtml } from "../pyl-brand.js";

const FORTUNE_EVENT_TYPES = ["fortune_started", "fortune_forecast_run", "fortune_pdf", "fortune_export"];

let plan = null;
let forecast = null;
let ui = defaultUiState();
let screen = "start";
let versionTaps = 0;
let busy = false;
let notice = "";
let crumb = null;
let editingGoalId = null;
let draftGoal = emptyDraftGoal();
let compare = null;
let forecastTimer = 0;
let lastScreen = null;
let openStages = null;

export async function boot() {
  ui = migrateUiState(await getFortuneUi());
  plan = migrateFortunePlan(await getFortunePlan()) || newFortunePlan();
  forecast = await getFortuneForecast();
  if (!plan.createdAt) plan = newFortunePlan();
  plan = await persistPlan();
  await log("app_open");
  await log("fortune_started");
  window.addEventListener("hashchange", onHash);
  enterOnLaunch();
  render();
  if (plan.privacyAccepted && (plan.theme || isBoardUnlocked(plan))) queueForecast({ persistEvent: false });
}

async function log(type, extraEnum) {
  await addEvent(makeEvent(type, extraEnum));
}

function onHash() {
  syncScreenFromHash();
  render();
}

function defaultScreen() {
  return nextAfterStart(plan);
}

/** Fresh open: Privacy once, then always Step 1. Ignore #/board and last screen. */
function enterOnLaunch() {
  screen = defaultScreen();
  const want = screen === "start" ? "" : "#/where";
  const next = `${location.pathname}${location.search}${want}`;
  const here = `${location.pathname}${location.search}${location.hash || ""}`;
  if (here !== next) history.replaceState(null, "", next || location.pathname);
}

function syncScreenFromHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const name = raw.split("?")[0] || "";
  if (!name) {
    screen = defaultScreen();
    return;
  }
  if (name === "counters") {
    screen = "counters";
    return;
  }
  if (FORTUNE_SCREENS.includes(name)) {
    screen = gateFortuneScreen(name, plan);
    return;
  }
  screen = "start";
}

function go(name) {
  notice = "";
  if (name !== "counters") name = gateFortuneScreen(name, plan);
  if (name === "compare") showSaveBorrowCrumb();
  if (location.hash === `#/${name}`) {
    screen = name;
    render();
    return;
  }
  location.hash = `/${name}`;
}

async function persistPlan(nextScreen) {
  plan = migrateFortunePlan(plan);
  if (nextScreen) plan.screen = nextScreen;
  plan.updatedAt = Date.now();
  plan = await saveFortunePlan(plan);
  return plan;
}

async function persistUi() {
  ui = await saveFortuneUi(ui);
  return ui;
}

function setNotice(value) {
  notice = value;
}

function queueForecast({ persistEvent = true, keepScroll = true } = {}) {
  clearTimeout(forecastTimer);
  busy = true;
  render({ keepScroll });
  forecastTimer = setTimeout(() => runAndPersistForecast({ persistEvent, keepScroll }), 60);
}

async function runAndPersistForecast({ persistEvent = true, keepScroll = true } = {}) {
  busy = true;
  try {
    const next = await runForecast(toEnginePlan(plan), { paths: 1000, seed: plan.seed });
    forecast = next;
    await saveFortuneForecast(next);
    if (persistEvent) await log("fortune_forecast_run");
  } finally {
    busy = false;
    render({ keepScroll });
  }
}

function fortuneFooter() {
  const tools = `<a class="link" href="${escapeHtml(productHref("right-door"))}">${escapeHtml(ft("otherToolsRight"))}</a>
          ·
          <a class="link" href="${escapeHtml(productHref("sunday"))}">${escapeHtml(ft("otherToolsSunday"))}</a>`;
  const version = `<button class="version" type="button" data-act="version">${escapeHtml(ft("version"))}</button>`;
  if (screen === "start") {
    return `
        ${pylWordmarkHtml({ footer: true })}
        <p class="tiny">${escapeHtml(ft("localOnly"))}</p>
        <p class="tiny">${escapeHtml(ft("otherToolsLabel"))}<br/>
          ${tools}
        </p>
        <p class="tiny">${escapeHtml(ft("compliance"))}</p>
        ${version}`;
  }
  return `
        <p class="tiny">${escapeHtml(ft("footerCompact"))}</p>
        <p class="tiny">${tools} · ${version}</p>`;
}

function shell(body) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  const node = el(`
    <div class="shell fortune">
      <header class="top">
        <div class="brand-block">
          ${pylWordmarkHtml()}
          <button class="brand" type="button" data-go="${plan?.privacyAccepted ? "where" : "start"}">${escapeHtml(ft("brand"))}</button>
        </div>
      </header>
      <main></main>
      <footer class="footer${screen === "start" ? "" : " ft-foot-compact"}">
        ${fortuneFooter()}
      </footer>
    </div>
  `);
  node.querySelector("main").append(body);
  if (notice) {
    const banner = el(`<p class="card warn">${escapeHtml(notice)}</p>`);
    node.querySelector("main").prepend(banner);
  }
  root.append(node);
  bindChrome(node);
  document.documentElement.lang = "en";
  document.documentElement.classList.add("fortune-root");
}

function bindChrome(root) {
  root.querySelector('[data-act="version"]')?.addEventListener("click", tapVersion);
  root.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });
}

function tapVersion() {
  versionTaps += 1;
  if (versionTaps >= 5) {
    versionTaps = 0;
    go("counters");
  }
}

function host() {
  return {
    plan,
    forecast,
    ui,
    crumb,
    busy,
    draftGoal,
    editingGoalId,
    compare,
    isStandalone: isStandalone(),
    el,
    escapeHtml,
    go,
    root: document.getElementById("app"),
    shellFortune: (body) => shell(body),
    acceptStart,
    pickTheme,
    pickDebtHeat,
    patchStabilize,
    finishStep2,
    skipStep2,
    startNext: () => nextAfterStart(plan),
    canOpenPlan: canOpenPlan(plan),
    openPlan,
    saveMoney,
    editGoal,
    saveGoal,
    deleteGoal,
    saveNet,
    pickTemplate,
    setInflation,
    shuffleSeed,
    dismissTease,
    dismissCrumb,
    setCompareMilestone,
    handlePdf,
    exportJson,
    clearPlan,
    bindStageStack,
    toggleStage,
    reorderStage,
    openStages,
    applyCoach,
  };
}

async function acceptStart() {
  plan.privacyAccepted = true;
  await persistPlan("where");
  go("where");
}

async function pickTheme(id) {
  plan = applyTheme(plan, id);
  if (id === "rebuild") {
    plan.stabilizeTargetMonths = Number(plan.net?.emergencyMonths) === 3 ? 3 : 6;
  }
  openStages = null;
  await persistPlan("next");
  go("next");
}

async function openPlan() {
  if (!canOpenPlan(plan)) return;
  await persistPlan("board");
  go("board");
  queueForecast();
}

async function pickDebtHeat(heat) {
  plan.debtHeat = heat;
  await persistPlan("next");
  render({ keepScroll: true });
}

async function patchStabilize(partial) {
  if (partial.stabilizeTargetMonths) {
    plan.stabilizeTargetMonths = partial.stabilizeTargetMonths === 3 ? 3 : 6;
    plan.net = { ...plan.net, emergencyMonths: plan.stabilizeTargetMonths };
  }
  if (partial.money) {
    plan.money = { ...plan.money, ...partial.money };
    plan.moneyCapturedAtStabilize = true;
  }
  if (partial.floorHkd != null) {
    plan.net = { ...plan.net, floorHkd: Math.max(0, Math.round(Number(partial.floorHkd) || 0)) };
  }
  await persistPlan("next");
  render({ keepScroll: true });
}

async function finishStep2() {
  plan.moneyCapturedAtStabilize = true;
  plan.boardReached = true;
  plan.phase2Unlocked = true;
  plan.net = {
    ...plan.net,
    emergencyMonths: stabilizeTargetMonths(plan),
  };
  openStages = null;
  await persistPlan("board");
  go("board");
  queueForecast();
}

async function skipStep2() {
  await finishStep2();
}

async function saveMoney(bands) {
  plan.money = { ...plan.money, ...bands };
  await persistPlan("board");
  go("board");
  queueForecast();
}

function editGoal(id) {
  editingGoalId = id;
  if (id) {
    const found = plan.milestones.find((m) => m.id === id);
    draftGoal = found
      ? { name: found.name, amount: String(found.amount), months: found.months }
      : emptyDraftGoal();
  } else {
    draftGoal = emptyDraftGoal();
  }
  go("goal-edit");
}

async function saveGoal(raw) {
  const next = normalizeMilestone({
    id: editingGoalId || undefined,
    name: raw.name,
    amount: Number(String(raw.amount).replace(/[^\d.]/g, "")),
    months: raw.months,
  });
  if (editingGoalId) {
    plan.milestones = plan.milestones.map((m) => (m.id === editingGoalId ? next : m));
  } else {
    plan.milestones = [...plan.milestones, next];
  }
  if (!plan.compareMilestoneId) plan.compareMilestoneId = next.id;
  editingGoalId = null;
  draftGoal = emptyDraftGoal();
  plan.boardReached = true;
  plan.phase2Unlocked = true;
  await persistPlan("board");
  go("board");
  queueForecast();
}

async function deleteGoal() {
  if (!editingGoalId) return;
  plan.milestones = plan.milestones.filter((m) => m.id !== editingGoalId);
  if (plan.compareMilestoneId === editingGoalId) {
    plan.compareMilestoneId = plan.milestones[0]?.id || null;
  }
  editingGoalId = null;
  await persistPlan("board");
  go("board");
  queueForecast();
}

async function saveNet(net) {
  plan.net = {
    emergencyMonths: Math.max(0, Math.min(36, Math.round(Number(net.emergencyMonths) || 0))),
    floorHkd: Math.max(0, Math.round(Number(net.floorHkd) || 0)),
  };
  await persistPlan("board");
  go("board");
  queueForecast();
}

async function pickTemplate(id) {
  const prev = plan.templateId;
  plan.templateId = id;
  if (prev !== id && shouldShowCrumb(ui, CRUMB_KEYS.compound)) {
    crumb = CRUMB_KEYS.compound;
    ui = markCrumb(ui, CRUMB_KEYS.compound);
    await persistUi();
  }
  await persistPlan("board");
  queueForecast();
}

async function setInflation(on) {
  plan.inflationOn = !!on;
  await persistPlan("board");
  queueForecast();
}

async function shuffleSeed() {
  plan.seed = (Math.floor(Math.random() * 1e9) + 1) >>> 0;
  await persistPlan("board");
  queueForecast();
}

async function dismissTease() {
  ui.loginTeaseDismissed = true;
  await persistUi();
  render({ keepScroll: true });
}

async function dismissCrumb() {
  crumb = null;
  render({ keepScroll: true });
}

async function applyCoach(key) {
  const actions = coachActions(plan, forecast);
  const action = actions.find((a) => a.key === key);
  if (!action) return;
  if (action.id === "edit-money") {
    go("money");
    return;
  }
  if (action.id === "edit-net") {
    go("net-edit");
    return;
  }
  const before = forecast ? { livingPct: forecast.livingPct, netPct: forecast.netPct } : { livingPct: 0, netPct: 0 };
  plan = applyCoachAction(plan, action);
  await persistPlan("board");
  await runAndPersistForecast({ persistEvent: true, keepScroll: true });
  const after = forecast || {};
  crumb = coachCrumb(action, before, after, isEmptyPot(plan));
  render({ keepScroll: true });
}

function showSaveBorrowCrumb() {
  if (shouldShowCrumb(ui, CRUMB_KEYS.saveBorrow)) {
    crumb = CRUMB_KEYS.saveBorrow;
    ui = markCrumb(ui, CRUMB_KEYS.saveBorrow);
    persistUi();
  }
}

async function setCompareMilestone(id) {
  plan.compareMilestoneId = id;
  await persistPlan("compare");
  refreshCompare();
  render({ keepScroll: true });
}

function refreshCompare() {
  const id = plan.compareMilestoneId || plan.milestones[0]?.id;
  if (!id) {
    compare = null;
    return;
  }
  plan.compareMilestoneId = id;
  compare = compareSaveBorrow(toEnginePlan(plan), id, { paths: 800, seed: plan.seed });
}

function toggleStage(id) {
  const here = currentStage(plan, forecast);
  if (!openStages) openStages = new Set([here]);
  if (openStages.has(id)) openStages.delete(id);
  else openStages.add(id);
  render({ keepScroll: true });
}

async function reorderStage(stage, orderedIds) {
  plan.milestones = applyStageOrder(plan.milestones, stage, orderedIds);
  await persistPlan("board");
  render({ keepScroll: true });
}

function bindStageStack(stack) {
  if (!stack) return;
  stack.querySelectorAll("[data-toggle-stage]").forEach((btn) => {
    btn.addEventListener("click", () => toggleStage(btn.dataset.toggleStage));
  });
  stack.querySelectorAll("[data-drag]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      const row = handle.closest("[data-row]");
      if (!row) return;
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture?.(event.pointerId);
      row.classList.add("is-drag");
      const stage = row.dataset.stage;
      const start = [...row.parentElement.querySelectorAll("[data-row][data-chip]")].map((node) => node.dataset.chip);
      const onMove = (ev) => {
        const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-row][data-chip]");
        if (!over || over === row || over.dataset.stage !== stage) return;
        const box = over.getBoundingClientRect();
        if (ev.clientY < box.top + box.height / 2) over.before(row);
        else over.after(row);
      };
      const onUp = async () => {
        row.classList.remove("is-drag");
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        const ids = [...row.parentElement.querySelectorAll("[data-row][data-chip]")].map((node) => node.dataset.chip);
        if (ids.join() === start.join()) return;
        await reorderStage(stage, ids);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    });
  });
}

function patchDials() {
  const root = document.getElementById("app");
  if (!root || !forecast) return;
  root.querySelectorAll(".ft-dial").forEach((dial) => {
    const pct = dial.dataset.kind === "living" ? forecast.livingPct : forecast.netPct;
    const ready = pct != null && Number.isFinite(Number(pct));
    const shown = ready ? Math.round(pct) : null;
    const tone = ready ? dialTone(pct, forecast.hardFail) : "wait";
    if (ready) dial.style.setProperty("--pct", String(shown));
    else dial.style.removeProperty("--pct");
    dial.className = `ft-dial tone-${tone}${ready ? "" : " is-pending"}`;
    const strong = dial.querySelector("strong");
    if (strong) strong.textContent = ready ? `${shown}%` : "…";
  });
  const hold = root.querySelector("[data-hold]");
  if (hold) {
    const status = holdStatus(plan, forecast);
    hold.className = `ft-hold ${status.pending ? "wait" : status.tone}`;
    hold.textContent = holdLineText(plan, forecast, busy);
  }
  const stageEl = root.querySelector("[data-stage-line]");
  const countEl = root.querySelector("[data-stage-count]");
  if (stageEl) {
    const here = currentStage(plan, forecast);
    const label = { fix: "Fix", stabilize: "Stabilize", plan: "Plan", invest: "Invest" }[here] || "Plan";
    stageEl.textContent = ft("youAreIn", { stage: label });
    if (countEl) {
      const stack = stageStack(plan, forecast, { open: openStages });
      const section = stack.find((s) => s.current) || stack[0];
      countEl.textContent = ft("youAreInCount", { n: String(section.index), total: String(section.total) });
    }
  }
  root.querySelectorAll("[data-row]").forEach((row) => {
    const id = row.dataset.chip || row.dataset.static;
    const pctEl = row.querySelector(".ft-pin-pct");
    const dial = row.querySelector(".ft-row-dial");
    if (!pctEl || id === "journey-today") return;
    const apply = (pct) => {
      const ready = pct != null && Number.isFinite(Number(pct));
      const shown = ready ? Math.round(pct) : null;
      pctEl.textContent = ready ? `${shown}%` : "…";
      const tone = ready ? dialTone(pct, forecast.hardFail) : "wait";
      row.classList.toggle("is-pending", !ready);
      row.className = row.className.replace(/tone-\w+/g, "").trim() + ` tone-${tone}`;
      if (dial) {
        if (ready) dial.style.setProperty("--pct", String(shown));
        else dial.style.removeProperty("--pct");
      }
    };
    if (id === "journey-floor") {
      apply(forecast.netPct);
      return;
    }
    if (id === "journey-fix") return;
    const i = plan.milestones.findIndex((m) => m.id === id);
    if (i >= 0) apply(forecast.milestonePct?.[i]);
  });
  stageStack(plan, forecast, { open: openStages }).forEach((section) => {
    const meta = root.querySelector(`[data-stage="${section.id}"] [data-rollup] strong`);
    const label = root.querySelector(`[data-stage="${section.id}"] [data-rollup] em`);
    if (!meta) return;
    if (section.current) {
      meta.textContent = ft("stageNow");
      if (label) label.hidden = true;
    } else {
      meta.textContent = section.rollup == null ? "…" : `${section.rollup}%`;
      if (label) label.hidden = false;
    }
  });
}

async function handlePdf(mode) {
  if (busy) return;
  busy = true;
  render({ keepScroll: true });
  try {
    if (!forecast) {
      await runAndPersistForecast({ persistEvent: false, keepScroll: true });
    }
    const blob = buildFortunePdf(plan, forecast);
    const file = new File([blob], "fortune-teller-sheet.pdf", { type: "application/pdf" });
    await log("fortune_pdf");
    if (mode === "share") {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: ft("brand") });
      } else {
        downloadBlob(file);
        notice = ft("shareFail");
      }
    } else {
      downloadBlob(file);
    }
  } catch {
    notice = ft("sheetError");
  } finally {
    busy = false;
    render({ keepScroll: true });
  }
}

async function exportJson() {
  const payload = {
    product: "fortune-teller",
    version: "0.9.0",
    exportedAt: new Date().toISOString(),
    plan,
    forecast,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(new File([blob], "fortune-plan.json", { type: "application/json" }));
  await log("fortune_export");
}

async function clearPlan() {
  if (!confirm(ft("clearConfirm"))) return;
  await wipeFortune();
  plan = newFortunePlan();
  forecast = null;
  ui = defaultUiState();
  compare = null;
  crumb = null;
  openStages = null;
  await persistPlan("start");
  go("start");
}

function render(opts = {}) {
  const keepScroll = !!opts.keepScroll;
  if (screen === "compare") refreshCompare();
  if (screen === "counters") {
    renderCounters();
  } else {
    renderFortune(screen, host());
  }
  if (!keepScroll && screen !== lastScreen) window.scrollTo(0, 0);
  lastScreen = screen;
}

async function renderCounters() {
  const events = await listEvents();
  const counts = countEvents(events);
  const body = el(`<div class="stack"><h1>${escapeHtml(ft("countersTitle"))}</h1><p class="hint">${escapeHtml(ft("countersHint"))}</p></div>`);
  const card = el(`<div class="card"></div>`);
  FORTUNE_EVENT_TYPES.forEach((type) => {
    card.append(
      el(
        `<div class="counter-row"><span>${escapeHtml(ft(`eventLabels.${type}`))}</span><strong>${counts[type] || 0}</strong></div>`,
      ),
    );
  });
  body.append(card);
  body.append(el(`<button class="btn btn-ghost" data-go="start" type="button">${escapeHtml(ft("back"))}</button>`));
  shell(body);
}
