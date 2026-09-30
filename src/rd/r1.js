import { buildRdExport } from "./export.js";
import { encodeShortCode } from "../shared/shortcode.js";

/** Logical session key. The storage wrapper adds pyl: or the preview prefix. */
export const R1_NOT_NOW_KEY = "rd:r1NotNow";

/** New zh lines in i18n r1.*. Needs native review before live. Not a preview blocker. */
export const R1_ZH_REVIEW = "unreviewed";

const NO_WRITE = { write: false, record: null, code: "", next: null };

export function r1CompletionKey(pack, now = new Date()) {
  const record = buildRdExport(pack, now);
  if (!record?.done) return null;
  if (!pack?.door) return null;
  if (!String(pack.letter || "").trim()) return null;
  return `${record.tenorMonths}|${pack.sentAt || "unsent"}`;
}

/** Standalone only, once per script/documents completion, and not after Not now. */
export function shouldShowR1({ host = "standalone", pack, notNow = false, offeredFor = null, now = new Date() } = {}) {
  if (host !== "standalone") return false;
  if (notNow) return false;
  const key = r1CompletionKey(pack, now);
  if (!key) return false;
  if (offeredFor && offeredFor === key) return false;
  return true;
}

/**
 * open, finish, and not-now never write. Only the primary action returns a record.
 * Not now does not choose a blocking next step.
 */
export function applyR1Action(action, ctx = {}) {
  if (action === "not-now") {
    ctx.sessionSet?.(R1_NOT_NOW_KEY, "1");
    return { ...NO_WRITE, next: "pack" };
  }
  if (action === "exit") return { ...NO_WRITE, next: "home" };
  if (action === "open" || action === "finish") return { ...NO_WRITE, next: null };
  if (action !== "primary") return { ...NO_WRITE, next: null };
  const record = buildRdExport(ctx.pack, ctx.now || new Date());
  const code = record?.done ? encodeShortCode(record) : null;
  if (!record?.done || !code) return { ...NO_WRITE, next: null };
  return { write: true, record, code, next: "code" };
}

/** Second press inside the window clears the on-screen code. */
export function consumeQuickExitPress(previousAt, now, gap = 800) {
  if (now - previousAt < gap) return { clear: true, at: 0 };
  return { clear: false, at: now };
}

export function renderR1Screen({ phase, code, s, el, escapeHtml, onPrimary, onNotNow, onExit, onContinue }) {
  if (phase === "code") {
    const body = el(`<div class="stack" data-r1="result"></div>`);
    body.append(
      el(`<h1>${escapeHtml(s("r1.codeTitle"))}</h1>`),
      el(`<p class="hint">${escapeHtml(s("r1.codeHint"))}</p>`),
      el(`<p class="r1-code" data-r1-code>${escapeHtml(code || "")}</p>`),
    );
    const exit = el(`<button class="btn btn-ghost" type="button" data-act="r1-exit">${escapeHtml(s("r1.exit"))}</button>`);
    const next = el(`<button class="btn btn-primary" type="button" data-act="r1-continue">${escapeHtml(s("continue"))}</button>`);
    exit.addEventListener("click", () => onExit?.());
    next.addEventListener("click", () => onContinue?.());
    const nav = el(`<div class="nav"></div>`);
    nav.append(next, exit);
    body.append(nav);
    return body;
  }
  const body = el(`<div class="stack" data-r1="ask"></div>`);
  body.append(
    el(`<h1>${escapeHtml(s("r1.title"))}</h1>`),
    el(`<p class="hint">${escapeHtml(s("r1.body"))}</p>`),
  );
  const primary = el(`<button class="btn btn-primary" type="button" data-act="r1-primary">${escapeHtml(s("r1.primary"))}</button>`);
  const later = el(`<button class="btn btn-ghost" type="button" data-act="r1-not-now">${escapeHtml(s("r1.notNow"))}</button>`);
  primary.addEventListener("click", () => onPrimary?.());
  later.addEventListener("click", () => onNotNow?.());
  const nav = el(`<div class="nav"></div>`);
  nav.append(primary, later);
  body.append(nav);
  return body;
}
