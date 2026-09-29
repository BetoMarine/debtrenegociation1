/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { el, escapeHtml } from "../dom.js";
import { FORTUNE_STRINGS } from "./copy.js";
import { newFortunePlan } from "./model.js";
import { FORTUNE_SCREENS, renderFortune } from "./ui.js";
import { BANK_NAME, RULE17, collectDomText, walkStrings } from "../../scripts/ci/copy-scan.mjs";

const baseline = JSON.parse(readFileSync(join(process.cwd(), "scripts/ci/rule17-baseline.json"), "utf8"));
const livePhrases = walkStrings(FORTUNE_STRINGS.en)
  .map((entry) => entry.text)
  .filter((text) => typeof text === "string" && text && !text.includes("{"));
const liveTemplates = walkStrings(FORTUNE_STRINGS.en)
  .map((entry) => entry.text)
  .filter((text) => typeof text === "string" && text.includes("{"));

function unexplained(text) {
  let rest = ` ${text} `;
  const phrases = [...livePhrases].sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rest = rest.replace(new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "g"), " ");
  }
  for (const template of liveTemplates) {
    const body = template
      .split(/\{[^}]+\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[^\\n]{0,80}");
    rest = rest.replace(new RegExp(body, "g"), " ");
  }
  return rest;
}

function isNewRule17(text) {
  const rest = unexplained(text);
  return RULE17.test(rest) || BANK_NAME.test(rest) || rest.includes("Right Door");
}

function hostFor(plan) {
  const root = document.createElement("div");
  document.body.innerHTML = "";
  document.body.append(root);
  const host = {
    el,
    escapeHtml,
    plan,
    forecast: null,
    busy: false,
    notice: "",
    crumb: null,
    compare: null,
    canOpenPlan: false,
    isStandalone: () => false,
    openStages: null,
    draftGoal: { name: "", amount: "", months: 12 },
    root,
    shellFortune(body) {
      root.replaceChildren(body);
    },
  };
  return new Proxy(host, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === "symbol") return undefined;
      return () => {};
    },
  });
}

describe("Fortune screen text", () => {
  it("renders every Fortune screen and keeps new rule-17 hits out of the baseline", () => {
    const plan = { ...newFortunePlan(), privacyAccepted: true, theme: "rebuild", debtHeat: "paying" };
    const known = baseline.map((line) => line.split("\n").slice(1).join("\n"));
    const leaves = [];
    for (const screen of FORTUNE_SCREENS) {
      const host = hostFor(plan);
      renderFortune(screen, host);
      const walker = document.createTreeWalker(host.root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node.textContent.trim();
        if (text) leaves.push(text);
        node = walker.nextNode();
      }
      leaves.push(...collectDomText(host.root).filter((text) => text.length < 180));
    }
    const bad = [...new Set(leaves)].filter((text) => !known.includes(text) && isNewRule17(text));
    expect(bad).toEqual([]);
    expect(isNewRule17("Call HSBC about a new Door")).toBe(true);
  });
});
