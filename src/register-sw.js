/** Register the root service worker from any product URL. */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const path = location.pathname;
  const nested = path.match(/\/(sunday|fortune)(?:\/|$)/);
  const root = nested
    ? path.slice(0, nested.index + 1)
    : path.endsWith("/")
      ? path
      : path.replace(/\/[^/]*$/, "/");
  navigator.serviceWorker.register(`${root}sw.js`).catch(() => {});
}
