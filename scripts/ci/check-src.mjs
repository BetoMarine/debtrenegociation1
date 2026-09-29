import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { FORTUNE_STRINGS } from "../../src/fortune/copy.js";
import { DOOR_KEYS, DOCUMENT_KEYS, SCRIPT_KEYS } from "../../src/rd/steps/index.js";
import { lookupCopy, STRINGS } from "../../src/i18n.js";
import { STAGE_WORDS } from "../../src/shared/stage-words.js";
import {
  hardSoonerHits,
  rule17Hits,
  soonerHits,
  unexpectedRule17,
  walkFiles,
  walkStrings,
} from "./copy-scan.mjs";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

const fortuneEntries = walkStrings(FORTUNE_STRINGS.en, [], "ft");
const ftHostEntries = [];
for (const key of [...SCRIPT_KEYS, ...DOOR_KEYS, ...DOCUMENT_KEYS]) {
  const text = lookupCopy(STRINGS.en.ftHost, key);
  if (typeof text === "string") ftHostEntries.push({ key: `ftHost.${key}`, text });
}
const scanned = [...fortuneEntries, ...ftHostEntries];
const baseline = JSON.parse(readFileSync(join(root, "scripts/ci/rule17-baseline.json"), "utf8"));
const ruleBad = unexpectedRule17(scanned, baseline);
if (ruleBad.length) {
  fail(`rule 17 / bank-name hits outside the live baseline:\n${ruleBad.map((h) => `${h.key}: ${h.text}`).join("\n")}`);
}
if (!rule17Hits(scanned).length) fail("rule 17 scanner produced no hits; it cannot prove a bad string fails");

const soonerBaseline = JSON.parse(readFileSync(join(root, "scripts/ci/sooner-baseline.json"), "utf8"));
const soonerAllowed = new Set(soonerBaseline);
for (const hit of soonerHits(scanned)) {
  if (!soonerAllowed.has(`${hit.key}\n${hit.text}`)) fail(`sooner-by scan hit ${hit.key}: ${hit.text}`);
}
const numbered = hardSoonerHits(scanned);
if (numbered.length) fail(`sooner-by number:\n${numbered.map((h) => h.text).join("\n")}`);

const stagePhrases = Object.values(STAGE_WORDS.en);
for (const file of walkFiles(join(root, "src"))) {
  if (!file.endsWith(".js") && !file.endsWith(".html")) continue;
  const rel = relative(root, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");
  if (rel === "src/shared/stage-words.js") continue;
  for (const phrase of stagePhrases) {
    if (text.includes(phrase)) fail(`${rel} repeats stage word "${phrase}"`);
  }
}

const nsSkip = new Set(["src/shared/storage/migrate-ns-v1.js"]);
for (const file of walkFiles(join(root, "src"))) {
  if (!/\.(js|html)$/.test(file)) continue;
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel.endsWith(".test.js") || rel.includes("/test-cases/")) continue;
  if (nsSkip.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes("right-door")) fail(`${rel} contains the live database name`);
  if (/pylinvest|com\.marinelli\.pylinvest|PYL Invest Brazil/.test(text)) {
    fail(`${rel} mentions PYL Invest Brazil`);
  }
}

const packForbidden = /rd:pack|ft:rdPack|ftRdPack|getPack|savePack|from ["'][^"']*rd\/steps/;
for (const file of walkFiles(join(root, "src/fortune"))) {
  if (!file.endsWith(".js")) continue;
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel === "src/fortune/rd-host.js") continue;
  const text = readFileSync(file, "utf8");
  if (packForbidden.test(text)) fail(`${rel} touches the pack or RD steps`);
  if (text.includes('"pack"') && !rel.endsWith(".test.js")) fail(`${rel} contains "pack"`);
}

for (const file of walkFiles(join(root, "src/fortune/import"))) {
  const text = readFileSync(file, "utf8");
  if (/\blocation\b/.test(text)) fail(`${relative(root, file)} reads location`);
}

for (const file of walkFiles(join(root, "src"))) {
  if (!file.endsWith(".js") || file.endsWith(".test.js")) continue;
  const text = readFileSync(file, "utf8");
  if (/navigator\.clipboard|execCommand\(\s*['"]copy['"]\s*\)/.test(text)) {
    fail(`${relative(root, file)} uses the clipboard`);
  }
}

const uiRoots = ["src/app.js", "src/fortune/ui.js", "src/fortune/app.js", "src/sunday", "src/rd", "src/fortune/import", "src/fortune/map"];
for (const file of walkFiles(join(root, "src"))) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (!file.endsWith(".js") || file.endsWith(".test.js")) continue;
  const watched = uiRoots.some((item) => rel === item || rel.startsWith(`${item}/`));
  if (!watched) continue;
  const text = readFileSync(file, "utf8");
  if (text.includes("timeToGoal.js")) fail(`${rel} imports timeToGoal.js`);
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}
console.log("check-src: ok");
