/** Shared Plan Your Life wordmark (SVG mark + text). */

export const PYL_NAME = "Plan Your Life";

const MARK = `<svg class="pyl-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <rect x="2" y="2" width="9" height="9" rx="2.2" fill="var(--pyl-purple)"/>
  <rect x="13" y="2" width="9" height="9" rx="2.2" fill="var(--pyl-teal)"/>
  <rect x="2" y="13" width="9" height="9" rx="2.2" fill="var(--pyl-teal)"/>
  <rect x="13" y="13" width="9" height="9" rx="2.2" fill="var(--pyl-purple)"/>
</svg>`;

export function pylWordmarkHtml({ footer = false } = {}) {
  const cls = footer ? "pyl-wordmark footer" : "pyl-wordmark";
  return `<span class="${cls}" aria-label="${PYL_NAME}">${MARK}<span class="pyl-wordmark-text">${PYL_NAME}</span></span>`;
}
