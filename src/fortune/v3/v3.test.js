/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FT_HOST_EN, FT_ZH_REVIEW } from "../../shared/ft-host-copy.js";
import { t } from "../../i18n.js";
import { declineStage1, newFortunePlan, stage1Ticked } from "../model.js";
import { exportWriteAvailable, fortuneLetterText, letterFileName } from "../rd-host.js";
import { V3_EN, v3 } from "./copy.js";
import { freshState, noDestination, reduce } from "./flow.js";
import { INVEST_CARDS, assignedCard, badYearLossPercent } from "./invest.js";
import { renderV3 } from "./render.js";

function textOf(state) {
  document.body.replaceChildren(renderV3(state));
  return document.body.textContent;
}

describe("Fortune v3 routing", () => {
  it("keeps the Design 01 answers until Beto lifts the HOLD", () => {
    expect(v3("s01Bank")).toBe("Yes, bank cards or loans");
    expect(v3("s01NotBank")).toBe("Yes, but not a bank");
    expect(v3("s01Managing")).toBe("No, I'm managing");
    let state = reduce(freshState(), { type: "cover-continue" });
    state = reduce(state, { type: "map-go" });
    expect(state.screen).toBe("s01");
    const view = textOf(state);
    expect(view).toContain("Yes, bank cards or loans");
    expect(view).not.toContain("Yes, bank or money-lender loans");
  });

  it("sends not-a-bank to cushion with the counselling line, and managing without it", () => {
    let state = reduce(freshState({ screen: "s01" }), { type: "answer-01", id: "not-bank" });
    expect(state.screen).toBe("s05");
    expect(state.plan.stage1.route).toBe("no-bank-debt");
    expect(stage1Ticked(state.plan)).toBe(true);
    expect(textOf(state)).toContain("3161 0102");
    state = reduce(freshState({ screen: "s01" }), { type: "answer-01", id: "managing" });
    expect(state.plan.stage1.route).toBe("managing");
    expect(textOf(state)).not.toContain("3161 0102");
    expect(reduce(state, { type: "cushion", months: 6 }).screen).toBe("map");
  });

  it("shows a plain tick at a glance and the no-bank line only after a tap", () => {
    const cushion = reduce(reduce(freshState({ screen: "s01" }), { type: "answer-01", id: "managing" }), { type: "cushion", months: 3 });
    expect(textOf(cushion)).not.toContain("No bank plan needed");
    expect(textOf(cushion)).toContain("✓");
    expect(textOf(reduce(cushion, { type: "toggle-reveal" }))).toContain("No bank plan needed");
  });

  it("routes a no to N1 for two lenders and N1b for one, with no IDRP on N1b", () => {
    const asked = {
      ...freshState({ screen: "map" }),
      plan: { ...newFortunePlan(), stage1: { ...newFortunePlan().stage1, status: "asked", route: "bank", startMonth: "2026-10", tenorMonths: 6 } },
      ui: { ...freshState().ui, lenderCount: 2, askedRoute: "idrp" },
      revealed: true,
    };
    const n1 = reduce(asked, { type: "they-said-no" });
    expect(n1.screen).toBe("n1");
    expect(stage1Ticked(n1.plan)).toBe(false);
    expect(n1.plan.stage1.status).toBe("declined");
    expect(textOf(n1)).toContain("Your lender said no");
    expect(textOf(n1)).toContain("hardship number");

    const one = reduce(
      { ...asked, ui: { ...asked.ui, lenderCount: 1, askedRoute: "hardship" } },
      { type: "they-said-no" },
    );
    expect(one.screen).toBe("n1b");
    const n1b = textOf(one);
    expect(n1b).toContain("3161 0102");
    expect(n1b).not.toContain("IDRP");
    expect(n1b).not.toContain("hardship number");
    expect(document.querySelector('a[href="tel:+85231610102"]')).toBeTruthy();
  });

  it("makes the counselling call primary after both routes were declined", () => {
    const plan = declineStage1(
      { ...newFortunePlan(), stage1: { ...newFortunePlan().stage1, status: "asked", route: "bank" } },
      "idrp",
      "2026-09",
    );
    const again = declineStage1(plan, "hardship", "2026-10");
    const dest = noDestination({ lenderCount: 2, declinedRoutes: again.stage1.declinedRoutes });
    expect(dest).toEqual({ screen: "n1", caritasPrimary: true });
    const view = textOf({
      ...freshState({ screen: "n1" }),
      plan: again,
      ui: { ...freshState().ui, lenderCount: 2, declinedRoutes: again.stage1.declinedRoutes, caritasPrimary: true },
    });
    expect(view).not.toContain("IDRP");
    expect(view).toContain("3161 0102");
  });

  it("labels exit, uses a radio group on the period, and keeps the compliance line", () => {
    const cover = textOf(freshState());
    expect(cover).toContain("Exit");
    expect(document.querySelector(".v3-exit").getAttribute("aria-label")).toBe("Quick exit");
    const situation = reduce(freshState({ screen: "s01c" }), { type: "tenor", months: 6 });
    textOf({ ...situation, screen: "s01c" });
    const group = document.querySelector('[role="radiogroup"]');
    expect(group.getAttribute("aria-labelledby")).toBe("v3-tenor-label");
    expect(document.querySelector('input[aria-label="6 months"]').checked).toBe(true);
    expect(document.body.textContent).not.toContain("months caption");
    const letter = textOf({ ...freshState({ screen: "s03b" }), rd: { ...freshState().rd, proof: 1, statements: 3, fullName: "Ada" } });
    expect(letter).toContain("Not affiliated with any bank or lender.");
    expect(letterFileName(new Date("2026-09-29"))).toBe("letter-2026-09.pdf");
    expect(fortuneLetterText({ fullName: "", tenorMonths: 6, askedRoute: "idrp" })).toContain("[Your accounts: card or loan, last 4 digits]");
  });
});

describe("invest cards and copy guards", () => {
  it("computes 10/15/20/25 and never assigns a card", () => {
    expect(assignedCard({ income: 1 })).toBeNull();
    expect(INVEST_CARDS.map((card) => badYearLossPercent(card.mu, card.swing))).toEqual([10, 15, 20, 25]);
    expect(INVEST_CARDS.every((card) => card.leverageNotional === 1)).toBe(true);
    expect(INVEST_CARDS[0].mix).toEqual({ stocks: 0.3, bonds: 0.45, reit: 0.1, cash: 0.15 });
    const cards = textOf({ ...freshState({ screen: "cards" }), plan: { ...newFortunePlan(), cushionBuiltAt: "2026-09" } });
    expect(cards).toContain("You pick");
    expect(cards).not.toMatch(/sooner|lever/i);
    expect(document.querySelector("[aria-pressed='true']")).toBeNull();
  });

  it("has no pylinvest mention and leaves the export writer for step 3", () => {
    const files = ["copy.js", "flow.js", "render.js", "boot.js", "invest.js"].map((name) =>
      readFileSync(join(process.cwd(), "src/fortune/v3", name), "utf8"),
    );
    const blob = files.join("\n");
    expect(blob).not.toMatch(/pylinvest|PYL Invest Brazil|com\.marinelli\.pylinvest/);
    expect(blob).not.toMatch(/sooner by|months sooner/i);
    expect(exportWriteAvailable()).toBe(false);
  });

  it("keeps standalone creditor copy and serves the lender question only on the fortune host", () => {
    expect(t("en", "creditorsTitle")).toBe("Creditors");
    expect(t("en", "creditorsTitle", null, { host: "fortune" })).toBe("How many lenders do you owe?");
    expect(FT_HOST_EN.complianceLender).toBe("Not affiliated with any bank or lender.");
    expect(FT_ZH_REVIEW).toBe("unreviewed");
    expect(V3_EN.e1.body).toContain("Right Door");
  });
});
