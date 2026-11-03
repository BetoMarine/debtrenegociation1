import { escapeHtml } from "../../dom.js";
import { present } from "./flow.js";

const ROUTE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`;

const EXIT_ICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

function infoButton() {
  return `<button class="so-info" type="button" data-act="info" aria-label="More about this plan">i</button>`;
}

function topbar(view) {
  const left = view.brand
    ? `<span class="so-brand">${ROUTE_ICON}<span>Fortune Teller</span></span>`
    : `<button class="so-icon so-back" type="button" data-act="back" aria-label="Back"><span aria-hidden="true">\u2039</span></button>`;
  const chip = view.chip ? `<span class="so-chip">${escapeHtml(view.chip)}</span>` : "";
  const hasStrip = view.blocks.some((block) => block.type === "strip");
  const info = hasStrip ? "" : infoButton();
  return `<header class="so-top">${left}<div class="so-chip-slot">${chip}</div><div class="so-top-end">${info}<button class="so-icon so-exit" type="button" data-act="exit" aria-label="Quick exit">${EXIT_ICON}<span>Exit</span></button></div></header>`;
}

function action(item, quiet) {
  if (!item) return "";
  const tone = item.tone || (quiet ? "quiet" : "primary");
  const cls = `so-btn ${tone}`;
  if (item.href) {
    return `<a class="${cls}" href="${escapeHtml(item.href)}" data-act="${escapeHtml(item.act)}" data-value="${escapeHtml(item.value || "")}">${escapeHtml(item.label)}</a>`;
  }
  return `<button class="${cls}" type="button" data-act="${escapeHtml(item.act)}" data-value="${escapeHtml(item.value || "")}">${escapeHtml(item.label)}</button>`;
}

function dock(view) {
  if (!view.primary && !view.quiet) return "";
  return `<div class="so-dock">${action(view.primary, false)}${action(view.quiet, true)}</div>`;
}

function fields(block) {
  return block.items
    .map((field) => {
      const id = `so-${field.key}`;
      if (field.input === "area") {
        return `<div class="so-paste"><label for="${id}"><b>${escapeHtml(field.label)}</b></label><span>${escapeHtml(field.hint || "")}</span>
            <textarea id="${id}" data-field="${escapeHtml(field.key)}" rows="4" maxlength="2000">${escapeHtml(field.value)}</textarea>
          </div>`;
      }
      if (field.input === "date") {
        return `<label class="so-label" for="${id}">${escapeHtml(field.label)}</label>
          <p class="so-date-shown">${escapeHtml(field.shown || "")}</p>
          <div class="so-input">
            <input id="${id}" data-field="${escapeHtml(field.key)}" type="date" value="${escapeHtml(field.value)}" ${field.min ? `min="${escapeHtml(field.min)}"` : ""} aria-label="${escapeHtml(field.label)}" />
          </div>`;
      }
      if (field.input === "text") {
        return `<label class="so-label" for="${id}">${escapeHtml(field.label)}</label>
          <div class="so-input"><input id="${id}" data-field="${escapeHtml(field.key)}" type="text" maxlength="80" autocomplete="off" enterkeyhint="done" value="${escapeHtml(field.value)}" aria-label="${escapeHtml(field.label)}" /></div>`;
      }
      return `<label class="so-label" for="${id}">${escapeHtml(field.label)}</label>
        <div class="so-input"><span class="so-cur">HK$</span><input id="${id}" data-field="${escapeHtml(field.key)}" inputmode="decimal" autocomplete="off" enterkeyhint="done" maxlength="16" value="${escapeHtml(field.value)}" aria-label="${escapeHtml(field.label)}" /></div>`;
    })
    .join("");
}

function cards(block) {
  return block.items
    .map((card) => {
      const date = card.date ? `<span class="so-date ${escapeHtml(card.tone || "")}">${escapeHtml(card.date)}</span>` : "";
      const remove = card.remove
        ? `<button class="so-remove" type="button" data-act="remove-goal" data-value="${escapeHtml(card.remove)}">Remove</button>`
        : "";
      const inner = `${card.tag ? `<span class="so-tag ${escapeHtml(card.tone || "")}">${escapeHtml(card.tag)}</span>` : ""}<b>${escapeHtml(card.title)}</b><span class="so-copy">${escapeHtml(card.body || "")}</span>${date}${remove}`;
      if (card.href) {
        return `<a class="so-card ${escapeHtml(card.tone || "")}" href="${escapeHtml(card.href)}" data-act="${escapeHtml(card.act)}" data-value="${escapeHtml(card.value || "")}">${inner}</a>`;
      }
      if (card.act === "stay" || !card.act) {
        return `<div class="so-card ${escapeHtml(card.tone || "")}">${inner}</div>`;
      }
      return `<button class="so-card ${escapeHtml(card.tone || "")}" type="button" data-act="${escapeHtml(card.act)}" data-value="${escapeHtml(card.value || "")}">${inner}</button>`;
    })
    .join("");
}

function blockHtml(block) {
  switch (block.type) {
    case "kicker":
      return `<span class="so-kicker ${escapeHtml(block.tone || "")}">${escapeHtml(block.label)}</span>`;
    case "title":
      return `<h1>${escapeHtml(block.text)}</h1>`;
    case "body":
      return `<p class="so-body-copy">${escapeHtml(block.text)}</p>`;
    case "pills":
      return `<div class="so-pills">${block.items
        .map((item) => `<span class="so-pill ${escapeHtml(item.tone)}">${escapeHtml(item.label)}</span>`)
        .join("")}</div>`;
    case "fact":
      return `<div class="so-fact ${escapeHtml(block.tone || "")}"><b>${escapeHtml(block.title)}</b>${escapeHtml(block.body)}</div>`;
    case "steps":
      return `<ol class="so-steps">${block.items
        .map(
          (item) =>
            `<li><span class="so-num">${escapeHtml(item.n)}</span><span>${escapeHtml(item.title)}<small>${escapeHtml(item.sub)}</small></span></li>`,
        )
        .join("")}</ol>`;
    case "confirm":
      return `<div class="so-confirm ${escapeHtml(block.tone || "")}"><b>${escapeHtml(block.title)}</b><span>${escapeHtml(block.body)}</span></div>`;
    case "hint":
      return `<p class="so-hint">${escapeHtml(block.text)}</p>`;
    case "alert":
      return `<p class="so-alert" role="alert">${escapeHtml(block.text)}</p>`;
    case "choices":
      return `<div class="so-choices">${block.items
        .map(
          (item) =>
            `<button class="so-choice ${escapeHtml(item.tone || "")}${item.on ? " is-on" : ""}" type="button" data-act="choose" data-field="${escapeHtml(item.field)}" data-value="${escapeHtml(item.value)}" aria-pressed="${item.on ? "true" : "false"}"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.body || "")}</span></button>`,
        )
        .join("")}</div>`;
    case "fields":
      return fields(block);
    case "rows":
      return `<div class="so-rows">${block.items
        .map((row) => {
          const tone = row.tone ? ` ${row.tone}` : "";
          return `<div class="so-row${tone}"><span>${escapeHtml(row.label)}</span><b>${escapeHtml(row.value)}</b></div>`;
        })
        .join("")}</div>`;
    case "cards":
      return cards(block);
    case "timeline":
      return `<ul class="so-time">${block.items
        .map(
          (item) =>
            `<li><span class="so-dot ${escapeHtml(item.tone || "")}"></span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.sub || "")}</small></div></li>`,
        )
        .join("")}</ul>`;
    case "mixes":
      return `<div class="so-mixes">${block.items
        .map(
          (mix) =>
            `<button class="so-mix${mix.on ? " is-on" : ""}" type="button" data-act="choose" data-field="mix" data-value="${escapeHtml(mix.id)}" aria-pressed="${mix.on ? "true" : "false"}"><span>${escapeHtml(mix.label)}</span><b>${escapeHtml(mix.mix)}</b></button>`,
        )
        .join("")}</div>`;
    case "badge":
      return `<span class="so-badge">${escapeHtml(block.text)}</span>`;
    case "shelf":
      return `<div class="so-shelf">${block.rows
        .map(
          (row) =>
            `<div class="so-shelf-row ${escapeHtml(row.tone || "")}"><div class="k">${escapeHtml(row.k)}</div><div class="v">${escapeHtml(row.v)}</div></div>`,
        )
        .join("")}</div>`;
    case "pdf":
      return `<div class="so-pdf"><div class="so-pdf-h">Fortune plan \u00b7 dated timeline</div>${block.rows
        .map(
          (row) =>
            `<div class="so-pdf-row"><span>${escapeHtml(row.label)}</span><b>${escapeHtml(row.date)}</b></div>`,
        )
        .join("")}</div>`;
    case "strip":
      return `<p class="so-strip">This plan stays on this phone. Erase any time. ${infoButton()}</p>`;
    default:
      return "";
  }
}

function counsel() {
  return `<div class="so-sheet" role="dialog" aria-modal="true" aria-labelledby="so-counsel-title">
    <div class="so-body">
      <span class="so-kicker">On this phone</span>
      <h1 id="so-counsel-title">Counsel and privacy</h1>
      <p class="so-body-copy">This plan stays on this phone until you erase it.</p>
      <div class="so-confirm"><b>We do not advise, sell, or arrange.</b><span>We do not contact a bank, a lender, or an insurer for you. Shelf puts an offer into plain words. It does not tell you to buy.</span></div>
      <p class="so-hint">Dates are expected marks we can track. They are not a promise.</p>
      <p class="so-strip">This plan stays on this phone. Erase any time.</p>
    </div>
    <div class="so-dock">
      <button class="so-btn primary" type="button" data-act="close">Close</button>
      <button class="so-btn quiet" type="button" data-act="erase">Erase this plan</button>
    </div>
  </div>`;
}

export function renderSliceO(state) {
  const view = present(state);
  const body = view.blocks.map(blockHtml).join("");
  return `<div class="so-app" data-screen="${escapeHtml(view.id)}" data-build="slice-o">
    <div class="so-screen">
      ${topbar(view)}
      <div class="so-body">${body}</div>
      ${dock(view)}
      ${view.infoOpen ? counsel() : ""}
    </div>
  </div>`;
}
