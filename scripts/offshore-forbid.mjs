import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";

const banned = ["pyl-", "right-door", "fortune", "Fortune", "debtrenegociation1", "invest", "boost"];
const livePackUrl = "https://betomarine.github.io/debtrenegociation1/sunday/";
const textExt = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".txt", ".map"]);
const distRoot = resolve("dist");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = new Set(walk(join(distRoot, "offshore")).map((file) => resolve(file)));
const pending = [...files];
while (pending.length) {
  const file = pending.pop();
  if (!textExt.has(extname(file))) continue;
  const text = readFileSync(file, "utf8");
  const found = text.match(/(?:\.\.\/|\.\/)[^"'()\s]+/g) || [];
  for (const rel of found) {
    const clean = rel.split("?")[0].split("#")[0];
    const abs = resolve(dirname(file), clean);
    if (!abs.startsWith(distRoot)) continue;
    if (files.has(abs)) continue;
    try {
      if (!statSync(abs).isFile()) continue;
    } catch {
      continue;
    }
    files.add(abs);
    pending.push(abs);
  }
}

const hits = [];
for (const file of files) {
  if (!textExt.has(extname(file))) continue;
  const text = readFileSync(file, "utf8").split(livePackUrl).join("");
  for (const word of banned) {
    if (text.includes(word)) hits.push(`${file}: ${word}`);
  }
}
if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log(`offshore forbid ok (${files.size} files)`);
