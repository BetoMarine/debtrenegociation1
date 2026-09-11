import { describe, expect, it } from "vitest";
import { applyTheme, newFortunePlan } from "./model.js";
import { stageStack } from "./journey.js";
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
    expect(html).toMatch(/stage rollup/i);
    expect(html).toContain("ft-row-ring");
    expect(html).not.toContain("ft-timeline");
    expect(html).not.toContain("ft-beat");
    expect(html).toMatch(/First growth pot/i);
    expect(html).toMatch(/is-current/);
  });

  it("keeps a thin Invest section on grow and labels the hold line", () => {
    const plan = applyTheme(newFortunePlan(), "grow");
    const html = renderStageStackHtml(stageStack(plan, { netPct: 10, milestonePct: [], livingPct: 10 }), escape);
    expect(html).toContain('data-stage="invest"');
    expect(html).toMatch(/Thin for now/i);
    const wrecked = applyTheme(newFortunePlan(), "rebuild");
    wrecked.money = { ...wrecked.money, savingsBand: "0", savings: 0 };
    const line = holdLineText(wrecked, { verdict: "wrecked", hardFail: true, livingPct: 2, netPct: 3 }, false);
    expect(line).toMatch(/does not hold/i);
    expect(line).toMatch(/floor first/i);
    expect(line).not.toMatch(/you'?re set/i);
  });
});
