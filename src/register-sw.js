/** Register the root service worker from either product URL. */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const path = location.pathname;
  const sundayAt = path.indexOf("/sunday/");
  const root = sundayAt !== -1 ? path.slice(0, sundayAt + 1) : path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
  navigator.serviceWorker.register(`${root}sw.js`).catch(() => {});
}
