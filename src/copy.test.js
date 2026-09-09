import { describe, expect, it } from "vitest";
import { FORTUNE_STRINGS } from "./fortune/copy.js";
import { STRINGS } from "./i18n.js";
import { productHref } from "./paths.js";
import { SUNDAY_STRINGS } from "./sunday/copy.js";

const FORBIDDEN = [
  /hidden department/i,
  /secret channel/i,
  /we know the bank/i,
  /legal jargon/i,
  /special recovery unit/i,
  /credit risk management/i,
  /\bis audited\b/i,
  /section 28/i,
  /隱藏部門/,
  /秘密渠道/,
  /我們認識銀行/,
  /特別追收/,
];

function walk(value, acc = []) {
  if (typeof value === "string") acc.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((v) => walk(v, acc));
  return acc;
}

describe("product copy", () => {
  it("never claims a hidden door or a relationship with the bank", () => {
    const all = [
      ...walk(STRINGS.zh),
      ...walk(STRINGS.en),
      ...walk(SUNDAY_STRINGS.en),
      ...walk(SUNDAY_STRINGS.tl),
      ...walk(SUNDAY_STRINGS.id),
      ...walk(FORTUNE_STRINGS.en),
    ].join("\n");
    for (const pattern of FORBIDDEN) {
      expect(all).not.toMatch(pattern);
    }
  });

  it("states that data dies with uninstall and that the user sends the pack", () => {
    expect(STRINGS.zh.localOnly).toMatch(/卸除/);
    expect(STRINGS.zh.localOnly).toMatch(/不收集/);
    expect(STRINGS.en.localOnly).toMatch(/Uninstall/);
    expect(STRINGS.en.localOnly).toMatch(/do not collect/);
    expect(STRINGS.zh.promiseLead).toMatch(/你自己寄出/);
    expect(STRINGS.en.promiseLead).toMatch(/You send it/);
    expect(STRINGS.zh.privacyTitle).toMatch(/不收集/);
    expect(STRINGS.en.privacyTitle).toMatch(/do not collect/i);
    expect(STRINGS.zh.privacyBody).toMatch(/不上傳/);
    expect(STRINGS.en.privacyBody).toMatch(/do not upload/i);
  });

  it("does not ship a first-page chooser and keeps products on separate URLs", () => {
    expect(STRINGS.en.chooserTitle).toBeUndefined();
    expect(STRINGS.zh.chooserTitle).toBeUndefined();
    expect(SUNDAY_STRINGS.en.backChooser).toBeUndefined();
    expect(productHref("right-door")).toBe("./");
    expect(productHref("sunday")).toBe("./sunday/");
    expect(productHref("fortune")).toBe("./fortune/");
  });

  it("Fortune Teller never claims a set-for-life score or Envizage", () => {
    const all = walk(FORTUNE_STRINGS.en).join("\n");
    expect(all).not.toMatch(/envizage/i);
    expect(FORTUNE_STRINGS.en.verdicts.shared).not.toMatch(/you'?re set/i);
    expect(FORTUNE_STRINGS.en.verdicts.wrecked).not.toMatch(/you'?re set/i);
    expect(FORTUNE_STRINGS.en.startTitle).toMatch(/floor/i);
    expect(FORTUNE_STRINGS.en.startTip).toMatch(/fix the fire/i);
    expect(FORTUNE_STRINGS.en.startLead).not.toMatch(/years to retirement/i);
    expect(FORTUNE_STRINGS.en.themes.rebuild.label).toMatch(/I need to rebuild/i);
    expect(all).toMatch(/not affiliated with HSBC/i);
    expect(all).toMatch(/not regulated advice/i);
  });

  it("never claims the app emails Enrich or lenders for the helper", () => {
    const all = [
      ...walk(SUNDAY_STRINGS.en),
      ...walk(SUNDAY_STRINGS.tl),
      ...walk(SUNDAY_STRINGS.id),
    ].join("\n");
    expect(SUNDAY_STRINGS.en.weDoNotEmailEnrich).toMatch(/do not email Enrich/i);
    expect(SUNDAY_STRINGS.tl.weDoNotEmailEnrich).toMatch(/Enrich/);
    expect(SUNDAY_STRINGS.id.weDoNotEmailEnrich).toMatch(/Enrich/);
    expect(all).not.toMatch(/we will email Enrich/i);
    expect(all).not.toMatch(/we contact your lender/i);
  });
});
