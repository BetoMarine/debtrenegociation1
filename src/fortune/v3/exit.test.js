/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { stageWord } from "../../shared/stage-words.js";
import { newFortunePlan } from "../model.js";
import { INVEST_CARDS } from "./invest.js";
import { v3 } from "./copy.js";
import { freshState, openedFortuneState, reduce } from "./flow.js";
import { renderV3 } from "./render.js";

const fixWord = stageWord("en", "fix");

function textOf(state) {
  document.body.replaceChildren(renderV3(state));
  return document.body.textContent;
}

function primaryLabel() {
  return document.querySelector(".v3-primary")?.textContent || "";
}

function midPlan() {
  return {
    ...newFortunePlan(),
    templateId: "balanced",
    cushionStartedAt: "2026-09",
    stage1: { ...newFortunePlan().stage1, status: "none", source: "ft-rd-steps", route: "bank" },
  };
}

function importedPlan(source = "rd-export") {
  return {
    ...newFortunePlan(),
    templateId: "balanced",
    cushionStartedAt: "2026-09",
    stage1: {
      ...newFortunePlan().stage1,
      status: "asked",
      source,
      route: "bank",
      startMonth: "2026-10",
      tenorMonths: 6,
      monthsAskedFor: 6,
    },
  };
}

describe("Fortune erase and start clear", () => {
  it("opens an empty map on Start after a true erase, not a mid-Fix screen", () => {
    const opened = openedFortuneState({ plan: null, ui: null, pendingErase: true });
    expect(opened.screen).toBe("e1");
    const map = reduce(opened, { type: "e1-ok" });
    expect(map.screen).toBe("map");
    expect(map.plan.stage1.status).toBe("none");
    expect(map.ui.lastByStage).toEqual({});
    textOf(map);
    expect(primaryLabel()).toBe(v3("startStage", { stage: fixWord }));
    expect(document.querySelector("[data-act='start-clear']")).toBeNull();
    expect(reduce(map, { type: "map-go" }).screen).toBe("s01");
  });

  it("makes Start fresh clear stage and resume", () => {
    const stuck = freshState({
      screen: "a2",
      plan: importedPlan(),
      ui: { ...freshState().ui, lastByStage: { fix: "s03" }, lenderCount: 2, askedRoute: "idrp" },
      foundExport: { tenorMonths: 6, startMonth: "2026-10", done: false },
    });
    const cleared = reduce(stuck, { type: "fresh" });
    expect(cleared.screen).toBe("map");
    expect(cleared.plan.stage1.status).toBe("none");
    expect(cleared.plan.stage1.source).toBeNull();
    expect(cleared.ui.lastByStage).toEqual({});
    expect(cleared.plan.templateId).toBe("balanced");
    expect(cleared.plan.cushionStartedAt).toBe("2026-09");
    expect(reduce(cleared, { type: "map-go" }).screen).toBe("s01");
  });
});

describe("Right Door erase leaves a way out", () => {
  it("offers Keep and Start clear for a sticky mid-Fix resume, and an empty map stays Start", () => {
    const empty = reduce(freshState(), { type: "cover-continue" });
    expect(empty.screen).toBe("map");
    textOf(empty);
    expect(primaryLabel()).toBe(v3("startStage", { stage: fixWord }));
    expect(document.querySelector("[data-act='start-clear']")).toBeNull();
    expect(reduce(empty, { type: "map-go" }).screen).toBe("s01");

    const opened = openedFortuneState({
      plan: midPlan(),
      ui: { lastByStage: { fix: "s03a" } },
      manualExport: true,
    });
    const choice = reduce(opened, { type: "cover-continue" });
    expect(choice.screen).toBe("choice");
    textOf(choice);
    expect(document.querySelector("[data-choice]")?.getAttribute("data-choice")).toBe("mid");
    expect(document.querySelector("[data-act='keep-plan']")?.textContent).toBe("Keep");
    expect(document.querySelector("[data-act='start-clear']")?.textContent).toBe("Start clear");
    expect(document.querySelector("[data-stage-line]")).toBeNull();

    const kept = reduce(choice, { type: "keep-plan" });
    expect(kept.screen).toBe("map");
    expect(kept.ui.exitKept).toBe(true);
    expect(kept.ui.lastByStage.fix).toBe("s03a");
    expect(kept.plan.stage1.source).toBe("ft-rd-steps");
    expect(kept.plan.templateId).toBe("balanced");
    expect(kept.plan.cushionStartedAt).toBe("2026-09");
    textOf(kept);
    expect(primaryLabel()).toBe(v3("continueStage", { stage: fixWord }));
    expect(document.querySelector("[data-act='start-clear']")).toBeTruthy();
    expect(reduce(kept, { type: "map-go" }).screen).toBe("s03a");
    expect(reduce(openedFortuneState({ plan: kept.plan, ui: kept.ui }), { type: "cover-continue" }).screen).toBe("map");

    const cleared = reduce(choice, { type: "start-clear" });
    expect(cleared.screen).toBe("map");
    expect(cleared.plan.stage1.status).toBe("none");
    expect(cleared.plan.stage1.source).toBeNull();
    expect(cleared.ui.lastByStage).toEqual({});
    expect(cleared.rd.fullName).toBe("");
    expect(cleared.plan.templateId).toBe("balanced");
    expect(cleared.plan.cushionStartedAt).toBe("2026-09");
    textOf(cleared);
    expect(primaryLabel()).toBe(v3("startStage", { stage: fixWord }));
    expect(document.querySelector("[data-act='start-clear']")).toBeNull();
    expect(reduce(cleared, { type: "map-go" }).screen).toBe("s01");
  });

  it("offers Keep and Start clear for an orphaned import and does not treat a live export as orphaned", () => {
    const orphan = reduce(
      openedFortuneState({
        plan: importedPlan("rd-export"),
        ui: { lastByStage: { fix: "dates" } },
      }),
      { type: "cover-continue" },
    );
    expect(orphan.screen).toBe("choice");
    textOf(orphan);
    expect(document.querySelector("[data-choice]")?.getAttribute("data-choice")).toBe("orphan");
    expect(document.body.textContent).toContain("Right Door on this phone was erased.");
    const kept = reduce(orphan, { type: "keep-plan" });
    expect(kept.plan.stage1.source).toBe("rd-export");
    expect(kept.plan.stage1.status).toBe("asked");
    expect(kept.plan.templateId).toBe("balanced");
    const cleared = reduce(orphan, { type: "start-clear" });
    expect(cleared.plan.stage1.source).toBeNull();
    expect(cleared.plan.stage1.status).toBe("none");
    expect(cleared.plan.cushionStartedAt).toBe("2026-09");
    expect(cleared.plan.templateId).toBe("balanced");

    const fromCode = reduce(openedFortuneState({ plan: importedPlan("code"), ui: {} }), { type: "cover-continue" });
    expect(fromCode.screen).toBe("choice");

    const live = openedFortuneState({
      plan: midPlan(),
      ui: { lastByStage: { fix: "s03a" } },
      foundExport: { tenorMonths: 6, startMonth: "2026-10", done: false, exportedAt: "2026-10-01" },
    });
    expect(reduce(live, { type: "cover-continue" }).screen).toBe("a2");
  });

  it("leaves the Balanced book numbers alone", () => {
    expect(INVEST_CARDS.find((card) => card.id === "balanced")).toMatchObject({ mu: 0.06, swing: 0.12, leverageNotional: 1 });
  });
});
