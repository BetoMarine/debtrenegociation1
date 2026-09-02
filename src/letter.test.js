import { describe, expect, it } from "vitest";
import { DOORS } from "./door.js";
import { buildLetter } from "./letter.js";

const sample = {
  fullName: "陳大文",
  hkid: "A123456(7)",
  phone: "91234567",
  reason: "job_ended",
  creditors: [{ nickname: "滙豐卡", type: "hsbc", amount: "HK$20,000", ref: "8899" }],
  situation: {
    whatChanged: "公司裁員",
    when: "2026年8月",
    incomeItems: "現無薪金",
    incomeAmount: "HK$0",
    expenseItems: "租金",
    expenseAmount: "HK$10,000",
    surplus: "HK$2,000",
    tenorMonths: "6",
    askInterestFreeze: false,
  },
  door: DOORS.HSBC_WORKOUT,
  documents: [
    { key: "hardship_proof", attachmentIds: ["a"] },
    { key: "bank_statements", attachmentIds: ["b", "c"] },
  ],
  today: "2026年09月02日",
};

const FORBIDDEN =
  /隱藏部門|秘密渠道|我們認識銀行|Special Recovery|Credit Risk Management|hidden department|secret channel|we know the bank|we act for|Section 28|第\s*28\s*條|第28段/;

describe("buildLetter", () => {
  it("writes a first-person Traditional Chinese bank-file request in the user’s name", () => {
    const text = buildLetter({ lang: "zh", ...sample });
    expect(text).toContain("CONFIDENTIAL");
    expect(text).toContain("正式請求：財務困難覆核");
    expect(text).toContain("本人陳大文");
    expect(text).toContain("A123456(7)");
    expect(text).toContain("公司裁員");
    expect(text).toContain("滙豐卡");
    expect(text).toContain("8899");
    expect(text).toContain("債務重組部／Collection Services");
    expect(text).toContain("cruu@hsbc.com.hk");
    expect(text).toContain("第24.16段");
    expect(text).toContain("自行申報，未經審計");
    expect(text).toContain("HK$2,000");
    expect(text).toContain("6 個月");
    expect(text).toContain("[X] 困難證明");
    expect(text).toContain("十四個工作天");
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).toMatch(/並非援引綜合債務紓緩計劃的三十日協調期/);
    expect(text).not.toMatch(/AUDITED/);
    expect(text).toContain("並未請求凍結利息或零利率");
  });

  it("writes an English letter the user can send themselves", () => {
    const text = buildLetter({
      lang: "en",
      ...sample,
      fullName: "Chan Tai Man",
      today: "2026-09-02",
    });
    expect(text).toContain("CONFIDENTIAL");
    expect(text).toContain("Formal request: financial hardship review");
    expect(text).toContain("Chan Tai Man");
    expect(text).toContain("I, Chan Tai Man, prepared this letter myself");
    expect(text).toContain("paragraph 24.16");
    expect(text).toContain("self-declared");
    expect(text).toContain("not audited");
    expect(text).toContain("not a clean credit score");
    expect(text).toContain("Debt Workout Unit / Collection Services");
    expect(text).not.toMatch(FORBIDDEN);
    expect(text).toContain("I am not asking for an interest freeze or a 0% rate");
  });

  it("only brands the IDRP 30-day period when the door is IDRP", () => {
    const idrp = buildLetter({ lang: "en", ...sample, door: DOORS.IDRP });
    expect(idrp).toMatch(/30-day coordination period/);
    const hsbc = buildLetter({ lang: "en", ...sample, door: DOORS.HSBC_WORKOUT });
    expect(hsbc).toMatch(/not a request to apply the IDRP 30-day standstill/);
  });
});
