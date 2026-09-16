import { describe, expect, it } from "vitest";
import { applyTheme, newFortunePlan } from "./model.js";
import { makeFireHandoff } from "../handoff.js";
import { stageStack } from "./journey.js";
import { receiveFireHandoff } from "./stabilize.js";
import { holdLineText, renderStageStackHtml } from "./ui.js";

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("Fortune board chrome", () => {
  it("renders four stage sections with % rings and no path-pin home", () => {
    const plan = applyTheme({ ...newFortunePlan(), debtHeat: "heavy" }, "rebuild");
    plan.debtHeat = "heavy";
    const html = renderStageStackHtml(
      stageStack(plan, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38, hardFail: true }),
      escape,
      true,
    );
    expect(html).toContain('data-stage="fix"');
    expect(html).toContain('data-stage="stabilize"');
    expect(html).toContain('data-stage="plan"');
    expect(html).toContain('data-stage="invest"');
    expect(html).toMatch(/on these goals/i);
    expect(html).toContain("ft-row-ring");
    expect(html).not.toContain("ft-timeline");
    expect(html).not.toContain("ft-beat");
    expect(html).toMatch(/First growth pot/i);
    expect(html).toMatch(/is-current/);
  });

  it("labels Fix as debt renegotiation months, not an EF 3-month term", () => {
    const from = new Date(2026, 8, 14);
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 3 }),
    );
    const html = renderStageStackHtml(
      stageStack(handed, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, from),
      escape,
    );
    expect(html).toMatch(/<strong>Debt renegotiation · 3 months<\/strong>/);
    expect(html).toMatch(/class="ft-row-when">Sep 2026 → Dec 2026</);
    expect(html).toMatch(/Emergency fund · now HK\$/);
    expect(html).not.toMatch(/Emergency fund · now HK\$0 \(3 mo\)/);
    expect(html).not.toMatch(/<strong>Sep 2026 → Dec 2026<\/strong>/);
  });

  it("puts Sooner / Later on living goals and a date on every row", () => {
    const from = new Date(2026, 8, 14);
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 3 }),
    );
    const html = renderStageStackHtml(
      stageStack(handed, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, from),
      escape,
    );
    expect(html).toMatch(/>Sooner</);
    expect(html).toMatch(/>Later</);
    expect(html).toMatch(/data-time-delta="-1"/);
    expect(html).toMatch(/class="ft-row-when">[^<]+</);
    expect(html).toMatch(/data-horizon=/);
    expect(html).toMatch(/to /);
  });

  it("FT-DATE-01: puts a date or range on every Fix / Stabilize / Plan / Invest row", () => {
    const from = new Date(2026, 8, 14);
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 3 }),
    );
    const html = renderStageStackHtml(
      stageStack(handed, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, from),
      escape,
    );
    const rows = html.match(/<div class="ft-row[\s\S]*?<\/div>/g) || [];
    expect(rows.length).toBeGreaterThanOrEqual(4);
    rows.forEach((row) => {
      expect(row).toMatch(/class="ft-row-when">[^<]+</);
    });
    expect(html).toMatch(/<strong>Debt renegotiation · 3 months<\/strong>/);
    expect(html).toMatch(/class="ft-row-when">Sep 2026 → Dec 2026</);
    expect(html).toMatch(/Emergency fund · now HK\$/);
    expect(html).toMatch(/First growth pot[\s\S]*?class="ft-row-when">Start saving /);
    expect(html).not.toMatch(/<strong>Sep 2026 → Dec 2026<\/strong>/);
    expect(html).not.toMatch(/<strong>by /);
  });

  it("labels a 6-month pack tenor on Fix and keeps the date secondary", () => {
    const from = new Date(2026, 8, 14);
    const handed = receiveFireHandoff(
      applyTheme({ ...newFortunePlan(), theme: "rebuild", debtHeat: "heavy" }, "rebuild"),
      makeFireHandoff({ source: "right-door", months: 6 }),
    );
    const html = renderStageStackHtml(
      stageStack(handed, { netPct: 22, milestonePct: [40, 55, 60, 35], livingPct: 38 }, {}, from),
      escape,
    );
    expect(html).toMatch(/<strong>Debt renegotiation · 6 months<\/strong>/);
    expect(html).toMatch(/class="ft-row-when">Sep 2026 → Mar 2027</);
    expect(html).not.toMatch(/<strong>Sep 2026 → Mar 2027<\/strong>/);
  });

  it("keeps a thin Invest section on grow and labels the hold line", () => {
    const plan = applyTheme(newFortunePlan(), "grow");
    const html = renderStageStackHtml(stageStack(plan, { netPct: 10, milestonePct: [], livingPct: 10 }), escape);
    expect(html).toContain('data-stage="invest"');
    expect(html).toMatch(/Suggested mix \(after the emergency fund\)/i);
    expect(html).not.toMatch(/Thin for now/i);
    expect(html).not.toMatch(/fixedIncome|2800\.HK|\bREIT\b/i);
    const wrecked = applyTheme(newFortunePlan(), "rebuild");
    wrecked.money = { ...wrecked.money, savingsBand: "0", savings: 0 };
    const line = holdLineText(wrecked, { verdict: "wrecked", hardFail: true, livingPct: 2, netPct: 3 }, false);
    expect(line).toMatch(/does not hold/i);
    expect(line).toMatch(/emergency fund first/i);
    expect(line).not.toMatch(/you'?re set/i);
  });
});
