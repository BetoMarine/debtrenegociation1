/** Precached HTML for a navigation URL. MPA products must not share Right Door's index.html. */
export function htmlShellForPath(pathname) {
  const path = String(pathname || "/");
  if (/\/fortune(?:\/|$)/.test(path)) return "fortune/index.html";
  if (/\/sunday(?:\/|$)/.test(path)) return "sunday/index.html";
  if (/\/pyl(?:\/|$)/.test(path)) return "pyl/index.html";
  return "index.html";
}

export function productIdForPath(pathname) {
  const path = String(pathname || "/");
  if (/\/fortune(?:\/|$)/.test(path)) return "fortune";
  if (/\/sunday(?:\/|$)/.test(path)) return "sunday";
  if (/\/pyl(?:\/|$)/.test(path)) return "pyl";
  return "right-door";
}
