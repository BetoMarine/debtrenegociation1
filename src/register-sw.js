/** Register the root service worker from any product URL. */

export function siteRootFromPath(pathname) {
  const path = String(pathname || "/");
  const nested = path.match(/\/(sunday|fortune)(?:\/|$)/);
  if (nested) return path.slice(0, nested.index + 1);
  if (path.endsWith("/")) return path;
  return path.replace(/\/[^/]*$/, "/") || "/";
}

export function serviceWorkerRegisterOptions() {
  return { scope: "./", updateViaCache: "none" };
}

/** Scope `./` resolves against the worker script URL, which lives at the site root. */
export function resolvedServiceWorkerScope(pathname, origin = "https://betomarine.github.io") {
  const root = siteRootFromPath(pathname);
  const script = new URL(`${root}sw.js`, origin.endsWith("/") ? origin : `${origin}/`);
  return new URL("./", script).pathname;
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const root = siteRootFromPath(location.pathname);
  navigator.serviceWorker.register(`${root}sw.js`, serviceWorkerRegisterOptions()).catch(() => {});
}
