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
  savePack,
  setLang,
  wipeAll,
} from "./db.js";
import { countEvents, makeEvent } from "./events.js";
import { DOORS, recommendDoor } from "./door.js";
import { DOCUMENT_DEFS, missingAttachments, normalizeDocuments } from "./docs.js";
import { buildLetter, letterContext } from "./letter.js";
import { buildPackPdf, compressImage } from "./pdf.js";

const STATUSES = ["draft", "sent", "waiting", "accepted", "rejected", "gave_up"];
const TYPES = ["hsbc", "hang_seng", "citi", "boc", "other", "money_lender"];
const REASONS = ["job_ended", "hours_cut", "will_miss", "already_missed"];

let lang = "zh";
let pack = null;
let screen = "home";
let versionTaps = 0;
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
  lang = await getLang();
  pack = migratePack(await getPack());
  await log("app_open");
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

function syncScreenFromHash() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const name = raw.split("?")[0] || "home";
  const allowed = new Set([
    "home",
    "reason",
    "creditors",
    "situation",
    "door",
    "documents",
    "pack",
    "counters",
  ]);
  screen = allowed.has(name) ? name : "home";
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
  } else {
    pack = migratePack(pack);
  }
  return pack;
}

function s(key, vars) {
  return t(lang, key, vars);
}

function el(html) {
  const wrap = document.createElement("div");
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(body) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  const node = el(`
    <div class="shell">
      <header class="top">
        <div class="brand">${escapeHtml(s("appName"))}</div>
        <button class="lang" type="button" data-act="lang">${escapeHtml(s("langToggle"))}</button>
      </header>
      <main></main>
      <footer class="footer">
        <p class="tiny">${escapeHtml(s("localOnly"))}</p>
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

function render() {
  notice = notice;
  const view = {
    home: renderHome,
    reason: renderReason,
    creditors: renderCreditors,
    situation: renderSituation,
    door: renderDoor,
    documents: renderDocuments,
    pack: renderPack,
    counters: renderCounters,
  }[screen];
  view();
  window.scrollTo(0, 0);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
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
    el(`<p>${escapeHtml(s("promiseBody"))}</p>`),
    el(`<p>${escapeHtml(s("promiseNever"))}</p>`),
    el(`<p class="card warn">${escapeHtml(s("creditHonesty"))}</p>`),
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
  } else if (hasDraft) {
    actions.append(el(`<button class="btn btn-primary" data-go="reason" type="button">${escapeHtml(s("resume"))}</button>`));
  }
  actions.append(el(`<button class="btn btn-accent" data-act="start" type="button">${escapeHtml(s("start"))}</button>`));
  body.append(actions);
  body.append(el(`<p class="tiny">${escapeHtml(s("notFor"))}</p>`));
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
  await wipeAll();
  pack = null;
  go("home");
}

function renderReason() {
  const body = el(`<div class="stack"><h1>${escapeHtml(s("reasonTitle"))}</h1><p class="hint">${escapeHtml(s("reasonHint"))}</p></div>`);
  for (const reason of REASONS) {
    const btn = el(
      `<button class="choice${pack?.reason === reason ? " selected" : ""}" type="button">${escapeHtml(s(`reasons.${reason}`))}</button>`,
    );
    btn.addEventListener("click", () => pickReason(reason));
    body.append(btn);
  }
  body.append(nav("home", pack?.reason ? "creditors" : null));
  shell(body);
}

async function pickReason(reason) {
  await ensurePack();
  pack.reason = reason;
  pack = await savePack(pack);
  render();
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

function renderCreditors() {
  const list = pack?.creditors || [];
  const body = el(`<div class="stack"><h1>${escapeHtml(s("creditorsTitle"))}</h1><p class="hint">${escapeHtml(s("creditorsHint"))}</p></div>`);
  if (!list.length) body.append(el(`<p class="tiny">${escapeHtml(s("noCreditors"))}</p>`));
  list.forEach((c, i) => {
    const row = el(`
      <div class="card creditor">
        <div>
          <strong>${escapeHtml(c.nickname)}</strong>
          <div class="tiny">${escapeHtml(s(`types.${c.type}`))}${c.ref ? ` · ${escapeHtml(c.ref)}` : ""}${c.amount ? ` · ${escapeHtml(c.amount)}` : ""}</div>
        </div>
        <button class="btn" type="button" style="width:auto;min-height:40px;padding:8px 12px">${escapeHtml(s("remove"))}</button>
      </div>
    `);
    row.querySelector("button").addEventListener("click", () => removeCreditor(i));
    body.append(row);
  });
  const form = el(`
    <div class="card stack">
      <label class="field">${escapeHtml(s("nickname"))}
        <input id="nick" maxlength="40" placeholder="${escapeHtml(s("nicknamePh"))}" value="${escapeHtml(draftCreditor.nickname)}" />
      </label>
      <label class="field">${escapeHtml(s("type"))}
        <select id="type">${TYPES.map((type) => `<option value="${type}" ${draftCreditor.type === type ? "selected" : ""}>${escapeHtml(s(`types.${type}`))}</option>`).join("")}</select>
      </label>
      <label class="field">${escapeHtml(s("accountRef"))}
        <input id="ref" maxlength="40" placeholder="${escapeHtml(s("accountRefPh"))}" value="${escapeHtml(draftCreditor.ref)}" />
      </label>
      <label class="field">${escapeHtml(s("amount"))}
        <input id="amt" maxlength="32" placeholder="${escapeHtml(s("amountPh"))}" value="${escapeHtml(draftCreditor.amount)}" />
      </label>
      <button class="btn" data-act="add" type="button">${escapeHtml(s("addCreditor"))}</button>
    </div>
  `);
  body.append(form);
  if (!list.length) body.append(el(`<p class="tiny">${escapeHtml(s("needCreditor"))}</p>`));
  body.append(nav("reason", list.length ? "situation" : null));
  shell(body);
  form.querySelector("#nick").addEventListener("input", (e) => {
    draftCreditor.nickname = e.target.value;
  });
  form.querySelector("#type").addEventListener("change", (e) => {
    draftCreditor.type = e.target.value;
  });
  form.querySelector("#ref").addEventListener("input", (e) => {
    draftCreditor.ref = e.target.value;
  });
  form.querySelector("#amt").addEventListener("input", (e) => {
    draftCreditor.amount = e.target.value;
  });
  form.querySelector("[data-act=add]").addEventListener("click", addCreditor);
}

async function addCreditor() {
  const nickname = draftCreditor.nickname.trim();
  if (!nickname) return;
  await ensurePack();
  pack.creditors.push({
    id: crypto.randomUUID(),
    nickname,
    type: draftCreditor.type,
    ref: draftCreditor.ref.trim(),
    amount: draftCreditor.amount.trim(),
  });
  draftCreditor = { nickname: "", type: draftCreditor.type, ref: "", amount: "" };
  pack.letterTouched = false;
  pack = await savePack(pack);
  render();
}

async function removeCreditor(index) {
  pack.creditors.splice(index, 1);
  pack.letterTouched = false;
  pack = await savePack(pack);
  render();
}

function readSituationForm(form) {
  return {
    fullName: form.querySelector("#fullName").value,
    hkid: form.querySelector("#hkid").value,
    phone: form.querySelector("#phone").value,
    situation: {
      whatChanged: form.querySelector("#what").value,
      when: form.querySelector("#when").value,
      incomeItems: form.querySelector("#incomeItems").value,
      incomeAmount: form.querySelector("#incomeAmount").value,
      expenseItems: form.querySelector("#expenseItems").value,
      expenseAmount: form.querySelector("#expenseAmount").value,
      surplus: form.querySelector("#surplus").value,
      tenorMonths: form.querySelector("#tenor").value,
      askInterestFreeze: form.querySelector("#freeze").checked,
    },
  };
}

function renderSituation() {
  const sit = pack?.situation || {};
  if (pack && !pack.letter) syncLetter();
  const body = el(`<div class="stack"><h1>${escapeHtml(s("situationTitle"))}</h1><p class="hint">${escapeHtml(s("situationHint"))}</p></div>`);
  const tenorOpts = ["3", "6", "9", "12"]
    .map((n) => `<option value="${n}" ${String(sit.tenorMonths || "6") === n ? "selected" : ""}>${escapeHtml(s(`tenorMonths.${n}`))}</option>`)
    .join("");
  const form = el(`
    <div class="stack">
      <label class="field">${escapeHtml(s("fullName"))}
        <input id="fullName" maxlength="80" placeholder="${escapeHtml(s("fullNamePh"))}" value="${escapeHtml(pack?.fullName || "")}" />
      </label>
      <label class="field">${escapeHtml(s("hkid"))}
        <input id="hkid" maxlength="20" placeholder="${escapeHtml(s("hkidPh"))}" value="${escapeHtml(pack?.hkid || "")}" autocomplete="off" />
      </label>
      <label class="field">${escapeHtml(s("phone"))}
        <input id="phone" maxlength="20" placeholder="${escapeHtml(s("phonePh"))}" value="${escapeHtml(pack?.phone || "")}" inputmode="tel" />
      </label>
      <label class="field">${escapeHtml(s("whatChanged"))}
        <textarea id="what" class="short" placeholder="${escapeHtml(s("whatChangedPh"))}">${escapeHtml(sit.whatChanged || "")}</textarea>
      </label>
      <label class="field">${escapeHtml(s("when"))}
        <input id="when" maxlength="40" placeholder="${escapeHtml(s("whenPh"))}" value="${escapeHtml(sit.when || "")}" />
      </label>
      <label class="field">${escapeHtml(s("incomeItems"))}
        <input id="incomeItems" maxlength="120" placeholder="${escapeHtml(s("incomeItemsPh"))}" value="${escapeHtml(sit.incomeItems || "")}" />
      </label>
      <label class="field">${escapeHtml(s("incomeAmount"))}
        <input id="incomeAmount" maxlength="40" placeholder="${escapeHtml(s("incomeAmountPh"))}" value="${escapeHtml(sit.incomeAmount || "")}" />
      </label>
      <label class="field">${escapeHtml(s("expenseItems"))}
        <input id="expenseItems" maxlength="120" placeholder="${escapeHtml(s("expenseItemsPh"))}" value="${escapeHtml(sit.expenseItems || "")}" />
      </label>
      <label class="field">${escapeHtml(s("expenseAmount"))}
        <input id="expenseAmount" maxlength="40" placeholder="${escapeHtml(s("expenseAmountPh"))}" value="${escapeHtml(sit.expenseAmount || "")}" />
      </label>
      <label class="field">${escapeHtml(s("surplus"))}
        <input id="surplus" maxlength="40" placeholder="${escapeHtml(s("surplusPh"))}" value="${escapeHtml(sit.surplus || "")}" />
      </label>
      <label class="field">${escapeHtml(s("tenor"))}
        <select id="tenor">${tenorOpts}</select>
      </label>
      <label class="doc-head">
        <input id="freeze" class="check" type="checkbox" ${sit.askInterestFreeze ? "checked" : ""} />
        <span>${escapeHtml(s("askInterestFreeze"))}</span>
      </label>
      <p class="tiny">${escapeHtml(s("creditHonesty"))}</p>
      <label class="field">${escapeHtml(s("letterTitle"))}
        <textarea id="letter">${escapeHtml(pack?.letter || "")}</textarea>
      </label>
      <button class="btn" data-act="regen" type="button">${escapeHtml(s("regenerate"))}</button>
      ${pack?.letterTouched ? `<p class="tiny">${escapeHtml(s("letterEdited"))}</p>` : ""}
    </div>
  `);
  body.append(form);
  const next = el(`<button class="btn btn-primary" type="button">${escapeHtml(s("continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="creditors" type="button">${escapeHtml(s("back"))}</button>`));
  body.append(box);
  shell(body);

  const persist = async (forceRebuild) => {
    const next = readSituationForm(form);
    pack.fullName = next.fullName;
    pack.hkid = next.hkid;
    pack.phone = next.phone;
    pack.situation = next.situation;
    if (forceRebuild || !pack.letterTouched) {
      syncLetter();
      if (forceRebuild) pack.letterTouched = false;
      form.querySelector("#letter").value = pack.letter;
    } else {
      pack.letter = form.querySelector("#letter").value;
    }
    pack = await savePack(pack);
  };
  ["fullName", "hkid", "phone", "what", "when", "incomeItems", "incomeAmount", "expenseItems", "expenseAmount", "surplus"].forEach((id) => {
    form.querySelector(`#${id}`).addEventListener("input", () => persist(false));
  });
  form.querySelector("#tenor").addEventListener("change", () => persist(false));
  form.querySelector("#freeze").addEventListener("change", () => persist(false));
  form.querySelector("#letter").addEventListener("input", async (e) => {
    pack.letterTouched = true;
    pack.letter = e.target.value;
    pack = await savePack(pack);
  });
  form.querySelector("[data-act=regen]").addEventListener("click", async () => {
    if (pack.letterTouched && !confirm(s("letterEdited"))) return;
    await persist(true);
    render();
  });
  next.addEventListener("click", async () => {
    await persist(false);
    if (!pack.fullName.trim()) {
      notice = s("needName");
      render();
      return;
    }
    notice = "";
    if (!pack.letter.trim()) await persist(true);
    await finishAssessment();
    go("door");
  });
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

function renderDoor() {
  const door = pack?.door || recommendDoor(pack?.creditors || []);
  const links = hrefs(lang);
  const copy = {
    [DOORS.IDRP]: {
      title: s("doorIdrpTitle"),
      body: s("doorIdrpBody"),
      sayTitle: s("doorIdrpSayTitle"),
      say: s("doorIdrpSay"),
      facts: [],
      sources: [
        [s("sourceHkma"), links.hkma],
        [s("sourceHkmaGuide"), links.hkmaGuide],
      ],
    },
    [DOORS.HSBC_WORKOUT]: {
      title: s("doorHsbcTitle"),
      body: s("doorHsbcBody"),
      sayTitle: s("doorHsbcSayTitle"),
      say: s("doorHsbcSay"),
      facts: [s("doorHsbcPhone"), s("doorHsbcEmail"), s("doorHsbcMail")],
      sources: [[s("sourceHsbc"), links.hsbc]],
    },
    [DOORS.CITI]: {
      title: s("doorCitiTitle"),
      body: s("doorCitiBody"),
      sayTitle: s("doorCitiSayTitle"),
      say: s("doorCitiSay"),
      facts: [s("doorCitiPhone")],
      sources: [[s("sourceCiti"), links.citi]],
    },
    [DOORS.OTHER]: {
      title: s("doorOtherTitle"),
      body: s("doorOtherBody"),
      sayTitle: s("doorOtherSayTitle"),
      say: s("doorOtherSay"),
      facts: [],
      sources: [
        [s("sourceHkma"), links.hkma],
        [s("sourceHkmaGuide"), links.hkmaGuide],
      ],
    },
  }[door];
  const body = el(`<div class="stack"><h1>${escapeHtml(s("doorTitle"))}</h1><h2>${escapeHtml(copy.title)}</h2><p>${escapeHtml(copy.body)}</p></div>`);
  if (copy.facts.length) {
    const card = el(`<div class="card stack"></div>`);
    copy.facts.forEach((fact) => card.append(el(`<p>${escapeHtml(fact)}</p>`)));
    body.append(card);
  }
  body.append(el(`<p class="tiny">${escapeHtml(copy.sayTitle)}</p>`));
  body.append(el(`<div class="script">${escapeHtml(copy.say)}</div>`));
  if ((pack?.creditors || []).some((c) => c.type === "money_lender") && door !== DOORS.IDRP) {
    body.append(el(`<p class="tiny">${escapeHtml(s("doorMoneyNote"))}</p>`));
  }
  const sources = el(`<div class="card stack"></div>`);
  copy.sources.forEach(([label, url]) => {
    sources.append(el(`<a class="link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`));
  });
  body.append(sources);
  body.append(nav("situation", "documents"));
  shell(body);
}

function renderDocuments() {
  pack.documents = normalizeDocuments(pack.documents);
  const body = el(`<div class="stack"><h1>${escapeHtml(s("docsTitle"))}</h1><p class="hint">${escapeHtml(s("docsHint"))}</p></div>`);
  pack.documents.forEach((doc, i) => {
    const def = DOCUMENT_DEFS.find((d) => d.key === doc.key);
    const have = doc.attachmentIds.length;
    const need = def?.minFiles || 0;
    const required = !!def?.required;
    const card = el(`
      <div class="card doc">
        <div>
          <span class="tag">${escapeHtml(required ? s("requiredTag") : s("optionalTag"))}</span>
          <strong>${escapeHtml(s(`docs.${doc.key}`))}</strong>
          ${need ? `<p class="tiny">${escapeHtml(s("photoCount", { have, need }))}</p>` : have ? `<p class="tiny">${have}</p>` : ""}
        </div>
        <input class="hidden-file" type="file" accept="image/*" multiple />
        <button class="btn" type="button">${escapeHtml(have ? s("attachMore") : s("attach"))}</button>
        <div class="thumbs"></div>
      </div>
    `);
    const file = card.querySelector('input[type="file"]');
    card.querySelector(".btn").addEventListener("click", () => file.click());
    file.addEventListener("change", async (e) => {
      const chosen = [...(e.target.files || [])];
      for (const item of chosen) {
        const blob = await compressImage(item);
        const id = crypto.randomUUID();
        await putAttachment(id, blob);
        pack.documents[i].attachmentIds.push(id);
      }
      if (!pack.letterTouched) syncLetter();
      pack = await savePack(pack);
      render();
    });
    const thumbs = card.querySelector(".thumbs");
    doc.attachmentIds.forEach((id, photoIndex) => {
      const row = el(`<div class="thumb-row"><button class="btn btn-ghost" type="button">${escapeHtml(s("removePhoto"))}</button></div>`);
      row.querySelector("button").addEventListener("click", async () => {
        await deleteAttachment(id);
        pack.documents[i].attachmentIds.splice(photoIndex, 1);
        if (!pack.letterTouched) syncLetter();
        pack = await savePack(pack);
        render();
      });
      getAttachment(id).then((blob) => {
        if (!blob) return;
        const img = document.createElement("img");
        img.className = "thumb";
        img.alt = "";
        img.src = URL.createObjectURL(blob);
        row.prepend(img);
      });
      thumbs.append(row);
    });
    body.append(card);
  });
  body.append(nav("door", "pack"));
  shell(body);
}

function missingCopy(gap) {
  if (gap.key === "hardship_proof") return s("missingHardship", { remain: gap.remain });
  if (gap.key === "bank_statements") return s("missingStatements", { remain: gap.remain });
  return s(`docs.${gap.key}`);
}

function renderPack() {
  pack.documents = normalizeDocuments(pack.documents);
  if (!pack.letterTouched) syncLetter();
  const gaps = missingAttachments(pack.documents);
  const blocked = gaps.length > 0;
  const reminder = reminderState();
  const showReminder = reminder && (pack.status === "sent" || pack.status === "waiting");
  const body = el(`<div class="stack"><h1>${escapeHtml(s("packTitle"))}</h1><p class="hint">${escapeHtml(s("packHint"))}</p></div>`);
  body.append(el(`<article class="letter-file">${escapeHtml(pack.letter || "")}</article>`));
  if (blocked) {
    const miss = el(`<div class="card warn stack"><strong>${escapeHtml(s("missingTitle"))}</strong><p class="tiny">${escapeHtml(s("missingHint"))}</p></div>`);
    gaps.forEach((gap) => miss.append(el(`<p>${escapeHtml(missingCopy(gap))}</p>`)));
    body.append(miss);
  }
  const actions = el(`<div class="nav"></div>`);
  const make = el(`<button class="btn btn-accent" type="button">${escapeHtml(busy ? s("makingPdf") : s("makePdf"))}</button>`);
  const share = el(`<button class="btn btn-primary" type="button">${escapeHtml(s("share"))}</button>`);
  const download = el(`<button class="btn" type="button">${escapeHtml(s("download"))}</button>`);
  make.disabled = busy || blocked;
  share.disabled = busy || blocked;
  download.disabled = busy || blocked;
  actions.append(make, share, download);
  body.append(actions);
  body.append(el(`<h2>${escapeHtml(s("statusTitle"))}</h2>`));
  body.append(el(`<p class="hint">${escapeHtml(s("statusHint"))}</p>`));
  if (showReminder) {
    body.append(
      el(
        `<div class="card"><strong>${escapeHtml(reminder.overdue ? s("reminderDue") : s("reminder"))}</strong><p class="tiny">${escapeHtml(s("comeBackOn"))} ${escapeHtml(reminder.label)}</p></div>`,
      ),
    );
  }
  STATUSES.forEach((status) => {
    const btn = el(
      `<button class="status${pack.status === status ? " selected" : ""}" type="button">${escapeHtml(s(`statuses.${status}`))}</button>`,
    );
    btn.addEventListener("click", () => setStatus(status));
    body.append(btn);
  });
  body.append(nav("documents", null));
  shell(body);
  if (!blocked) {
    make.addEventListener("click", () => handlePdf("download"));
    share.addEventListener("click", () => handlePdf("share"));
    download.addEventListener("click", () => handlePdf("download"));
  }
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
    const file = new File([blob], lang === "zh" ? "正確的門-信件包.pdf" : "right-door-pack.pdf", {
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

function downloadBlob(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function renderCounters() {
  const events = await listEvents();
  const counts = countEvents(events);
  const body = el(`<div class="stack"><h1>${escapeHtml(s("countersTitle"))}</h1><p class="hint">${escapeHtml(s("countersHint"))}</p></div>`);
  const card = el(`<div class="card"></div>`);
  Object.entries(counts).forEach(([type, n]) => {
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
