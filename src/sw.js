/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { htmlShellForPath } from "./pwa-shell.js";

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
