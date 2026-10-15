/** Register the root service worker from any product URL. Preview pages must not keep one. */

export function siteRootFromPath(pathname) {
  const path = String(pathname || "/");
  const nested = path.match(/\/(sunday|fortune)(?:\/|$)/);
  if (nested) return path.slice(0, nested.index + 1);
  if (path.endsWith("/")) return path;
  return path.replace(/\/[^/]*$/, "/") || "/";
}

/** Dig-in previews ship a new hashed bundle every publish. A worker would keep the previous one. */
export function shouldRegisterServiceWorker(pathname) {
  return !/\/preview(?:\/|$)/.test(String(pathname || ""));
}

export function clearInstalledWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve();
  const dropCaches =
    typeof caches !== "undefined" && caches.keys
      ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve();
  return navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    .then(() => dropCaches)
    .then(() => {});
}

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (!shouldRegisterServiceWorker(location.pathname)) {
    clearInstalledWorkers().catch(() => {});
    return;
  }
  const root = siteRootFromPath(location.pathname);
  navigator.serviceWorker.register(`${root}sw.js`, { updateViaCache: "none" }).catch(() => {});
}
