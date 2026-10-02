import { describe, expect, it } from "vitest";
import { FORTUNE_DATA_KEYS } from "../../db.js";
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
