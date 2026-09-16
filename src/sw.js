/// <reference lib="webworker" />
import { clientsClaim, setCacheNameDetails } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { htmlShellForPath } from "./pwa-shell.js";

const swPath = self.location.pathname || "";
const previewHit = swPath.match(/\/preview\/pr-(\d+)\//);
const isPreviewSw = !!previewHit;

setCacheNameDetails({
  prefix: isPreviewSw ? `pyl-pr-${previewHit[1]}` : "pyl-live",
  suffix: "wb",
});

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

const denylist = [/\.[^/]+$/];
if (!isPreviewSw) denylist.push(/\/preview\/pr-\d+\//);

registerRoute(
  new NavigationRoute(
    (ctx) => {
      const shell = htmlShellForPath(ctx.url.pathname);
      const handler = handlers[shell];
      if (!handler) return fetch(ctx.request);
      return handler(ctx);
    },
    { denylist },
  ),
);
