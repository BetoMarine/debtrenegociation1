import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const RULE17 = /Door|Fix|Pack|growth pot|Step \d|Stabili|Invest|Grow it/;
export const BANK_NAME = /HSBC|Hang Seng|Citibank|\bCiti\b|\bBOC\b|Bank of China|Standard Chartered|恒生|滙豐|花旗|中銀/;
export const RIGHT_DOOR_OK = /(^|\.)(r1\.|a2\.|e1\.)|(^|\.)fromRightDoor$/;
export const SOONER = /sooner|earlier than|faster|\{n\} months?/i;
export const SOONER_ZH = /提早|早\s*\d+\s*個?月/;
export const SOONER_NUMBER = /sooner by|\d+\s+months?\s+sooner|earlier than/i;

export function walkStrings(value, acc = [], prefix = "") {
  if (typeof value === "string") acc.push({ key: prefix || "(root)", text: value });
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "ftHost") continue;
      walkStrings(child, acc, prefix ? `${prefix}.${key}` : key);
    }
  }
  return acc;
}

export function flattenFtHost(table, prefix = "ftHost") {
  return walkStrings(table?.ftHost || {}, [], prefix);
}

export function rule17Hits(entries) {
  return entries.filter((entry) => RULE17.test(entry.text) || BANK_NAME.test(entry.text) || entry.text.includes("Right Door"));
}

export function unexpectedRule17(entries, baseline) {
  const allowed = new Set(baseline);
  const bad = [];
  for (const entry of rule17Hits(entries)) {
    const id = `${entry.key}\n${entry.text}`;
    if (allowed.has(id)) continue;
    if (entry.text.includes("Right Door") && RIGHT_DOOR_OK.test(entry.key)) continue;
    bad.push(entry);
  }
  return bad;
}

export function soonerHits(entries) {
  return entries.filter((entry) => SOONER.test(entry.text) || SOONER_ZH.test(entry.text));
}

export function hardSoonerHits(entries) {
  return entries.filter((entry) => SOONER_NUMBER.test(entry.text) || SOONER_ZH.test(entry.text));
}

export function collectDomText(root) {
  if (!root) return [];
  const out = [];
  const nodes = root.querySelectorAll ? [root, ...root.querySelectorAll("*")] : [root];
  for (const node of nodes) {
    for (const attr of ["aria-label", "title", "alt", "placeholder"]) {
      const value = node.getAttribute?.(attr);
      if (value) out.push(value);
    }
  }
  const text = root.textContent || "";
  if (text.trim()) out.push(text);
  return out;
}

export function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkFiles(path, acc);
    } else acc.push(path);
  }
  return acc;
}

export function readText(path) {
  return readFileSync(path, "utf8");
}
