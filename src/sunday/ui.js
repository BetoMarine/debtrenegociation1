import {
  CARITAS,
  CONSULATE_ID,
  CONSULATE_PH,
  ENRICH,
  HELP,
  LABOUR_FDH,
  POLICE,
  TWGH_FDCC,
} from "./contacts.js";
import { el as domEl } from "../dom.js";
import { st } from "./copy.js";
import { SUNDAY_DOORS, consulateFor, hasCrisisFlags, recommendSundayDoor } from "./door.js";
import {
  BALANCE_BANDS,
  GOALS,
  GUARANTOR,
  LOAN_TYPES,
  MONTHLY_BANDS,
  NATIONALITIES,
  STILL_BORROWING,
  SUNDAY_LANGS,
  WHO_KNOWS,
  canGeneratePdf,
  emptyDraftLoan,
  splitIsValid,
  splitTotal,
  triageComplete,
} from "./model.js";

export const SUNDAY_SCREENS = [
  "sunday-privacy",
  "sunday-language",
  "sunday-triage",
  "sunday-crisis",
  "sunday-situation",
  "sunday-debts",
  "sunday-split",
  "sunday-door",
  "sunday-review",
  "sunday-done",
];

export function nextSundayLang(lang) {
  const i = SUNDAY_LANGS.indexOf(lang);
  return SUNDAY_LANGS[(i + 1) % SUNDAY_LANGS.length];
}

function t(host, key, vars) {
  return st(host.sundayLang, key, vars);
}

function choiceClass(on) {
  return on ? "choice selected" : "choice";
}

/** Pause before writing months left. Choice taps save immediately. */
export const SITUATION_PERSIST_MS = 300;

const SITUATION_LATER_SCREENS = new Set([
  "sunday-debts",
  "sunday-split",
  "sunday-door",
  "sunday-review",
  "sunday-done",
]);

let situationPersistTimer = 0;

function cancelSituationPersist() {
  clearTimeout(situationPersistTimer);
  situationPersistTimer = 0;
}

function situationStillCurrent(host) {
  return !SITUATION_LATER_SCREENS.has(host.sunday?.screen);
}

function scheduleSituationPersist(host) {
  cancelSituationPersist();
  situationPersistTimer = setTimeout(() => {
    situationPersistTimer = 0;
    if (!situationStillCurrent(host)) return;
    host.persistSunday("sunday-situation");
  }, SITUATION_PERSIST_MS);
}

function syncDigits(input, max = 3) {
  const raw = String(input.value ?? "");
  const next = raw.replace(/\D/g, "").slice(0, max);
  if (next !== raw) {
    const caret = input.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
    input.value = next;
    const pos = Math.min(digitsBefore, next.length);
    if (typeof input.setSelectionRange === "function") input.setSelectionRange(pos, pos);
  }
  return next;
}

function markSelected(buttons, active) {
  for (const btn of buttons) btn.classList.toggle("selected", btn === active);
}

const EYE = `<svg class="v3-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 4l18 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

export const SUNDAY_PILL_GAP_PX = 16;
export const SUNDAY_PILL_MIN_PX = 44;

/** Browser and WhatsApp links ask first. tel: — including 999 — never does. */
export function shouldLeaveApp(href) {
  const value = String(href || "");
  if (/^tel:/i.test(value)) return false;
  return /^https?:/i.test(value);
}

export function sundayCornerHtml(ex, lang = "en") {
  const gap = SUNDAY_PILL_GAP_PX;
  const min = SUNDAY_PILL_MIN_PX;
  return `<div class="sunday-corner" data-sunday-corner style="gap:${gap}px">
    <a class="pill-999" data-act="call-999" href="${POLICE.phoneHref}" aria-label="${ex(st(lang, "call999"))}" style="min-width:${min}px;min-height:${min}px">999</a>
    <button class="eye-off" type="button" data-act="exit" aria-label="${ex(st(lang, "exitAria"))}" style="min-width:${min}px;min-height:${min}px">${EYE}</button>
  </div>`;
}

function showLeaveSheet(host, anchorEl, { href, destName, kind }) {
  if (!shouldLeaveApp(href)) return;
  const ex = host.escapeHtml;
  const parent = anchorEl?.closest?.(".shell") || document.body;
  parent.querySelector("[data-leave-sheet]")?.remove();
  parent.querySelector("[data-leave-scrim]")?.remove();
  const body = kind === "enrich" ? t(host, "leaveEnrichBody") : t(host, "leaveNamedBody", { name: destName });
  const open = kind === "enrich" ? t(host, "leaveOpenEnrich") : t(host, "leaveOpenNamed", { name: destName });
  const scrim = host.el(`<div class="leave-scrim" data-leave-scrim></div>`);
  const sheet = host.el(`<div class="leave-sheet" data-leave-sheet role="dialog" aria-modal="true" aria-labelledby="leave-title">
    <h2 id="leave-title">${ex(t(host, "leaveTitle"))}</h2>
    <p>${ex(body)}</p>
    <p>${ex(t(host, "leavePackStays"))}</p>
    <button class="btn btn-primary" type="button" data-act="confirm-leave">${ex(open)}</button>
    <button class="btn btn-ghost" type="button" data-act="stay-here">${ex(t(host, "leaveStay"))}</button>
  </div>`);
  const close = () => {
    scrim.remove();
    sheet.remove();
  };
  scrim.addEventListener("click", close);
  sheet.querySelector("[data-act='stay-here']").addEventListener("click", close);
  sheet.querySelector("[data-act='confirm-leave']").addEventListener("click", () => {
    close();
    if (typeof host.openExternal === "function") host.openExternal(href);
    else window.open(href, "_blank", "noopener");
  });
  parent.append(scrim, sheet);
}

function outbound(host, { href, label, className, kind, destName }) {
  const { el, escapeHtml: ex } = host;
  if (!shouldLeaveApp(href)) {
    return el(`<a class="${className}" href="${ex(href)}">${ex(label)}</a>`);
  }
  const btn = el(
    `<button class="${className}" type="button" data-leave="${ex(kind || "site")}" data-href="${ex(href)}">${ex(label)}</button>`,
  );
  btn.addEventListener("click", () => showLeaveSheet(host, btn, { href, destName, kind }));
  return btn;
}

export function sundayStatusHtml(ex, lang = "en") {
  return `<div class="status-sheet" role="dialog" data-status-sheet aria-labelledby="sunday-status-title">
    <h2 id="sunday-status-title">${ex(st(lang, "statusTitle"))}</h2>
    <p>${ex(st(lang, "brand"))}</p>
    <p class="status-live">${ex(st(lang, "statusLive"))}</p>
    <button class="btn" type="button" data-act="close-status">${ex(st(lang, "statusClose"))}</button>
  </div>`;
}

export function attachSundayStatus(root, lang = "en", ex = (value) => value) {
  root.querySelector("[data-act='status']")?.addEventListener("click", () => {
    if (root.querySelector("[data-status-sheet]")) return;
    const sheet = domEl(sundayStatusHtml(ex, lang));
    root.append(sheet);
    sheet.querySelector("[data-act='close-status']")?.addEventListener("click", () => sheet.remove());
  });
}

export function renderSunday(screen, host) {
  const view = {
    "sunday-privacy": renderPrivacy,
    "sunday-language": renderLanguage,
    "sunday-triage": renderTriage,
    "sunday-crisis": renderCrisis,
    "sunday-situation": renderSituation,
    "sunday-debts": renderDebts,
    "sunday-split": renderSplit,
    "sunday-door": renderDoor,
    "sunday-review": renderReview,
    "sunday-done": renderDone,
  }[screen];
  view(host);
}

function renderPrivacy(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"></div>`);
  body.append(
    el(`<p class="kicker">${ex(t(host, "pylStudio"))}</p>`),
    el(`<h1>${ex(t(host, "privacyTitle"))}</h1>`),
    el(`<p class="lede">${ex(t(host, "privacyLead"))}</p>`),
    el(`<div class="card privacy"><p>${ex(t(host, "privacyBody"))}</p></div>`),
  );
  if (!host.isStandalone) {
    body.append(
      el(
        `<div class="card"><strong>${ex(t(host, "addHome"))}</strong><p class="tiny">${ex(t(host, "addHomeHow"))}</p></div>`,
      ),
    );
  }
  const check = el(`
    <label class="doc-head">
      <input class="check" type="checkbox" ${sunday.privacyAccepted ? "checked" : ""} />
      <span>${ex(t(host, "privacyCheck"))}</span>
    </label>
  `);
  body.append(check);
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const nav = el(`<div class="nav"></div>`);
  nav.append(next);
  body.append(nav);
  host.shellSunday(body);
  check.querySelector("input").addEventListener("change", async (e) => {
    sunday.privacyAccepted = e.target.checked;
    await host.persistSunday("sunday-privacy");
  });
  next.addEventListener("click", async () => {
    if (!sunday.privacyAccepted) {
      host.setNotice(t(host, "privacyNeed"));
      host.render();
      return;
    }
    host.setNotice("");
    await host.persistSunday("sunday-language");
    host.go("sunday-language");
  });
}

function renderLanguage(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "languageTitle"))}</h1><p class="hint">${ex(t(host, "languageHint"))}</p></div>`);
  for (const code of SUNDAY_LANGS) {
    const btn = el(`<button class="${choiceClass(sunday.lang === code)}" type="button">${ex(t(host, `langNames.${code}`))}</button>`);
    btn.addEventListener("click", () => host.setSundayLang(code));
    body.append(btn);
  }
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="sunday-privacy" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);
  next.addEventListener("click", async () => {
    await host.persistSunday("sunday-triage");
    host.go("sunday-triage");
  });
}

function renderTriage(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "triageTitle"))}</h1><p class="hint">${ex(t(host, "triageHint"))}</p></div>`);
  const flags = [
    ["passport", t(host, "flags.passport")],
    ["shark", t(host, "flags.shark")],
    ["agency", t(host, "flags.agency")],
  ];
  flags.forEach(([key, label]) => {
    const on = sunday.flags.includes(key);
    const btn = el(`<button class="${choiceClass(on)}" type="button">${ex(label)}</button>`);
    btn.addEventListener("click", async () => {
      const set = new Set(sunday.flags);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      sunday.flags = [...set];
      sunday.noneOfAbove = false;
      sunday.door = recommendSundayDoor(sunday.flags);
      await host.persistSunday("sunday-triage");
      host.render();
    });
    body.append(btn);
  });
  const none = el(`<button class="${choiceClass(sunday.noneOfAbove)}" type="button">${ex(t(host, "flags.none"))}</button>`);
  none.addEventListener("click", async () => {
    sunday.flags = [];
    sunday.noneOfAbove = true;
    sunday.door = recommendSundayDoor(sunday.flags);
    await host.persistSunday("sunday-triage");
    host.render();
  });
  body.append(none);
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="sunday-language" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);
  next.addEventListener("click", async () => {
    if (!triageComplete(sunday)) {
      host.setNotice(t(host, "flagsNeed"));
      host.render();
      return;
    }
    host.setNotice("");
    sunday.door = recommendSundayDoor(sunday.flags);
    const nextScreen = hasCrisisFlags(sunday.flags) ? "sunday-crisis" : "sunday-situation";
    await host.persistSunday(nextScreen);
    await host.log("sunday_triage_done", sunday.door);
    host.go(nextScreen);
  });
}

function consulateLinks(host, nationality) {
  const which = consulateFor(nationality);
  const nodes = [];
  if (which === "ph" || which === "both") {
    nodes.push(outbound(host, { href: CONSULATE_PH.phoneHref, label: t(host, "callConsulatePh", { phone: CONSULATE_PH.phone }), className: "btn ext" }));
    nodes.push(outbound(host, { href: CONSULATE_PH.emergencyHref, label: t(host, "callConsulatePhEmergency", { phone: CONSULATE_PH.emergency }), className: "btn ext" }));
    nodes.push(outbound(host, { href: CONSULATE_PH.site, label: t(host, "consulatePhSite"), className: "btn", kind: "site", destName: "Philippine Consulate" }));
  }
  if (which === "id" || which === "both") {
    nodes.push(outbound(host, { href: CONSULATE_ID.phoneHref, label: t(host, "callConsulateId", { phone: CONSULATE_ID.phone }), className: "btn ext" }));
    nodes.push(outbound(host, { href: CONSULATE_ID.site, label: t(host, "consulateIdSite"), className: "btn", kind: "site", destName: "Indonesian Consulate" }));
  }
  return nodes;
}

function renderCrisis(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "crisisTitle"))}</h1><p class="lede">${ex(t(host, "crisisLead"))}</p></div>`);
  if (sunday.flags.includes("passport")) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "crisisPassport"))}</p></div>`));
    body.append(outbound(host, { href: POLICE.phoneHref, label: t(host, "call999"), className: "btn ext" }));
    body.append(outbound(host, { href: HELP.phoneHref, label: t(host, "callHelp", { phone: HELP.phone }), className: "btn ext" }));
    body.append(outbound(host, { href: HELP.whatsappHref, label: t(host, "waHelp", { phone: HELP.whatsapp }), className: "btn", kind: "whatsapp", destName: t(host, "whatsAppName") }));
    body.append(outbound(host, { href: HELP.site, label: t(host, "helpSite"), className: "btn", kind: "site", destName: t(host, "helpName") }));
    consulateLinks(host, sunday.nationality).forEach((n) => body.append(n));
  }
  if (sunday.flags.includes("shark")) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "crisisShark"))}</p></div>`));
    body.append(outbound(host, { href: HELP.phoneHref, label: t(host, "callHelp", { phone: HELP.phone }), className: "btn ext" }));
    body.append(outbound(host, { href: HELP.whatsappHref, label: t(host, "waHelp", { phone: HELP.whatsapp }), className: "btn", kind: "whatsapp", destName: t(host, "whatsAppName") }));
    body.append(outbound(host, { href: HELP.site, label: t(host, "helpSite"), className: "btn", kind: "site", destName: t(host, "helpName") }));
    body.append(outbound(host, { href: POLICE.phoneHref, label: t(host, "call999"), className: "btn ext" }));
  }
  if (sunday.flags.includes("agency")) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "crisisAgency"))}</p></div>`));
    body.append(outbound(host, { href: LABOUR_FDH.phoneHref, label: t(host, "callLabour", { phone: LABOUR_FDH.phone }), className: "btn ext" }));
    consulateLinks(host, sunday.nationality).forEach((n) => body.append(n));
  }
  body.append(el(`<p class="tiny">${ex(t(host, "weNeverMessage"))}</p>`));
  const next = el(`<button class="btn btn-accent" type="button">${ex(t(host, "crisisShortPack"))}</button>`);
  const skip = el(`<button class="btn" type="button">${ex(t(host, "skip"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, skip, el(`<button class="btn btn-ghost" data-go="sunday-triage" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);
  next.addEventListener("click", async () => {
    await host.persistSunday("sunday-situation");
    host.go("sunday-situation");
  });
  skip.addEventListener("click", async () => {
    sunday.door = recommendSundayDoor(sunday.flags);
    await host.persistSunday("sunday-door");
    await host.log("sunday_door_chosen", sunday.door);
    host.go("sunday-door");
  });
}

function renderSituation(host) {
  cancelSituationPersist();
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "situationTitle"))}</h1><p class="hint">${ex(t(host, "situationHint"))}</p></div>`);
  body.append(el(`<p class="tiny">${ex(t(host, "nationality"))}</p>`));
  const nationalityButtons = NATIONALITIES.map((key) => {
    const btn = el(
      `<button class="${choiceClass(sunday.nationality === key)}" type="button" data-sunday-choice="nationality" data-value="${ex(key)}">${ex(t(host, `nationalities.${key}`))}</button>`,
    );
    btn.addEventListener("click", () => {
      host.sunday.nationality = key;
      markSelected(nationalityButtons, btn);
      host.persistSunday("sunday-situation");
    });
    body.append(btn);
    return btn;
  });
  const months = el(`
    <label class="field">${ex(t(host, "monthsLeft"))}
      <input id="months" inputmode="numeric" maxlength="3" placeholder="${ex(t(host, "monthsLeftPh"))}" value="${ex(sunday.monthsLeft || "")}" />
    </label>
  `);
  body.append(months);
  const monthsInput = months.querySelector("#months");
  body.append(el(`<p class="tiny">${ex(t(host, "whoKnows"))}</p>`));
  const whoButtons = WHO_KNOWS.map((key) => {
    const btn = el(
      `<button class="${choiceClass(sunday.whoKnows === key)}" type="button" data-sunday-choice="who" data-value="${ex(key)}">${ex(t(host, `whoKnowsOpts.${key}`))}</button>`,
    );
    btn.addEventListener("click", () => {
      host.sunday.whoKnows = key;
      markSelected(whoButtons, btn);
      host.persistSunday("sunday-situation");
    });
    body.append(btn);
    return btn;
  });
  body.append(el(`<p class="tiny">${ex(t(host, "meetingGoal"))}</p>`));
  GOALS.forEach((key) => {
    const btn = el(
      `<button class="${choiceClass(sunday.goals.includes(key))}" type="button" data-sunday-choice="goal" data-value="${ex(key)}">${ex(t(host, `goals.${key}`))}</button>`,
    );
    btn.addEventListener("click", () => {
      const pack = host.sunday;
      const set = new Set(pack.goals);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      pack.goals = GOALS.filter((g) => set.has(g));
      btn.classList.toggle("selected", set.has(key));
      host.persistSunday("sunday-situation");
    });
    body.append(btn);
  });
  const back = hasCrisisFlags(sunday.flags) ? "sunday-crisis" : "sunday-triage";
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="${back}" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);

  const rememberMonths = () => {
    host.sunday.monthsLeft = syncDigits(monthsInput);
  };
  monthsInput.addEventListener("input", () => {
    rememberMonths();
    scheduleSituationPersist(host);
  });
  monthsInput.addEventListener("blur", () => {
    if (!situationPersistTimer) return;
    rememberMonths();
    cancelSituationPersist();
    if (!situationStillCurrent(host)) return;
    host.persistSunday("sunday-situation");
  });
  next.addEventListener("click", async () => {
    rememberMonths();
    cancelSituationPersist();
    const pack = host.sunday;
    if (!pack.nationality) {
      host.setNotice(t(host, "needNationality"));
      await host.persistSunday("sunday-situation");
      host.render();
      return;
    }
    if (!pack.whoKnows) {
      host.setNotice(t(host, "needWhoKnows"));
      await host.persistSunday("sunday-situation");
      host.render();
      return;
    }
    if (!pack.goals.length) {
      host.setNotice(t(host, "needGoal"));
      await host.persistSunday("sunday-situation");
      host.render();
      return;
    }
    host.setNotice("");
    await host.persistSunday("sunday-debts");
    host.go("sunday-debts");
  });
}

function renderDebts(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const list = sunday.loans || [];
  const body = el(`<div class="stack"><h1>${ex(t(host, "debtsTitle"))}</h1><p class="hint">${ex(t(host, "debtsHint"))}</p></div>`);
  if (!list.length) body.append(el(`<p class="tiny">${ex(t(host, "noLoans"))}</p>`));
  list.forEach((loan, i) => {
    const row = el(`
      <div class="card creditor">
        <div>
          <strong>${ex(loan.nickname)}</strong>
          <div class="tiny">${ex(t(host, `loanTypes.${loan.type}`))} · ${ex(t(host, `bands.${loan.balanceBand}`))} · ${ex(t(host, `stillOpts.${loan.stillBorrowing}`))}</div>
        </div>
        <button class="btn" type="button" style="width:auto;min-height:40px;padding:8px 12px">${ex(t(host, "remove"))}</button>
      </div>
    `);
    row.querySelector("button").addEventListener("click", () => host.removeSundayLoan(i));
    body.append(row);
  });
  const d = host.draftLoan || emptyDraftLoan();
  const typeOpts = LOAN_TYPES.map((v) => `<option value="${v}" ${d.type === v ? "selected" : ""}>${ex(t(host, `loanTypes.${v}`))}</option>`).join("");
  const balOpts = BALANCE_BANDS.map((v) => `<option value="${v}" ${d.balanceBand === v ? "selected" : ""}>${ex(t(host, `bands.${v}`))}</option>`).join("");
  const monOpts = MONTHLY_BANDS.map((v) => `<option value="${v}" ${d.monthlyBand === v ? "selected" : ""}>${ex(t(host, `bands.${v}`))}</option>`).join("");
  const guaOpts = GUARANTOR.map((v) => `<option value="${v}" ${d.guarantor === v ? "selected" : ""}>${ex(t(host, `guarantorOpts.${v}`))}</option>`).join("");
  const stillOpts = STILL_BORROWING.map((v) => `<option value="${v}" ${d.stillBorrowing === v ? "selected" : ""}>${ex(t(host, `stillOpts.${v}`))}</option>`).join("");
  const form = el(`
    <div class="card stack">
      <label class="field">${ex(t(host, "nickname"))}
        <input id="nick" maxlength="40" placeholder="${ex(t(host, "nicknamePh"))}" value="${ex(d.nickname)}" />
      </label>
      <label class="field">${ex(t(host, "loanType"))}
        <select id="type">${typeOpts}</select>
      </label>
      <label class="field">${ex(t(host, "balanceBand"))}
        <select id="bal">${balOpts}</select>
      </label>
      <label class="field">${ex(t(host, "monthlyBand"))}
        <select id="mon">${monOpts}</select>
      </label>
      <label class="field">${ex(t(host, "guarantor"))}
        <select id="gua">${guaOpts}</select>
      </label>
      <label class="field">${ex(t(host, "stillBorrowing"))}
        <select id="still">${stillOpts}</select>
      </label>
      <button class="btn" data-act="add" type="button">${ex(t(host, "addLoan"))}</button>
    </div>
  `);
  body.append(form);
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="sunday-situation" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);
  form.querySelector("#nick").addEventListener("input", (e) => {
    host.draftLoan.nickname = e.target.value;
  });
  form.querySelector("#type").addEventListener("change", (e) => {
    host.draftLoan.type = e.target.value;
  });
  form.querySelector("#bal").addEventListener("change", (e) => {
    host.draftLoan.balanceBand = e.target.value;
  });
  form.querySelector("#mon").addEventListener("change", (e) => {
    host.draftLoan.monthlyBand = e.target.value;
  });
  form.querySelector("#gua").addEventListener("change", (e) => {
    host.draftLoan.guarantor = e.target.value;
  });
  form.querySelector("#still").addEventListener("change", (e) => {
    host.draftLoan.stillBorrowing = e.target.value;
  });
  form.querySelector("[data-act=add]").addEventListener("click", () => host.addSundayLoan());
  next.addEventListener("click", async () => {
    if (!list.length && !hasCrisisFlags(sunday.flags)) {
      host.setNotice(t(host, "needLoan"));
      host.render();
      return;
    }
    host.setNotice("");
    await host.persistSunday("sunday-split");
    host.go("sunday-split");
  });
}

function renderSplit(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const split = sunday.split || { bills: "", allowance: "", keep: "" };
  const total = splitTotal(split);
  const body = el(`<div class="stack"><h1>${ex(t(host, "splitTitle"))}</h1><p class="hint">${ex(t(host, "splitHint"))}</p></div>`);
  const form = el(`
    <div class="stack">
      <label class="field">${ex(t(host, "splitBills"))}
        <span class="tiny">${ex(t(host, "splitBillsHint"))}</span>
        <input id="bills" inputmode="numeric" maxlength="3" value="${ex(split.bills)}" />
      </label>
      <label class="field">${ex(t(host, "splitAllowance"))}
        <span class="tiny">${ex(t(host, "splitAllowanceHint"))}</span>
        <input id="allowance" inputmode="numeric" maxlength="3" value="${ex(split.allowance)}" />
      </label>
      <label class="field">${ex(t(host, "splitKeep"))}
        <span class="tiny">${ex(t(host, "splitKeepHint"))}</span>
        <input id="keep" inputmode="numeric" maxlength="3" value="${ex(split.keep)}" />
      </label>
      <p class="tiny" id="total">${ex(t(host, "splitTotal", { n: total == null ? "—" : String(total) }))}</p>
      <label class="field">${ex(t(host, "splitNote"))}
        <textarea id="note" class="short" maxlength="200" placeholder="${ex(t(host, "splitNotePh"))}">${ex(sunday.splitNote || "")}</textarea>
      </label>
      <p class="tiny">${ex(t(host, "splitWeDontSend"))}</p>
    </div>
  `);
  body.append(form);
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="sunday-debts" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);

  const persistMemory = () => {
    sunday.split = {
      bills: form.querySelector("#bills").value.replace(/[^\d]/g, "").slice(0, 3),
      allowance: form.querySelector("#allowance").value.replace(/[^\d]/g, "").slice(0, 3),
      keep: form.querySelector("#keep").value.replace(/[^\d]/g, "").slice(0, 3),
    };
    sunday.splitNote = form.querySelector("#note").value.slice(0, 200);
    const n = splitTotal(sunday.split);
    form.querySelector("#total").textContent = t(host, "splitTotal", { n: n == null ? "—" : String(n) });
  };
  ["bills", "allowance", "keep", "note"].forEach((id) => {
    form.querySelector(`#${id}`).addEventListener("input", persistMemory);
  });
  next.addEventListener("click", async () => {
    persistMemory();
    if (!splitIsValid(sunday.split) && !hasCrisisFlags(sunday.flags)) {
      host.setNotice(t(host, "splitNeed"));
      host.render();
      return;
    }
    host.setNotice("");
    sunday.door = recommendSundayDoor(sunday.flags);
    await host.persistSunday("sunday-door");
    await host.log("sunday_door_chosen", sunday.door);
    host.go("sunday-door");
  });
}

function doorCopy(host, door) {
  if (door === SUNDAY_DOORS.PASSPORT) {
    return { title: t(host, "doors.passportTitle"), body: t(host, "doors.passportBody") };
  }
  if (door === SUNDAY_DOORS.SHARK) {
    return { title: t(host, "doors.sharkTitle"), body: t(host, "doors.sharkBody") };
  }
  if (door === SUNDAY_DOORS.AGENCY) {
    return { title: t(host, "doors.agencyTitle"), body: t(host, "doors.agencyBody") };
  }
  return { title: t(host, "doors.enrichTitle"), body: t(host, "doors.enrichBody") };
}

function renderDoor(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const door = sunday.door || recommendSundayDoor(sunday.flags);
  const back = sunday.split && (sunday.split.bills !== "" || hasCrisisFlags(sunday.flags)) ? "sunday-split" : "sunday-crisis";
  const body = el(`<div class="stack" data-screen="sunday-door"></div>`);
  body.append(el(`<button class="text-back" data-go="${back}" type="button">‹ ${ex(t(host, "back"))}</button>`));
  body.append(el(`<h1>${ex(t(host, "nextDoorTitle"))}</h1>`));

  if (door !== SUNDAY_DOORS.ENRICH) {
    const copy = doorCopy(host, door);
    body.append(el(`<h2>${ex(copy.title)}</h2>`));
    body.append(el(`<p>${ex(copy.body)}</p>`));
  }
  if (door === SUNDAY_DOORS.PASSPORT || door === SUNDAY_DOORS.SHARK) {
    body.append(outbound(host, { href: HELP.phoneHref, label: t(host, "callHelp", { phone: HELP.phone }), className: "btn" }));
    body.append(outbound(host, { href: HELP.whatsappHref, label: t(host, "waHelp", { phone: HELP.whatsapp }), className: "btn", kind: "whatsapp", destName: t(host, "whatsAppName") }));
    body.append(outbound(host, { href: HELP.site, label: t(host, "helpSite"), className: "btn", kind: "site", destName: t(host, "helpName") }));
  }
  if (door === SUNDAY_DOORS.PASSPORT || door === SUNDAY_DOORS.AGENCY) {
    consulateLinks(host, sunday.nationality).forEach((n) => body.append(n));
  }
  if (door === SUNDAY_DOORS.AGENCY) {
    body.append(outbound(host, { href: LABOUR_FDH.phoneHref, label: t(host, "callLabour", { phone: LABOUR_FDH.phone }), className: "btn" }));
  }
  if (door === SUNDAY_DOORS.ENRICH || door === SUNDAY_DOORS.SHARK) {
    const card = el(`<div class="card cta-box stack" data-enrich-card></div>`);
    card.append(el(`<h2>${ex(t(host, "enrichCardTitle"))}</h2>`));
    card.append(el(`<p>${ex(t(host, "enrichCardBody"))}</p>`));
    card.append(
      outbound(host, {
        href: ENRICH.booking,
        label: t(host, "bookEnrich"),
        className: "btn btn-primary",
        kind: "enrich",
        destName: "Enrich",
      }),
    );
    card.append(el(`<p class="tiny sunday-affiliation" data-affiliation>${ex(t(host, "notAffiliatedEnrich"))}</p>`));
    card.append(
      outbound(host, {
        href: ENRICH.whatsappEnTlHref,
        label: t(host, "enrichWaEn", { phone: ENRICH.whatsappEnTl }),
        className: "link leave-link",
        kind: "whatsapp",
        destName: t(host, "whatsAppName"),
      }),
    );
    card.append(
      outbound(host, {
        href: ENRICH.whatsappIdHref,
        label: t(host, "enrichWaId", { phone: ENRICH.whatsappId }),
        className: "link leave-link",
        kind: "whatsapp",
        destName: t(host, "whatsAppName"),
      }),
    );
    body.append(card);
  }

  body.append(
    el(
      `<p class="tiny">${ex(t(host, "alsoAvailable"))} <a class="link" href="${CARITAS.phoneHref}">${ex(t(host, "caritas", { phone: CARITAS.phone }))}</a> · <a class="link" href="${TWGH_FDCC.phoneHref}">${ex(t(host, "twgh", { phone: TWGH_FDCC.phone }))}</a></p>`,
    ),
  );
  const save = el(`<button class="btn btn-primary" type="button" data-act="save-pack">${ex(t(host, "saveMyPack"))}</button>`);
  body.append(save);
  host.shellSunday(body);
  save.addEventListener("click", async () => {
    await host.persistSunday("sunday-done");
    await host.log("sunday_pack_created");
    host.go("sunday-done");
  });
}

function renderReview(host) {
  const { el, escapeHtml: ex, sunday, busy } = host;
  const blocked = !canGeneratePdf(sunday);
  const body = el(`<div class="stack"><h1>${ex(t(host, "reviewTitle"))}</h1><p class="hint">${ex(t(host, "reviewHint"))}</p></div>`);
  body.append(el(`<div class="card stack">
    <p><strong>${ex(t(host, "pdf.langPref"))}</strong> ${ex(st(sunday.lang || host.sundayLang, `langNames.${sunday.lang || host.sundayLang}`))}</p>
    <p><strong>${ex(t(host, "nationality"))}</strong> ${ex(sunday.nationality ? t(host, `nationalities.${sunday.nationality}`) : "—")}</p>
    <p><strong>${ex(t(host, "meetingGoal"))}</strong> ${ex((sunday.goals || []).map((g) => t(host, `goals.${g}`)).join(" · ") || "—")}</p>
    <p><strong>${ex(t(host, "debtsTitle"))}</strong> ${ex(t(host, "loansCount", { n: String((sunday.loans || []).length) }))}</p>
    <p><strong>${ex(t(host, "splitTitle"))}</strong> ${ex(t(host, "splitTotal", { n: splitTotal(sunday.split) == null ? "—" : String(splitTotal(sunday.split)) }))}</p>
  </div>`));
  if (blocked) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "needLoanOrCrisis"))}</p></div>`));
  }
  const make = el(`<button class="btn btn-accent" type="button">${ex(busy ? t(host, "makingPdf") : t(host, "makePdf"))}</button>`);
  const share = el(`<button class="btn btn-primary" type="button">${ex(t(host, "share"))}</button>`);
  const download = el(`<button class="btn" type="button">${ex(t(host, "download"))}</button>`);
  make.disabled = busy || blocked;
  share.disabled = busy || blocked;
  download.disabled = busy || blocked;
  const actions = el(`<div class="nav"></div>`);
  actions.append(make, share, download);
  actions.append(el(`<button class="btn btn-ghost" data-go="sunday-door" type="button">${ex(t(host, "back"))}</button>`));
  const done = el(`<button class="btn" type="button">${ex(t(host, "continue"))}</button>`);
  actions.append(done);
  if (host.fromFortune) {
    actions.append(el(host.fortuneReturnCta(t(host, "backToFortune"))));
  }
  body.append(actions);
  host.shellSunday(body);
  if (!blocked) {
    make.addEventListener("click", () => host.handleSundayPdf("download"));
    share.addEventListener("click", () => host.handleSundayPdf("share"));
    download.addEventListener("click", () => host.handleSundayPdf("download"));
  }
  done.addEventListener("click", async () => {
    await host.persistSunday("sunday-done");
    host.go("sunday-done");
  });
}

function renderDone(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack" data-screen="sunday-done"></div>`);
  body.append(el(`<button class="text-back" data-go="sunday-door" type="button">‹ ${ex(t(host, "backDoor"))}</button>`));
  body.append(el(`<h1>${ex(t(host, "savedTitle"))}</h1>`));
  body.append(el(`<p class="lede">${ex(t(host, "savedLead"))}</p>`));
  const done = el(`<button class="btn btn-primary" type="button" data-act="done">${ex(t(host, "done"))}</button>`);
  const pdf = el(`<button class="link pdf-copy" type="button" data-act="pdf-copy">${ex(t(host, "savePdfCopy"))}</button>`);
  const clear = el(`<button class="btn btn-ghost" type="button">${ex(t(host, "clearPack"))}</button>`);
  body.append(done, pdf, clear);
  host.shellSunday(body);
  done.addEventListener("click", () => host.go("sunday-door"));
  pdf.addEventListener("click", () => {
    if (!canGeneratePdf(sunday)) {
      host.setNotice(t(host, "needLoanOrCrisis"));
      host.render();
      return;
    }
    host.handleSundayPdf?.("download");
  });
  clear.addEventListener("click", () => host.clearSunday?.());
}
