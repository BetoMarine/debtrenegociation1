/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { stageWord } from "../../shared/stage-words.js";
import { stage1Ticked } from "../model.js";
import { freshState, mapAction, openedFortuneState, reduce } from "./flow.js";
import { renderV3 } from "./render.js";
import { v3 } from "./copy.js";

function ask() {
  return openedFortuneState({ plan: null, ui: null });
}

function row(stage) {
  return document.querySelector(`[data-stage='${stage}']`);
}

describe("where you are", () => {
  it("cold-opens the ask when Fortune is empty, with no continue or erase", () => {
    const where = ask();
    expect(where.screen).toBe("where");
    document.body.replaceChildren(renderV3(where));
    expect(document.body.textContent).toContain(v3("where.title"));
    expect(document.body.textContent).toContain(v3("where.stress"));
    expect(document.body.textContent).toContain(v3("where.stable"));
    expect(document.body.textContent).toContain(v3("where.grow"));
    expect(document.querySelector("[data-act='cover-continue']")).toBeNull();
    expect(document.querySelector("[data-act='ask-erase']")).toBeNull();
    expect(document.querySelector("[data-dig-in]")).toBeNull();
    expect(document.querySelector("[data-act='map-go']")).toBeNull();
    expect(document.body.textContent).not.toContain(stageWord("en", "fix"));
    expect(reduce(freshState(), { type: "cover-continue" }).screen).toBe("where");
  });

  it("sends stressed into the month question, and stable or grow past it without ticking the month", () => {
    const where = ask();
    const stressed = reduce(where, { type: "pick-where", id: "rebuild" });
    expect(stressed.screen).toBe("s01");
    expect(stressed.plan.theme).toBe("rebuild");
    expect(stage1Ticked(stressed.plan)).toBe(false);

    const stable = reduce(where, { type: "pick-where", id: "steady" });
    expect(stable.screen).toBe("s05");
    expect(stable.plan.theme).toBe("steady");
    expect(stage1Ticked(stable.plan)).toBe(false);
    expect(stable.plan.cushionBuiltAt).toBeFalsy();
    expect(mapAction(stable.plan, stable.ui).stage).toBe("stabilize");
    document.body.replaceChildren(renderV3(reduce(stable, { type: "home" })));
    expect(row("fix").disabled).toBe(true);
    expect(row("fix").textContent).toContain(v3("skipped"));
    expect(row("stabilize").textContent).toContain(v3("youAreHere"));

    const grow = reduce(where, { type: "pick-where", id: "grow" });
    expect(grow.screen).toBe("s07");
    expect(grow.plan.theme).toBe("grow");
    expect(stage1Ticked(grow.plan)).toBe(false);
    expect(grow.plan.cushionStartedAt).toBeFalsy();
    expect(grow.plan.cushionBuiltAt).toBeFalsy();
    expect(mapAction(grow.plan, grow.ui).stage).toBe("plan");
    const map = reduce(grow, { type: "home" });
    document.body.replaceChildren(renderV3(map));
    expect(row("fix").disabled).toBe(true);
    expect(row("fix").textContent).toContain(v3("skipped"));
    expect(row("plan").textContent).toContain(v3("youAreHere"));
    expect(row("invest").disabled).toBe(true);
    expect(row("invest").getAttribute("data-act")).toBeNull();
    expect(row("invest").textContent).toContain(v3("lockedGrow"));
    expect(document.querySelector(".v3-primary")?.textContent || "").not.toContain(stageWord("en", "fix"));
    expect(reduce(map, { type: "open-stage", stage: "invest" }).screen).toBe("map");
  });

  it("mirrors the same starts from dig-in and hides that block unless asked", () => {
    const where = { ...ask(), digIn: true };
    document.body.replaceChildren(renderV3(where));
    expect(document.querySelector("[data-dig-in]")?.textContent).toContain("Dig-in jumps");
    expect(reduce(where, { type: "dig-in", id: "fix" }).screen).toBe("s01");
    expect(reduce(where, { type: "dig-in", id: "stabilize" }).screen).toBe("s05");
    expect(reduce(where, { type: "dig-in", id: "plan" }).screen).toBe("s07");
    expect(reduce(where, { type: "dig-in", id: "invest" }).screen).toBe("s12");
    expect(reduce(where, { type: "dig-in", id: "a2" }).screen).toBe("a2");
  });
});
