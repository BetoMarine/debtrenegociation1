import { t, hrefs } from "./i18n.js";
import {
  addEvent,
  deleteAttachment,
  getAttachment,
  getLang,
  getPack,
  listEvents,
  newPack,
  putAttachment,
  saveFortuneHandoff,
  savePack,
  saveRdExport,
  setLang,
  wipeRightDoor,
} from "./db.js";
import { downloadBlob, el, escapeHtml, isStandalone } from "./dom.js";
import { countEvents, makeEvent } from "./events.js";
import { DOORS, recommendDoor } from "./door.js";
import { DOCUMENT_DEFS, missingAttachments, normalizeDocuments } from "./docs.js";
import { buildLetter, letterContext } from "./letter.js";
import { productHref, SUNDAY_HASH_PREFIX } from "./paths.js";
import { pylWordmarkHtml } from "./pyl-brand.js";
import { captureFortuneReferral, fortuneReturnBarHtml, fortuneReturnCtaHtml, isFortuneReferral, withFromFortune } from "./refer.js";
import { makeFireHandoff, packImpliedFixMonths } from "./handoff.js";
import { buildPackPdf, compressImage } from "./pdf.js";
import { renderR1Screen, R1_NOT_NOW_KEY, applyR1Action, consumeQuickExitPress, r1CompletionKey, shouldShowR1 } from "./rd/r1.js";
import { RD_PRODUCT } from "./shared/product-id.js";
import { stageWord } from "./shared/stage-words.js";
import { sessionGet, sessionSet } from "./shared/storage/web.js";
import { renderRdStep } from "./rd/steps/index.js";

const STATUSES = ["draft", "sent", "waiting", "accepted", "rejected", "gave_up"];
const TYPES = ["hsbc", "hang_seng", "citi", "boc", "other", "money_lender"];
const REASONS = ["job_ended", "hours_cut", "will_miss", "already_missed"];

let lang = "zh";
let pack = null;
let screen = "home";
let versionTaps = 0;
let r1Phase = "ask";
let r1Code = "";
let r1Armed = false;
let exitAt = 0;
let draftCreditor = { nickname: "", type: "hsbc", amount: "", ref: "" };
let busy = false;
let notice = "";

function migratePack(raw) {
  if (!raw) return raw;
  const sit = raw.situation || {};
  return {
    ...raw,
    hkid: raw.hkid || "",
    phone: raw.phone || "",
    situation: {
      whatChanged: sit.whatChanged || "",
      when: sit.when || "",
      incomeItems: sit.incomeItems || "",
      incomeAmount: sit.incomeAmount || sit.incomeNow || "",
      expenseItems: sit.expenseItems || "",
      expenseAmount: sit.expenseAmount || "",
      surplus: sit.surplus || sit.canPay || "",
      tenorMonths: sit.tenorMonths || "6",
      askInterestFreeze: !!sit.askInterestFreeze,
    },
    documents: normalizeDocuments(raw.documents),
  };
}

function syncLetter() {
  if (!pack) return;
  pack.letter = buildLetter(letterContext(pack, lang));
}

export async function boot() {
  captureFortuneReferral();
  lang = await getLang();
  pack = migratePack(await getPack());
  await log("app_open");
  await persistFireHandoff();
  window.addEventListener("hashchange", onHash);
  window.addEventListener("keydown", onQuickExitKey);
  syncScreenFromHash();
  render();
}

async function persistFireHandoff() {
  if (!isFortuneReferral()) return;
  await saveFortuneHandoff(makeFireHandoff({ source: RD_PRODUCT, months: packImpliedFixMonths(pack) }));
}

async function log(type, extraEnum) {
  await addEvent(makeEvent(type, extraEnum));
}

function onHash() {
  syncScreenFromHash();
  render();
}

const RD_SCREENS = new Set(["home", "reason", "creditors", "situation", "door", "documents", "pack", "r1", "counters"]);

function syncScreenFromHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const name = raw.split("?")[0] || "home";
  if (name.startsWith(SUNDAY_HASH_PREFIX)) {
    let dest = productHref("sunday");
    if (isFortuneReferral()) dest = withFromFortune(dest);
    location.replace(`${dest}#/${name}`);
    return;
  }
  screen = RD_SCREENS.has(name) ? name : "home";
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

async function ensurePack() {
  if (!pack) {
    pack = migratePack(newPack(lang));
    pack = await savePack(pack);
    await persistFireHandoff();
  } else {
    pack = migratePack(pack);
  }
  return pack;
}

function s(key, vars) {
  return t(lang, key, vars, { host: "standalone" });
}

function shell(body) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  const node = el(`
    <div class="shell">
      <header class="top${isFortuneReferral() ? " is-from-fortune" : ""}">
        ${isFortuneReferral() ? fortuneReturnBarHtml(escapeHtml) : ""}
        <div class="top-row">
          <div class="brand-block">
            ${pylWordmarkHtml()}
            <button class="brand" type="button" data-go="home">${escapeHtml(s("appName"))}</button>
          </div>
          <button class="lang" type="button" data-act="lang">${escapeHtml(s("langToggle"))}</button>
        </div>
      </header>
      <main></main>
      <footer class="footer">
        ${pylWordmarkHtml({ footer: true })}
        <p class="tiny">${escapeHtml(s("localOnly"))}</p>
        <p class="tiny">${escapeHtml(s("promiseNever"))}</p>
        <p class="tiny">${escapeHtml(s("creditHonesty"))}</p>
        <p class="tiny">${escapeHtml(s("notFor"))}</p>
        <p class="tiny">${escapeHtml(s("otherTools"))}<br/>
          <a class="link" href="${escapeHtml(productHref("sunday"))}">${escapeHtml(s("otherToolsSunday"))}</a>
          ·
          <a class="link" href="${escapeHtml(productHref("fortune"))}">${escapeHtml(s("otherToolsFortune"))}</a>
        </p>
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
  document.documentElement.lang = lang === "zh" ? "zh-Hant-HK" : "en";
}

function bind(root) {
  root.querySelector('[data-act="lang"]')?.addEventListener("click", toggleLang);
  root.querySelector('[data-act="version"]')?.addEventListener("click", tapVersion);
  root.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });
}

async function toggleLang() {
  lang = lang === "zh" ? "en" : "zh";
  document.documentElement.lang = lang === "zh" ? "zh-Hant-HK" : "en";
  await setLang(lang);
  if (pack) {
    pack.lang = lang;
    if (!pack.letterTouched) syncLetter();
    pack = await savePack(pack);
  }
  render();
}

function tapVersion() {
  versionTaps += 1;
  if (versionTaps >= 5) {
    versionTaps = 0;
    go("counters");
  }
}

function stepCtx() {
  return {
    host: "standalone",
    stageId: "fix",
    stageWord: stageWord("en", "fix"),
    get pack() {
      return pack;
    },
    set pack(value) {
      pack = value;
    },
    get lang() {
      return lang;
    },
    get busy() {
      return busy;
    },
    set busy(value) {
      busy = value;
    },
    get notice() {
      return notice;
    },
    set notice(value) {
      notice = value;
    },
    get draftCreditor() {
      return draftCreditor;
    },
    set draftCreditor(value) {
      draftCreditor = value;
    },
    s,
    el,
    escapeHtml,
    shell,
    nav,
    go,
    render,
    ensurePack,
    savePack,
    syncLetter,
    persistFireHandoff,
    recommendDoor,
    DOORS,
    hrefs,
    DOCUMENT_DEFS,
    missingAttachments,
    normalizeDocuments,
    putAttachment,
    getAttachment,
    deleteAttachment,
    compressImage,
    isFortuneReferral,
    fortuneReturnCtaHtml,
    reminderState,
    STATUSES,
    TYPES,
    REASONS,
    setStatus,
    handlePdf,
    finishAssessment,
  };
}

function r1NotNow() {
  return sessionGet(R1_NOT_NOW_KEY) === "1";
}

function offerR1() {
  const now = new Date();
  if (!shouldShowR1({ host: "standalone", pack, notNow: r1NotNow(), offeredFor: pack?.r1OfferedFor, now })) return false;
  const key = r1CompletionKey(pack, now);
  pack.r1OfferedFor = key;
  const pending = pack;
  void savePack(pending).then((saved) => {
    if (pack === pending) pack = saved;
  });
  r1Armed = true;
  return true;
}

function render() {
  persistFireHandoff();
  if (screen === "pack" && offerR1()) {
    r1Phase = "ask";
    r1Code = "";
    screen = "r1";
    if (location.hash !== "#/r1") location.hash = "/r1";
  }
  if (screen === "r1" && r1Phase !== "code" && (!r1Armed || r1NotNow() || !r1CompletionKey(pack))) {
    r1Armed = false;
    screen = "pack";
  }
  if (screen === "home") renderHome();
  else if (screen === "counters") renderCounters();
  else if (screen === "r1") renderR1();
  else if (["reason", "creditors", "situation", "door", "documents", "pack"].includes(screen)) renderRdStep(screen, stepCtx());
  window.scrollTo(0, 0);
}

function renderR1() {
  const body = renderR1Screen({
    phase: r1Phase === "code" ? "code" : "ask",
    code: r1Code,
    s,
    el,
    escapeHtml,
    onPrimary: () => {
      void onR1Primary();
    },
    onNotNow: () => onR1NotNow(),
    onExit: () => quickExitR1(),
    onContinue: () => continueFromCode(),
  });
  shell(body);
}

async function onR1Primary() {
  const decision = applyR1Action("primary", { pack, now: new Date() });
  if (!decision.write) return;
  const saved = await saveRdExport(decision.record);
  if (!saved) return;
  r1Code = decision.code;
  r1Phase = "code";
  screen = "r1";
  r1Armed = true;
  render();
}

function onR1NotNow() {
  applyR1Action("not-now", { sessionSet });
  r1Code = "";
  r1Phase = "ask";
  r1Armed = false;
  go("pack");
}

function quickExitR1() {
  applyR1Action("exit");
  r1Code = "";
  r1Phase = "ask";
  r1Armed = false;
  go("home");
}

function continueFromCode() {
  r1Code = "";
  r1Phase = "ask";
  r1Armed = false;
  go("pack");
}

function onQuickExitKey(event) {
  if (event.key !== "Escape" || screen !== "r1" || r1Phase !== "code" || !r1Code) return;
  const press = consumeQuickExitPress(exitAt, Date.now());
  exitAt = press.at;
  if (press.clear) quickExitR1();
}

function reminderState() {
  if (!pack?.sentAt) return null;
  const due = pack.sentAt + 7 * 24 * 60 * 60 * 1000;
  const date = new Date(due);
  const label =
    lang === "zh"
      ? `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`
      : date.toISOString().slice(0, 10);
  return { due, label, overdue: Date.now() >= due };
}

function renderHome() {
  const hasDraft = pack && pack.reason;
  const hasPack = pack && pack.letter;
  const reminder = reminderState();
  const showReminder = reminder && (pack.status === "sent" || pack.status === "waiting");
  const body = el(`<div class="stack"></div>`);
  body.append(
    el(`<p class="kicker">${escapeHtml(s("promiseKicker"))}</p>`),
    el(`<h1>${escapeHtml(s("promiseTitle"))}</h1>`),
    el(`<p class="lede">${escapeHtml(s("promiseLead"))}</p>`),
    el(
      `<div class="card privacy"><strong>${escapeHtml(s("privacyTitle"))}</strong><p>${escapeHtml(s("privacyBody"))}</p></div>`,
    ),
  );
  if (showReminder) {
    body.append(
      el(
        `<div class="card"><strong>${escapeHtml(reminder.overdue ? s("reminderDue") : s("reminder"))}</strong><p class="tiny">${escapeHtml(s("comeBackOn"))} ${escapeHtml(reminder.label)}</p></div>`,
      ),
    );
  }
  if (!isStandalone()) {
    body.append(
      el(
        `<div class="card"><strong>${escapeHtml(s("addHome"))}</strong><p class="tiny">${escapeHtml(s("addHomeHow"))}</p></div>`,
      ),
    );
  }
  const actions = el(`<div class="nav"></div>`);
  if (hasPack) {
    actions.append(el(`<button class="btn btn-primary" data-go="pack" type="button">${escapeHtml(s("openPack"))}</button>`));
    actions.append(el(`<button class="btn btn-accent" data-act="start" type="button">${escapeHtml(s("start"))}</button>`));
  } else if (hasDraft) {
    actions.append(el(`<button class="btn btn-primary" data-go="reason" type="button">${escapeHtml(s("resume"))}</button>`));
    actions.append(el(`<button class="btn btn-accent" data-act="start" type="button">${escapeHtml(s("start"))}</button>`));
  } else {
    actions.append(el(`<button class="btn btn-primary" data-act="start" type="button">${escapeHtml(s("start"))}</button>`));
  }
  body.append(actions);
  if (pack) {
    body.append(el(`<button class="btn btn-ghost" data-act="wipe" type="button">${escapeHtml(s("wipe"))}</button>`));
  }
  shell(body);
  body.querySelector('[data-act="start"]').addEventListener("click", startAssessment);
  body.querySelector('[data-act="wipe"]')?.addEventListener("click", onWipe);
}

async function startAssessment() {
  await ensurePack();
  await log("assessment_started");
  go("reason");
}

async function onWipe() {
  if (!confirm(s("wipeConfirm"))) return;
  await wipeRightDoor();
  pack = null;
  go("home");
}

function nav(backTo, nextTo, nextDisabled) {
  const box = el(`<div class="nav"></div>`);
  if (nextTo) {
    const next = el(
      `<button class="btn btn-primary" data-go="${nextTo}" type="button" ${nextDisabled ? "disabled" : ""}>${escapeHtml(s("continue"))}</button>`,
    );
    box.append(next);
  }
  box.append(el(`<button class="btn btn-ghost" data-go="${backTo}" type="button">${escapeHtml(s("back"))}</button>`));
  return box;
}

async function finishAssessment() {
  const door = recommendDoor(pack.creditors);
  pack.door = door;
  pack.documents = normalizeDocuments(pack.documents);
  if (!pack.letterTouched) syncLetter();
  pack = await savePack(pack);
  await log("assessment_done");
  await log("door_chosen", door);
  await log("pack_created");
}

async function setStatus(status) {
  pack.status = status;
  if (status === "sent" && !pack.sentAt) pack.sentAt = Date.now();
  if (status === "draft") pack.sentAt = null;
  pack = await savePack(pack);
  await log("status_tapped", status);
  render();
}

async function collectAttachments() {
  const map = {};
  for (const doc of normalizeDocuments(pack.documents)) {
    for (const id of doc.attachmentIds) {
      const blob = await getAttachment(id);
      if (blob) map[id] = blob;
    }
  }
  return map;
}

async function handlePdf(mode) {
  if (busy) return;
  if (missingAttachments(pack.documents).length) {
    render();
    return;
  }
  busy = true;
  render();
  try {
    const attachments = await collectAttachments();
    const blob = await buildPackPdf({ pack, lang, attachments });
    const file = new File([blob], lang === "zh" ? "正確的門-信件包.pdf" : `${RD_PRODUCT}-pack.pdf`, {
      type: "application/pdf",
    });
    if (mode === "share") {
      await log("share_tapped");
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: s("appName") });
      } else {
        downloadBlob(file);
        notice = s("shareFail");
      }
    } else {
      downloadBlob(file);
    }
  } catch {
    notice = s("pdfError");
  } finally {
    busy = false;
    render();
  }
}

async function renderCounters() {
  const events = await listEvents();
  const counts = countEvents(events);
  const body = el(`<div class="stack"><h1>${escapeHtml(s("countersTitle"))}</h1><p class="hint">${escapeHtml(s("countersHint"))}</p></div>`);
  const card = el(`<div class="card"></div>`);
  Object.entries(counts)
    .filter(([type]) => !type.startsWith("sunday_"))
    .forEach(([type, n]) => {
      card.append(
        el(
          `<div class="counter-row"><span>${escapeHtml(s(`eventLabels.${type}`))}</span><strong>${n}</strong></div>`,
        ),
      );
    });
  body.append(card);
  body.append(el(`<button class="btn btn-ghost" data-go="home" type="button">${escapeHtml(s("back"))}</button>`));
  shell(body);
}
