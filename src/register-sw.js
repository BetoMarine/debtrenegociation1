/** Register the root service worker from any product URL. */

export function siteRootFromPath(pathname) {
  const path = String(pathname || "/");
  const nested = path.match(/\/(sunday|fortune)(?:\/|$)/);
  if (nested) return path.slice(0, nested.index + 1);
  if (path.endsWith("/")) return path;
  return path.replace(/\/[^/]*$/, "/") || "/";
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const root = siteRootFromPath(location.pathname);
  navigator.serviceWorker.register(`${root}sw.js`, { updateViaCache: "none" }).catch(() => {});
}
