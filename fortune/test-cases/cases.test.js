import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeFireHandoff } from "../../src/handoff.js";
import { EF_MILESTONE_ID } from "../../src/handoff.js";
import {
  BACK_TO_FORTUNE_LABEL,
  fortuneOutboundHref,
  fortuneReturnBarHtml,
  withFromFortune,
} from "../../src/refer.js";
import { killTestInput, runMonteCarlo } from "../../src/fortune/engine.js";
import {
  applyTheme,
  emergencyCurrentHkd,
  emergencySnapshot,
  migrateFortunePlan,
  newFortunePlan,
  setLivingGoalMonths,
  shiftLivingGoalMonths,
  upsertLivingGoal,
} from "../../src/fortune/model.js";
import { holdStatus, monthsFromDrag, stageStack, stackRows } from "../../src/fortune/journey.js";
import { canOpenPlan, ensureFireSequence, gateFortuneScreen, nextAfterStart, receiveFireHandoff } from "../../src/fortune/stabilize.js";
import { holdLineText, renderPlanJourneyHtml, renderStageStackHtml } from "../../src/fortune/ui.js";
import { isReadableCalendarWhen, planSchedule, planTimeline, projectShelfGrowth } from "../../src/fortune/timeline.js";
import { htmlShellForPath } from "../../src/pwa-shell.js";
import { APP_VERSION, FORTUNE_STRINGS } from "../../src/fortune/copy.js";
import { STRINGS } from "../../src/i18n.js";

const catalog = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));
const casesMd = readFileSync(new URL("./cases.md", import.meta.url), "utf8");
const REQUIRED = [
  "FT-DATE-01",
  "FT-EF-01",
  "FT-EF-02",
  "FT-INVEST-01",
  "FT-LOOP-01",
  "FT-ENTRY-01",
  "FT-FAIL-01",
  "FT-DRAG-01",
  "FT-OVERLAP-01",
  "FT-VER-01",
];

function byId(id) {
  return catalog.cases.find((c) => c.id === id);
}

function persistLike(plan, handoff = null) {
  return ensureFireSequence(migrateFortunePlan(plan), handoff);
}

function rebuildBoard(currentHkd = 25000) {
  const seeded = applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "none" }, "rebuild");
  seeded.moneyCapturedAtStabilize = true;
  seeded.boardReached = true;
  seeded.net = { ...seeded.net, currentHkd, floorHkd: 120000, emergencyMonths: 6 };
  return persistLike(seeded);
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("Fortune test-case catalog", () => {
  it("lists the standing Fortune ids in json and markdown", () => {
    expect(catalog.requiredIds).toEqual(REQUIRED);
    expect(catalog.cases.map((c) => c.id)).toEqual(REQUIRED);
    for (const id of REQUIRED) {
      expect(casesMd).toContain(`## ${id}`);
      const row = byId(id);
      expect(row, id).toBeTruthy();
      expect(row.tests.length).toBeGreaterThan(0);
      expect(row.tests[0]).toBe("fortune/test-cases/cases.test.js");
    }
    expect(catalog.process.bobFirst).toMatch(/npm test/i);
    expect(catalog.process.maddyAfter).toMatch(/Safari/i);
    expect(byId("FT-DATE-01").status).toBe("automated");
    expect(byId("FT-EF-01").status).toBe("automated");
    expect(byId("FT-EF-02").status).toBe("automated");
    expect(byId("FT-INVEST-01").status).toBe("automated");
    expect(byId("FT-FAIL-01").status).toBe("automated");
    expect(byId("FT-LOOP-01").status).toBe("safari_manual");
    expect(byId("FT-ENTRY-01").status).toBe("safari_manual");
    expect(byId("FT-LOOP-01").liveRequires).toBe("safari");
    expect(byId("FT-ENTRY-01").liveRequires).toBe("safari");
    expect(byId("FT-DRAG-01").status).toBe("automated");
    expect(byId("FT-OVERLAP-01").status).toBe("automated");
    expect(byId("FT-DRAG-01").liveRequires).toBe("safari");
    expect(byId("FT-OVERLAP-01").liveRequires).toBe("safari");
    expect(byId("FT-DRAG-01").automation).toBe("unit");
    expect(byId("FT-OVERLAP-01").automation).toBe("unit");
    expect(byId("FT-VER-01").status).toBe("safari_manual");
    expect(byId("FT-VER-01").liveRequires).toBe("safari");
    expect(byId("FT-VER-01").automation).toBe("unit_slice");
  });
});

describe("FT-DATE-01", () => {
  it("puts readable calendar dates on the journey and every stage row — never tenor-only whenLabels", () => {
    const from = new Date(2026, 8, 14);
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 3 }),
    );
    const forecast = { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 };
    const stack = stageStack(handed, forecast, {}, from);
    const rows = stack.flatMap((stage) => stage.rows);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    rows.forEach((row) => {
      expect(isReadableCalendarWhen(row.whenLabel), row.name).toBe(true);
      expect(row.whenLabel).not.toMatch(/3–6 months/);
    });
    const fix = rows.find((r) => r.stage === "fix");
    const floor = rows.find((r) => r.kind === "floor");
    const pot = rows.find((r) => /growth pot/i.test(r.name));
    expect(fix.name).toBe("Debt renegotiation · 3 months");
    expect(fix.whenLabel).toBe("Sep 2026 → Dec 2026");
    expect(floor.whenLabel).toMatch(/Start |Complete now/);
    expect(pot.whenLabel).toMatch(/Start saving /);

    const html = renderStageStackHtml(stack, escape);
    const htmlRows = html.match(/<div class="ft-row[\s\S]*?<\/div>/g) || [];
    expect(htmlRows.length).toBeGreaterThanOrEqual(4);
    htmlRows.forEach((row) => {
      expect(row).toMatch(/class="ft-row-when">[^<]+</);
    });
    expect(html).toMatch(/<strong>Debt renegotiation · 3 months<\/strong>/);
    expect(html).not.toMatch(/<strong>Sep 2026 → Dec 2026<\/strong>/);

    const timeline = planTimeline(handed, forecast, from);
    const journey = renderPlanJourneyHtml(timeline, escape);
    expect(journey).toContain("data-journey");
    expect(journey).toMatch(/Sep 2026 → Dec 2026/);
    expect(journey).toMatch(/data-fact="end"/);
    expect(journey).not.toMatch(/3–6 months/);
    expect(journey).not.toMatch(/data-kind="now"/);

    const waiting = stackRows(
      ensureFireSequence(
        applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
        makeFireHandoff({ source: "right-door", months: null }),
      ),
      null,
      from,
    );
    expect(waiting.find((r) => r.stage === "fix").whenLabel).toBe("Sep 2026 → Mar 2027");
    expect(isReadableCalendarWhen(waiting.find((r) => r.stage === "fix").whenLabel)).toBe(true);
  });
});

describe("FT-EF-01", () => {
  it("editing/pinning First growth pot does not change EF amount or duplicate the growth goal", () => {
    const plan = rebuildBoard(25000);
    const before = emergencySnapshot(plan);
    const pot = plan.milestones.find((m) => /first growth pot/i.test(m.name));
    expect(pot).toBeTruthy();
    expect(pot.stage).toBe("invest");

    const once = persistLike(upsertLivingGoal(plan, { name: pot.name, amount: "88000", months: pot.months }, pot.id));
    const twice = persistLike(upsertLivingGoal(once, { name: pot.name, amount: "88000", months: pot.months }, pot.id));
    const after = emergencySnapshot(twice);
    const pots = twice.milestones.filter((m) => /first growth pot/i.test(m.name));
    const investRows = stageStack(twice, { netPct: 20, milestonePct: [] })
      .find((s) => s.id === "invest")
      .rows.filter((r) => /first growth pot/i.test(r.name));
    const planRows = stageStack(twice, { netPct: 20, milestonePct: [] })
      .find((s) => s.id === "plan")
      .rows.filter((r) => /first growth pot/i.test(r.name));

    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(88000);
    expect(pots[0].id).toBe(pot.id);
    expect(pots[0].stage).toBe("invest");
    expect(investRows).toHaveLength(1);
    expect(planRows).toHaveLength(0);
    expect(emergencyCurrentHkd(twice)).toBe(25000);
    expect(after.currentHkd).toBe(before.currentHkd);
    expect(after.floorHkd).toBe(before.floorHkd);
    expect(after.floorId).toBe(EF_MILESTONE_ID);

    const blocked = persistLike(
      upsertLivingGoal(twice, { name: "First growth pot", amount: "99999", months: 36 }, EF_MILESTONE_ID),
    );
    expect(emergencyCurrentHkd(blocked)).toBe(25000);
    expect(blocked.milestones.filter((m) => /first growth pot/i.test(m.name))).toHaveLength(1);
  });
});

describe("FT-EF-02", () => {
  it("shows emergency-fund start and complete calendar dates on the journey", () => {
    const from = new Date(2026, 8, 14);
    const seeded = applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild");
    seeded.money = {
      ...seeded.money,
      incomeMonthly: 40000,
      spendMonthly: 20000,
      leftoverMonthly: 20000,
      savings: 0,
      debts: 0,
    };
    seeded.net = { ...seeded.net, currentHkd: 0, floorHkd: 120000, emergencyMonths: 6 };
    seeded.moneyCapturedAtStabilize = true;
    const plan = persistLike(seeded, makeFireHandoff({ source: "right-door", months: 6 }));
    const { ef, fix } = planSchedule(plan, null, from);
    expect(ef.targetMonths).toBe(6);
    expect(ef.startMonths).toBe(fix.endMonths);
    expect(ef.whenLabel).toBe("Start Mar 2027 · complete Sep 2027");
    const html = renderPlanJourneyHtml(planTimeline(plan, { netPct: 22, milestonePct: [] }, from), escape);
    expect(html).toMatch(/Start Mar 2027 · complete Sep 2027/);
    expect(html).toMatch(/data-fact="start"/);
    expect(html).toMatch(/data-fact="complete"/);
    expect(html).not.toMatch(/>Stabilize</);
  });
});

describe("FT-INVEST-01", () => {
  it("shows Invest start saving, enough-to-start, and a shelf μ growth line", () => {
    const from = new Date(2026, 8, 14);
    const seeded = applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild");
    seeded.money = {
      ...seeded.money,
      incomeMonthly: 40000,
      spendMonthly: 20000,
      leftoverMonthly: 20000,
      savings: 0,
      debts: 0,
    };
    seeded.net = { ...seeded.net, currentHkd: 0, floorHkd: 120000, emergencyMonths: 6 };
    seeded.moneyCapturedAtStabilize = true;
    const plan = persistLike(seeded, makeFireHandoff({ source: "right-door", months: 6 }));
    const { invest } = planSchedule(plan, null, from);
    expect(invest.startSaveLabel).toBe("Sep 2027");
    expect(invest.enoughLabel).toBe("Sep 2029");
    expect(projectShelfGrowth(25000, 36, 0.15)).toBe(38022);
    expect(invest.growthLine).toMatch(/sooner than cash-only|same month as cash-only/i);
    expect(invest.growthLine).toMatch(/if you invest this/i);
    expect(invest.growthLine).toMatch(/Illustrative under assumed return/);
    expect(invest.growthLine).not.toMatch(/custody|we hold|buy list|we invest for you/i);
    const html = renderPlanJourneyHtml(planTimeline(plan, { netPct: 22, milestonePct: [] }, from), escape);
    expect(html).toMatch(/Start saving Sep 2027 · enough Sep 2029/);
    expect(html).toMatch(/Enough to invest/);
    expect(html).toMatch(/Invest start/);
    expect(html).toMatch(/HK\$25,000 · Sep 2029/);
    expect(html).toMatch(/Vs cash-only|sooner than cash-only|same month as cash-only/);
    expect(html).toMatch(/data-journey-growth/);
    expect(html).toMatch(/Illustrative under assumed return/);
    expect(html).toMatch(/you act elsewhere/);
    expect(html).toMatch(/Projection only/);
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).toMatch(/Illustrative under assumed return/);
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).toMatch(/you act elsewhere/);
    expect(FORTUNE_STRINGS.en.journeyGrowthNote).not.toMatch(/we invest for you/);
  });
});

describe("FT-FAIL-01", () => {
  it("hard-fails 0 income / 0 savings / huge house and does not hold", () => {
    const forecast = runMonteCarlo(killTestInput(), { paths: 400, seed: 1 });
    expect(forecast.hardFail).toBe(true);
    expect(forecast.verdict).toBe("wrecked");
    expect(forecast.youAreSet).toBe(false);
    expect(forecast.livingPct).toBeLessThan(5);
    expect(forecast.netPct).toBeLessThan(5);

    const wrecked = applyTheme(newFortunePlan(), "rebuild");
    wrecked.money = { ...wrecked.money, savingsBand: "0", savings: 0 };
    const status = holdStatus(wrecked, forecast);
    expect(status.hard).toBe(true);
    const line = holdLineText(wrecked, forecast, false);
    expect(line).toMatch(/does not hold/i);
    expect(line).not.toMatch(/you'?re set/i);
  });
});

describe("FT-LOOP-01", () => {
  it("unit slice: fire links carry from=fortune and return to Step 1 with a Fix handoff", () => {
    expect(withFromFortune("../")).toBe("../?from=fortune");
    expect(fortuneOutboundHref("right-door")).toMatch(/from=fortune/);
    expect(fortuneOutboundHref("sunday")).toMatch(/from=fortune/);
    expect(BACK_TO_FORTUNE_LABEL).toBe("Back to Fortune Teller");
    expect(fortuneReturnBarHtml((s) => s)).toMatch(/Back to Fortune Teller/);

    const reached = {
      ...applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      privacyAccepted: true,
      boardReached: true,
    };
    expect(nextAfterStart(reached)).toBe("where");
    expect(gateFortuneScreen("start", reached)).toBe("where");
    expect(canOpenPlan(reached)).toBe(true);

    const received = receiveFireHandoff(reached, makeFireHandoff({ source: "right-door", months: 3 }));
    expect(received.milestones.find((m) => m.role === "fix").name).toBe("Debt renegotiation · 3 months");
  });

  it.skip("live Safari: Heavy → Open Right Door header Back to Fortune Teller → Me today (Maddy after Bob)", () => {
    expect(byId("FT-LOOP-01").liveRequires).toBe("safari");
  });
});

describe("FT-ENTRY-01", () => {
  it("unit slice: after privacy, every open is Step 1; Looks right does not auto-skip", () => {
    expect(nextAfterStart({ privacyAccepted: false })).toBe("start");
    const mid = { privacyAccepted: true, theme: "rebuild" };
    expect(nextAfterStart(mid)).toBe("where");
    expect(gateFortuneScreen("start", mid)).toBe("where");
    expect(gateFortuneScreen("where", { ...mid, boardReached: true })).toBe("where");
    expect(canOpenPlan(mid)).toBe(false);
    expect(canOpenPlan({ ...mid, boardReached: true })).toBe(true);
    expect(gateFortuneScreen("board", { ...mid, boardReached: true })).toBe("board");
    expect(gateFortuneScreen("board", mid)).toBe("next");
  });

  it.skip("live Safari: reload /fortune/ lands on Me today, not the board (Maddy after Bob)", () => {
    expect(byId("FT-ENTRY-01").liveRequires).toBe("safari");
  });
});

describe("FT-DRAG-01", () => {
  it("shifts living-goal months inside the same stage and extends phase end", () => {
    const plan = persistLike(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 6 }),
    );
    const visit = plan.milestones.find((m) => /family visit/i.test(m.name));
    const before = stageStack(plan, null).find((s) => s.id === "plan");
    const next = persistLike(shiftLivingGoalMonths(plan, visit.id, 12));
    const moved = next.milestones.find((m) => m.id === visit.id);
    expect(moved.months).toBe(visit.months + 12);
    expect(moved.stage).toBe("plan");
    expect(stageStack(next, null).find((s) => s.id === "plan").horizon).toBe(before.horizon + 12);
    expect(monthsFromDrag(8, 36)).toBe(11);
    expect(setLivingGoalMonths(plan, plan.milestones.find((m) => m.role === "fix").id, 18)).toBe(plan);

    const html = renderStageStackHtml(stageStack(plan, { netPct: 22, milestonePct: [40, 55, 60, 35] }), escape);
    expect(html).toMatch(/>Sooner</);
    expect(html).toMatch(/>Later</);
    expect(html).not.toMatch(/<div class="ft-timeline"/);
  });

  it.skip("live Safari: Sooner / Later and handle scrub months on a Plan row (Maddy after Bob)", () => {
    expect(byId("FT-DRAG-01").liveRequires).toBe("safari");
  });
});

describe("FT-OVERLAP-01", () => {
  it("allows Plan months inside the Fix/Stabilize window without changing stage or resurrecting path pins", () => {
    const plan = persistLike(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 6 }),
    );
    const phone = plan.milestones.find((m) => /phone/i.test(m.name));
    const overlapped = persistLike(setLivingGoalMonths(plan, phone.id, 4));
    expect(overlapped.milestones.find((m) => m.id === phone.id).stage).toBe("plan");
    const stack = stageStack(overlapped, { netPct: 20, milestonePct: [40, 55, 60, 35] });
    expect(stack.map((s) => s.id)).toEqual(["fix", "stabilize", "plan", "invest"]);
    expect(stack.find((s) => s.id === "stabilize").overlapsPrevious).toBe(true);
    expect(stack.find((s) => s.id === "plan").overlapsPrevious).toBe(true);
    const html = renderStageStackHtml(stack, escape);
    expect(html).toMatch(/also during Stabilize/);
    expect(html).not.toContain("ft-timeline");
    expect(html).not.toContain("ft-beat");
  });

  it.skip("live Safari: Plan Sooner into Stabilize shows overlaps hint; stack stays the home board (Maddy after Bob)", () => {
    expect(byId("FT-OVERLAP-01").liveRequires).toBe("safari");
  });
});

describe("FT-VER-01", () => {
  it("unit slice: Fortune version and HTML shell stay Fortune after an RD/Sunday path", () => {
    expect(APP_VERSION).toMatch(/0\.9\.10/);
    expect(FORTUNE_STRINGS.en.version).toBe(APP_VERSION);
    expect(FORTUNE_STRINGS.en.version).not.toMatch(/0\.8\.0/);
    expect(STRINGS.en.version).toMatch(/0\.8\.0/);
    expect(htmlShellForPath("/fortune/")).toBe("fortune/index.html");
    expect(htmlShellForPath("/debtrenegociation1/fortune")).toBe("fortune/index.html");
    expect(htmlShellForPath("/sunday/")).toBe("sunday/index.html");
    expect(htmlShellForPath("/")).toBe("index.html");
    expect(htmlShellForPath("/fortune/")).not.toBe(htmlShellForPath("/"));
  });

  it.skip("live Safari: Fortune footer v0.9.x → RD → Back → Fortune footer still Fortune, no hard refresh", () => {
    expect(byId("FT-VER-01").liveRequires).toBe("safari");
  });
});
