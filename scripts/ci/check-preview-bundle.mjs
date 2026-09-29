import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const allow = JSON.parse(readFileSync(join(root, "scripts/ci/preview-allowlist.json"), "utf8"));
const networkAllow = JSON.parse(readFileSync(join(root, "scripts/ci/network-allowlist.json"), "utf8"));

const BANS = ["right-door", "pylinvest", "com.marinelli.pylinvest", "PYL Invest Brazil"];
const SCOPED = ["localStorage.clear", "sessionStorage.clear", "indexedDB.databases", "deleteDatabase(", "caches.delete", "caches.keys"];
const NETWORK = ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", "importScripts(", "https://", "http://"];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

function count(text, token) {
  let n = 0;
  let from = 0;
  while (from <= text.length) {
    const at = text.indexOf(token, from);
    if (at < 0) break;
    n += 1;
    from = at + token.length;
  }
  return n;
}

function chunkKey(rel) {
  const base = rel.split("/").pop();
  if (base === "sw.js") return "sw.js";
  const match = base.match(/^(.*)-[A-Za-z0-9_-]{6,}\.(js|css)$/);
  return match ? `${match[1]}.${match[2]}` : base;
}

const files = walk(dist).filter((file) => /\.(js|html|webmanifest)$/.test(file));
const failures = [];
const scopedCounts = {};
const networkCounts = {};

for (const file of files) {
  const rel = relative(dist, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");
  for (const ban of BANS) {
    if (text.includes(ban)) failures.push(`${rel} contains ${ban}`);
  }
  const key = chunkKey(rel);
  if (file.endsWith(".js")) {
    for (const token of SCOPED) {
      const n = count(text, token);
      if (!n) continue;
      scopedCounts[key] = scopedCounts[key] || {};
      scopedCounts[key][token] = (scopedCounts[key][token] || 0) + n;
    }
    for (const token of NETWORK) {
      const n = count(text, token);
      if (!n) continue;
      networkCounts[key] = networkCounts[key] || {};
      networkCounts[key][token] = (networkCounts[key][token] || 0) + n;
    }
    if (/fortune/i.test(key) && key !== "rd-steps.js" && key !== "ns-storage.js") {
      if (text.includes("rd:pack") || text.includes("ft:rdPack")) {
        failures.push(`${rel} fortune chunk reads a pack key`);
      }
    }
  }
}

function diffCounts(actual, expected, label) {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  for (const key of keys) {
    const a = actual[key] || {};
    const e = expected[key] || {};
    const tokens = new Set([...Object.keys(a), ...Object.keys(e)]);
    for (const token of tokens) {
      if ((a[token] || 0) !== (e[token] || 0)) {
        failures.push(`${label} ${key} ${token}: built ${a[token] || 0}, allowlist ${e[token] || 0}`);
      }
    }
  }
}

diffCounts(scopedCounts, allow.scoped || {}, "scoped");
diffCounts(networkCounts, networkAllow.counts || {}, "network");

if (failures.length) {
  console.error(failures.join("\n"));
  console.error("\nscoped counts:\n" + JSON.stringify(scopedCounts, null, 2));
  console.error("\nnetwork counts:\n" + JSON.stringify(networkCounts, null, 2));
  process.exit(1);
}
console.log("check-preview-bundle: ok");
