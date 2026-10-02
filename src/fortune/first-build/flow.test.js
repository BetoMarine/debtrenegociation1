import { describe, expect, it } from "vitest";
import { FORTUNE_DATA_KEYS, newPack } from "../../db.js";
import {
  FRAME_IDS,
  LIFE_DISCLAIMER,
  PRIVACY_STRIP,
  canContinue,
  cushionReady,
  freshState,
  hydrate,
  parseAmount,
  present,
  reduce,
} from "./flow.js";
import { buildLife, rightDoorJoined } from "./life.js";
import { renderFirstBuild } from "./view.js";

function go(state, action) {
  return reduce(state, action).state;
}

function money(state, key, amount, note = "") {
  return go(state, { type: "edit", key, amount, note });
}

describe("Slice A first-build flow", () => {
  it("cold start is Where are you, with the three doors and no dig-in", () => {
    const view = present(freshState());
    expect(view.frame).toBe("W0-where-are-you");
    expect(view.title).toBe("Where are you?");
    expect(view.choices.map((c) => c.label)).toEqual([
      "Under money stress",
      "Stable — building a cushion",
      "Ready to plan what’s next",
    ]);
    const html = renderFirstBuild(freshState());
    expect(html).not.toMatch(/dig-in/i);
    expect(html).not.toMatch(/I need to rebuild/);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/Skip/);
  });

  it("routes stressed, stable, and OK onto different spines after take-home", () => {
    for (const [entry, screen] of [
      ["stressed", "f0"],
      ["stable", "s0"],
      ["ok", "g0"],
    ]) {
      let state = go(freshState(), { type: "pick-entry", entry });
      expect(state.screen).toBe("i0");
      expect(go(state, { type: "continue" }).screen).toBe("i0");
      state = money(state, "takeHome", "20000");
      state = go(state, { type: "continue" });
      expect(state.screen).toBe("ic");
      expect(present(state).title).toBe("Monthly costs");
      expect(go(state, { type: "continue" }).screen).toBe("ic");
      state = money(state, "monthlyCosts", "10000");
      expect(go(state, { type: "continue" }).screen).toBe(screen);
    }
  });

  it("keeps I1 copy and requires an actual amount before Fix situations", () => {
    let state = money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "18000");
    state = go(state, { type: "continue" });
    state = go(money(state, "monthlyCosts", "9000"), { type: "continue" });
    state = go(state, { type: "pick-fix", situation: "missed" });
    expect(state.screen).toBe("i1");
    expect(present(state).title).toBe("Still due this month");
    expect(present(state).body).toBe("What you still need to cover.");
    expect(present(state).skip).toBe(false);
    expect(go(state, { type: "continue" }).screen).toBe("i1");
    state = money(state, "stillDue", "0", "rent left");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("f1");
    expect(state.inputs.stillDue.note).toBe("rent left");
  });

  it("walks missed payments through two surgical numbers, then holds for Right Door", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "15000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "8000"), { type: "continue" });
    state = go(state, { type: "pick-fix", situation: "soon" });
    state = go(money(state, "stillDue", "4000"), { type: "continue" });
    expect(state.screen).toBe("f2");
    expect(present(state).rdLater).toBe(true);
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("fd");
    expect(present(state).title).toBe("This month");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("fd2");
    const lenders = go(state, { type: "pick-next", pick: "lenders" });
    expect(lenders.screen).toBe("tl");
    expect(present(lenders).title).toBe("Debt amount");
    expect(renderFirstBuild(lenders)).not.toMatch(/from=fortune|sunday|Right Door letter|import|docs/i);
    expect(renderFirstBuild(lenders)).not.toMatch(/Prioritise|Remove|Skip|not pay/i);

    state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "15000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "8000"), { type: "continue" });
    state = go(state, { type: "pick-fix", situation: "worry" });
    state = go(money(state, "stillDue", "1"), { type: "continue" });
    expect(state.screen).toBe("f3");
    expect(go(state, { type: "continue" }).screen).toBe("fd");

    state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "15000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "8000"), { type: "continue" });
    state = go(state, { type: "pick-fix", situation: "missed" });
    state = go(money(state, "stillDue", "1"), { type: "continue" });
    expect(state.screen).toBe("f1");
    expect(present(state).rdLater).toBe(false);
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("i2");
    expect(go(state, { type: "continue" }).screen).toBe("i2");
    state = go(money(state, "overdue", "8500"), { type: "continue" });
    expect(state.screen).toBe("i2b");
    expect(present(state).input.label).toBe("Days");
    expect(present(state).input.prefix).toBe("");
    state = go(state, { type: "edit", key: "daysLate", days: "40" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("fd");
    expect(state.fixHeldForRightDoor).toBe(false);
    expect(renderFirstBuild(state)).not.toMatch(/Right Door letter/i);
  });

  it("sends stable through cushion amounts into planning, and OK straight to planning", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = go(money(state, "takeHome", "30000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "12000"), { type: "continue" });
    expect(state.screen).toBe("s0");
    state = go(state, { type: "pick-cushion", situation: "none" });
    expect(state.screen).toBe("s1");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("i3");
    expect(canContinue(money(state, "cushionNow", "0"))).toBe(true);
    state = go(money(state, "cushionNow", "0"), { type: "continue" });
    expect(state.screen).toBe("i3b");
    state = go(money(state, "cushionTarget", "90000"), { type: "continue" });
    expect(state.screen).toBe("sd");
    state = go(money(state, "monthlySave", "1000"), { type: "continue" });
    expect(state.screen).toBe("sd2");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(true);

    state = go(freshState(), { type: "pick-entry", entry: "ok" });
    state = go(money(state, "takeHome", "42000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "20000"), { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(cushionReady(state)).toBe(false);
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(true);
    const locked = go(state, { type: "pick-grow", pick: "invest" });
    expect(locked.screen).toBe("g3");
    expect(present(locked).callout.title).toBe("Cushion not ready");
    expect(present(locked).primary).toBe("Continue");
    expect(present(locked).showPlan).toBe(true);
    expect(present(locked).body).toBe("Still locked until your cushion is ready.");
    expect(go(locked, { type: "continue" }).screen).toBe("g0");
    expect(go(locked, { type: "back" }).screen).toBe("g0");
  });

  it("unlocks Invest only when current savings cover a real target", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = go(money(state, "takeHome", "50000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "20000"), { type: "continue" });
    state = go(state, { type: "pick-cushion", situation: "ok" });
    state = go(state, { type: "continue" });
    state = go(money(state, "cushionNow", "10000"), { type: "continue" });
    state = go(money(state, "cushionTarget", "30000"), { type: "continue" });
    state = go(money(state, "monthlySave", "2000"), { type: "continue" });
    expect(state.screen).toBe("sd2");
    state = go(state, { type: "continue" });
    expect(cushionReady(state)).toBe(false);
    expect(state.screen).toBe("g0");
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(true);

    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    expect(state.screen).toBe("i3");
    state = go(money(state, "cushionNow", "30000"), { type: "continue" });
    state = go(money(state, "cushionTarget", "30000"), { type: "continue" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("sd2");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("sd3");
    expect(cushionReady(state)).toBe(true);
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(false);
    const open = go(state, { type: "pick-grow", pick: "invest" });
    expect(present(open).callout.title).toBe("Unlocked");
    expect(present(open).body).toBe("Your cushion is ready — this can open.");
    expect(renderFirstBuild(open)).not.toMatch(/Cushion not ready/);
    expect(renderFirstBuild(open)).not.toMatch(/Still locked/);
  });

  it("erase wipes Fortune only and returns to an empty Where are you", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "1000"), { type: "continue" });
    expect(go(state, { type: "open-erase" }).screen).toBe("ic");
    state = go(go(state, { type: "back" }), { type: "back" });
    expect(state.screen).toBe("w0");
    state = go(state, { type: "open-erase" });
    expect(state.screen).toBe("e0");
    expect(renderFirstBuild(state)).toMatch(/Erase Fortune Teller on this phone/);
    expect(go(state, { type: "cancel-erase" }).screen).toBe("w0");
    state = go(state, { type: "open-erase" });
    const wiped = reduce(state, { type: "confirm-erase" });
    expect(wiped.wipe).toBe(true);
    expect(wiped.state.screen).toBe("e1");
    expect(wiped.state.entry).toBeNull();
    expect(wiped.state.fixSituation).toBeNull();
    expect(wiped.state.inputs.takeHome.amount).toBe("");
    expect(present(wiped.state).title).toBe("Fortune Teller erased from this phone.");
    const clean = go(wiped.state, { type: "erase-ok" });
    expect(clean).toEqual(freshState());
    expect(hydrate(clean).screen).toBe("w0");
    expect(hydrate(clean).entry).toBeNull();

    expect(FORTUNE_DATA_KEYS).toEqual([
      "fortunePlan",
      "fortuneForecast",
      "fortuneUi",
      "fortuneFireHandoff",
      "fortuneSliceA",
    ]);
    expect(FORTUNE_DATA_KEYS).not.toContain("pack");
    expect(FORTUNE_DATA_KEYS).not.toContain("sundayPack");
    expect(FORTUNE_DATA_KEYS).not.toContain("sundayLang");
  });

  it("resumes the current stage and drops a sticky journey after a bad save", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "ok" });
    state = go(money(state, "takeHome", "22000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "8000"), { type: "continue" });
    state = go(state, { type: "pick-grow", pick: "goals" });
    expect(hydrate(state).screen).toBe("g1");
    expect(hydrate({ ...state, screen: "e0" }).screen).toBe("w0");
    expect(hydrate({ version: 1, screen: "f1", entry: "stressed" }).screen).toBe("f0");
    expect(hydrate(null)).toBeNull();
  });

  it("covers every first-build frame and never offers Skip on amount cards", () => {
    const seen = new Set();
    const mark = (state) => seen.add(present(state).frame);
    let stressed = go(freshState(), { type: "pick-entry", entry: "stressed" });
    mark(freshState());
    mark(stressed);
    stressed = money(stressed, "takeHome", "1");
    stressed = go(stressed, { type: "continue" });
    stressed = go(money(stressed, "monthlyCosts", "1"), { type: "continue" });
    mark(stressed);
    stressed = go(stressed, { type: "pick-fix", situation: "missed" });
    mark(stressed);
    stressed = go(money(stressed, "stillDue", "1"), { type: "continue" });
    mark(stressed);
    stressed = go(stressed, { type: "continue" });
    mark(stressed);
    stressed = go(money(stressed, "overdue", "1"), { type: "continue" });
    mark(stressed);
    const soon = go(
      go(go(go(stressed, { type: "back" }), { type: "back" }), { type: "back" }),
      { type: "pick-fix", situation: "soon" },
    );
    mark(go(money(soon, "stillDue", "1"), { type: "continue" }));
    const worry = go(go(soon, { type: "back" }), { type: "pick-fix", situation: "worry" });
    mark(go(worry, { type: "continue" }));

    let stable = go(freshState(), { type: "pick-entry", entry: "stable" });
    stable = go(money(stable, "takeHome", "2"), { type: "continue" });
    stable = go(money(stable, "monthlyCosts", "1"), { type: "continue" });
    mark(stable);
    for (const situation of ["none", "small", "ok"]) {
      const detail = go(stable, { type: "pick-cushion", situation });
      mark(detail);
    }
    stable = go(go(stable, { type: "pick-cushion", situation: "small" }), { type: "continue" });
    mark(stable);
    stable = go(money(stable, "cushionNow", "10"), { type: "continue" });
    mark(stable);
    stable = go(money(stable, "cushionTarget", "20"), { type: "continue" });
    stable = go(money(stable, "monthlySave", "1"), { type: "continue" });
    stable = go(stable, { type: "continue" });
    mark(stable);
    mark(go(stable, { type: "pick-grow", pick: "goals" }));
    mark(go(stable, { type: "pick-grow", pick: "insurance" }));
    mark(go(stable, { type: "pick-grow", pick: "invest" }));

    const erase = go(freshState(), { type: "open-erase" });
    mark(erase);
    mark(reduce(erase, { type: "confirm-erase" }).state);

    const expected = Object.values(FRAME_IDS)
      .map((id) => (id === "G3-invest-locked" ? "Gd3-invest-still-locked" : id))
      .sort();
    expect([...seen].sort()).toEqual(expected);
    for (const id of ["i0", "i1", "i2", "i2b", "i3", "i3b"]) {
      const view = present({ ...freshState(), screen: id });
      expect(view.skip).toBe(false);
      expect(view.primary).toBe("Continue");
      expect(renderFirstBuild({ ...freshState(), screen: id, entry: id.startsWith("i3") ? "stable" : "stressed", fixSituation: "missed", cushionSituation: "small" })).not.toMatch(/Skip/);
    }
  });

  it("accepts actual numbers including zero and rejects blanks", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("  ")).toBeNull();
    expect(parseAmount("HK$20,000")).toBe(20000);
    expect(parseAmount("0")).toBe(0);
    expect(parseAmount("-1")).toBeNull();
    expect(canContinue(money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "0"))).toBe(true);
  });
});

function settled(state) {
  return { ...state, lifeBaseline: null, lifeMove: null };
}

function todayHtml(html) {
  const rest = html.split('data-ms="today"')[1] || "";
  const end = rest.search(/data-ms="(?:rd|ef)"/);
  return end === -1 ? rest : rest.slice(0, end);
}

function milestoneIds(html) {
  return [...html.matchAll(/data-ms="(today|expect|rd|ef|invest|goals|age)"/g)].map((match) => match[1]);
}

function saveLineYs(html) {
  const chunk = html.includes('data-ms="ef"') ? html.split('data-ms="ef"')[1] : html;
  const match = chunk.match(/stroke="#5eead4"[^>]*points="([^"]+)"/);
  if (!match) return [];
  return match[1].split(" ").map((pair) => Number(pair.split(",")[1]));
}

describe("Slice B Your life", () => {
  it("keeps Where are you as the door and reaches Your life without a journey rewrite", () => {
    const home = renderFirstBuild(freshState());
    expect(home).toMatch(/Where are you/);
    expect(home).toMatch(/Under money stress/);
    expect(home).toMatch(/data-act="open-life"/);
    const life = go(freshState(), { type: "open-life" });
    expect(life.screen).toBe("l0");
    expect(life.lifeFrom).toBe("w0");
    expect(go(life, { type: "back" }).screen).toBe("w0");
    expect(renderFirstBuild(life)).toMatch(/Today → age 70/);
    expect(renderFirstBuild(life)).toMatch(/Invest &amp; insurance/);
    expect(renderFirstBuild(life)).toMatch(/Later pass · Insurance · Invest boost/);
    expect(renderFirstBuild(life)).toMatch(/Later pass · Per-goal % · Overall success/);
    expect(renderFirstBuild(life)).toMatch(/Age 70/);
    expect(renderFirstBuild(life)).toMatch(/Add milestones as you plan/);
    expect(renderFirstBuild(life)).not.toMatch(/Back to input/);
    expect(renderFirstBuild(life)).not.toMatch(/behaviour score|behavior score/i);
  });

  it("paints a negative net red and a positive net teal with Steady so far", () => {
    const stressed = go(
      money(
        money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "18400"),
        "monthlyCosts",
        "24900",
      ),
      { type: "open-life" },
    );
    const stressedHtml = renderFirstBuild(stressed);
    const stressedToday = todayHtml(stressedHtml);
    expect(stressedToday).toMatch(/If nothing changes/);
    expect(stressedToday).toMatch(/Net –6,500/);
    expect(stressedToday).toContain("#dc2626");
    expect(stressedToday).not.toContain("#0d9488");
    expect(stressedToday).not.toContain("#5eead4");
    expect(stressedToday).not.toMatch(/Steady so far/);
    expect(stressedHtml).toMatch(/Get through this month/);

    for (const entry of ["stable", "ok"]) {
      const state = go(money(go(freshState(), { type: "pick-entry", entry }), "takeHome", "22000"), {
        type: "open-life",
      });
      const today = todayHtml(renderFirstBuild(state));
      expect(today).toMatch(/Steady so far/);
      expect(today).toMatch(/Net \+22,000/);
      expect(today).toContain("#0d9488");
      expect(today).not.toContain("#dc2626");
    }
    expect(renderFirstBuild(go(money(go(freshState(), { type: "pick-entry", entry: "stable" }), "takeHome", "22000"), { type: "open-life" }))).toMatch(
      /Build a cushion/,
    );
  });

  it("moves TODAY net from take-home first, and from still due, overdue, and days late", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = money(state, "stillDue", "24900");
    state = money(state, "takeHome", "22800");
    state = settled(state);
    state = money(state, "takeHome", "18400");
    expect(buildLife(state).today.net).toBe(-6500);
    const card = renderFirstBuild(state);
    expect(card).toMatch(/Monthly take-home/);
    expect(card).toMatch(/Show my current plan/);
    expect(card).not.toMatch(/data-ms="today"/);
    const plan = go(state, { type: "show-plan" });
    expect(plan.lifeFrom).toBe("i0");
    const primary = renderFirstBuild(plan);
    expect(primary).toMatch(/Net –6,500/);
    expect(primary).toMatch(/Was –2,100 · take-home updated/);
    expect(primary).toMatch(/Income 18,400 · Expenses 24,900/);
    expect(primary).toMatch(/Back to input/);
    expect(primary).not.toMatch(/Monthly take-home/);
    expect(todayHtml(primary)).not.toContain("#0d9488");
    const returned = go(plan, { type: "back-to-input" });
    expect(returned.screen).toBe("i0");
    expect(returned.inputs.takeHome.amount).toBe("18400");

    state = settled(state);
    state = money(state, "stillDue", "20000");
    expect(buildLife(state).today.net).toBe(-1600);
    expect(buildLife(state).today.delta).toMatch(/still due updated/);

    state = settled(state);
    state = money(state, "overdue", "1200");
    expect(buildLife(state).today.expenses).toBe(21200);
    expect(buildLife(state).today.net).toBe(-2800);

    state = settled(state);
    state = go(state, { type: "edit", key: "daysLate", days: "4" });
    expect(buildLife(state).today.daysText).toBe("Days late 4");
    state = settled(state);
    state = go(state, { type: "edit", key: "daysLate", days: "9" });
    expect(buildLife(state).today.daysText).toBe("Days late 9");
    expect(buildLife(state).today.daysDelta).toMatch(/Was 4 · days late updated/);
  });

  it("moves the emergency-fund now, target, and percent from cushion inputs", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = money(state, "cushionTarget", "60000");
    state = money(state, "cushionNow", "4000");
    state = settled({ ...state, screen: "i3", cushionSituation: "small" });
    state = money(state, "cushionNow", "12000");
    const life = buildLife(state);
    expect(life.ef.now).toBe(12000);
    expect(life.ef.target).toBe(60000);
    expect(life.ef.pct).toBe(20);
    expect(life.ef.delta).toBe("Was 4,000 · 7% · cushion input");
    const card = renderFirstBuild(state);
    expect(card).toMatch(/Current savings/);
    expect(card).toMatch(/Show my current plan/);
    expect(card).not.toMatch(/data-ms="ef"/);
    const opened = go(state, { type: "show-plan" });
    const html = renderFirstBuild(opened);
    expect(html).toMatch(/Emergency fund/);
    expect(html).toMatch(/Now 12,000 · 20%/);
    expect(html).toMatch(/Was 4,000 · 7% · cushion input/);
    expect(html).toMatch(/Back to input/);
    expect(html).toContain("#5eead4");
    expect(go(opened, { type: "back-to-input" }).screen).toBe("i3");

    state = settled(state);
    state = { ...state, screen: "i3b" };
    state = money(state, "cushionTarget", "30000");
    expect(buildLife(state).ef.pct).toBe(40);
    expect(buildLife(state).ef.foot).toMatch(/Target 30,000 · Now 12,000 · 40%/);
  });

  it("shows the Right Door cash-flow effect only after join, and keeps the live RD note", () => {
    let state = money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "18000");
    state = money(state, "stillDue", "24900");
    state = money(state, "overdue", "1200");
    state = go(settled(state), { type: "open-life" });
    const waiting = renderFirstBuild(state);
    expect(waiting).not.toMatch(/Right Door complete/);
    expect(waiting).not.toMatch(/After Right Door completes/);
    expect(waiting).not.toMatch(/data-ms="rd"/);
    expect(waiting).not.toMatch(/Trend starts positive/);
    expect(waiting).not.toContain('points="20,78 70,76 120,74 180,72 250,70"');
    expect(milestoneIds(waiting)).toEqual(["today"]);

    const joined = renderFirstBuild({ ...state, rightDoorJoined: true });
    expect(joined).toMatch(/Right Door complete/);
    expect(joined).toMatch(/Trend starts positive · Net \+1,200/);
    expect(milestoneIds(joined)).toEqual(["today", "rd"]);
    const focus = go({ ...state, rightDoorJoined: true }, { type: "open-milestone", id: "rd" });
    const focusHtml = renderFirstBuild(focus);
    expect(focusHtml).toMatch(/Live Right Door as-is/);
    expect(focusHtml).not.toMatch(/letter|import UI|HKID/i);
  });

  it("opens the TODAY net sheet and returns to an empty Where are you after erase", () => {
    let state = money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "18400");
    state = money(state, "stillDue", "24900");
    state = go(go(settled(state), { type: "open-life" }), { type: "open-milestone", id: "today" });
    expect(state.screen).toBe("l1");
    state = go(state, { type: "open-net" });
    const sheet = renderFirstBuild(state);
    expect(sheet).toMatch(/TODAY · Net/);
    expect(sheet).toMatch(/Why the cash flow is negative/);
    expect(sheet).toMatch(/If nothing changes, the trend only worsens/);
    expect(sheet).toMatch(/Got it/);
    expect(go(state, { type: "close-net" }).lifeDetail).toBe(false);

    const stable = go(money(go(freshState(), { type: "pick-entry", entry: "stable" }), "takeHome", "22000"), {
      type: "open-life",
    });
    const stableSheet = renderFirstBuild(go(go(stable, { type: "open-milestone", id: "today" }), { type: "open-net" }));
    expect(stableSheet).toMatch(/Why this month is steady/);
    expect(stableSheet).toMatch(/Steady so far/);
    expect(stableSheet).not.toMatch(/trend only worsens/);

    const wiped = reduce(go(freshState(), { type: "open-erase" }), { type: "confirm-erase" });
    const clean = go(wiped.state, { type: "erase-ok" });
    expect(clean.screen).toBe("w0");
    expect(clean.entry).toBeNull();
    expect(buildLife(clean).today.net).toBeNull();
    expect(present(clean).title).toBe("Where are you?");
    expect(rightDoorJoined(newPack("en"), null)).toBe(false);
    expect(rightDoorJoined({ fullName: "Ada", status: "draft" }, null)).toBe(true);
    expect(rightDoorJoined(null, { source: "right-door" })).toBe(true);
    expect(FORTUNE_DATA_KEYS).not.toContain("pack");
  });

  it("shows the full plan from every input card and returns to that same card", () => {
    const setup = {
      i0: { entry: "stressed" },
      i1: { entry: "stressed", fixSituation: "missed" },
      i2: { entry: "stressed", fixSituation: "missed" },
      i2b: { entry: "stressed", fixSituation: "missed" },
      i3: { entry: "stable", cushionSituation: "small" },
      i3b: { entry: "stable", cushionSituation: "small" },
      ic: { entry: "stressed" },
      sd: { entry: "stable", cushionSituation: "small" },
      gd: { entry: "ok" },
      gd2: { entry: "ok" },
      ig: { entry: "ok" },
      ig2: { entry: "ok" },
    };
    for (const id of Object.keys(setup)) {
      const state = { ...freshState(), screen: id, ...setup[id] };
      const card = renderFirstBuild(state);
      expect(card).toMatch(/data-act="continue"/);
      expect(card).toMatch(/Show my current plan/);
      expect(card).not.toMatch(/ft-sheet/);
      expect(present(state).chip).not.toBe("Your life");
      const plan = go(state, { type: "show-plan" });
      expect(plan.screen).toBe("l0");
      expect(plan.fromInput).toBe(true);
      const opened = renderFirstBuild(plan);
      expect(opened).toMatch(/Today → age 70/);
      expect(opened).toMatch(/data-ms="today"/);
      if (setup[id].entry === "stressed") {
        expect(opened).not.toMatch(/data-ms="ef"/);
        expect(opened).not.toMatch(/Invest &amp; insurance/);
      } else {
        expect(opened).toMatch(/Invest &amp; insurance/);
      }
      expect(opened).toMatch(/Back to input/);
      expect(opened).not.toMatch(/ft-sheet/);
      expect(go(plan, { type: "back-to-input" }).screen).toBe(id);
      expect(go(plan, { type: "back" }).screen).toBe(id);
    }
  });
});

describe("Slice C costs and deeper flows", () => {
  function doorAfterCosts(entry, costs = "24900") {
    let state = go(freshState(), { type: "pick-entry", entry });
    state = go(money(state, "takeHome", "18400"), { type: "continue" });
    expect(state.screen).toBe("ic");
    expect(present(state).title).toBe("Monthly costs");
    expect(present(state).body).toBe("What you usually spend in a month.");
    const card = renderFirstBuild(state);
    expect(card).toMatch(/Show my current plan/);
    expect(card).not.toMatch(/Skip/);
    expect(card).not.toMatch(/24,900/);
    return go(money(state, "monthlyCosts", costs), { type: "continue" });
  }

  it("asks Monthly costs after take-home on every door and moves TODAY", () => {
    expect(doorAfterCosts("stressed").screen).toBe("f0");
    expect(doorAfterCosts("stable").screen).toBe("s0");
    expect(doorAfterCosts("ok").screen).toBe("g0");

    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "18400"), { type: "continue" });
    state = settled(state);
    state = money(state, "monthlyCosts", "20500");
    state = settled(state);
    state = money(state, "monthlyCosts", "24900");
    const life = buildLife(state);
    expect(life.today.expenses).toBe(24900);
    expect(life.today.net).toBe(-6500);
    expect(life.today.delta).toBe("Was \u20132,100 \u00b7 costs updated");
    expect(life.today.graph).toBe("down-red");
    const plan = renderFirstBuild(go(state, { type: "show-plan" }));
    expect(plan).toMatch(/Net –6,500/);
    expect(plan).toMatch(/Expenses 24,900/);
    expect(plan).toMatch(/Back to input/);
    expect(todayHtml(plan)).toContain("#dc2626");
    expect(todayHtml(plan)).not.toContain("#0d9488");
    expect(go(go(state, { type: "show-plan" }), { type: "back-to-input" }).screen).toBe("ic");

    const stable = money(
      settled(go(money(go(freshState(), { type: "pick-entry", entry: "stable" }), "takeHome", "22000"), { type: "continue" })),
      "monthlyCosts",
      "30000",
    );
    expect(buildLife(stable).today.net).toBe(-8000);
    expect(buildLife(stable).today.graph).toBe("down-red");
    expect(buildLife(stable).today.kicker).toBe("If nothing changes");
  });

  it("shows the month picture, confirms a cost cut, and keeps Talk to lenders on Fortune", () => {
    let state = doorAfterCosts("stressed", "24900");
    state = go(state, { type: "pick-fix", situation: "missed" });
    state = go(money(state, "stillDue", "3200"), { type: "continue" });
    state = go(state, { type: "continue" });
    state = go(money(state, "overdue", "0"), { type: "continue" });
    state = go(state, { type: "edit", key: "daysLate", days: "3" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("fd");
    const picture = renderFirstBuild(state);
    expect(picture).toMatch(/Take-home/);
    expect(picture).toMatch(/18,400/);
    expect(picture).toMatch(/Monthly costs/);
    expect(picture).toMatch(/24,900/);
    expect(picture).toMatch(/Still due \/ overdue/);
    expect(picture).toMatch(/3,200/);
    expect(picture).toMatch(/Left this month/);
    expect(picture).toMatch(/9,700/);
    expect(picture).toMatch(/Show my current plan/);
    expect(picture).not.toMatch(/Tap to enter/);

    state = go(state, { type: "continue" });
    expect(state.screen).toBe("fd2");
    expect(present(state).choices.map((c) => c.label)).toEqual(["Reduce cost", "Talk to lenders"]);
    expect(renderFirstBuild(state)).not.toMatch(/Prioritise|Remove|Skip|not pay/i);
    expect(renderFirstBuild(state)).not.toMatch(/Show my current plan/);

    const lenders = go(state, { type: "pick-next", pick: "lenders" });
    expect(lenders.screen).toBe("tl");
    expect(renderFirstBuild(lenders)).not.toMatch(/letter|docs|import/i);

    state = go(state, { type: "pick-next", pick: "reduce" });
    expect(state.screen).toBe("l0");
    expect(state.screen).not.toBe("l3");
    expect(state.inputs.monthlyCosts.amount).toBe("23900");
    expect(buildLife(state).today.net).toBe(-5500);
    expect(go(state, { type: "back" }).screen).toBe("fd2");
  });

  it("plans the cushion from monthly save and opens Invest only at the gate", () => {
    let state = doorAfterCosts("stable", "14400");
    state = go(state, { type: "pick-cushion", situation: "small" });
    state = go(state, { type: "continue" });
    state = go(money(state, "cushionNow", "12000"), { type: "continue" });
    state = go(money(state, "cushionTarget", "60000"), { type: "continue" });
    expect(present(state).title).toBe("Save each month");
    expect(go(state, { type: "continue" }).screen).toBe("sd");
    state = go(money(state, "monthlySave", "4000"), { type: "continue" });
    expect(state.screen).toBe("sd2");
    expect(present(state).rows.map((row) => row.value)).toEqual(["12,000", "60,000", "4,000", "12"]);
    const life = buildLife(state);
    expect(life.ef.saveText).toBe("Save 4,000 · 12 months");
    expect(go(state, { type: "continue" }).screen).toBe("g0");

    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    expect(state.screen).toBe("i3");
    state = go(money(state, "cushionNow", "60000"), { type: "continue" });
    state = go(money(state, "cushionTarget", "60000"), { type: "continue" });
    state = go(state, { type: "continue" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("sd3");
    expect(present(state).primary).toBe("Continue to Plan what\u2019s next");
    expect(present(state).callout.title).toBe("Invest can open");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(false);
    expect(present(go(state, { type: "pick-grow", pick: "invest" })).frame).toBe("Gd4-invest-unlocked");
  });

  it("wires a goal amount into the Goals stub and keeps cover on the insurance stub", () => {
    let state = doorAfterCosts("ok", "10000");
    state = go(state, { type: "pick-grow", pick: "goals" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("ig");
    expect(present(state).title).toBe("Goal name");
    expect(go(state, { type: "continue" }).screen).toBe("ig");
    state = go(state, { type: "edit", key: "goalName", text: "New flat deposit" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("ig2");
    expect(go(state, { type: "continue" }).screen).toBe("ig2");
    state = go(state, { type: "edit", key: "goalDate", date: "2028-06-15" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("gd");
    expect(present(state).title).toBe("Goal amount");
    expect(go(state, { type: "continue" }).screen).toBe("gd");
    state = money(state, "goalAmount", "50000");
    const goals = buildLife(state).stubs.find((stub) => stub.id === "goals");
    expect(goals.funding.name).toBe("New flat deposit");
    expect(goals.funding.dateText).toBe("15 Jun 2028");
    expect(goals.funding.fundedText).toBe("0");
    expect(goals.funding.targetText).toBe("50,000");
    expect(goals.funding.pct).toBe(0);
    expect(goals.later).toBe("");
    expect(goals.delta).toBe("Was unset \u00b7 goal amount in");
    const html = renderFirstBuild(go(state, { type: "show-plan" }));
    expect(html).toMatch(/New flat deposit/);
    expect(html).toMatch(/Date by 15 Jun 2028/);
    expect(html).toMatch(/Funded 0 of 50,000 · 0%/);
    expect(html).toMatch(/Was unset · goal amount in/);
    expect(html).not.toMatch(/Later pass · Per-goal/);
    expect(html).not.toMatch(/Success/);
    expect(html).toMatch(/Back to input/);
    expect(go(go(state, { type: "show-plan" }), { type: "back" }).screen).toBe("gd");

    state = go(state, { type: "continue" });
    state = go(state, { type: "pick-grow", pick: "insurance" });
    state = go(state, { type: "continue" });
    expect(present(state).title).toBe("Monthly cover");
    state = go(money(state, "cover", "900"), { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(buildLife(state).stubs.find((stub) => stub.id === "invest").later).toBe("Cover 900 · a month");

    const locked = go(state, { type: "pick-grow", pick: "invest" });
    expect(present(locked).frame).toBe("Gd3-invest-still-locked");
    expect(renderFirstBuild(locked)).toMatch(/Cushion not ready/);
    expect(renderFirstBuild(locked)).toMatch(/Show my current plan/);
    expect(renderFirstBuild(locked)).not.toMatch(/behaviour score|behavior score/i);
  });
});

describe("Slice D privacy, disclaimer, and wipe", () => {
  it("shows the locked privacy strip on Where are you and monthly take-home", () => {
    const home = renderFirstBuild(freshState());
    expect(home).toMatch(/Stays on this phone\. Erase any time\./);
    expect(home).toContain(PRIVACY_STRIP);
    expect(home).not.toMatch(/Nothing leaves/i);
    const opened = renderFirstBuild(go(freshState(), { type: "privacy-info" }));
    expect(opened).toMatch(/Erase clears Fortune Teller on this phone/);
    expect(opened).toMatch(/other Plan Your Life apps keep their data/);

    const takeHome = go(freshState(), { type: "pick-entry", entry: "stressed" });
    const card = renderFirstBuild(takeHome);
    expect(card).toMatch(/Monthly take-home/);
    expect(card).toContain(PRIVACY_STRIP);
    expect(card).toMatch(/Show my current plan/);
    expect(renderFirstBuild({ ...freshState(), screen: "ic", entry: "stressed" })).not.toContain(PRIVACY_STRIP);
  });

  it("shows the locked disclaimer on Your life home and TODAY detail", () => {
    const home = renderFirstBuild(go(freshState(), { type: "open-life" }));
    expect(home).toContain(LIFE_DISCLAIMER);
    expect(home).toMatch(/Not advice\. Not a guarantee\./);
    const today = go(go(freshState(), { type: "open-life" }), { type: "open-milestone", id: "today" });
    expect(today.screen).toBe("l1");
    expect(renderFirstBuild(today)).toContain(LIFE_DISCLAIMER);
    expect(renderFirstBuild(today)).not.toMatch(/Nothing leaves/i);
  });

  it("erase clears a stressed plan so a later stable life is empty", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "18400"), { type: "continue" });
    state = money(state, "monthlyCosts", "24900");
    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    expect(state.screen).toBe("w0");
    expect(buildLife(state).today.net).toBe(-6500);
    expect(buildLife(state).today.graph).toBe("down-red");

    state = go(state, { type: "open-erase" });
    const wiped = reduce(state, { type: "confirm-erase" });
    expect(wiped.wipe).toBe(true);
    expect(wiped.state.entry).toBeNull();
    expect(wiped.state.inputs.takeHome.amount).toBe("");
    expect(wiped.state.inputs.monthlyCosts.amount).toBe("");
    expect(wiped.state.lifeMove).toBeNull();
    const clean = go(wiped.state, { type: "erase-ok" });
    expect(clean).toEqual(freshState());
    expect(renderFirstBuild(clean)).toContain(PRIVACY_STRIP);

    const stable = go(clean, { type: "pick-entry", entry: "stable" });
    const life = buildLife(go(stable, { type: "open-life" }));
    expect(life.tone).toBe("steady");
    expect(life.today.kicker).toBe("Steady so far");
    expect(life.today.graph).toBe("up-teal");
    expect(life.today.net).toBeNull();
    expect(life.today.expenses).toBeNull();
    expect(life.today.income).toBeNull();
    const html = renderFirstBuild(go(stable, { type: "open-life" }));
    expect(html).toMatch(/Steady so far/);
    expect(html).toContain(LIFE_DISCLAIMER);
    expect(html).not.toMatch(/If nothing changes/);
    expect(html).not.toMatch(/6,500/);
    expect(html).not.toMatch(/24,900/);
    expect(html).not.toMatch(/18,400/);
    expect(todayHtml(html)).not.toContain("#dc2626");
  });
});

describe("Slice E dig-in fixes", () => {
  it("draws TODAY flat on zero when income equals expenses", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = money(state, "takeHome", "30000");
    state = money(state, "monthlyCosts", "30000");
    state = go(state, { type: "open-life" });
    const life = buildLife(state);
    expect(life.today.net).toBe(0);
    expect(life.today.graph).toBe("flat-zero");
    expect(life.today.kicker).toBe("Even this month");
    expect(life.today.netText).toBe("Net 0");
    const html = renderFirstBuild(state);
    const today = todayHtml(html);
    expect(today).toMatch(/Even this month/);
    expect(today).toMatch(/Net 0/);
    expect(today).toMatch(/Income 30,000 · Expenses 30,000/);
    expect(today).toContain('points="20,55 70,55 120,55 180,55 250,55"');
    expect(today).toContain("is-zero");
    expect(today).toContain("is-slate");
    expect(today).not.toContain("#dc2626");
    expect(today).not.toContain("#0d9488");
    expect(today).not.toContain("#5eead4");
    expect(html).toMatch(/Get through this month/);
    expect(html).toContain(LIFE_DISCLAIMER);
    expect(milestoneIds(html)).toEqual(["today"]);
    expect(html).not.toMatch(/data-ms="ef"/);
    expect(html).not.toMatch(/Invest &amp; insurance/);
    expect(html).not.toMatch(/data-ms="goals"/);

    const negative = buildLife(money(state, "monthlyCosts", "31000"));
    expect(negative.today.net).toBe(-1000);
    expect(negative.today.graph).toBe("down-red");
    expect(negative.today.kicker).toBe("If nothing changes");
  });

  it("requires a goal name and a real date before the amount", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "ok" });
    state = go(money(state, "takeHome", "30000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "20000"), { type: "continue" });
    state = go(state, { type: "pick-grow", pick: "goals" });
    state = go(state, { type: "continue" });
    expect(present(state).title).toBe("Goal name");
    expect(renderFirstBuild(state)).toMatch(/Tap to enter/);
    expect(renderFirstBuild(state)).toMatch(/Show my current plan/);
    expect(renderFirstBuild(state)).not.toMatch(/New flat deposit/);
    expect(go(state, { type: "continue" }).showRequired).toBe(true);
    expect(go(state, { type: "edit", key: "goalName", text: "   " }).screen).toBe("ig");
    expect(canContinue(go(state, { type: "edit", key: "goalName", text: "   " }))).toBe(false);

    state = go(state, { type: "edit", key: "goalName", text: "New flat deposit" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("ig2");
    expect(present(state).title).toBe("Date by");
    expect(present(state).body).toBe("When do you want this ready?");
    const dateCard = renderFirstBuild(state);
    expect(dateCard).toMatch(/Pick a date/);
    expect(dateCard).toMatch(/type="date"/);
    expect(dateCard).toMatch(/Show my current plan/);
    expect(go(state, { type: "continue" }).showRequired).toBe(true);
    expect(canContinue(go(state, { type: "edit", key: "goalDate", date: "2028-02-31" }))).toBe(false);
    expect(go(state, { type: "back" }).screen).toBe("ig");

    state = go(state, { type: "edit", key: "goalDate", date: "2028-06-15" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("gd");
    expect(go(state, { type: "back" }).screen).toBe("ig2");
    const plan = go(state, { type: "show-plan" });
    expect(plan.screen).toBe("l0");
    expect(go(plan, { type: "back-to-input" }).screen).toBe("gd");
  });

  it("hides Right Door on a stable plan and keeps the TODAY to emergency-fund rail continuous", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = money(state, "takeHome", "30000");
    state = money(state, "monthlyCosts", "25000");
    state = go(state, { type: "open-life" });
    const hidden = renderFirstBuild(state);
    expect(hidden).not.toMatch(/Right Door complete/);
    expect(hidden).not.toMatch(/data-ms="rd"/);
    expect(hidden).not.toContain('points="20,78 70,76 120,74 180,72 250,70"');
    expect(milestoneIds(hidden)).toEqual(["today", "ef", "invest", "goals", "age"]);
    expect([...hidden.matchAll(/data-n="(\d+)"/g)].map((match) => match[1])).toEqual(["1", "2", "3", "4", "5"]);
    expect(hidden).toMatch(/Steady so far/);
    expect(hidden).toContain(LIFE_DISCLAIMER);

    const joined = renderFirstBuild({ ...state, rightDoorJoined: true });
    expect(joined).toMatch(/Right Door complete/);
    expect(joined).toMatch(/Trend starts positive/);
    expect(milestoneIds(joined)).toEqual(["today", "rd", "ef", "invest", "goals", "age"]);
    expect([...joined.matchAll(/data-n="(\d+)"/g)].map((match) => match[1])).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("opens the emergency-fund detail with savings on or above zero", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = money(state, "takeHome", "30000");
    state = money(state, "monthlyCosts", "25000");
    state = money(state, "cushionNow", "0");
    state = money(state, "cushionTarget", "50000");
    state = go(state, { type: "open-life" });
    const card = renderFirstBuild(state);
    expect(card).toMatch(/Tap for detail/);
    expect(card).toMatch(/data-act="open-milestone"[^>]*data-value="ef"|data-value="ef"/);
    const ys = saveLineYs(card);
    expect(ys.length).toBeGreaterThan(0);
    expect(ys.every((y) => y === 55)).toBe(true);

    const detail = go(state, { type: "open-milestone", id: "ef" });
    expect(detail.screen).toBe("l3");
    const html = renderFirstBuild(detail);
    expect(html).toMatch(/Emergency fund/);
    expect(html).toMatch(/Cash flow and savings toward your cushion/);
    expect(html).toMatch(/Target/);
    expect(html).toMatch(/50,000/);
    expect(html).toMatch(/Now/);
    expect(html).toMatch(/Funded/);
    expect(html).toMatch(/0%/);
    expect(html).toMatch(/Income/);
    expect(html).toMatch(/30,000/);
    expect(html).toMatch(/Expenses/);
    expect(html).toMatch(/–25,000/);
    expect(html).toMatch(/Net this month/);
    expect(html).toMatch(/\+5,000/);
    expect(html).toMatch(/Got it/);
    expect(html).toContain(LIFE_DISCLAIMER);
    const detailYs = saveLineYs(html);
    expect(detailYs.every((y) => y <= 55)).toBe(true);
    expect(go(detail, { type: "back" }).screen).toBe("l0");

    const saved = money(state, "cushionNow", "20000");
    const risen = saveLineYs(renderFirstBuild(go(saved, { type: "open-milestone", id: "ef" })));
    expect(Math.max(...risen)).toBe(55);
    expect(Math.min(...risen)).toBeLessThan(55);
  });
});

describe("Slice F action and project", () => {
  function stressedMonth(income, costs) {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", income), { type: "continue" });
    state = go(money(state, "monthlyCosts", costs), { type: "continue" });
    return state;
  }

  it("projects a cost reduction on Your life before the cushion phase", () => {
    let state = stressedMonth("30000", "30000");
    state = go(state, { type: "pick-fix", situation: "worry" });
    state = go(money(state, "stillDue", "0"), { type: "continue" });
    state = go(state, { type: "continue" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("fd2");
    const choices = renderFirstBuild(state);
    expect(choices).toMatch(/Reduce cost/);
    expect(choices).toMatch(/Talk to lenders/);
    expect(choices).not.toMatch(/Prioritise|Remove|Skip|not pay/i);

    state = go(state, { type: "pick-next", pick: "reduce" });
    expect(state.screen).toBe("l0");
    expect(state.action).toBe("reduce");
    expect(state.inputs.monthlyCosts.amount).toBe("29000");
    const life = buildLife(state);
    expect(life.today.net).toBe(1000);
    expect(life.today.graph).toBe("turn-up");
    expect(life.today.kicker).toBe("Positive from today");
    expect(life.scope).toBe("full");
    const html = renderFirstBuild(state);
    expect(html).toMatch(/Positive from today/);
    expect(html).toContain('points="20,55 70,46 120,40 180,34 250,28"');
    expect(html).toMatch(/data-act="project-next"/);
    expect(html).not.toMatch(/data-screen="l3"/);
    expect(milestoneIds(html)).toEqual(["today", "ef", "invest", "goals", "age"]);
    expect(life.ef.date).toBe(life.today.date);
    expect(life.phase.current).toBe("cushion");
    expect(html).toMatch(/data-phase="cushion"/);
    expect(html).not.toMatch(/behaviour score|behavior score/i);

    state = go(state, { type: "project-next" });
    expect(state.screen).toBe("s0");
    expect(present(state).title).toBe("Build a cushion");
    expect(go(state, { type: "back" }).screen).toBe("l0");
  });

  it("turns lender answers into an expected result on Your life", () => {
    let state = stressedMonth("30000", "30000");
    state = go(state, { type: "pick-fix", situation: "soon" });
    state = go(money(state, "stillDue", "1000"), { type: "continue" });
    state = go(state, { type: "continue" });
    state = go(state, { type: "continue" });
    state = go(state, { type: "pick-next", pick: "lenders" });
    expect(go(state, { type: "continue" }).screen).toBe("tl");
    state = go(money(state, "lenderDebt", "20000"), { type: "continue" });
    expect(state.screen).toBe("tl2");
    expect(present(state).title).toBe("Total contract");
    state = go(money(state, "lenderContract", "80000"), { type: "continue" });
    expect(state.screen).toBe("tl3");
    state = go(money(state, "lenderPremium", "1500"), { type: "continue" });
    expect(state.screen).toBe("tl4");
    expect(present(state).title).toBe("Duration");
    expect(go(state, { type: "continue" }).showRequired).toBe(true);
    state = go(state, { type: "edit", key: "lenderDuration", months: "24" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("l0");
    expect(state.action).toBe("lenders");
    const html = renderFirstBuild(state);
    expect(html).toMatch(/Expected result/);
    expect(html).toMatch(/If you talk to lenders/);
    expect(html).toMatch(/Debt 20,000/);
    expect(html).toMatch(/Contract 80,000/);
    expect(html).toMatch(/Premium 1,500/);
    expect(html).toMatch(/24 months/);
    expect(html).toMatch(/Positive from today/);
    expect(html).not.toMatch(/Right Door letter|import|docs/i);
    expect(html).not.toMatch(/Right Door complete/);
    expect(milestoneIds(html)[1]).toBe("expect");
    expect(go(state, { type: "project-next" }).screen).toBe("s0");
  });

  it("saves a goal date and opens that goal from Your life", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "ok" });
    state = go(money(state, "takeHome", "30000"), { type: "continue" });
    state = go(money(state, "monthlyCosts", "20000"), { type: "continue" });
    state = go(state, { type: "pick-grow", pick: "goals" });
    state = go(state, { type: "continue" });
    state = go(state, { type: "edit", key: "goalName", text: "New flat deposit" });
    state = go(state, { type: "continue" });
    state = go(state, { type: "edit", key: "goalDate", date: "2028-06-15" });
    state = go(state, { type: "continue" });
    state = go(money(state, "goalAmount", "50000"), { type: "continue" });
    state = go(state, { type: "open-life" });
    expect(buildLife(state).stubs.find((stub) => stub.id === "goals").funding.dateText).toBe("15 Jun 2028");

    state = go(state, { type: "open-milestone", id: "goals" });
    expect(state.screen).toBe("ig");
    expect(state.goalEdit).toBe(true);
    expect(state.inputs.goalName.text).toBe("New flat deposit");
    expect(state.inputs.goalDate.date).toBe("2028-06-15");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("ig2");
    state = go(state, { type: "edit", key: "goalDate", date: "2029-01-02" });
    state = go(state, { type: "continue" });
    expect(state.inputs.goalDate.date).toBe("2029-01-02");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("l0");
    const goals = buildLife(state).stubs.find((stub) => stub.id === "goals");
    expect(goals.funding.dateText).toBe("2 Jan 2029");
    expect(renderFirstBuild(state)).toMatch(/Date by 2 Jan 2029/);
    expect(renderFirstBuild(state)).toMatch(/data-phase="goals"/);
  });
});
