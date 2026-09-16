/** Register the root service worker from any product URL. */

export const SW_CACHE_BUST = "0.9.11";

export function isPagesPreviewPath(pathname) {
  return /\/preview\/pr-\d+\//.test(String(pathname || ""));
}

export function siteRootFromPath(pathname) {
  const path = String(pathname || "/");
  const nested = path.match(/\/(sunday|fortune)(?:\/|$)/);
  if (nested) return path.slice(0, nested.index + 1);
  if (path.endsWith("/")) return path;
  return path.replace(/\/[^/]*$/, "/") || "/";
}

function scriptUrl(reg) {
  return reg?.active?.scriptURL || reg?.waiting?.scriptURL || reg?.installing?.scriptURL || "";
}

function isForeignPreviewController(script, pathname) {
  if (!isPagesPreviewPath(pathname)) return false;
  return !!script && !/\/preview\/pr-\d+\//.test(script);
}

export async function dropForeignPreviewWorkers(pathname = location.pathname) {
  if (!("serviceWorker" in navigator)) return false;
  const regs = await navigator.serviceWorker.getRegistrations();
  let dropped = false;
  await Promise.all(
    regs.map(async (reg) => {
      if (!isForeignPreviewController(scriptUrl(reg), pathname)) return;
      dropped = true;
      await reg.unregister();
    }),
  );
  if (dropped && self.caches?.keys) {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (/pyl-live|workbox-precache/i.test(key) && !/pyl-pr-|preview/i.test(key)) return caches.delete(key);
        return Promise.resolve();
      }),
    );
  }
  return dropped;
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const root = siteRootFromPath(location.pathname);
  const script = `${root}sw.js?v=${encodeURIComponent(SW_CACHE_BUST)}`;
  dropForeignPreviewWorkers(location.pathname)
    .then((dropped) => {
      return navigator.serviceWorker
        .register(script, { scope: root, updateViaCache: "none" })
        .then(() => dropped);
    })
    .then((dropped) => {
      if (dropped) location.reload();
    })
    .catch(() => {});
}
