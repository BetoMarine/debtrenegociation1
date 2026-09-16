import { describe, expect, it } from "vitest";
import { makeFireHandoff } from "../handoff.js";
import { applyTheme, migrateFortunePlan, newFortunePlan, shiftLivingGoalMonths } from "./model.js";
import { applyFixMonths, ensureFireSequence } from "./stabilize.js";
import {
  FIX_ASSUMED_MONTHS,
  goalImpactReason,
  goalReachChance,
  investBoostLine,
  isReadableCalendarWhen,
  monthRangeLabel,
  planSchedule,
  planTimeline,
  projectShelfGrowth,
  shelfGrowthLine,
  soonerLagPhrase,
} from "./timeline.js";
import { renderPlanJourneyHtml, renderStageStackHtml } from "./ui.js";
import { stageStack } from "./journey.js";
import { boostVsCash, planningMu, SILENT_INVEST_MU } from "./strategyBooks.js";
import { CASH_BENCHMARK } from "./templates.js";
import { timeToGoal } from "./timeToGoal.js";
import { FORTUNE_STRINGS } from "./copy.js";

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

  it("lets a 6-month pick rewrite a 3-month pack tenor on the plan dates", () => {
    const three = stressedRebuild({ fixMonths: 3 });
    expect(planSchedule(three, null, FROM).fix.rangeLabel).toBe("Sep 2026 → Dec 2026");
    const six = persistLike(applyFixMonths(three, 6), makeFireHandoff({ source: "right-door", months: 3 }));
    const { fix } = planSchedule(six, null, FROM);
    expect(six.fixMonthsUserPicked).toBe(true);
    expect(fix.months).toBe(6);
    expect(fix.rangeLabel).toBe("Sep 2026 → Mar 2027");
    expect(fix.endLabel).toBe("Mar 2027");
    const html = renderPlanJourneyHtml(planTimeline(six, null, FROM), escape);
    expect(html).toMatch(/Mar 2027/);
    expect(html).toMatch(/data-fix-months="6"/);
    expect(html).toMatch(/Debt renegotiation · 6 months/);
    expect(html).not.toMatch(/Debt renegotiation · 3 months/);
    expect(html).not.toMatch(/Sep 2026 → Dec 2026/);
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

describe("Invest start and goal boost vs cash", () => {
  it("compounds Linda mix μ annually over the growth-pot horizon", () => {
    expect(projectShelfGrowth(25000, 36, 0.15)).toBe(38022);
    expect(projectShelfGrowth(25000, 36, planningMu("balanced"))).toBe(38022);
    expect(projectShelfGrowth(25000, 36, planningMu("firm"))).toBe(35123);
    expect(shelfGrowthLine({ amount: 25000, months: 36, templateId: "balanced" })).toMatch(
      /Over 3 years, HK\$25,000 grows to about HK\$38,022 under Balanced \(15% a year\)\. Projection only/,
    );
    expect(shelfGrowthLine({ amount: 0, months: 36, templateId: "firm" })).toMatch(/Pin a growth amount/);
    expect(shelfGrowthLine({ amount: 25000, months: 36, templateId: "balanced" })).not.toMatch(/custody|hold money|buy list/i);
  });

  it("answers when Invest saving starts and how much sooner the goal lands vs cash-only", () => {
    const { invest, ef } = planSchedule(stressedRebuild({ fixMonths: 6 }), null, FROM);
    expect(invest.startSaveMonths).toBe(ef.endMonths);
    expect(invest.startSaveLabel).toBe("Sep 2027");
    expect(invest.enoughLabel).toBe("Sep 2029");
    expect(invest.whenLabel).toBe("Start saving Sep 2027 · enough Sep 2029");
    expect(invest.thresholdLabel).toBe("HK$25,000");
    expect(invest.investStartLabel).toBe("Sep 2029");
    expect(invest.mix).toBe("Balanced");
    expect(invest.mu).toBe(SILENT_INVEST_MU);
    expect(invest.growthLine).toMatch(/if you invest this quieter mix/i);
    expect(invest.growthLine).toMatch(/cash-only/);
    expect(invest.growthLine).toMatch(/Illustrative under assumed return/);
    expect(invest.growthLine).toMatch(/you act elsewhere/);
    expect(invest.growthLine).not.toMatch(/we invest|we hold|buy list|rebalance for you|custody/i);
    expect(invest.growthLine).not.toMatch(/shelf|floor|rollup/i);
    expect(isReadableCalendarWhen(invest.whenLabel)).toBe(true);
  });

  it("shows a visible months-sooner boost for a large goal under mix μ vs cash 1.2%", () => {
    expect(CASH_BENCHMARK.mu).toBe(0.012);
    const hit = timeToGoal(0.012, 0.15, { goal: 180000, monthlySave: 8000 });
    expect(hit.monthsCash).toBeGreaterThan(hit.monthsInvest);
    expect(hit.monthsSooner).toBeGreaterThan(0);
    const boost = boostVsCash({
      goal: 180000,
      monthlySave: 8000,
      investMu: planningMu("balanced"),
      cashMu: CASH_BENCHMARK.mu,
    });
    expect(boost.soonerMonths).toBe(hit.monthsSooner);
    expect(boost.yearsSooner).toBe(hit.yearsSooner);
    expect(boost.investPot).toBeGreaterThan(boost.cashPot);
    const line = investBoostLine({
      name: "New car",
      templateLabel: "Balanced",
      mu: 0.15,
      boost,
      silent: false,
    });
    expect(line).toMatch(/If you invest this way under Balanced \(15% a year\)/);
    expect(line).toMatch(new RegExp(`New car lands sooner by ${soonerLagPhrase(boost.soonerMonths)} than cash-only`));
    expect(line).toMatch(/At the cash-only date the mix pot is about/);
    expect(line).toMatch(/Illustrative under assumed return — you act elsewhere/);
    expect(line).not.toMatch(/we invest|buy list|rebalance for you|custody|shelf|floor/i);
  });

  it("uses the picked card μ after the emergency fund is complete, not the silent 5%", () => {
    const funded = stressedRebuild({ fixMonths: 6, leftover: 8000, savings: 200000 });
    funded.templateId = "firm";
    const { invest, ef } = planSchedule(funded, null, FROM);
    expect(ef.ready).toBe(true);
    expect(invest.silent).toBe(false);
    expect(invest.mu).toBe(planningMu("firm"));
    expect(invest.mu).toBe(0.12);
    expect(invest.growthLine).toMatch(/If you invest this way under Firm \(12% a year\)/);
    expect(invest.growthLine).not.toMatch(/quieter mix/);
  });

  it("hard-locks BOOST copy as directions-only — never execute/buy/rebalance-for-you", () => {
    const execution = /we invest for you|rebalance for you|buy for you|\bwe (buy|trade|execute)\b/i;
    const samples = [
      investBoostLine({
        name: "New car",
        templateLabel: "Balanced",
        mu: 0.15,
        boost: { cashMonths: 24, investMonths: 18, soonerMonths: 6, cashPot: 100000, investPot: 120000 },
        silent: false,
      }),
      investBoostLine({
        name: "First growth pot",
        templateLabel: "Balanced",
        mu: 0.05,
        boost: { cashMonths: 24, investMonths: 18, soonerMonths: 6, cashPot: 100000, investPot: 105000 },
        silent: true,
      }),
      investBoostLine({
        name: "New car",
        templateLabel: "Firm",
        mu: 0.12,
        boost: { cashMonths: 12, investMonths: 12, soonerMonths: 0 },
        silent: false,
      }),
      investBoostLine({ name: "New car", templateLabel: "Growth", mu: 0.2, boost: {}, silent: false }),
    ];
    samples.forEach((line) => {
      expect(line).toMatch(/if you invest this/i);
      expect(line).toMatch(/Illustrative under assumed return/);
      expect(line).toMatch(/you act elsewhere/i);
      expect(line).not.toMatch(execution);
    });
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).toMatch(/Illustrative under assumed return/);
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).toMatch(/you act elsewhere/i);
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).toMatch(/Fortune does not invest for you/);
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).not.toMatch(execution);
  });
});

describe("goal success % that moves", () => {
  it("changes the % when a tight goal moves one month, with a plain-English reason", () => {
    const early = goalReachChance({ amount: 100000, months: 5, leftover: 20000, inflationOn: false });
    const later = goalReachChance({ amount: 100000, months: 6, leftover: 20000, inflationOn: false });
    expect(early.pct).toBeGreaterThan(0);
    expect(later.pct).toBeGreaterThan(early.pct);
    const easySoon = goalReachChance({ amount: 4000, months: 7, leftover: 20000, inflationOn: false });
    const easyLater = goalReachChance({ amount: 4000, months: 8, leftover: 20000, inflationOn: false });
    expect(easyLater.pct).not.toBe(easySoon.pct);
    expect(easyLater.pct).toBeGreaterThan(easySoon.pct);
    expect(easySoon.pct).toBeGreaterThan(0);
    expect(easyLater.pct).toBeLessThan(100);
    expect(goalImpactReason(-1, later.pct, early.pct)).toMatch(/less time to save/i);
    expect(goalImpactReason(1, early.pct, later.pct)).toMatch(/more time/i);
  });

  it("explains a stuck 0% instead of leaving it unexplained", () => {
    const stuck = goalReachChance({ amount: 80000, months: 8, leftover: 0, inflationOn: false });
    expect(stuck.pct).toBe(0);
    expect(stuck.reason).toMatch(/leftover/i);
    expect(stuck.stuck).toBe(true);
  });
});

describe("plan timeline glance", () => {
  it("answers Fix / EF / goals / Invest on one journey view", () => {
    const plan = stressedRebuild({ fixMonths: 6 });
    const forecast = { netPct: 22, milestonePct: [0, 22, 40, 55, 60, 35], livingPct: 38, hardFail: false };
    const timeline = planTimeline(plan, forecast, FROM);
    const html = renderPlanJourneyHtml(timeline, escape);
    const phone = timeline.beats.find((b) => b.kind === "goal" && /phone/i.test(b.name));
    expect(html).toContain("data-journey");
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
    expect(html).toMatch(new RegExp(`May 2027 · ${phone.pct}%`));
    expect(html).toMatch(/Start saving/);
    expect(html).toMatch(/Enough to invest/);
    expect(html).toMatch(/Invest start/);
    expect(html).toMatch(/HK\$25,000 · Sep 2029/);
    expect(html).toMatch(/>Balanced</);
    expect(html).toMatch(/cash-only/);
    expect(html).toMatch(/if you invest this/i);
    expect(html).toMatch(/Illustrative under assumed return/);
    expect(html).toMatch(/you act elsewhere/);
    expect(html).toMatch(/At cash-only date/);
    expect(html).not.toMatch(/we invest for you|rebalance for you|buy list/i);
    expect(html).not.toMatch(/stage rollup/i);
    expect(html).not.toMatch(/>Shelf</);
    expect(html).toMatch(/>Sooner</);
    expect(html).toMatch(/>Later</);
    expect(html).toMatch(/data-journey-reason/);
    expect(timeline.beats.find((b) => b.kind === "now")).toBeUndefined();
    expect(timeline.beats.find((b) => b.kind === "fix").whenLabel).toBe("Sep 2026 → Mar 2027");
    expect(phone.whenLabel).toBe(`May 2027 · ${phone.pct}%`);
    expect(phone.pct).toBeGreaterThan(0);
    expect(phone.reason).toMatch(/leftover|time to save|later/i);
  });

  it("moving a Plan goal updates the timeline date and the success %", () => {
    const plan = stressedRebuild({ fixMonths: 6, leftover: 8000 });
    const phone = plan.milestones.find((m) => /phone/i.test(m.name));
    const later = persistLike(shiftLivingGoalMonths(plan, phone.id, 6));
    const before = planTimeline(plan, null, FROM);
    const after = planTimeline(later, null, FROM);
    const beforePhone = before.beats.find((b) => b.id === phone.id);
    const afterPhone = after.beats.find((b) => b.id === phone.id);
    expect(beforePhone.whenLabel).toMatch(/^May 2027 · \d+%$/);
    expect(afterPhone.whenLabel).toMatch(/^Nov 2027 · \d+%$/);
    expect(afterPhone.stage).toBe("plan");
    expect(afterPhone.pct).not.toBe(beforePhone.pct);
    expect(afterPhone.pct).toBeGreaterThan(beforePhone.pct);
    expect(afterPhone.reason).toBeTruthy();
    const html = renderPlanJourneyHtml(after, escape);
    expect(html).toMatch(/data-journey-reason/);
    expect(html).not.toMatch(/May 2027 · 0%/);
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
    expect(html).not.toMatch(/stage rollup/i);
    expect(html).toMatch(/You're here/);
  });
});
