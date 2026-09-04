import { describe, expect, it } from "vitest";
import { ENRICH } from "./contacts.js";
import { PDF_FOOTER_LEGAL, PDF_FOOTER_ORG } from "./copy.js";
import { briefingRows, buildSundayPdf } from "./pdf.js";

const sample = {
  lang: "tl",
  privacyAccepted: true,
  flags: [],
  noneOfAbove: true,
  nationality: "filipino",
  monthsLeft: "8",
  whoKnows: "friend",
  goals: ["stop_borrowing", "payoff_plan", "remittance_vs_bills"],
  loans: [
    {
      nickname: "Happy Finance",
      type: "hk_money_lender",
      balanceBand: "11_20k",
      monthlyBand: "1_5k",
      guarantor: "friend_helper",
      stillBorrowing: "trying_to_stop",
    },
  ],
  split: { bills: "40", allowance: "35", keep: "25" },
  splitNote: "I want family to only get the allowance amount.",
  door: "enrich",
  updatedAt: Date.parse("2026-09-04T00:00:00Z"),
};

describe("Sunday Pack PDF", () => {
  it("includes the required footer and Enrich booking URL, and never an example banner", () => {
    const rows = briefingRows(sample);
    expect(rows.footerOrg).toBe(PDF_FOOTER_ORG);
    expect(rows.footerOrg).toMatch(/not affiliated with Enrich/);
    expect(rows.footerLegal).toBe(PDF_FOOTER_LEGAL);
    expect(rows.footerLegal).toMatch(/not a request for Enrich to contact any lender/);
    expect(rows.doorLines.join("\n")).toContain(ENRICH.booking);
    expect(JSON.stringify(rows)).not.toMatch(/EXAMPLE DATA ONLY/i);
  });

  it("embeds those phrases in a one-page PDF blob", async () => {
    const blob = buildSundayPdf(sample);
    expect(blob.type).toMatch(/pdf/);
    const buf = Buffer.from(await blob.arrayBuffer());
    const asText = buf.toString("latin1");
    expect(asText).toContain("not affiliated with Enrich");
    expect(asText).toContain("not a credit report");
    expect(asText).toContain("fhd-registration");
    expect(asText).not.toContain("EXAMPLE DATA ONLY");
  });
});
