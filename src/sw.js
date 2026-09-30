/// <reference lib="webworker" />
import { clientsClaim, setCacheNameDetails } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { htmlShellForPath } from "./pwa-shell.js";
import { ownCacheNames, workboxCacheDetails } from "./shared/storage/ns.js";

self.skipWaiting();
clientsClaim();

const cacheDetails = workboxCacheDetails();
if (cacheDetails) setCacheNameDetails(cacheDetails);

precacheAndRoute(self.__WB_MANIFEST);

const ownCaches = ownCacheNames();
if (ownCaches) {
  const keep = new Set([ownCaches.precache, ownCaches.runtime]);
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(ownCaches.ownPrefix) && !keep.has(key))
            .map((key) => caches.delete(key)),
        ),
      ),
    );
  });
} else {
  cleanupOutdatedCaches();
}

const SHELLS = ["index.html", "fortune/index.html", "sunday/index.html", "pyl/index.html"];
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
      denylist: [/\.[^/]+$/],
    },
  ),
);
