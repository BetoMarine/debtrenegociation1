import { escapeHtml } from "../../dom.js";
import { present } from "./flow.js";

const ROUTE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`;

const EXIT_ICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const LOCK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;

function exitButton() {
  return `<button class="ft-icon ft-exit" type="button" data-act="exit" aria-label="Quick exit">${EXIT_ICON}<span>Exit</span></button>`;
}

function topbar(view) {
  const left = view.brand
    ? `<span class="ft-brand">${ROUTE_ICON}<span>Fortune Teller</span></span>`
    : `<button class="ft-icon ft-back" type="button" data-act="back" aria-label="Back"><span aria-hidden="true">‹</span></button>`;
  const chip = view.chip ? `<span class="ft-chip">${escapeHtml(view.chip)}</span>` : "";
  return `<header class="ft-top">${left}<div class="ft-chip-slot">${chip}</div><div class="ft-top-end">${exitButton()}</div></header>`;
}

function choices(view) {
  return view.choices
    .map((item) => {
      const locked = item.locked ? " is-locked" : "";
      const sub = item.sub ? `<span class="ft-sub">${escapeHtml(item.sub)}</span>` : "";
      const tail = item.locked
        ? `<span class="ft-lock-ico">${LOCK_ICON}</span>`
        : `<b aria-hidden="true">›</b>`;
      const act =
        view.id === "w0"
          ? "pick-entry"
          : view.id === "f0"
            ? "pick-fix"
            : view.id === "s0"
              ? "pick-cushion"
              : "pick-grow";
      return `<button class="ft-choice${locked}" type="button" data-act="${act}" data-value="${escapeHtml(item.id)}"><span class="ft-choice-label">${escapeHtml(item.label)}${sub}</span>${tail}</button>`;
    })
    .join("");
}

function inputBlock(view) {
  const field = view.input;
  const money = field.mode === "money";
  const prefix = money ? `<span class="ft-cur">HK$</span>` : "";
  const amountMode = money ? "decimal" : "numeric";
  const amountName = money ? "amount" : "days";
  const required = view.showRequired
    ? `<p class="ft-required" role="alert">${escapeHtml(view.requiredHint)}</p>`
    : "";
  return `<label class="ft-label" for="ft-amount">${escapeHtml(field.label)}</label>
    <div class="ft-input">
      ${prefix}<input id="ft-amount" name="${amountName}" data-field="${amountName}" data-key="${escapeHtml(field.key)}" inputmode="${amountMode}" autocomplete="off" enterkeyhint="done" maxlength="${money ? "16" : "5"}" placeholder="Tap to enter" value="${escapeHtml(field.amount)}" aria-label="${escapeHtml(field.label)}" />
    </div>
    ${required}
    <label class="ft-label" for="ft-note">Note</label>
    <div class="ft-input is-optional">
      <input id="ft-note" name="note" data-field="note" data-key="${escapeHtml(field.key)}" autocomplete="off" maxlength="280" placeholder="Optional" value="${escapeHtml(field.note)}" aria-label="Note (optional)" />
    </div>`;
}

function content(view) {
  const infoBtn = view.info
    ? `<button class="ft-info" type="button" data-act="info" aria-label="Why?" aria-expanded="${view.infoOpen ? "true" : "false"}" aria-controls="ft-why">i</button>`
    : "";
  const why =
    view.info && view.infoOpen
      ? `<p class="ft-why" id="ft-why">${escapeHtml(view.info)}</p>`
      : view.info
        ? `<p class="ft-why" id="ft-why" hidden></p>`
        : "";
  let main = "";
  if (view.kind === "choices") main = `<div class="ft-choices">${choices(view)}</div>`;
  if (view.kind === "input") main = inputBlock(view);
  if (view.kind === "locked" && view.lockTitle) {
    main = `<div class="ft-lockrow">${LOCK_ICON}<div><b>${escapeHtml(view.lockTitle)}</b><span>${escapeHtml(view.lockBody)}</span></div></div>`;
  }
  return `<div class="ft-content"><h1>${escapeHtml(view.title)}${infoBtn}</h1><p class="ft-body">${escapeHtml(view.body)}</p>${why}${main}</div>`;
}

function rdNote(view) {
  if (!view.rdLater) return "";
  return `<p class="ft-rd-note">Live Right Door handoff comes later.</p>`;
}

function actions(view) {
  const parts = [];
  if (view.rdLater) parts.push(rdNote(view));
  if (view.primary && view.id !== "e1") {
    parts.push(
      `<button class="ft-btn primary" type="button" data-act="continue">${escapeHtml(view.primary)}</button>`,
    );
  }
  if (view.id === "e1" && view.primary) {
    parts.push(
      `<button class="ft-btn primary" type="button" data-act="erase-ok">${escapeHtml(view.primary)}</button>`,
    );
  }
  if (view.quiet && view.id === "w0") {
    parts.push(
      `<button class="ft-btn quiet" type="button" data-act="open-erase">${escapeHtml(view.quiet)}</button>`,
    );
  } else if (view.quiet) {
    parts.push(
      `<button class="ft-btn quiet" type="button" data-act="back">${escapeHtml(view.quiet)}</button>`,
    );
  }
  if (!parts.length) return `<div class="ft-actions"></div>`;
  return `<div class="ft-actions">${parts.join("")}</div>`;
}

function sheet(view) {
  return `<div class="ft-scrim" data-act="cancel-erase"></div>
    <div class="ft-sheet" role="dialog" aria-modal="true" aria-labelledby="ft-erase-title">
      <div class="ft-grab"></div>
      <h1 id="ft-erase-title">${escapeHtml(view.title)}</h1>
      <p class="ft-body">${escapeHtml(view.body)}</p>
      <button class="ft-btn danger" type="button" data-act="confirm-erase">${escapeHtml(view.danger)}</button>
      <button class="ft-btn quiet" type="button" data-act="cancel-erase">${escapeHtml(view.quiet)}</button>
    </div>`;
}

function screenHtml(view) {
  return `${topbar(view)}${content(view)}${actions(view)}`;
}

export function renderFirstBuild(state) {
  const view = present(state);
  if (state.screen === "e0") {
    const under = present({ ...state, screen: "w0", infoOpen: false });
    return `<div class="ft-app"><div class="ft-screen" data-screen="e0" data-frame="${escapeHtml(view.frame)}">${topbar(view)}<div class="ft-under" inert>${content(under)}</div>${sheet(view)}</div></div>`;
  }
  return `<div class="ft-app"><div class="ft-screen" data-screen="${escapeHtml(view.id)}" data-frame="${escapeHtml(view.frame)}">${screenHtml(view)}</div></div>`;
}
