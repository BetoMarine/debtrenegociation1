import { describe, expect, it } from "vitest";
import { PDF_FOOTER_LEGAL, PDF_FOOTER_ORG } from "./copy.js";
import { killTestInput } from "./engine.js";
import { newFortunePlan } from "./model.js";
import { buildFortunePdf, sheetRows } from "./pdf.js";

const samplePlan = {
  ...newFortunePlan(),
  privacyAccepted: true,
  theme: "grow",
  money: { incomeBand: "80_120", spendBand: "35_50", savingsBand: "400_800", debtsBand: "0" },
  milestones: [
    { id: "w50", name: "Wife's 50th", amount: 80000, months: 24 },
    { id: "wed", name: "Daughter's wedding", amount: 250000, months: 60 },
  ],
  net: { emergencyMonths: 9, floorHkd: 400000 },
  templateId: "balanced",
  updatedAt: Date.parse("2026-09-09T00:00:00Z"),
};

const sampleForecast = {
  livingPct: 64,
  netPct: 41,
  milestonePct: [88, 40],
  verdict: "stretched",
  hardFail: false,
  youAreSet: false,
  medianWealth: 520000,
  paths: 1000,
  seed: 20260909,
};

describe("Fortune Teller PDF", () => {
  it("includes execute-elsewhere, not advice, and not affiliated with HSBC", () => {
    const rows = sheetRows(samplePlan, sampleForecast);
    expect(rows.footerOrg).toBe(PDF_FOOTER_ORG);
    expect(rows.footerLegal).toBe(PDF_FOOTER_LEGAL);
    expect(rows.execute).toMatch(/licensed intermediary/i);
    expect(rows.notAdvice).toMatch(/not regulated advice/i);
    expect(rows.notHsbc).toMatch(/not affiliated with HSBC/i);
    expect(rows.disclaimer).toMatch(/not a fund we sell/i);
    expect(JSON.stringify(rows).toLowerCase()).not.toMatch(/you'?re set/);
    expect(JSON.stringify(rows).toLowerCase()).not.toMatch(/envizage/);
  });

  it("embeds those phrases in a one-page PDF blob", async () => {
    const blob = buildFortunePdf(samplePlan, sampleForecast);
    expect(blob.type).toMatch(/pdf/);
    const asText = Buffer.from(await blob.arrayBuffer()).toString("latin1");
    const lower = asText.toLowerCase();
    expect(lower).toContain("licensed intermediary");
    expect(lower).toContain("not affiliated with hsbc");
    expect(asText).toContain("Plan Your Life / Fortune Teller");
    expect(asText).toContain("Illustrative");
    expect(lower).not.toContain("you're set");
    expect(lower).not.toContain("envizage");
  });

  it("marks a kill-test sheet as a hard fail, not a green success", () => {
    const rows = sheetRows(
      { ...newFortunePlan(), ...killTestInput(), milestones: killTestInput().milestones },
      {
        livingPct: 0,
        netPct: 0,
        milestonePct: [0],
        verdict: "wrecked",
        hardFail: true,
        youAreSet: false,
        medianWealth: 0,
        paths: 400,
        seed: 1,
      },
    );
    expect(rows.hardFail).toBe(true);
    expect(rows.verdict).toMatch(/does not hold/i);
  });
});
