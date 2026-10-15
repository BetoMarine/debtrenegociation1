/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { htmlShellForPath } from "./pwa-shell.js";

self.skipWaiting();
clientsClaim();

const previewScope = /\/preview(?:\/|$)/.test(new URL(self.registration.scope).pathname);

if (previewScope) {
  /* pyl-preview-clear: this worker exists only to evict a preview that cached an older fortune-*.js. */
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        await self.clients.claim();
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        await Promise.all(
          windows.map((client) => (typeof client.navigate === "function" ? client.navigate(client.url) : undefined)),
        );
      })(),
    );
  });
} else {
  precacheAndRoute(self.__WB_MANIFEST);
  cleanupOutdatedCaches();

  const SHELLS = ["index.html", "fortune/index.html", "sunday/index.html", "pyl/index.html", "offshore/index.html"];
  const handlers = {};
  for (const url of SHELLS) {
    try {
      handlers[url] = createHandlerBoundToURL(url);
    } catch {
      /* shell missing from this precache — fall through to network */
    }
  }

  registerRoute(
    new NavigationRoute(
      (ctx) => {
        const shell = htmlShellForPath(ctx.url.pathname);
        const handler = handlers[shell];
        if (!handler) return fetch(ctx.request);
        return handler(ctx);
      },
      {
        denylist: [/\.[^/]+$/, /\/offshore(?:\/|$)/],
      },
    ),
  );
}
