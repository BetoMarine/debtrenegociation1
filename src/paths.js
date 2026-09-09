/** Public product URLs. Root stays Right Door; Sunday Pack /sunday/; Fortune Teller /fortune/. */
export function productHref(which) {
  const path = typeof location !== "undefined" ? location.pathname : "/";
  const onSunday = /\/sunday(?:\/|$)/.test(path);
  const onFortune = /\/fortune(?:\/|$)/.test(path);
  if (which === "sunday") {
    if (onSunday) return "./";
    if (onFortune) return "../sunday/";
    return "./sunday/";
  }
  if (which === "fortune") {
    if (onFortune) return "./";
    if (onSunday) return "../fortune/";
    return "./fortune/";
  }
  if (onSunday || onFortune) return "../";
  return "./";
}

export const SUNDAY_HASH_PREFIX = "sunday-";
