import { describe, expect, it } from "vitest";
import { makeFireHandoff } from "../handoff.js";
import { applyTheme, migrateFortunePlan, newFortunePlan, shiftLivingGoalMonths } from "./model.js";
import { ensureFireSequence } from "./stabilize.js";
import {
  FIX_ASSUMED_MONTHS,
  isReadableCalendarWhen,
  monthRangeLabel,
  planSchedule,
  planTimeline,
  projectShelfGrowth,
  shelfGrowthLine,
} from "./timeline.js";
import { renderPlanJourneyHtml, renderStageStackHtml } from "./ui.js";
import { stageStack } from "./journey.js";
import { planningMu } from "./strategyBooks.js";

const FROM = new Date(2026, 8, 14);

function persistLike(plan, handoff = null) {
  return ensureFireSequence(migrateFortunePlan(plan), handoff);
}

function stressedRebuild({ fixMonths = 6, leftover = 20000, savings = 0 } = {}) {
  const seeded = applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild");
  seeded.money = {
    ...seeded.money,
    incomeMonthly: 40000,
    spendMonthly: 20000,
    leftoverMonthly: leftover,
    savings,
    debts: 0,
  };
  seeded.net = { ...seeded.net, currentHkd: savings, floorHkd: 120000, emergencyMonths: 6 };
  seeded.moneyCapturedAtStabilize = true;
  seeded.boardReached = true;
  return persistLike(seeded, makeFireHandoff({ source: "right-door", months: fixMonths }));
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("readable calendar dates", () => {
  it("accepts month-year ranges and rejects tenor-only strings", () => {
    expect(isReadableCalendarWhen("Sep 2026 → Mar 2027")).toBe(true);
    expect(isReadableCalendarWhen("Finishes Mar 2027")).toBe(true);
    expect(isReadableCalendarWhen("Start Mar 2027 · complete Sep 2027")).toBe(true);
    expect(isReadableCalendarWhen("3–6 months")).toBe(false);
    expect(isReadableCalendarWhen("6 months")).toBe(false);
    expect(monthRangeLabel(0, 6, FROM)).toBe("Sep 2026 → Mar 2027");
  });
});

describe("Fix finish date", () => {
  it("shows a 6-month assumed calendar range when the pack has not picked", () => {
    expect(FIX_ASSUMED_MONTHS).toBe(6);
    const waiting = persistLike(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: null }),
    );
    const { fix } = planSchedule(waiting, null, FROM);
    expect(fix.assumed).toBe(true);
    expect(fix.endMonths).toBe(6);
    expect(fix.rangeLabel).toBe("Sep 2026 → Mar 2027");
    expect(fix.whenLabel).toBe("Sep 2026 → Mar 2027");
    expect(isReadableCalendarWhen(fix.whenLabel)).toBe(true);
    expect(fix.whenLabel).not.toMatch(/3–6 months/);
    expect(fix.whenLabel).not.toMatch(/^Now/i);
  });

  it("shows when a picked 3- or 6-month Fix finishes", () => {
    const three = planSchedule(stressedRebuild({ fixMonths: 3 }), null, FROM).fix;
    expect(three.assumed).toBe(false);
    expect(three.rangeLabel).toBe("Sep 2026 → Dec 2026");
    expect(three.whenLabel).toBe("Sep 2026 → Dec 2026");
    const six = planSchedule(stressedRebuild({ fixMonths: 6 }), null, FROM).fix;
    expect(six.rangeLabel).toBe("Sep 2026 → Mar 2027");
    expect(six.whenLabel).toBe("Sep 2026 → Mar 2027");
    expect(six.startLabel).toBe("Sep 2026");
    expect(six.endLabel).toBe("Mar 2027");
  });
});

describe("Emergency fund start and complete", () => {
  it("starts after Fix and completes after 6 months of spending when leftover covers a month of spend", () => {
    const { ef, fix } = planSchedule(stressedRebuild({ fixMonths: 6 }), null, FROM);
    expect(ef.targetMonths).toBe(6);
    expect(ef.startMonths).toBe(fix.endMonths);
    expect(ef.saveMonths).toBe(6);
    expect(ef.endMonths).toBe(12);
    expect(ef.whenLabel).toBe("Start Mar 2027 · complete Sep 2027");
    expect(ef.contributeLabel).toBe("HK$20,000 a month until complete");
    expect(isReadableCalendarWhen(ef.whenLabel)).toBe(true);
  });

  it("says complete now with a calendar month when the floor is already funded", () => {
    const { ef } = planSchedule(stressedRebuild({ fixMonths: 6, savings: 200000 }), null, FROM);
    expect(ef.ready).toBe(true);
    expect(ef.whenLabel).toBe("Complete now · Sep 2026");
  });
});

describe("Invest start and shelf growth", () => {
  it("compounds Linda shelf μ annually over the growth-pot horizon", () => {
    expect(projectShelfGrowth(25000, 36, 0.15)).toBe(38022);
    expect(projectShelfGrowth(25000, 36, planningMu("balanced"))).toBe(38022);
    expect(projectShelfGrowth(25000, 36, planningMu("firm"))).toBe(35123);
    expect(shelfGrowthLine({ amount: 25000, months: 36, templateId: "balanced" })).toMatch(
      /Over 3 years, HK\$25,000 grows to about HK\$38,022 under Balanced \(15% a year\)\. Projection only/,
    );
    expect(shelfGrowthLine({ amount: 0, months: 36, templateId: "firm" })).toMatch(/Pin a growth amount/);
    expect(shelfGrowthLine({ amount: 25000, months: 36, templateId: "balanced" })).not.toMatch(/custody|hold money|buy list/i);
  });

  it("answers when Invest saving starts and when the pot is enough", () => {
    const { invest, ef } = planSchedule(stressedRebuild({ fixMonths: 6 }), null, FROM);
    expect(invest.startSaveMonths).toBe(ef.endMonths);
    expect(invest.startSaveLabel).toBe("Sep 2027");
    expect(invest.enoughLabel).toBe("Sep 2029");
    expect(invest.whenLabel).toBe("Start saving Sep 2027 · enough Sep 2029");
    expect(invest.thresholdLabel).toBe("HK$25,000");
    expect(invest.investStartLabel).toBe("Sep 2029");
    expect(invest.shelf).toBe("Balanced");
    expect(invest.growthLine).toMatch(/HK\$25,000 grows to about HK\$38,022 under Balanced/);
    expect(isReadableCalendarWhen(invest.whenLabel)).toBe(true);
  });
});

describe("plan timeline glance", () => {
  it("answers Fix / EF / goals / Invest on one journey view", () => {
    const plan = stressedRebuild({ fixMonths: 6 });
    const forecast = { netPct: 22, milestonePct: [0, 22, 40, 55, 60, 35], livingPct: 38, hardFail: false };
    const timeline = planTimeline(plan, forecast, FROM);
    const html = renderPlanJourneyHtml(timeline, escape);
    expect(html).toContain('data-journey');
    expect(html).not.toContain("ft-timeline");
    expect(html).not.toContain("ft-beat");
    expect(html).toMatch(/Your plan/);
    expect(html).not.toMatch(/data-kind="now"/);
    expect(html).toMatch(/data-fact="start"/);
    expect(html).toMatch(/Sep 2026/);
    expect(html).toMatch(/Mar 2027/);
    expect(html).toMatch(/Start Mar 2027 · complete Sep 2027|>Mar 2027</);
    expect(html).toMatch(/data-fact="complete"/);
    expect(html).toMatch(/HK\$20,000 a month until complete/);
    expect(html).toMatch(/May 2027 · 40%/);
    expect(html).toMatch(/Nov 2027 · 55%/);
    expect(html).toMatch(/Mar 2028 · 60%/);
    expect(html).toMatch(/Start saving/);
    expect(html).toMatch(/Enough to invest/);
    expect(html).toMatch(/Invest start/);
    expect(html).toMatch(/HK\$25,000 · Sep 2029/);
    expect(html).toMatch(/>Balanced</);
    expect(html).toMatch(/grows to about HK\$38,022 under Balanced/);
    expect(html).toMatch(/>Sooner</);
    expect(html).toMatch(/>Later</);
    expect(timeline.beats.find((b) => b.kind === "now")).toBeUndefined();
    expect(timeline.beats.find((b) => b.kind === "fix").whenLabel).toBe("Sep 2026 → Mar 2027");
    expect(timeline.beats.find((b) => b.kind === "goal" && /phone/i.test(b.name)).whenLabel).toBe("May 2027 · 40%");
    expect(timeline.beats.find((b) => b.kind === "goal" && /phone/i.test(b.name)).pct).toBe(40);
  });

  it("moving a Plan goal updates the timeline date", () => {
    const plan = stressedRebuild({ fixMonths: 6 });
    const phone = plan.milestones.find((m) => /phone/i.test(m.name));
    const later = persistLike(shiftLivingGoalMonths(plan, phone.id, 6));
    const before = planTimeline(plan, { milestonePct: [0, 22, 40, 55, 60, 35] }, FROM);
    const after = planTimeline(later, { milestonePct: [0, 22, 70, 55, 60, 35] }, FROM);
    const beforePhone = before.beats.find((b) => b.id === phone.id);
    const afterPhone = after.beats.find((b) => b.id === phone.id);
    expect(beforePhone.whenLabel).toBe("May 2027 · 40%");
    expect(afterPhone.whenLabel).toBe("Nov 2027 · 70%");
    expect(afterPhone.stage).toBe("plan");
    expect(afterPhone.pct).toBe(70);
    expect(afterPhone.pct).not.toBe(beforePhone.pct);
  });

  it("keeps stage-stack whenLabels as calendar dates, not tenor strings", () => {
    const plan = stressedRebuild({ fixMonths: 6 });
    const stack = stageStack(plan, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, FROM);
    const html = renderStageStackHtml(stack, escape);
    const rows = stack.flatMap((s) => s.rows);
    rows.forEach((row) => {
      expect(isReadableCalendarWhen(row.whenLabel), row.name).toBe(true);
      expect(row.whenLabel).not.toMatch(/3–6 months/);
    });
    expect(html).toMatch(/Sep 2026 → Mar 2027/);
    expect(html).toMatch(/Start Mar 2027 · complete Sep 2027/);
    expect(html).toMatch(/Start saving Sep 2027 · enough Sep 2029/);
  });
});
