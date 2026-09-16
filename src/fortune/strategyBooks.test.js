import { describe, expect, it } from "vitest";
import { applyTheme, migrateFortunePlan, newFortunePlan } from "./model.js";
import { isStabilizeReady } from "./stabilize.js";
import {
  bookForTemplate,
  boostVsCash,
  effectiveInvestMu,
  isGatedTemplate,
  planningMu,
  resolveTemplatePick,
  SILENT_INVEST_MU,
} from "./strategyBooks.js";
import {
  CASH_BENCHMARK,
  TEMPLATE_IDS,
  TEMPLATES,
  canonicalTemplateId,
  getTemplate,
  mixFiPercent,
} from "./templates.js";
import { timeToGoal } from "./timeToGoal.js";

function thinRebuild(overrides = {}) {
  return {
    ...applyTheme(newFortunePlan(), "rebuild"),
    money: {
      incomeMonthly: 22000,
      spendMonthly: 18000,
      savings: 0,
      debts: 400000,
      incomeBand: "15_30",
      spendBand: "10_20",
      savingsBand: "0",
      debtsBand: "400_1m",
    },
    net: { emergencyMonths: 6, floorHkd: 120000, currentHkd: 0 },
    templateId: "balanced",
    ...overrides,
  };
}

function fundedFloor(overrides = {}) {
  return {
    ...applyTheme(newFortunePlan(), "grow"),
    money: {
      incomeMonthly: 100000,
      spendMonthly: 42000,
      savings: 600000,
      debts: 0,
      incomeBand: "80_120",
      spendBand: "35_50",
      savingsBand: "400_800",
      debtsBand: "0",
    },
    net: { emergencyMonths: 6, floorHkd: 250000, currentHkd: 600000 },
    templateId: "balanced",
    ...overrides,
  };
}

describe("Fortune growth-pot shelf lock", () => {
  it("renames Steady → Firm and maps legacy ids on load", () => {
    expect(TEMPLATE_IDS).toEqual(["firm", "balanced", "growth", "frontier"]);
    expect(TEMPLATES.steady).toBeUndefined();
    expect(TEMPLATES.firm.label).toBe("Firm");
    expect(canonicalTemplateId("steady")).toBe("firm");
    expect(getTemplate("steady")).toEqual(TEMPLATES.firm);
    expect(migrateFortunePlan({ ...newFortunePlan(), templateId: "steady" }).templateId).toBe("firm");
  });

  it("locks planning μ / assumed swing", () => {
    expect(planningMu("firm")).toBe(0.12);
    expect(planningMu("steady")).toBe(0.12);
    expect(planningMu("balanced")).toBe(0.15);
    expect(planningMu("growth")).toBe(0.2);
    expect(planningMu("frontier")).toBe(0.35);
    expect(TEMPLATES.firm.sigma).toBe(0.16);
    expect(TEMPLATES.balanced.sigma).toBe(0.2);
    expect(TEMPLATES.growth.sigma).toBe(0.28);
    expect(TEMPLATES.frontier.sigma).toBe(0.45);
  });

  it("locks Firm FI under Balanced while Growth/Frontier keep falling FI", () => {
    const fi = TEMPLATE_IDS.map((id) => mixFiPercent(TEMPLATES[id].mix));
    expect(fi).toEqual([25, 30, 5, 0]);
    expect(TEMPLATES.firm.mix).toBe("48% stocks · 25% FI · 15% REIT · 12% cash");
    const firmHoldings = Object.fromEntries(bookForTemplate("firm").holdings.map((h) => [h.sleeve, h.weight]));
    expect(firmHoldings).toEqual({ stocks: 0.48, fixedIncome: 0.25, reit: 0.15, cash: 0.12 });
    expect(bookForTemplate("firm").fiWeight).toBe(0.25);
    expect(bookForTemplate("firm").fiWeight).toBeLessThan(bookForTemplate("balanced").fiWeight);
    expect(firmHoldings.stocks).toBeLessThan(
      bookForTemplate("balanced").holdings.find((h) => h.sleeve === "stocks").weight,
    );
    expect(bookForTemplate("balanced").fiWeight).toBeGreaterThan(bookForTemplate("growth").fiWeight);
    expect(bookForTemplate("growth").fiWeight).toBeGreaterThan(bookForTemplate("frontier").fiWeight);
    expect(bookForTemplate("frontier").fiWeight).toBe(0);
    expect(TEMPLATES.frontier.mix).not.toMatch(/[1-9]\d*\s*%\s*FI/);
  });

  it("shares Family A DNA for Firm/Balanced and separates Growth/Frontier", () => {
    const firm = bookForTemplate("firm");
    const balanced = bookForTemplate("balanced");
    const growth = bookForTemplate("growth");
    const frontier = bookForTemplate("frontier");
    expect(firm.family).toBe("A");
    expect(balanced.family).toBe("A");
    expect(firm.holdings.map((h) => h.symbol)).toEqual(balanced.holdings.map((h) => h.symbol));
    expect(firm.leverageNotional).toBe(1);
    expect(growth.family).toBe("B");
    expect(growth.leverageNotional).toBe(1.25);
    expect(frontier.family).toBe("C");
    expect(frontier.leverageNotional).toBe(2);
    const books = [firm, balanced, growth, frontier];
    books.forEach((book) => {
      const sum = book.holdings.reduce((acc, h) => acc + h.weight, 0);
      expect(sum).toBeCloseTo(1, 10);
      const blob = JSON.stringify(book);
      expect(blob).toMatch(/Projection proxy/i);
      expect(blob).not.toMatch(/buy list|buy-list|Finnhub|apiKey/i);
    });
    expect(TEMPLATES.firm.note).toMatch(/not a deposit/i);
    expect(TEMPLATES.growth.note).toMatch(/lever/i);
    expect(TEMPLATES.frontier.note).toMatch(/speculative/i);
    TEMPLATE_IDS.forEach((id) => {
      expect(TEMPLATES[id].note).toMatch(/not a fund we sell/i);
    });
  });

  it("BOOST vs cash uses Linda timeToGoal and locked shelf μ", () => {
    expect(CASH_BENCHMARK.mu).toBe(0.012);
    expect(TEMPLATES.firm).toMatchObject({ mu: 0.12, sigma: 0.16 });
    expect(TEMPLATES.balanced).toMatchObject({ mu: 0.15, sigma: 0.2 });
    expect(TEMPLATES.growth).toMatchObject({ mu: 0.2, sigma: 0.28 });
    expect(TEMPLATES.frontier).toMatchObject({ mu: 0.35, sigma: 0.45 });
    const opts = { goal: 180000, principal: 0, monthlySave: 8000 };
    const hit = timeToGoal(CASH_BENCHMARK.mu, planningMu("balanced"), opts);
    expect(hit.monthsInvest).toBeLessThan(hit.monthsCash);
    expect(hit.monthsSooner).toBe(hit.monthsCash - hit.monthsInvest);
    expect(hit.yearsSooner).toBe(hit.monthsSooner / 12);
    const boost = boostVsCash({
      goal: 180000,
      monthlySave: 8000,
      investMu: planningMu("balanced"),
    });
    expect(boost.cashMonths).toBe(hit.monthsCash);
    expect(boost.investMonths).toBe(hit.monthsInvest);
    expect(boost.soonerMonths).toBe(hit.monthsSooner);
    expect(boost.yearsSooner).toBe(hit.yearsSooner);
    expect(boost.investPot).toBeGreaterThan(boost.cashPot);
    expect(timeToGoal(0.012, 0.12, { goal: 10000, monthlySave: 10000 }).monthsInvest).toBe(1);
    expect(timeToGoal(0.012, 0.12, { goal: 50000, principal: 50000 }).monthsCash).toBe(0);
    expect(timeToGoal(0.012, 0.12, { goal: 50000, monthlySave: 0 }).monthsCash).toBeNull();
    const thin = thinRebuild();
    expect(isStabilizeReady(thin)).toBe(false);
    expect(effectiveInvestMu(thin)).toBe(SILENT_INVEST_MU);
    expect(effectiveInvestMu(fundedFloor())).toBe(planningMu("balanced"));
  });

  it("blocks Growth/Frontier until the EF floor is ready", () => {
    const thin = thinRebuild();
    const funded = fundedFloor();
    expect(isStabilizeReady(thin)).toBe(false);
    expect(isStabilizeReady(funded)).toBe(true);
    expect(isGatedTemplate("growth")).toBe(true);
    expect(isGatedTemplate("frontier")).toBe(true);
    expect(isGatedTemplate("firm")).toBe(false);
    expect(resolveTemplatePick(thin, "growth")).toEqual({ ok: false, templateId: "growth", reason: "floor" });
    expect(resolveTemplatePick(thin, "frontier").ok).toBe(false);
    expect(resolveTemplatePick(thin, "firm")).toMatchObject({ ok: true, templateId: "firm" });
    expect(resolveTemplatePick(funded, "growth")).toMatchObject({ ok: true, templateId: "growth" });
    expect(resolveTemplatePick(funded, "frontier")).toEqual({
      ok: true,
      templateId: "frontier",
      warnFrontier: true,
    });
    expect(resolveTemplatePick(thin, "steady").templateId).toBe("firm");
  });
});
