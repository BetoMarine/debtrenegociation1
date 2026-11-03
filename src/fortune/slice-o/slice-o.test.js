import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cashflowLabel, cushionPlan, formatDay, youToday } from "./dates.js";
import {
  MIXES,
  STORAGE_KEY,
  SUNDAY_PACK_URL,
  freshState,
  loadState,
  present,
  previewFrame,
  reduce,
  storeState,
} from "./flow.js";
import { buildSliceOPdf } from "./pdf.js";
import { decodeOffer, SAMPLE_OFFER } from "./shelf.js";
import { renderSliceO } from "./view.js";
import { keyboardOverlap } from "./app.js";

const BANNED = [
  /\bshe\b/i,
  /Empty until/i,
  /No Right Door card/i,
  /Pick a date/i,
  /Use this mix/i,
  /\bQA\b/,
  /dig-in/i,
  /PASS-BAR/i,
  /clunky hop/i,
  /you should buy/i,
];

function memory() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

function act(state, action) {
  return reduce(state, action).state;
}

function london() {
  let state = freshState({ asOf: "2026-11-03" });
  const go = (action) => {
    state = act(state, action);
  };
  go({ type: "next" });
  go({ type: "next" });
  go({ type: "edit", key: "income", value: "24000" });
  go({ type: "next" });
  go({ type: "edit", key: "bills", value: "6000" });
  go({ type: "edit", key: "personal", value: "6000" });
  go({ type: "next" });
  go({ type: "choose", field: "debt", value: "yes" });
  go({ type: "edit", key: "installment", value: "8000" });
  go({ type: "choose", field: "installmentIn", value: "no" });
  go({ type: "next" });
  return state;
}

function throughCushion() {
  let state = london();
  state = act(state, { type: "next" });
  state = act(state, { type: "next" });
  state = act(state, { type: "next" });
  state = act(state, { type: "next" });
  return state;
}

function assertClean(html) {
  for (const pattern of BANNED) expect(html).not.toMatch(pattern);
}

describe("Slice O dated spine", () => {
  it("walks income, expenses, then debt, and shows You today with one net", () => {
    const today = london();
    expect(today.screen).toBe("today");
    const picture = youToday(today);
    expect(picture.expenses).toBe(20000);
    expect(picture.net).toBe(4000);
    const html = renderSliceO(today);
    expect(html).toContain("You today");
    expect(html).toContain("Left this month");
    expect(html).toContain("+4,000");
    expect(html).toContain("This plan stays on this phone. Erase any time.");
    assertClean(html);
  });

  it("does not count an installment twice when it is already in expenses", () => {
    let state = london();
    state = act(state, { type: "back" });
    state = act(state, { type: "choose", field: "installmentIn", value: "yes" });
    state = act(state, { type: "next" });
    expect(youToday(state).net).toBe(12000);
    expect(youToday(state).installment).toBe(0);
  });

  it("opens Right Door or Sunday Pack before the cushion, with the Sunday URL", () => {
    const path = act(london(), { type: "next" });
    expect(path.screen).toBe("debtpath");
    const html = renderSliceO(path);
    expect(html).toContain("Fix debt first");
    expect(html).toContain(`href="${SUNDAY_PACK_URL}"`);
    expect(html).toContain(`href="${"https://betomarine.github.io/debtrenegociation1/?from=fortune#/reason"}"`);
    expect(html).not.toContain('href="../');
    expect(html).not.toMatch(/URL:\s*betomarine/);
    expect(html).not.toContain("sunday/?from=fortune<");
    expect(html).toContain("Open Right Door");
    expect(html).toContain("build \u2192 upload \u2192 THEN book");
    expect(html).not.toContain("Open Shelf");
    assertClean(html);
    const packed = reduce(path, { type: "door", door: "pack" });
    expect(packed.href).toBe(SUNDAY_PACK_URL);
    expect(packed.state.screen).toBe("cashflow");
    expect(packed.state.debtDoor).toBe("pack");
  });

  it("puts ~3 Feb 2027 on the plan from 3 Nov 2026, then a viable EF date on arrival", () => {
    let state = act(london(), { type: "next" });
    state = act(state, { type: "next" });
    expect(state.screen).toBe("cashflow");
    expect(cashflowLabel(state)).toBe("~3 Feb 2027");
    let html = renderSliceO(state);
    expect(html).toContain("~3 Feb 2027 · cashflow+");
    expect(html).toContain("Add to life timeline");
    assertClean(html);

    state = act(state, { type: "next" });
    expect(state.screen).toBe("cushion");
    const plan = cushionPlan(state);
    expect(formatDay(plan.date)).toBe("15 May 2027");
    expect(plan.viable).toBe(true);
    html = renderSliceO(state);
    expect(html).toContain("Ready by 15 May 2027");
    expect(html).toContain("Build your cushion");
    expect(html).not.toMatch(/Pick a date/i);
    assertClean(html);
  });

  it("shows the completion date on arrival when the cushion is already funded", () => {
    let state = throughCushion();
    state = act(state, { type: "back" });
    state = act(state, { type: "edit", key: "cushionNow", value: "40000" });
    state = act(state, { type: "edit", key: "cushionTarget", value: "30000" });
    expect(state.screen).toBe("cushion");
    expect(formatDay(cushionPlan(state).date)).toBe("3 Nov 2026");
    const html = renderSliceO(state);
    expect(html).toContain("Ready · 3 Nov 2026");
    expect(html).toContain("already in place");
    expect(html).not.toMatch(/Pick a date/i);
  });

  it("orders one card per action and keeps goals and Boost behind those dates", () => {
    const early = freshState({ asOf: "2026-11-03" });
    expect(act(early, { type: "go", screen: "boost" }).screen).toBe("home");
    expect(act(early, { type: "go", screen: "shelf" }).screen).toBe("home");
    expect(act(early, { type: "go", screen: "goals" }).screen).toBe("home");
    expect(renderSliceO(early)).not.toContain("Bring the bank offer");

    const timeline = throughCushion();
    expect(timeline.screen).toBe("timeline");
    const html = renderSliceO(timeline);
    expect(html).toContain("Your life plan");
    expect(html.indexOf("~3 Feb 2027")).toBeLessThan(html.indexOf("15 May 2027"));
    expect(html.indexOf("15 May 2027")).toBeLessThan(html.indexOf("After 15 May 2027"));
    expect(html).toContain("Goals + Boost");
    assertClean(html);

    const after = act(timeline, { type: "next" });
    expect(after.screen).toBe("after");
    const afterHtml = renderSliceO(after);
    expect(afterHtml).toContain("Goals + Boost");
    expect(afterHtml).toContain("Open goals &amp; Boost");
    expect(afterHtml).toContain("See Boost");
    assertClean(afterHtml);
  });

  it("keeps Boost as a reference benchmark and Shelf as an unbiased decode", () => {
    let state = act(throughCushion(), { type: "next" });
    state = act(state, { type: "go", screen: "boost" });
    expect(present(state).chip).toBe("Boost");
    expect(present(state).blocks.find((block) => block.type === "title").text).toBe("Boost mixes");
    let html = renderSliceO({ ...state, boostRef: "" });
    expect(html).toContain("Boost mixes");
    expect(html).toContain(">Boost<");
    expect(html).toContain("60/40");
    expect(html).toContain("80/20");
    expect(html).toContain("40/60");
    expect(html).toContain("not a product to buy");
    expect(html).toContain("internal benchmark");
    expect(html).toContain("Yes \u00b7 open Shelf");
    expect(html).toContain("Did your bank or manager give you a proposal?");
    expect(html).not.toMatch(/Linda BO/);
    expect(html).not.toMatch(/Use this mix/i);
    expect(html).not.toMatch(/<b>Unlocked<\/b>/);
    assertClean(html);

    state = act(state, { type: "choose", field: "mix", value: "growth" });
    expect(state.boostRef).toBe("growth");
    expect(MIXES).toHaveLength(3);

    state = act(state, { type: "go", screen: "shelf" });
    expect(decodeOffer(SAMPLE_OFFER).what).toBe("Long insurance+investment plan. HK$2,000 / month for 15 years.");
    expect(decodeOffer(SAMPLE_OFFER).paid).toMatch(/commission/i);
    expect(decodeOffer(SAMPLE_OFFER).costs).toMatch(/not a promise/);
    html = renderSliceO(state);
    expect(html).toContain("Bring the bank offer");
    expect(html).toContain("What it is");
    expect(html).toContain("Who may get paid");
    expect(html).toContain("don\u2019t tell you to buy");
    expect(html).not.toMatch(/you should buy/i);
    assertClean(html);

    const other = decodeOffer("Global Equity Fund, 10 years, illustrated 6% , no commission stated.");
    expect(other.what).toMatch(/investment/i);
    expect(other.paid).toMatch(/Ask if anyone earns a fee/);
    expect(`${other.what} ${other.costs} ${other.paid}`).not.toMatch(/should buy/i);
  });

  it("moves a goal that starts before the cushion, and keeps Boost on the same beat", () => {
    let state = act(throughCushion(), { type: "go", screen: "goals" });
    expect(state.goalDate).toBe("2027-05-15");
    const creating = renderSliceO(state);
    expect(creating).toContain("Save goal");
    expect(creating).not.toContain("See Boost");
    expect(creating).not.toContain("Open Shelf");
    state = act(state, { type: "edit", key: "goalName", value: "Course" });
    state = act(state, { type: "edit", key: "goalAmount", value: "8000" });
    state = act(state, { type: "edit", key: "goalDate", value: "2026-12-01" });
    state = act(state, { type: "next" });
    expect(state.goals[0].date).toBe("2027-05-15");
    expect(state.goalMoved).toBe(true);
    expect(state.screen).toBe("goalask");
    const html = renderSliceO(state);
    expect(html).toContain("Another goal?");
    expect(html).toContain("No \u00b7 go to Boost");
    expect(html).toContain("Yes \u00b7 add another");
    expect(html).toContain("Course");
    assertClean(html);
  });

  it("walks save, another goal, Boost, then Shelf or the PDF", () => {
    let state = act(throughCushion(), { type: "go", screen: "goals" });
    state = act(state, { type: "edit", key: "goalName", value: "Course" });
    state = act(state, { type: "edit", key: "goalAmount", value: "8000" });
    state = act(state, { type: "next" });
    expect(state.screen).toBe("goalask");
    const again = act(state, { type: "another", value: "yes" });
    expect(again.screen).toBe("goals");
    expect(again.goalName).toBe("");
    expect(renderSliceO(again)).not.toContain("Open Shelf");
    state = act(state, { type: "another", value: "no" });
    expect(state.screen).toBe("boost");
    const boost = renderSliceO(state);
    expect(boost).toContain("internal benchmark");
    expect(boost).toContain("not a product to buy");
    expect(boost).toContain("Did your bank or manager give you a proposal?");
    expect(boost).toContain("Yes \u00b7 open Shelf");
    expect(boost).toContain("No \u00b7 see the PDF");
    expect(boost).not.toMatch(/Linda|Use this mix|shop/i);
    expect(act(state, { type: "go", screen: "pdf" }).screen).toBe("pdf");
    const shelf = act(state, { type: "go", screen: "shelf" });
    expect(shelf.screen).toBe("shelf");
    const shelfHtml = renderSliceO(shelf);
    expect(shelfHtml).toContain("See the PDF");
    expect(shelfHtml).toContain("don\u2019t tell you to buy");
    const plan = renderSliceO(act(throughCushion(), { type: "go", screen: "timeline" }));
    expect(plan).toContain("See the PDF");
    assertClean(boost);
    assertClean(shelfHtml);
  });

  it("prints the same dated order, including You today", () => {
    const state = throughCushion();
    const sheet = renderSliceO(act(state, { type: "go", screen: "pdf" }));
    expect(sheet).toContain("Your dated plan");
    expect(sheet.indexOf("Debt fix")).toBeLessThan(sheet.indexOf("Emergency fund ready"));
    expect(sheet.indexOf("~3 Feb 2027")).toBeLessThan(sheet.indexOf("15 May 2027"));
    expect(sheet.indexOf("after 15 May")).toBeGreaterThan(sheet.indexOf("15 May 2027"));
    expect(sheet).toContain("at Boost");
    assertClean(sheet);

    const pdf = buildSliceOPdf(state).output();
    expect(pdf).toContain("YOU TODAY");
    expect(pdf).toContain("This plan stays on this phone. Erase any time.");
    expect(pdf).toContain("4,000");
    const debtAt = pdf.indexOf("Debt fix");
    const efAt = pdf.indexOf("Emergency fund ready");
    const goalsAt = pdf.indexOf("open after EF");
    const boostAt = pdf.indexOf("Boost");
    const shelfAt = pdf.indexOf("Shelf");
    expect(debtAt).toBeGreaterThan(-1);
    expect(debtAt).toBeLessThan(efAt);
    expect(efAt).toBeLessThan(goalsAt);
    expect(goalsAt).toBeLessThan(boostAt);
    expect(boostAt).toBeLessThan(shelfAt);
    expect(pdf.indexOf("~3 Feb 2027")).toBeLessThan(pdf.indexOf("15 May 2027"));
    expect(pdf).toMatch(/not a product to buy/i);
    expect(pdf).not.toMatch(/you should buy/i);
  });

  it("resumes the last step on this phone and can erase it", () => {
    const state = throughCushion();
    const store = memory();
    storeState(store, state);
    expect(store.getItem(STORAGE_KEY)).toBeTruthy();
    const again = loadState(store);
    expect(again.screen).toBe("timeline");
    expect(again.income).toBe("24000");
    expect(again.cushionSet).toBe(true);
    const wiped = reduce(again, { type: "erase" });
    expect(wiped.wipe).toBe(true);
    expect(wiped.state.screen).toBe("home");
    expect(wiped.state.income).toBe("");
    expect(renderSliceO(wiped.state)).toContain("Dated plan + Shelf");
  });

  it("opens a London frame on the matching screen", () => {
    expect(previewFrame("home").screen).toBe("home");
    expect(previewFrame("debtpath").screen).toBe("debtpath");
    expect(previewFrame("timeline").screen).toBe("timeline");
    expect(renderSliceO(previewFrame("cushion"))).toContain("Ready by 15 May 2027");
    expect(renderSliceO(previewFrame("cashflow"))).toContain("~3 Feb 2027");
    expect(previewFrame("boost").screen).toBe("boost");
    expect(previewFrame("shelf").screen).toBe("shelf");
    expect(previewFrame("pdf").screen).toBe("pdf");
    assertClean(renderSliceO(previewFrame("after")));
  });

  it("keeps the dock 16px clear and leaves live Fortune untouched", () => {
    const css = readFileSync("src/fortune/slice-o/slice-o.css", "utf8");
    expect(css).toMatch(/\.so-screen > \.so-dock\s*\{[^}]*position:\s*relative/);
    expect(css).toMatch(/\.so-body\s*\{[^}]*margin-bottom:\s*16px/);
    expect(css).not.toMatch(/\.so-dock\s*\{[^}]*position:\s*absolute/);
    expect(css).not.toMatch(/so-scroll-end/);
    expect(css).toMatch(/\.so-screen\s*\{[^}]*overflow:\s*hidden/);
    expect(keyboardOverlap(800, 500, 0)).toBe(300);
    expect(keyboardOverlap(800, 820, 0)).toBe(0);

    const fortuneHtml = readFileSync("fortune/index.html", "utf8");
    const fortuneMain = readFileSync("src/fortune/main.js", "utf8");
    const vite = readFileSync("vite.config.js", "utf8");
    const db = readFileSync("src/db.js", "utf8");
    expect(fortuneHtml).toContain("/src/fortune/main.js");
    expect(fortuneHtml).not.toContain("slice-o");
    expect(fortuneMain).toContain('from "./first-build/app.js"');
    expect(vite).toContain('fortune/index.html');
    expect(vite).toContain("fortune-o/index.html");
    expect(db).toContain("fortuneSliceA");
    expect(db).not.toContain("slice-o");
    expect(db).not.toContain("fortuneSliceO");
  });
});
