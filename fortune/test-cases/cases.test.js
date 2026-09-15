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
  upsertLivingGoal,
} from "../../src/fortune/model.js";
import { holdStatus, stageStack, stackRows } from "../../src/fortune/journey.js";
import { canOpenPlan, ensureFireSequence, gateFortuneScreen, nextAfterStart, receiveFireHandoff } from "../../src/fortune/stabilize.js";
import { holdLineText, renderStageStackHtml } from "../../src/fortune/ui.js";

const catalog = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));
const casesMd = readFileSync(new URL("./cases.md", import.meta.url), "utf8");
const REQUIRED = [
  "FT-DATE-01",
  "FT-EF-01",
  "FT-LOOP-01",
  "FT-ENTRY-01",
  "FT-FAIL-01",
  "FT-DRAG-01",
  "FT-OVERLAP-01",
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
    expect(byId("FT-FAIL-01").status).toBe("automated");
    expect(byId("FT-LOOP-01").status).toBe("safari_manual");
    expect(byId("FT-ENTRY-01").status).toBe("safari_manual");
    expect(byId("FT-LOOP-01").liveRequires).toBe("safari");
    expect(byId("FT-ENTRY-01").liveRequires).toBe("safari");
    expect(byId("FT-DRAG-01").status).toBe("not_built");
    expect(byId("FT-OVERLAP-01").status).toBe("not_built");
  });
});

describe("FT-DATE-01", () => {
  it("puts whenLabel / date on every milestone row and keeps Fix months on the title", () => {
    const from = new Date(2026, 8, 14);
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 3 }),
    );
    const stack = stageStack(handed, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, from);
    const rows = stack.flatMap((stage) => stage.rows);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    rows.forEach((row) => {
      expect(row.whenLabel, row.name).toMatch(/\S/);
    });
    const fix = rows.find((r) => r.stage === "fix");
    const floor = rows.find((r) => r.kind === "floor");
    const pot = rows.find((r) => /growth pot/i.test(r.name));
    expect(fix.name).toBe("Debt renegotiation · 3 months");
    expect(fix.whenLabel).toBe("Dec 2026");
    expect(floor.whenLabel).toMatch(/^by [A-Z][a-z]{2} 20\d\d$/);
    expect(pot.whenLabel).toMatch(/^by /);

    const html = renderStageStackHtml(stack, escape);
    const htmlRows = html.match(/<div class="ft-row[\s\S]*?<\/div>/g) || [];
    expect(htmlRows.length).toBeGreaterThanOrEqual(4);
    htmlRows.forEach((row) => {
      expect(row).toMatch(/class="ft-row-when">[^<]+</);
    });
    expect(html).toMatch(/<strong>Debt renegotiation · 3 months<\/strong>/);
    expect(html).not.toMatch(/<strong>Dec 2026<\/strong>/);

    const waiting = stackRows(
      ensureFireSequence(
        applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
        makeFireHandoff({ source: "right-door", months: null }),
      ),
      null,
      from,
    );
    expect(waiting.find((r) => r.stage === "fix").whenLabel).toBe("3–6 months");
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
  it("is cataloged as not_built", () => {
    expect(byId("FT-DRAG-01").status).toBe("not_built");
    expect(byId("FT-DRAG-01").automation).toBe("none");
  });

  it.skip("not_built: drag-to-reorder living goal rows on the board", () => {
    expect(byId("FT-DRAG-01").status).toBe("not_built");
  });
});

describe("FT-OVERLAP-01", () => {
  it("is cataloged as not_built (no overlapping path-pin home board)", () => {
    expect(byId("FT-OVERLAP-01").status).toBe("not_built");
    expect(byId("FT-OVERLAP-01").automation).toBe("none");
  });

  it.skip("not_built: overlapping path pins are out of the Fortune home board", () => {
    expect(byId("FT-OVERLAP-01").status).toBe("not_built");
  });
});
