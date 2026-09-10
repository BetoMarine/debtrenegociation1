import { CRUMB_KEYS, markCrumb, shouldShowCrumb } from "./crumbs.js";
import { applyCoachAction, coachActions, coachCrumb, isEmptyPot } from "./coach.js";
import { ft } from "./copy.js";
import { compareSaveBorrow } from "./engine.js";
import {
  gateFortuneScreen,
  isDebtHeat,
  isPhase2Unlocked,
  needsFireCard,
  nextAfterStart,
  stabilizeTargetMonths,
} from "./stabilize.js";
import { FORTUNE_SCREENS, dialTone, renderFortune } from "./ui.js";
import {
  applyTheme,
  defaultUiState,
  emptyDraftGoal,
  getTheme,
  migrateFortunePlan,
  migrateUiState,
  monthYearLabel,
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
let dragBeforeNet = null;

export async function boot() {
  ui = migrateUiState(await getFortuneUi());
  plan = migrateFortunePlan(await getFortunePlan()) || newFortunePlan();
  forecast = await getFortuneForecast();
  if (!plan.createdAt) plan = newFortunePlan();
  plan = await persistPlan();
  await log("app_open");
  await log("fortune_started");
  window.addEventListener("hashchange", onHash);
  syncScreenFromHash();
  render();
  if (plan.privacyAccepted && (plan.theme || isPhase2Unlocked(plan))) queueForecast({ persistEvent: false });
}

async function log(type, extraEnum) {
  await addEvent(makeEvent(type, extraEnum));
}

function onHash() {
  syncScreenFromHash();
  render();
}

function defaultScreen() {
  if (!plan?.privacyAccepted) return "start";
  if (plan.screen && FORTUNE_SCREENS.includes(plan.screen) && plan.screen !== "start") {
    return gateFortuneScreen(plan.screen, plan);
  }
  return nextAfterStart(plan);
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

function shell(body) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  const node = el(`
    <div class="shell fortune">
      <header class="top">
        <div class="brand-block">
          ${pylWordmarkHtml()}
          <button class="brand" type="button" data-go="start">${escapeHtml(ft("brand"))}</button>
        </div>
      </header>
      <main></main>
      <footer class="footer">
        ${pylWordmarkHtml({ footer: true })}
        <p class="tiny">${escapeHtml(ft("localOnly"))}</p>
        <p class="tiny">${escapeHtml(ft("otherToolsLabel"))}<br/>
          <a class="link" href="${escapeHtml(productHref("right-door"))}">${escapeHtml(ft("otherToolsRight"))}</a>
          ·
          <a class="link" href="${escapeHtml(productHref("sunday"))}">${escapeHtml(ft("otherToolsSunday"))}</a>
        </p>
        <p class="tiny">${escapeHtml(ft("compliance"))}</p>
        <button class="version" type="button" data-act="version">${escapeHtml(ft("version"))}</button>
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
    continueFromFire,
    patchStabilize,
    warnThinFloor,
    unlockPhase2,
    startNext: () => nextAfterStart(plan),
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
    bindTimeline,
    applyCoach,
  };
}

async function acceptStart(next) {
  plan.privacyAccepted = true;
  await persistPlan(next);
  go(next);
}

async function pickTheme(id) {
  if (!isPhase2Unlocked(plan)) {
    plan.theme = id;
    plan.milestones = [];
    const theme = getTheme(id);
    if (id === "rebuild" && theme && !plan.moneyCapturedAtStabilize) {
      plan.money = { ...plan.money, ...theme.moneyBands };
      plan.net = { ...theme.net };
      plan.stabilizeTargetMonths = Number(theme.net.emergencyMonths) === 3 ? 3 : 6;
    }
    await persistPlan("triage");
    go("triage");
    return;
  }
  plan = applyTheme(plan, id);
  const next = plan.moneyCapturedAtStabilize ? "board" : "money";
  await persistPlan(next);
  go(next);
  if (next === "board") queueForecast();
}

async function pickDebtHeat(heat) {
  plan.debtHeat = heat;
  await persistPlan(needsFireCard(heat) ? "triage" : "stabilize");
  if (needsFireCard(heat)) {
    render({ keepScroll: true });
    return;
  }
  go("stabilize");
}

async function continueFromFire() {
  if (!isDebtHeat(plan.debtHeat)) {
    go("triage");
    return;
  }
  await persistPlan("stabilize");
  go("stabilize");
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
  await persistPlan("stabilize");
  render({ keepScroll: true });
}

async function warnThinFloor() {
  plan.thinFloorWarned = true;
  await persistPlan("stabilize");
  render({ keepScroll: true });
}

async function unlockPhase2({ override = false } = {}) {
  const first = !isPhase2Unlocked(plan);
  plan.moneyCapturedAtStabilize = true;
  plan.phase2Unlocked = true;
  if (override) plan.phase2Override = true;
  plan.net = {
    ...plan.net,
    emergencyMonths: stabilizeTargetMonths(plan),
  };
  if (first && plan.theme) plan = applyTheme(plan, plan.theme);
  await persistPlan(plan.theme ? "board" : "theme");
  if (plan.theme) {
    go("board");
    queueForecast();
  } else {
    go("theme");
  }
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

function bindTimeline(rail) {
  if (!rail) return;
  const horizon = Number(rail.dataset.horizon) || 48;
  rail.querySelectorAll("[data-chip]").forEach((chip) => {
    chip.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      chip.setPointerCapture(event.pointerId);
      dragBeforeNet = forecast?.netPct ?? null;
      const onMove = (ev) => {
        const box = rail.getBoundingClientRect();
        const x = Math.min(Math.max(ev.clientX - box.left, 0), box.width);
        const months = Math.max(1, Math.min(horizon, Math.round(1 + (x / box.width) * (horizon - 1))));
        const id = chip.dataset.chip;
        const found = plan.milestones.find((m) => m.id === id);
        chip.style.left = `${((months - 1) / Math.max(1, horizon - 1)) * 100}%`;
        const em = chip.querySelector("em");
        if (em) em.textContent = monthYearLabel(months);
        if (!found || found.months === months) return;
        found.months = months;
        liveForecast();
      };
      const onUp = async () => {
        chip.removeEventListener("pointermove", onMove);
        chip.removeEventListener("pointerup", onUp);
        await persistPlan("board");
        await runAndPersistForecast({ persistEvent: false, keepScroll: true });
        await maybeDragCrumb();
      };
      chip.addEventListener("pointermove", onMove);
      chip.addEventListener("pointerup", onUp);
    });
  });
}

function liveForecast() {
  clearTimeout(forecastTimer);
  forecastTimer = setTimeout(async () => {
    forecast = await runForecast(toEnginePlan(plan), { paths: 700, seed: plan.seed });
    patchDials();
  }, 40);
}

function patchDials() {
  const root = document.getElementById("app");
  if (!root || !forecast) return;
  root.querySelectorAll(".ft-dial").forEach((dial) => {
    const pct = dial.dataset.kind === "living" ? forecast.livingPct : forecast.netPct;
    const shown = Math.round(pct);
    const tone = dialTone(pct, forecast.hardFail);
    dial.style.setProperty("--pct", String(shown));
    dial.className = `ft-dial tone-${tone}`;
    const strong = dial.querySelector("strong");
    if (strong) strong.textContent = `${shown}%`;
  });
  const verdict = root.querySelector(".ft-verdict");
  if (verdict) {
    verdict.className = `ft-verdict ${forecast.hardFail ? "wreck" : forecast.verdict}`;
    verdict.textContent =
      forecast.hardFail || forecast.verdict === "wrecked" ? ft("coachTitle") : ft(`verdicts.${forecast.verdict}`);
  }
  root.querySelectorAll("[data-chip]").forEach((chip) => {
    const id = chip.dataset.chip;
    const i = plan.milestones.findIndex((m) => m.id === id);
    const pctEl = chip.querySelector(".ft-pin-pct");
    if (pctEl && i >= 0 && forecast.milestonePct?.[i] != null) {
      const shown = Math.round(forecast.milestonePct[i]);
      pctEl.textContent = `${shown}%`;
      chip.className = `ft-pin tone-${dialTone(forecast.milestonePct[i], forecast.hardFail)}`;
    }
  });
}

async function maybeDragCrumb() {
  const after = forecast?.netPct;
  if (
    dragBeforeNet != null &&
    after != null &&
    dragBeforeNet - after >= 8 &&
    shouldShowCrumb(ui, CRUMB_KEYS.dragNet)
  ) {
    crumb = CRUMB_KEYS.dragNet;
    ui = markCrumb(ui, CRUMB_KEYS.dragNet);
    await persistUi();
    render({ keepScroll: true });
  }
  dragBeforeNet = null;
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
    version: "0.7.0",
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
