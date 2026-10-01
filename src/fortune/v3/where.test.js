/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { stage1Ticked } from "../model.js";
import { freshState, mapAction, reduce } from "./flow.js";
import { renderV3 } from "./render.js";

function ask() {
  return reduce(freshState(), { type: "cover-continue" });
}

describe("where you are", () => {
  it("asks on an empty continue and does not open the month question first", () => {
    const where = ask();
    expect(where.screen).toBe("where");
    document.body.replaceChildren(renderV3(where));
    expect(document.body.textContent).toContain("Where are you today?");
    expect(document.body.textContent).toContain("I need to rebuild");
    expect(document.body.textContent).toContain("I'm steady");
    expect(document.body.textContent).toContain("I want to grow");
    expect(document.querySelector("[data-dig-in]")).toBeNull();
    expect(document.querySelector("[data-act='map-go']")).toBeNull();
  });

  it("sends stressed into the month question and stable or grow past it", () => {
    const where = ask();
    const stressed = reduce(where, { type: "pick-where", id: "rebuild" });
    expect(stressed.screen).toBe("s01");
    expect(stressed.plan.theme).toBe("rebuild");
    expect(stage1Ticked(stressed.plan)).toBe(false);

    const stable = reduce(where, { type: "pick-where", id: "steady" });
    expect(stable.screen).toBe("s05");
    expect(stable.plan.theme).toBe("steady");
    expect(mapAction(stable.plan, stable.ui).stage).toBe("stabilize");

    const grow = reduce(where, { type: "pick-where", id: "grow" });
    expect(grow.screen).toBe("s07");
    expect(grow.plan.theme).toBe("grow");
    expect(grow.plan.cushionBuiltAt).toBeTruthy();
    expect(mapAction(grow.plan, grow.ui).stage).toBe("plan");
    const map = reduce(grow, { type: "home" });
    document.body.replaceChildren(renderV3(map));
    expect(document.querySelector("[data-stage='invest']")?.getAttribute("data-act")).toBe("open-stage");
    expect(reduce(map, { type: "open-stage", stage: "invest" }).screen).toBe("s12");
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
