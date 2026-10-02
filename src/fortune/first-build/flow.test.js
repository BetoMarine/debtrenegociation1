import { describe, expect, it } from "vitest";
import { FORTUNE_DATA_KEYS, newPack } from "../../db.js";
import {
  FRAME_IDS,
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
      expect(go(state, { type: "continue" }).screen).toBe(screen);
    }
  });

  it("keeps I1 copy and requires an actual amount before Fix situations", () => {
    let state = money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "18000");
    state = go(state, { type: "continue" });
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
    state = go(state, { type: "pick-fix", situation: "soon" });
    state = go(money(state, "stillDue", "4000"), { type: "continue" });
    expect(state.screen).toBe("f2");
    expect(present(state).rdLater).toBe(true);
    expect(go(state, { type: "continue" }).screen).toBe("f2");
    expect(go(state, { type: "continue" }).fixHeldForRightDoor).toBe(true);

    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    state = go(state, { type: "pick-fix", situation: "worry" });
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("f3");
    expect(go(state, { type: "continue" }).screen).toBe("f3");

    state = go(go(state, { type: "back" }), { type: "back" });
    state = go(state, { type: "pick-fix", situation: "missed" });
    state = go(state, { type: "continue" });
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
    expect(state.screen).toBe("i2b");
    expect(state.fixHeldForRightDoor).toBe(true);
    expect(renderFirstBuild(state)).not.toMatch(/from=fortune|sunday|Right Door letter/i);
    expect(renderFirstBuild(state)).toMatch(/Live Right Door handoff comes later/);
  });

  it("sends stable through cushion amounts into planning, and OK straight to planning", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = go(money(state, "takeHome", "30000"), { type: "continue" });
    expect(state.screen).toBe("s0");
    state = go(state, { type: "pick-cushion", situation: "none" });
    expect(state.screen).toBe("s1");
    state = go(state, { type: "continue" });
    expect(state.screen).toBe("i3");
    expect(canContinue(money(state, "cushionNow", "0"))).toBe(true);
    state = go(money(state, "cushionNow", "0"), { type: "continue" });
    expect(state.screen).toBe("i3b");
    state = go(money(state, "cushionTarget", "90000"), { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(true);

    state = go(freshState(), { type: "pick-entry", entry: "ok" });
    state = go(money(state, "takeHome", "42000"), { type: "continue" });
    expect(state.screen).toBe("g0");
    expect(cushionReady(state)).toBe(false);
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(true);
    const locked = go(state, { type: "pick-grow", pick: "invest" });
    expect(locked.screen).toBe("g3");
    expect(present(locked).lockTitle).toBe("Still locked");
    expect(present(locked).primary).toBeNull();
    expect(present(locked).quiet).toBe("Back to plan");
    expect(go(locked, { type: "back" }).screen).toBe("g0");
  });

  it("unlocks Invest only when current savings cover a real target", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stable" });
    state = go(money(state, "takeHome", "50000"), { type: "continue" });
    state = go(state, { type: "pick-cushion", situation: "ok" });
    state = go(state, { type: "continue" });
    state = go(money(state, "cushionNow", "10000"), { type: "continue" });
    state = go(money(state, "cushionTarget", "30000"), { type: "continue" });
    expect(cushionReady(state)).toBe(false);
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(true);

    state = go(state, { type: "back" });
    state = go(state, { type: "back" });
    state = go(money(state, "cushionNow", "30000"), { type: "continue" });
    state = go(money(state, "cushionTarget", "30000"), { type: "continue" });
    expect(cushionReady(state)).toBe(true);
    expect(present(state).choices.find((c) => c.id === "invest").locked).toBe(false);
    const open = go(state, { type: "pick-grow", pick: "invest" });
    expect(present(open).lockTitle).toBeUndefined();
    expect(present(open).body).toBe("Your cushion is ready.");
    expect(renderFirstBuild(open)).not.toMatch(/Still locked/);
  });

  it("erase wipes Fortune only and returns to an empty Where are you", () => {
    let state = go(freshState(), { type: "pick-entry", entry: "stressed" });
    state = go(money(state, "takeHome", "1000"), { type: "continue" });
    expect(go(state, { type: "open-erase" }).screen).toBe("f0");
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
    mark(stable);
    mark(go(stable, { type: "pick-grow", pick: "goals" }));
    mark(go(stable, { type: "pick-grow", pick: "insurance" }));
    mark(go(stable, { type: "pick-grow", pick: "invest" }));

    const erase = go(freshState(), { type: "open-erase" });
    mark(erase);
    mark(reduce(erase, { type: "confirm-erase" }).state);

    expect([...seen].sort()).toEqual(Object.values(FRAME_IDS).sort());
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
  return html.split('data-ms="today"')[1].split('data-ms="rd"')[0];
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

  it("paints stressed TODAY red and stable or OK TODAY teal with Steady so far", () => {
    const stressed = go(
      money(go(freshState(), { type: "pick-entry", entry: "stressed" }), "takeHome", "18400"),
      { type: "open-life" },
    );
    const stressedHtml = renderFirstBuild(stressed);
    const stressedToday = todayHtml(stressedHtml);
    expect(stressedToday).toMatch(/If nothing changes/);
    expect(stressedToday).toMatch(/Net \+18,400/);
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
    expect(waiting).toMatch(/After Right Door completes/);
    expect(waiting).not.toMatch(/Trend starts positive/);
    expect(waiting.split('data-ms="rd"')[1].split('data-ms="ef"')[0]).not.toContain("#0d9488");

    const joined = renderFirstBuild({ ...state, rightDoorJoined: true });
    expect(joined).toMatch(/Trend starts positive · Net \+1,200/);
    const focus = go(state, { type: "open-milestone", id: "rd" });
    const focusHtml = renderFirstBuild({ ...focus, rightDoorJoined: true });
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
      expect(opened).toMatch(/Invest &amp; insurance/);
      expect(opened).toMatch(/Back to input/);
      expect(opened).not.toMatch(/ft-sheet/);
      expect(go(plan, { type: "back-to-input" }).screen).toBe(id);
      expect(go(plan, { type: "back" }).screen).toBe(id);
    }
  });
});
