import { productHref } from "./paths.js";

export const FROM_FORTUNE = "fortune";
export const FROM_PARAM = "from";
const STORAGE_KEY = "pyl.from";

function sessionStore() {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Append `?from=fortune` so Right Door / Sunday Pack can offer a return chip. */
export function withFromFortune(href) {
  const raw = String(href || "");
  if (!raw) return raw;
  const hashAt = raw.indexOf("#");
  const hash = hashAt >= 0 ? raw.slice(hashAt) : "";
  const base = hashAt >= 0 ? raw.slice(0, hashAt) : raw;
  if (/(?:[?&])from=fortune(?:&|$)/i.test(base)) return raw;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}from=fortune${hash}`;
}

/** Fortune → Right Door / Sunday Pack outbound href (normal navigation, keeps history). */
export function fortuneOutboundHref(which) {
  return withFromFortune(productHref(which));
}

export function fortuneReturnHref() {
  return productHref("fortune");
}

/**
 * True when this tab arrived from Fortune. Query wins; sessionStorage survives
 * hash-only start / in-app screens. Standalone opens (no from=fortune, empty
 * session) stay independent — no Fortune chrome.
 */
export function captureFortuneReferral(loc = typeof location !== "undefined" ? location : null, storage = sessionStore()) {
  let fromQuery = false;
  try {
    const params = new URLSearchParams(loc?.search || "");
    fromQuery = String(params.get(FROM_PARAM) || "").toLowerCase() === FROM_FORTUNE;
  } catch {
    fromQuery = false;
  }
  if (fromQuery) {
    try {
      storage?.setItem(STORAGE_KEY, FROM_FORTUNE);
    } catch {
      /* private mode */
    }
    return true;
  }
  try {
    return storage?.getItem(STORAGE_KEY) === FROM_FORTUNE;
  } catch {
    return false;
  }
}

export function isFortuneReferral(loc, storage) {
  return captureFortuneReferral(loc, storage);
}

/** Fortune and standalone hops share origin — drop the referral so footer links stay independent. */
export function clearFortuneReferral(storage = sessionStore()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function fortuneReturnBarHtml(escapeHtml, label) {
  const href = escapeHtml(fortuneReturnHref());
  const text = escapeHtml(label);
  return `<a class="from-fortune-bar" data-back-fortune href="${href}">${text}</a>`;
}

export function fortuneReturnCtaHtml(escapeHtml, label) {
  const href = escapeHtml(fortuneReturnHref());
  const text = escapeHtml(label);
  return `<a class="btn btn-primary ext" data-back-fortune-cta href="${href}">${text}</a>`;
}
