import { describe, expect, it } from "vitest";
import { STRINGS } from "./i18n.js";

const FORBIDDEN = [
  /hidden department/i,
  /secret channel/i,
  /we know the bank/i,
  /legal jargon/i,
  /special recovery unit/i,
  /credit risk management/i,
  /\bAUDITED\b/,
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
    const all = [...walk(STRINGS.zh), ...walk(STRINGS.en)].join("\n");
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
});
