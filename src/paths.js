/** Public product URLs. Root stays Right Door; Sunday Pack lives at /sunday/. */
export function productHref(which) {
  const path = typeof location !== "undefined" ? location.pathname : "/";
  const onSunday = /\/sunday(?:\/|$)/.test(path);
  if (which === "sunday") return onSunday ? "./" : "./sunday/";
  return onSunday ? "../" : "./";
}

export const SUNDAY_HASH_PREFIX = "sunday-";
