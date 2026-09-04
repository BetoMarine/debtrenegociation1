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

function linkBtn(href, text) {
  return `<a class="btn btn-primary ext" href="${href}" target="_blank" rel="noopener">${text}</a>`;
}

function telBtn(href, text) {
  return `<a class="btn ext" href="${href}">${text}</a>`;
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
    el(`<p class="kicker">Sunday Pack</p>`),
    el(`<h1>${ex(t(host, "privacyTitle"))}</h1>`),
    el(`<p class="lede">${ex(t(host, "privacyLead"))}</p>`),
    el(`<div class="card privacy"><p>${ex(t(host, "privacyBody"))}</p></div>`),
  );
  const check = el(`
    <label class="doc-head">
      <input class="check" type="checkbox" ${sunday.privacyAccepted ? "checked" : ""} />
      <span>${ex(t(host, "privacyCheck"))}</span>
    </label>
  `);
  body.append(check);
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const nav = el(`<div class="nav"></div>`);
  nav.append(next, el(`<button class="btn btn-ghost" data-go="chooser" type="button">${ex(t(host, "back"))}</button>`));
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
  const { el, escapeHtml: ex } = host;
  const which = consulateFor(nationality);
  const nodes = [];
  if (which === "ph" || which === "both") {
    nodes.push(el(telBtn(CONSULATE_PH.phoneHref, ex(t(host, "callConsulatePh", { phone: CONSULATE_PH.phone })))));
    nodes.push(el(telBtn(CONSULATE_PH.emergencyHref, ex(t(host, "callConsulatePhEmergency", { phone: CONSULATE_PH.emergency })))));
    nodes.push(el(linkBtn(CONSULATE_PH.site, ex(t(host, "consulatePhSite")))));
  }
  if (which === "id" || which === "both") {
    nodes.push(el(telBtn(CONSULATE_ID.phoneHref, ex(t(host, "callConsulateId", { phone: CONSULATE_ID.phone })))));
    nodes.push(el(linkBtn(CONSULATE_ID.site, ex(t(host, "consulateIdSite")))));
  }
  return nodes;
}

function renderCrisis(host) {
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "crisisTitle"))}</h1><p class="lede">${ex(t(host, "crisisLead"))}</p></div>`);
  if (sunday.flags.includes("passport")) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "crisisPassport"))}</p></div>`));
    body.append(el(telBtn(POLICE.phoneHref, ex(t(host, "call999")))));
    body.append(el(telBtn(HELP.phoneHref, ex(t(host, "callHelp", { phone: HELP.phone })))));
    body.append(el(linkBtn(HELP.whatsappHref, ex(t(host, "waHelp", { phone: HELP.whatsapp })))));
    body.append(el(linkBtn(HELP.site, ex(t(host, "helpSite")))));
    consulateLinks(host, sunday.nationality).forEach((n) => body.append(n));
  }
  if (sunday.flags.includes("shark")) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "crisisShark"))}</p></div>`));
    body.append(el(telBtn(HELP.phoneHref, ex(t(host, "callHelp", { phone: HELP.phone })))));
    body.append(el(linkBtn(HELP.whatsappHref, ex(t(host, "waHelp", { phone: HELP.whatsapp })))));
    body.append(el(linkBtn(HELP.site, ex(t(host, "helpSite")))));
    body.append(el(telBtn(POLICE.phoneHref, ex(t(host, "call999")))));
  }
  if (sunday.flags.includes("agency")) {
    body.append(el(`<div class="card warn"><p>${ex(t(host, "crisisAgency"))}</p></div>`));
    body.append(el(telBtn(LABOUR_FDH.phoneHref, ex(t(host, "callLabour", { phone: LABOUR_FDH.phone })))));
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
  const { el, escapeHtml: ex, sunday } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "situationTitle"))}</h1><p class="hint">${ex(t(host, "situationHint"))}</p></div>`);
  body.append(el(`<p class="tiny">${ex(t(host, "nationality"))}</p>`));
  NATIONALITIES.forEach((key) => {
    const btn = el(`<button class="${choiceClass(sunday.nationality === key)}" type="button">${ex(t(host, `nationalities.${key}`))}</button>`);
    btn.addEventListener("click", async () => {
      sunday.nationality = key;
      await host.persistSunday("sunday-situation");
      host.render();
    });
    body.append(btn);
  });
  const months = el(`
    <label class="field">${ex(t(host, "monthsLeft"))}
      <input id="months" inputmode="numeric" maxlength="3" placeholder="${ex(t(host, "monthsLeftPh"))}" value="${ex(sunday.monthsLeft || "")}" />
    </label>
  `);
  body.append(months);
  body.append(el(`<p class="tiny">${ex(t(host, "whoKnows"))}</p>`));
  WHO_KNOWS.forEach((key) => {
    const btn = el(`<button class="${choiceClass(sunday.whoKnows === key)}" type="button">${ex(t(host, `whoKnowsOpts.${key}`))}</button>`);
    btn.addEventListener("click", async () => {
      sunday.whoKnows = key;
      await host.persistSunday("sunday-situation");
      host.render();
    });
    body.append(btn);
  });
  body.append(el(`<p class="tiny">${ex(t(host, "meetingGoal"))}</p>`));
  GOALS.forEach((key) => {
    const on = sunday.goals.includes(key);
    const btn = el(`<button class="${choiceClass(on)}" type="button">${ex(t(host, `goals.${key}`))}</button>`);
    btn.addEventListener("click", async () => {
      const set = new Set(sunday.goals);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      sunday.goals = GOALS.filter((g) => set.has(g));
      await host.persistSunday("sunday-situation");
      host.render();
    });
    body.append(btn);
  });
  const back = hasCrisisFlags(sunday.flags) ? "sunday-crisis" : "sunday-triage";
  const next = el(`<button class="btn btn-primary" type="button">${ex(t(host, "continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="${back}" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);
  months.querySelector("#months").addEventListener("input", async (e) => {
    sunday.monthsLeft = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
    await host.persistSunday("sunday-situation");
  });
  next.addEventListener("click", async () => {
    if (!sunday.nationality) {
      host.setNotice(t(host, "needNationality"));
      host.render();
      return;
    }
    if (!sunday.whoKnows) {
      host.setNotice(t(host, "needWhoKnows"));
      host.render();
      return;
    }
    if (!sunday.goals.length) {
      host.setNotice(t(host, "needGoal"));
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

  const persist = async () => {
    sunday.split = {
      bills: form.querySelector("#bills").value.replace(/[^\d]/g, "").slice(0, 3),
      allowance: form.querySelector("#allowance").value.replace(/[^\d]/g, "").slice(0, 3),
      keep: form.querySelector("#keep").value.replace(/[^\d]/g, "").slice(0, 3),
    };
    sunday.splitNote = form.querySelector("#note").value.slice(0, 200);
    const n = splitTotal(sunday.split);
    form.querySelector("#total").textContent = t(host, "splitTotal", { n: n == null ? "—" : String(n) });
    await host.persistSunday("sunday-split");
  };
  ["bills", "allowance", "keep", "note"].forEach((id) => {
    form.querySelector(`#${id}`).addEventListener("input", persist);
  });
  next.addEventListener("click", async () => {
    await persist();
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
  const copy = doorCopy(host, door);
  const body = el(`<div class="stack"><h1>${ex(t(host, "doorTitle"))}</h1><p class="hint">${ex(t(host, "doorLead"))}</p><h2>${ex(copy.title)}</h2><p>${ex(copy.body)}</p></div>`);

  if (door === SUNDAY_DOORS.PASSPORT || door === SUNDAY_DOORS.SHARK) {
    body.append(el(telBtn(POLICE.phoneHref, ex(t(host, "call999")))));
    body.append(el(telBtn(HELP.phoneHref, ex(t(host, "callHelp", { phone: HELP.phone })))));
    body.append(el(linkBtn(HELP.whatsappHref, ex(t(host, "waHelp", { phone: HELP.whatsapp })))));
    body.append(el(linkBtn(HELP.site, ex(t(host, "helpSite")))));
  }
  if (door === SUNDAY_DOORS.PASSPORT || door === SUNDAY_DOORS.AGENCY) {
    consulateLinks(host, sunday.nationality).forEach((n) => body.append(n));
  }
  if (door === SUNDAY_DOORS.AGENCY) {
    body.append(el(telBtn(LABOUR_FDH.phoneHref, ex(t(host, "callLabour", { phone: LABOUR_FDH.phone })))));
  }
  if (door === SUNDAY_DOORS.ENRICH || door === SUNDAY_DOORS.SHARK) {
    const cta = el(`
      <div class="card cta-box stack">
        <strong>${ex(t(host, "doors.enrichTitle"))}</strong>
        <a class="btn btn-primary ext" href="${ENRICH.booking}" target="_blank" rel="noopener">${ex(t(host, "openEnrich"))}</a>
        <p class="tiny">${ex(t(host, "weDoNotEmailEnrich"))}</p>
        <a class="link" href="${ENRICH.whatsappEnTlHref}" target="_blank" rel="noopener">${ex(t(host, "enrichWaEn", { phone: ENRICH.whatsappEnTl }))}</a>
        <a class="link" href="${ENRICH.whatsappIdHref}" target="_blank" rel="noopener">${ex(t(host, "enrichWaId", { phone: ENRICH.whatsappId }))}</a>
        <p class="tiny">${ex(t(host, "enrichNoLend"))}</p>
      </div>
    `);
    body.append(cta);
  } else {
    body.append(
      el(
        `<p class="tiny">${ex(t(host, "weDoNotEmailEnrich"))}</p>`,
      ),
    );
  }

  body.append(
    el(
      `<p class="tiny">${ex(t(host, "alsoAvailable"))} <a class="link" href="${CARITAS.phoneHref}">${ex(t(host, "caritas", { phone: CARITAS.phone }))}</a> · <a class="link" href="${TWGH_FDCC.phoneHref}">${ex(t(host, "twgh", { phone: TWGH_FDCC.phone }))}</a></p>`,
    ),
  );
  const next = el(`<button class="btn btn-accent" type="button">${ex(t(host, "generateSecondary"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  const back = sunday.split && (sunday.split.bills !== "" || hasCrisisFlags(sunday.flags)) ? "sunday-split" : "sunday-crisis";
  box.append(next, el(`<button class="btn btn-ghost" data-go="${back}" type="button">${ex(t(host, "back"))}</button>`));
  body.append(box);
  host.shellSunday(body);
  next.addEventListener("click", async () => {
    await host.persistSunday("sunday-review");
    await host.log("sunday_pack_created");
    host.go("sunday-review");
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
  const { el, escapeHtml: ex } = host;
  const body = el(`<div class="stack"><h1>${ex(t(host, "doneTitle"))}</h1><p class="lede">${ex(t(host, "doneLead"))}</p></div>`);
  body.append(
    el(`<div class="card"><p>${ex(t(host, "doneCheck1"))}</p></div>`),
    el(`<div class="card"><p>${ex(t(host, "doneCheck2"))}</p></div>`),
    el(`<div class="card"><p>${ex(t(host, "doneCheck3"))}</p></div>`),
    el(`<a class="btn btn-primary ext" href="${ENRICH.booking}" target="_blank" rel="noopener">${ex(t(host, "openEnrich"))}</a>`),
    el(`<p class="tiny">${ex(t(host, "weDoNotEmailEnrich"))}</p>`),
  );
  const clear = el(`<button class="btn" type="button">${ex(t(host, "clearPack"))}</button>`);
  const chooser = el(`<button class="btn btn-ghost" data-go="chooser" type="button">${ex(t(host, "backChooser"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(clear, chooser);
  body.append(box);
  host.shellSunday(body);
  clear.addEventListener("click", () => host.clearSunday());
}
