import { describe, expect, it } from "vitest";
import { buildLetter } from "./letter.js";

const sample = {
  fullName: "陳大文",
  reason: "job_ended",
  creditors: [{ nickname: "滙豐卡", type: "hsbc", amount: "HK$20,000" }],
  situation: {
    whatChanged: "公司裁員",
    when: "2026年8月",
    incomeNow: "沒有薪金",
    canPay: "每月 HK$2,000",
  },
  today: "2026年09月02日",
};

describe("buildLetter", () => {
  it("writes a first-person Traditional Chinese letter in the user’s name", () => {
    const text = buildLetter({ lang: "zh", ...sample });
    expect(text).toContain("本人陳大文");
    expect(text).toContain("公司裁員");
    expect(text).toContain("滙豐卡");
    expect(text).toContain("六十日");
    expect(text).not.toMatch(/隱藏部門|秘密渠道|我們認識銀行|legal jargon/i);
  });

  it("writes an English letter the user can send themselves", () => {
    const text = buildLetter({ lang: "en", ...sample, fullName: "Chan Tai Man" });
    expect(text).toContain("Chan Tai Man");
    expect(text).toContain("I prepared and am sending this letter myself");
    expect(text).toContain("not a clean credit score");
    expect(text).not.toMatch(/hidden department|secret channel|we know the bank/i);
  });
});
