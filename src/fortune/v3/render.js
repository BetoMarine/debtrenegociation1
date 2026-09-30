import { el, escapeHtml } from "../../dom.js";
import { HKMA_DEBT_URL, hostCopy } from "../../shared/ft-host-copy.js";
import { stageWord } from "../../shared/stage-words.js";
import { pylWordmarkHtml } from "../../pyl-brand.js";
import { v3 } from "./copy.js";
import {
  RD_SCREENS,
  addYm,
  ROOT_SCREENS,
  buttonLabel,
  counsellingOn,
  documentReason,
  docsComplete,
  formatMonth,
  mapAction,
  noDestination,
  orphanedImport,
  otherRoute,
  rowStatus,
  stageForScreen,
  stickyMidFix,
} from "./flow.js";
import { INVEST_CARDS, badYearLossPercent } from "./invest.js";
import { fortuneLetterText } from "../rd-host.js";
import { stabilizeSnapshot } from "../stabilize.js";

const EYE = `<svg class="v3-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 4l18 16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

const INFO = `<svg class="v3-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 8h.01" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;

function btn(label, act, extra = "") {
  return `<button class="v3-primary" type="button" data-act="${act}" ${extra}>${escapeHtml(label)}</button>`;
}

function quiet(label, act, extra = "") {
  return `<button class="v3-quiet" type="button" data-act="${act}" ${extra}>${escapeHtml(label)}</button>`;
}

function infoBtn(id) {
  return `<button class="v3-info" type="button" data-act="info" data-id="${id}" aria-label="${escapeHtml(v3("why"))}">${INFO}</button>`;
}

function chrome(state) {
  const back = !ROOT_SCREENS.has(state.screen);
  const lang = RD_SCREENS.has(state.screen);
  const exitWord = lang && state.lang === "zh" ? v3("exitZh") : v3("exit");
  const stageId = stageForScreen(state.screen);
  const stage = stageId ? stageWord("en", stageId) : "";
  const top = el(`<header class="v3-top"></header>`);
  top.append(
    el(
      `<button class="v3-exit" type="button" data-act="exit" aria-label="${escapeHtml(v3("exitAria"))}">${EYE}<span>${escapeHtml(exitWord)}</span></button>`,
    ),
  );
  if (back) {
    top.append(el(`<button class="v3-back" type="button" data-act="back" aria-label="${escapeHtml(v3("backAria"))}">‹</button>`));
  } else if (state.screen !== "cover") {
    top.append(el(`<div class="v3-brand">${pylWordmarkHtml()}</div>`));
  } else {
    top.append(el(`<div class="v3-brand">${pylWordmarkHtml()}</div>`));
  }
  if (lang) {
    top.append(
      el(
        `<button class="v3-lang" type="button" data-act="lang" lang="zh-HK" aria-label="${escapeHtml(v3("langAria"))}">${state.lang === "zh" ? "EN" : "中"}</button>`,
      ),
    );
  }
  const wrap = el(`<div class="v3-chrome"></div>`);
  wrap.append(top);
  if (stage) {
    wrap.append(
      el(
        `<button class="v3-stage" type="button" data-act="home" data-stage-line aria-label="${escapeHtml(`${stage}, ${v3("backPath")}`)}"><span class="v3-path" aria-hidden="true"></span>${escapeHtml(stage)}</button>`,
      ),
    );
  }
  return wrap;
}

function h1(text, infoId) {
  return `<h1 class="v3-h1">${escapeHtml(text)}${infoId ? infoBtn(infoId) : ""}</h1>`;
}

function tel(label) {
  return `<a class="v3-tel" href="tel:+85231610102">${escapeHtml(label)}</a><p class="v3-tiny">${escapeHtml(hostCopy("en", "notAffiliated"))}</p>`;
}

function screen01() {
  return `<div class="v3-stack">${h1(v3("s01Title"))}<p class="v3-body">${escapeHtml(v3("s01Body"))}</p>
    ${btn(v3("s01Bank"), "answer", `data-id="bank"`)}
    ${btn(v3("s01NotBank"), "answer", `data-id="not-bank"`)}
    ${btn(v3("s01Managing"), "answer", `data-id="managing"`)}</div>`;
}

function screenReason(state) {
  const lang = state.lang;
  const keys = ["job_ended", "hours_cut", "will_miss", "already_missed"];
  const choices = keys
    .map((id) => `<button class="v3-choice" type="button" data-act="reason" data-id="${id}">${escapeHtml(hostCopy(lang, `reasons.${id}`))}</button>`)
    .join("");
  return `<div class="v3-stack">${h1(hostCopy(lang, "reasonTitle"))}<p class="v3-body">${escapeHtml(hostCopy(lang, "reasonHint"))}</p>${choices}</div>`;
}

function screenLenders(state) {
  const lang = state.lang;
  return `<div class="v3-stack">${h1(hostCopy(lang, "creditorsTitle"), "lenders")}<p class="v3-body">${escapeHtml(hostCopy(lang, "creditorsHint"))}</p>
    ${btn(hostCopy(lang, "lenderOne"), "lenders", `data-count="1"`)}
    ${btn(hostCopy(lang, "lenderMany"), "lenders", `data-count="2"`)}</div>`;
}

function screenSituation(state) {
  const lang = state.lang;
  const tenor = String(state.rd.tenorMonths || "6");
  const radios = ["3", "6", "9", "12"]
    .map((n) => {
      const checked = tenor === n ? "checked" : "";
      return `<label class="v3-radio"><input type="radio" name="tenor" value="${n}" ${checked} aria-label="${n} months" /><span aria-hidden="true">${n}</span></label>`;
    })
    .join("");
  return `<div class="v3-stack">${h1(hostCopy(lang, "situationTitle"))}<p class="v3-body">${escapeHtml(hostCopy(lang, "situationHint"))}</p>
    <label class="v3-field">${escapeHtml(hostCopy(lang, "fullName"))}<input id="v3-name" maxlength="80" value="${escapeHtml(state.rd.fullName || "")}" /></label>
    <p class="v3-label" id="v3-tenor-label">${escapeHtml(hostCopy(lang, "tenor"))} ${infoBtn("honesty")}</p>
    <div class="v3-radios" role="radiogroup" aria-labelledby="v3-tenor-label">${radios}</div>
    <p class="v3-body">${escapeHtml(hostCopy(lang, "creditShort"))}</p>
    ${btn(hostCopy(lang, "continue"), "continue-situation")}
    ${quiet(hostCopy(lang, "seeLetter"), "open-letter")}</div>`;
}

function screenDoor(state) {
  const lang = state.lang;
  const many = Number(state.ui.lenderCount) !== 1 && state.ui.askedRoute !== "hardship";
  const title = many ? hostCopy(lang, "doorIdrpTitle") : hostCopy(lang, "doorOtherTitle");
  const body = many ? hostCopy(lang, "doorIdrpBody") : hostCopy(lang, "doorOtherBody");
  const info = many ? infoBtn("idrp") : "";
  return `<div class="v3-stack">${h1(hostCopy(lang, "doorTitle"))}<h2 class="v3-h2">${escapeHtml(title)} ${info}</h2><p class="v3-body">${escapeHtml(body)}</p>
    ${btn(hostCopy(lang, "showScript"), "show-script")}
    ${tel(hostCopy(lang, "collectorLine"))}</div>`;
}

function screenSay(state) {
  const lang = state.lang;
  const hardship = state.ui.askedRoute === "hardship" || Number(state.ui.lenderCount) === 1;
  const say = hardship ? hostCopy(lang, "doorOtherSay") : hostCopy(lang, "doorIdrpSay");
  return `<div class="v3-stack">${h1(hostCopy(lang, "sayTitle"))}<p class="v3-body">${escapeHtml(say)}</p><p class="v3-body">${escapeHtml(hostCopy(lang, "youSend"))}</p>
    ${btn(hostCopy(lang, "nextDocuments"), "next-docs")}</div>`;
}

function screenDocs(state) {
  const lang = state.lang;
  const reason = documentReason(state.rd);
  const ready = docsComplete(state.rd);
  const rows = [
    ["hardship_proof", "docs.hardship_proof", state.rd.proof],
    ["bank_statements", "docs.bank_statements", state.rd.statements],
    ["identity", "docs.identity", state.rd.identity],
    ["other", "docs.other", state.rd.other],
  ]
    .map(([key, copyKey, have]) => {
      return `<div class="v3-doc"><div><strong>${escapeHtml(hostCopy(lang, copyKey))}</strong>${have ? `<p class="v3-tiny">${have}</p>` : ""}</div>
        <label class="v3-add">${escapeHtml(hostCopy(lang, "addPhoto"))}<input class="v3-file" data-doc="${key}" type="file" accept="image/*" multiple /></label></div>`;
    })
    .join("");
  const described = reason ? `aria-describedby="v3-docs-reason"` : "";
  return `<div class="v3-stack">${h1(hostCopy(lang, "docsTitle"), "docs")}<p class="v3-body">${escapeHtml(hostCopy(lang, "docsHint"))}</p>${rows}
    ${reason ? `<p class="v3-reason" id="v3-docs-reason">${escapeHtml(reason)}</p>` : ""}
    <button class="v3-primary${ready ? "" : " is-off"}" type="button" data-act="next-letter-ready" aria-disabled="${ready ? "false" : "true"}" ${described}>${escapeHtml(hostCopy(lang, "nextLetter"))}</button></div>`;
}

function screenLetter(state) {
  const lang = state.lang;
  const text = fortuneLetterText({ ...state.rd, askedRoute: state.ui.askedRoute === "hardship" || Number(state.ui.lenderCount) === 1 ? "hardship" : "idrp" });
  return `<div class="v3-stack">${h1(hostCopy(lang, "letterReadyTitle"))}<p class="v3-body">${escapeHtml(hostCopy(lang, "letterReadyBody"))}</p>
    <pre class="v3-letter">${escapeHtml(text)}</pre>
    ${btn(hostCopy(lang, "sharePdf"), "share-pdf")}
    ${quiet(hostCopy(lang, "continue"), "finish-month")}
    <p class="v3-tiny">${escapeHtml(hostCopy(lang, "complianceLender"))}</p></div>`;
}

function screenEditLetter(state) {
  const text = fortuneLetterText({ ...state.rd, askedRoute: state.ui.askedRoute === "hardship" ? "hardship" : "idrp" });
  const value = state.rd.letterTouched ? state.rd.letter : text;
  return `<div class="v3-stack">${h1(v3("letterTitle"))}<textarea id="v3-letter" rows="12">${escapeHtml(value)}</textarea>${btn(hostCopy(state.lang, "continue"), "continue-situation")}</div>`;
}

function screenNo(state) {
  const lang = state.lang;
  const dest = noDestination(state.ui);
  const primaryCaritas = state.screen === "n1b" || dest.caritasPrimary || state.ui.caritasPrimary;
  const offer = otherRoute(state.ui.askedRoute || "idrp");
  const title = offer === "idrp" ? hostCopy(lang, "doorIdrpTitle") : hostCopy(lang, "doorOtherTitle");
  const body = offer === "idrp" ? hostCopy(lang, "doorIdrpBody") : hostCopy(lang, "doorOtherBody");
  if (primaryCaritas) {
    return `<div class="v3-stack">${h1(hostCopy(lang, "n1Title"))}${tel(hostCopy(lang, "caritas"))}${quiet(hostCopy(lang, "backPath"), "home")}</div>`;
  }
  return `<div class="v3-stack">${h1(hostCopy(lang, "n1Title"))}<h2 class="v3-h2">${escapeHtml(title)}</h2><p class="v3-body">${escapeHtml(body)}</p>
    ${btn(hostCopy(lang, "showScript"), "other-way")}${tel(hostCopy(lang, "caritas"))}</div>`;
}

function rangeLabel(plan) {
  const start = plan.stage1?.startMonth;
  const tenor = Number(plan.stage1?.tenorMonths || 0);
  if (!start || !tenor) return "";
  const end = addYm(start, tenor - 1);
  return `${formatMonth(start)} → ${formatMonth(end)}`;
}

function screenMap(state) {
  const plan = state.plan;
  const action = mapAction(plan, state.ui);
  const rows = ["fix", "stabilize", "plan", "invest"]
    .map((id) => {
      const status = rowStatus(id, plan);
      const name = stageWord("en", id);
      let badge = "";
      if (status === "here") badge = v3("youAreHere");
      else if (status === "done") badge = "✓";
      else if (status === "progress") badge = v3("inProgress");
      else if (status === "locked") badge = v3("lockedGrow");
      const act = status === "here" ? "map-go" : status === "done" || status === "progress" ? "toggle-reveal" : "";
      return `<button class="v3-row is-${status}" type="button" ${act ? `data-act="${act}"` : "disabled"} data-stage="${id}"><span>${escapeHtml(name)}</span><span class="v3-badge">${escapeHtml(badge)}</span></button>`;
    })
    .join("");
  let reveal = "";
  if (state.revealed) {
    const route = plan.stage1?.route;
    const bits = [];
    if (route === "no-bank-debt" || route === "managing") bits.push(`<p>${escapeHtml(v3("noBankRevealed"))}</p>`);
    else if (plan.stage1?.status === "asked" || plan.stage1?.status === "agreed") {
      const label = plan.stage1.status === "agreed" ? v3("agreed", { range: rangeLabel(plan) }) : v3("askedFor", { range: rangeLabel(plan) });
      bits.push(`<p>${escapeHtml(label)}</p>`);
      if (plan.stage1.source === "rd-export" || plan.stage1.source === "code") {
        bits.push(`<p class="v3-tiny">${escapeHtml(v3("fromRightDoor", { date: formatMonth(plan.stage1.importedAt) }))}</p>`);
      }
      if (plan.stage1.status === "asked") {
        bits.push(`<p class="v3-row-actions">${quiet(v3("changeDates"), "open-dates")}${quiet(v3("theySaidNo"), "they-said-no")}</p>`);
        bits.push(quiet(v3("markAgreed"), "mark-agreed"));
      }
      if (plan.stage1.source === "rd-export" || plan.stage1.source === "code") bits.push(quiet(v3("bringAgain"), "ask-bring"));
    }
    if (plan.cushionBuiltAt) bits.push(`<p>${escapeHtml(v3("cushionBuilt", { month: formatMonth(plan.cushionBuiltAt) }))}</p>`);
    else if (plan.cushionStartedAt) {
      const reach = stabilizeSnapshot(plan).reach;
      const end = reach?.label || formatMonth(addYm(plan.cushionStartedAt, Number(plan.stabilizeTargetMonths) === 3 ? 2 : 5));
      const saved = Number.isFinite(Number(plan.net?.currentHkd)) ? plan.net.currentHkd : "";
      bits.push(`<p>${escapeHtml(v3("cushionRange", { start: formatMonth(plan.cushionStartedAt), end }))}</p>`);
      bits.push(`<label class="v3-field">${escapeHtml(v3("savingsLabel"))}<input id="v3-savings" inputmode="numeric" value="${escapeHtml(saved)}" /></label>`);
      bits.push(quiet(v3("updateSavings"), "save-savings"));
    }
    reveal = `<div class="v3-reveal" tabindex="-1">${bits.join("")}</div>`;
  }
  const lineKey = state.ui.transition;
  const line = lineKey === "month" ? v3("transitionMonth") : lineKey === "import" ? v3("transitionImport") : lineKey === "cushion" ? v3("transitionCushion") : lineKey === "pinned" ? v3("transitionPinned") : lineKey === "built" ? v3("transitionBuilt") : "";
  const primary = action.kind === "none" ? "" : btn(buttonLabel(action.kind, action.stage), "map-go");
  const changed = plan.cushionBuiltAt ? quiet(v3("somethingChanged"), "redo") : "";
  const canClear = stickyMidFix(plan, state.ui) || orphanedImport(plan, state.foundExport);
  const startClear = canClear ? quiet(v3("choice.clear"), "start-clear") : "";
  const mixes = plan.cushionBuiltAt ? quiet(v3("mixesQuiet"), "open-cards") : "";
  const used = state.standalone || state.foundExport ? quiet(v3("a2.used"), "used-already") : "";
  return `<div class="v3-stack"><h1 class="v3-h1">${escapeHtml(v3("yourPath"))}</h1><p class="v3-body">${escapeHtml(v3("oneStep"))}</p>${rows}${reveal}${line ? `<p class="v3-body">${escapeHtml(line)}</p>` : ""}${primary}${startClear}${changed}${mixes}${used}</div>`;
}

function screenCushion(state) {
  const line = counsellingOn(state.plan, state.ui) ? tel(hostCopy(state.lang, "caritas")) : "";
  return `<div class="v3-stack">${h1(v3("cushionTitle"), "cushion")}
    ${btn(v3("cushion3"), "cushion", `data-months="3"`)}
    ${btn(v3("cushion6"), "cushion", `data-months="6"`)}
    ${line}</div>`;
}

function screenPlan() {
  const ids = [
    ["place", "goalPlace"],
    ["skills", "goalSkills"],
    ["family", "goalFamily"],
    ["own", "goalOwn"],
  ];
  return `<div class="v3-stack">${h1(v3("planTitle"))}${ids.map(([id, key]) => `<button class="v3-choice" type="button" data-act="goal" data-id="${id}">${escapeHtml(v3(key))}</button>`).join("")}</div>`;
}

function screenGoal(state) {
  const names = { place: v3("goalPlace"), skills: v3("goalSkills"), family: v3("goalFamily"), own: v3("goalOwn") };
  const name = names[state.ui.goalChoice] || v3("goalOwn");
  const when = formatMonth(addYm(new Date().toISOString().slice(0, 7), Number(state.ui.goalMonths || 12) - 1));
  const chance = state.ui.goalChance == null ? "" : `<p class="v3-body">${escapeHtml(v3("chance", { n: state.ui.goalChance }))} ${infoBtn("chance")}</p>`;
  return `<div class="v3-stack">${h1(`${name}`)}<p class="v3-body">${escapeHtml(when)}</p>
    <label class="v3-field">${escapeHtml(v3("amountLabel"))}<input id="v3-amount" inputmode="numeric" value="${escapeHtml(state.ui.goalAmount || "")}" /></label>
    ${chance}
    ${btn(v3("pin"), "pin")}
    ${quiet(v3("delay"), "delay-goal")}</div>`;
}

function screenGrow(state) {
  const pinned = (state.plan.milestones || []).find((m) => m.pinned);
  const name = pinned?.name || v3("goalOwn");
  const amount = pinned ? `HK$${Number(pinned.amount || 0).toLocaleString("en-HK")}` : "";
  const when = pinned ? formatMonth(addYm(new Date().toISOString().slice(0, 7), Number(pinned.months || 1) - 1)) : "";
  return `<div class="v3-stack">${h1(name)}<p class="v3-body">${escapeHtml(amount)}</p><p class="v3-h2">${escapeHtml(when)} ${infoBtn("grow")}</p>
    ${btn(v3("backPath"), "home")}</div>`;
}

function screenCards(state) {
  const cards = INVEST_CARDS.map((card) => {
    const loss = badYearLossPercent(card.mu, card.swing);
    const picked = state.ui.pickedCard === card.id;
    return `<article class="v3-card${picked ? " is-on" : ""}"><h2>${escapeHtml(card.label)}</h2>
      <p>${escapeHtml(v3("perYear", { n: Math.round(card.mu * 100) }))}</p>
      <p>${escapeHtml(v3("badYear", { n: loss }))}</p>
      <p class="v3-tiny">${escapeHtml(v3(card.noteKey))}</p>
      <button class="v3-choice" type="button" data-act="pick-card" data-id="${card.id}" aria-pressed="${picked ? "true" : "false"}">${escapeHtml(v3("useMix"))}</button></article>`;
  }).join("");
  return `<div class="v3-stack">${h1(v3("cardsTitle"))}<p class="v3-body">${escapeHtml(v3("cardsLead"))}</p>${cards}${btn(v3("backPath"), "home")}</div>`;
}

function screenDates(state) {
  const tenor = Number(state.plan.stage1?.tenorMonths || 6);
  const options = [3, 6, 9, 12]
    .map((n) => `<option value="${n}" ${tenor === n ? "selected" : ""}>${n}</option>`)
    .join("");
  return `<div class="v3-stack">${h1(v3("datesTitle"))}
    <label class="v3-field">${escapeHtml(v3("startMonth"))}<input id="v3-start" type="month" value="${escapeHtml(state.plan.stage1?.startMonth || "")}" /></label>
    <label class="v3-field">${escapeHtml(hostCopy("en", "tenor"))}<select id="v3-tenor">${options}</select></label>
    ${btn(v3("saveDates"), "save-dates")}</div>`;
}

function screenA2() {
  return `<div class="v3-stack">${h1(v3("a2.title"))}${btn(v3("a2.bring"), "bring")}${quiet(v3("a2.fresh"), "fresh")}</div>`;
}

function screenChoice(state) {
  const orphan = orphanedImport(state.plan, state.foundExport);
  const title = orphan ? v3("a2.orphanTitle") : v3("choice.title");
  const body = orphan ? v3("a2.orphanBody") : v3("choice.body");
  return `<div class="v3-stack" data-choice="${orphan ? "orphan" : "mid"}">${h1(title)}<p class="v3-body">${escapeHtml(body)}</p>${btn(v3("choice.keep"), "keep-plan")}${quiet(v3("choice.clear"), "start-clear")}</div>`;
}

function screenCode(state) {
  const errKey = state.codeError === "version" ? "a2.codeVersion" : state.codeError === "length" ? "a2.codeLength" : state.codeError ? "a2.codeCheck" : "";
  return `<div class="v3-stack">${h1(v3("a2.codeTitle"))}
    <label class="v3-field">${escapeHtml(v3("a2.codeTitle"))}<input id="v3-code" maxlength="8" value="${escapeHtml(state.codeDraft || "")}" autocomplete="off" /></label>
    ${errKey ? `<p class="v3-reason">${escapeHtml(v3(errKey))}</p>` : ""}
    ${btn(v3("continue"), "code-submit")}</div>`;
}

function screenCover(state) {
  const hint = state.ui.coverHintSeen ? "" : `<p class="v3-tiny">${escapeHtml(v3("coverHint"))}</p>`;
  return `<div class="v3-stack"><h1 class="v3-h1">${escapeHtml(v3("brand"))}</h1><p class="v3-body">${escapeHtml(v3("coverLead"))}</p>${hint}
    ${btn(v3("continue"), "cover-continue")}${quiet(v3("erase.link"), "ask-erase")}</div>`;
}

function screenE1() {
  return `<div class="v3-stack">${h1(v3("e1.title"))}<p class="v3-body">${escapeHtml(v3("e1.body"))}</p>${btn(v3("e1.ok"), "e1-ok")}</div>`;
}

function main(state) {
  switch (state.screen) {
    case "cover":
      return screenCover(state);
    case "map":
      return screenMap(state);
    case "a2":
      return screenA2();
    case "choice":
      return screenChoice(state);
    case "code":
      return screenCode(state);
    case "s01":
      return screen01();
    case "s01a":
      return screenReason(state);
    case "s01b":
      return screenLenders(state);
    case "s01c":
      return screenSituation(state);
    case "letter":
      return screenEditLetter(state);
    case "s02":
      return screenDoor(state);
    case "s03":
      return screenSay(state);
    case "s03a":
      return screenDocs(state);
    case "s03b":
      return screenLetter(state);
    case "n1":
    case "n1b":
      return screenNo(state);
    case "s05":
      return screenCushion(state);
    case "s07":
      return screenPlan();
    case "s08":
      return screenGoal(state);
    case "s12":
      return screenGrow(state);
    case "cards":
      return screenCards(state);
    case "dates":
      return screenDates(state);
    case "e1":
      return screenE1();
    default:
      return screenMap(state);
  }
}

const INFO_TEXT = {
  lenders: () => hostCopy("en", "creditorsInfo"),
  honesty: () => hostCopy("en", "creditInfo"),
  idrp: () => hostCopy("en", "doorIdrpInfo"),
  docs: () => hostCopy("en", "docsInfo"),
  cushion: () => v3("cushionInfo"),
  chance: () => v3("chanceInfo"),
  grow: () => v3("growInfo"),
  "need-name": () => v3("needName"),
};

function sheet(state) {
  const kind = state.sheet?.type;
  if (kind === "info" || kind === "need-name") {
    const text = INFO_TEXT[state.sheet.id || "need-name"]?.() || "";
    const link =
      state.sheet.id === "idrp"
        ? `<button class="v3-quiet" type="button" data-act="leave" data-href="${escapeHtml(HKMA_DEBT_URL)}">${escapeHtml(hostCopy(state.lang, "hkmaLink"))}</button>`
        : "";
    return `<div class="v3-sheet" role="dialog"><p>${escapeHtml(text)}</p>${link}${btn(v3("continue"), "close-sheet")}</div>`;
  }
  if (kind === "leave") {
    return `<div class="v3-sheet" role="dialog">${h1(v3("leaving.title"))}<p class="v3-body">${escapeHtml(v3("leaving.body"))}</p>${btn(v3("leaving.go"), "confirm-leave")}${quiet(v3("leaving.stay"), "close-sheet")}</div>`;
  }
  if (kind === "erase") {
    return `<div class="v3-sheet" role="dialog">${h1(v3("erase.title"))}<p class="v3-body">${escapeHtml(v3("erase.body"))}</p>${btn(v3("erase.confirm"), "confirm-erase")}${quiet(v3("erase.stay"), "close-sheet")}</div>`;
  }
  if (kind === "bring") {
    return `<div class="v3-sheet" role="dialog"><p>${escapeHtml(v3("bringAgainBody"))}</p>${btn(v3("bringAgain"), "confirm-bring")}${quiet(v3("erase.stay"), "close-sheet")}</div>`;
  }
  if (kind === "status") {
    return `<div class="v3-sheet" role="dialog" aria-labelledby="v3-status-title"><h2 id="v3-status-title" class="v3-h2">${escapeHtml(v3("status.title"))}</h2>
      <p class="v3-status-line">${escapeHtml(v3("status.fortune"))}</p>
      <p class="v3-status-line">${escapeHtml(v3("status.invest"))}</p>
      <p class="v3-status-line">${escapeHtml(v3("status.door"))}</p>
      ${btn(v3("status.close"), "close-sheet")}</div>`;
  }
  return "";
}

function footer() {
  return `<footer class="v3-foot"><button class="v3-about" type="button" data-act="about">${escapeHtml(v3("about"))}</button></footer>`;
}

export function renderV3(state) {
  const root = el(`<div class="v3" data-screen="${escapeHtml(state.screen)}" lang="${state.lang === "zh" && RD_SCREENS.has(state.screen) ? "zh-HK" : "en"}"></div>`);
  root.append(chrome(state));
  const body = el(`<main class="v3-main">${main(state)}</main>`);
  root.append(body);
  root.append(el(footer()));
  if (state.sheet) root.append(el(sheet(state)));
  return root;
}
