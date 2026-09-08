import { st as sundayT } from "./copy.js";
import { SUNDAY_SCREENS, nextSundayLang, renderSunday } from "./ui.js";
import {
  addEvent,
  getSundayLang,
  getSundayPack,
  listEvents,
  saveSundayPack,
  setSundayLang as persistSundayLang,
  wipeSundayPack,
} from "../db.js";
import { downloadBlob, el, escapeHtml, isStandalone } from "../dom.js";
import { countEvents, makeEvent } from "../events.js";
import { productHref } from "../paths.js";
import { emptyDraftLoan, migrateSundayPack, newSundayPack, normalizeLoan } from "./model.js";
import { buildSundayPdf } from "./pdf.js";

const SUNDAY_EVENT_TYPES = [
  "sunday_started",
  "sunday_triage_done",
  "sunday_pack_created",
  "sunday_door_chosen",
  "sunday_share_tapped",
];

let sunday = null;
let sundayLang = "en";
let screen = "sunday-privacy";
let versionTaps = 0;
let draftLoan = emptyDraftLoan();
let busy = false;
let notice = "";

export async function boot() {
  sundayLang = await getSundayLang();
  sunday = migrateSundayPack(await getSundayPack(), sundayLang);
  await ensureSunday();
  await log("app_open");
  await log("sunday_started");
  window.addEventListener("hashchange", onHash);
  syncScreenFromHash();
  render();
}

async function log(type, extraEnum) {
  await addEvent(makeEvent(type, extraEnum));
}

function onHash() {
  syncScreenFromHash();
  render();
}

function defaultSundayScreen() {
  if (sunday?.privacyAccepted && sunday.screen && SUNDAY_SCREENS.includes(sunday.screen)) {
    return sunday.screen;
  }
  return "sunday-privacy";
}

function syncScreenFromHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const name = raw.split("?")[0] || "";
  if (!name) {
    screen = defaultSundayScreen();
    return;
  }
  if (name === "counters" || SUNDAY_SCREENS.includes(name)) {
    screen = name;
    return;
  }
  screen = "sunday-privacy";
}

function go(name) {
  notice = "";
  if (location.hash === `#/${name}`) {
    screen = name;
    render();
    return;
  }
  location.hash = `/${name}`;
}

async function ensureSunday() {
  if (!sunday) {
    sunday = migrateSundayPack(newSundayPack(sundayLang), sundayLang);
    sunday = await saveSundayPack(sunday);
  } else {
    sunday = migrateSundayPack(sunday, sundayLang);
  }
  return sunday;
}

function setNotice(value) {
  notice = value;
}

async function persistSunday(nextScreen) {
  await ensureSunday();
  sunday.lang = sundayLang;
  if (nextScreen) sunday.screen = nextScreen;
  sunday.updatedAt = Date.now();
  sunday = await saveSundayPack(sunday);
  return sunday;
}

async function setSundayLanguage(code) {
  sundayLang = code;
  await persistSundayLang(code);
  await ensureSunday();
  sunday.lang = code;
  sunday = await saveSundayPack(sunday);
  render();
}

function navSunday(backTo, nextTo) {
  const box = el(`<div class="nav"></div>`);
  if (nextTo) {
    box.append(
      el(
        `<button class="btn btn-primary" data-go="${nextTo}" type="button">${escapeHtml(sundayT(sundayLang, "continue"))}</button>`,
      ),
    );
  }
  box.append(
    el(`<button class="btn btn-ghost" data-go="${backTo}" type="button">${escapeHtml(sundayT(sundayLang, "back"))}</button>`),
  );
  return box;
}

function sundayHost() {
  return {
    sunday,
    sundayLang,
    draftLoan,
    busy,
    el,
    escapeHtml,
    go,
    render,
    log,
    setNotice,
    persistSunday,
    setSundayLang: setSundayLanguage,
    shellSunday: (body) => {
      shell(body);
    },
    navSunday,
    addSundayLoan,
    removeSundayLoan,
    handleSundayPdf,
    clearSunday,
    isStandalone: isStandalone(),
  };
}

async function addSundayLoan() {
  const nickname = String(draftLoan.nickname || "").trim();
  if (!nickname) return;
  await ensureSunday();
  sunday.loans.push(
    normalizeLoan({
      ...draftLoan,
      id: crypto.randomUUID(),
      nickname,
    }),
  );
  draftLoan = emptyDraftLoan();
  sunday = await saveSundayPack(sunday);
  render();
}

async function removeSundayLoan(index) {
  sunday.loans.splice(index, 1);
  sunday = await saveSundayPack(sunday);
  render();
}

async function handleSundayPdf(mode) {
  if (busy) return;
  busy = true;
  render();
  try {
    const blob = buildSundayPdf(sunday);
    const file = new File([blob], "sunday-pack-briefing.pdf", { type: "application/pdf" });
    if (mode === "share") {
      await log("sunday_share_tapped");
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: sundayT(sundayLang, "brand") });
      } else {
        downloadBlob(file);
        notice = sundayT(sundayLang, "shareFail");
      }
    } else {
      downloadBlob(file);
    }
  } catch {
    notice = sundayT(sundayLang, "pdfError");
  } finally {
    busy = false;
    render();
  }
}

async function clearSunday() {
  if (!confirm(sundayT(sundayLang, "clearConfirm"))) return;
  await wipeSundayPack();
  sunday = null;
  draftLoan = emptyDraftLoan();
  await ensureSunday();
  go("sunday-privacy");
}

function s(key, vars) {
  return sundayT(sundayLang, key, vars);
}

function shell(body) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  const node = el(`
    <div class="shell">
      <header class="top">
        <button class="brand" type="button" data-go="sunday-privacy">${escapeHtml(s("brand"))}</button>
        <button class="lang" type="button" data-act="lang">${escapeHtml(s(`nextLang.${sundayLang}`))}</button>
      </header>
      <main></main>
      <footer class="footer">
        <p class="tiny">${escapeHtml(s("localOnly"))}</p>
        <p class="tiny"><a class="link" href="${escapeHtml(productHref("right-door"))}">${escapeHtml(s("otherTools"))}</a></p>
        <button class="version" type="button" data-act="version">${escapeHtml(s("version"))}</button>
      </footer>
    </div>
  `);
  node.querySelector("main").append(body);
  if (notice) {
    const banner = el(`<p class="card warn">${escapeHtml(notice)}</p>`);
    node.querySelector("main").prepend(banner);
  }
  root.append(node);
  bind(root);
  document.documentElement.lang =
    sundayLang === "tl" ? "tl" : sundayLang === "id" ? "id" : "en";
}

function bind(root) {
  root.querySelector('[data-act="lang"]')?.addEventListener("click", toggleLang);
  root.querySelector('[data-act="version"]')?.addEventListener("click", tapVersion);
  root.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });
}

async function toggleLang() {
  await setSundayLanguage(nextSundayLang(sundayLang));
}

function tapVersion() {
  versionTaps += 1;
  if (versionTaps >= 5) {
    versionTaps = 0;
    go("counters");
  }
}

function render() {
  if (screen === "counters") {
    renderCounters();
    window.scrollTo(0, 0);
    return;
  }
  renderSunday(screen, sundayHost());
  window.scrollTo(0, 0);
}

async function renderCounters() {
  const events = await listEvents();
  const counts = countEvents(events);
  const body = el(`<div class="stack"><h1>${escapeHtml(s("countersTitle"))}</h1><p class="hint">${escapeHtml(s("countersHint"))}</p></div>`);
  const card = el(`<div class="card"></div>`);
  SUNDAY_EVENT_TYPES.forEach((type) => {
    card.append(
      el(
        `<div class="counter-row"><span>${escapeHtml(s(`eventLabels.${type}`))}</span><strong>${counts[type] || 0}</strong></div>`,
      ),
    );
  });
  body.append(card);
  body.append(el(`<button class="btn btn-ghost" data-go="sunday-privacy" type="button">${escapeHtml(s("back"))}</button>`));
  shell(body);
}
