import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DAY = 24 * 60 * 60 * 1000;
const KEEP_DAYS = 30;

function tombstoneHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview ended</title>
  </head>
  <body>
    <p>This preview has ended.</p>
    <script>
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
        }).catch(function () {});
      }
    </script>
  </body>
</html>
`;
}

function tombstoneSw(pr) {
  const ns = `pyl-preview-pr${pr}`;
  return `self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (key) { return key.indexOf("${ns}-") === 0; }).map(function (key) { return caches.delete(key); }));
    await new Promise(function (resolve) {
      var req = indexedDB.deleteDatabase("${ns}");
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { resolve(); };
      req.onblocked = function () { resolve(); };
    });
    await self.registration.unregister();
  })());
});
`;
}

function writeEnded(dir, pr, at = new Date()) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), tombstoneHtml());
  writeFileSync(join(dir, "sw.js"), tombstoneSw(pr));
  writeFileSync(join(dir, ".ended-at"), at.toISOString());
}

function expire(root, now = Date.now()) {
  const preview = join(root, "preview");
  let names = [];
  try {
    names = readdirSync(preview);
  } catch {
    return [];
  }
  const removed = [];
  for (const name of names) {
    if (name === "pr-26") continue;
    const dir = join(preview, name);
    if (!statSync(dir).isDirectory()) continue;
    const stampPath = join(dir, ".ended-at");
    let stamp = "";
    try {
      stamp = readFileSync(stampPath, "utf8").trim();
    } catch {
      continue;
    }
    const at = Date.parse(stamp);
    if (!Number.isFinite(at)) continue;
    if (now - at < KEEP_DAYS * DAY) continue;
    rmSync(dir, { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}

const [command, dir, pr] = process.argv.slice(2);
if (command === "end") {
  if (String(pr) === "26") {
    console.log("PR 26 preview is left untouched");
    process.exit(0);
  }
  writeEnded(join(dir, "preview", `pr-${pr}`), pr);
  console.log(`tombstone preview/pr-${pr}`);
} else if (command === "expire") {
  const removed = expire(dir);
  console.log(removed.length ? `removed ${removed.join(",")}` : "no expired tombstones");
} else {
  console.error("usage: write-tombstone.mjs end <gh-pages-dir> <pr> | expire <gh-pages-dir>");
  process.exit(1);
}
