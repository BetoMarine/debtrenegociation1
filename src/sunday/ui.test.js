/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { el, escapeHtml } from "../dom.js";
import { emptyDraftLoan, newSundayPack } from "./model.js";
import { SITUATION_PERSIST_MS, attachSundayStatus, renderSunday, sundayStatusHtml } from "./ui.js";
import { st } from "./copy.js";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.replaceChildren();
});

function mount(screen, sunday, { replaceOnSave = false } = {}) {
  let pack = sunday;
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  const renders = [];
  const host = {
    get sunday() {
      return pack;
    },
    set sunday(value) {
      pack = value;
    },
    sundayLang: "en",
    draftLoan: emptyDraftLoan(),
    busy: false,
    el,
    escapeHtml,
    render(...args) {
      renders.push(args);
    },
    persistSunday: vi.fn(async (next) => {
      pack.screen = next;
      if (replaceOnSave) pack = { ...pack };
      return pack;
    }),
    setNotice: vi.fn(),
    go: vi.fn(),
    shellSunday(body) {
      root.replaceChildren(body);
    },
    log: vi.fn(),
    addSundayLoan: vi.fn(),
    removeSundayLoan: vi.fn(),
  };
  renderSunday(screen, host);
  return { root, host, renders };
}

function typeInto(input, value, caret = value.length) {
  input.focus();
  input.value = value;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Sunday situation screen keeps its place", () => {
  it("selects who-knows, nationality, and goals without remounting the months field", () => {
    const sunday = newSundayPack("en");
    sunday.screen = "sunday-situation";
    const { root, host, renders } = mount("sunday-situation", sunday);
    const months = root.querySelector("#months");
    months.focus();
    const who = root.querySelector('[data-sunday-choice="who"][data-value="employer"]');
    const nationality = root.querySelector('[data-sunday-choice="nationality"][data-value="filipino"]');
    const goal = root.querySelector('[data-sunday-choice="goal"][data-value="rights"]');
    who.focus();
    who.click();
    expect(document.activeElement).toBe(who);
    nationality.click();
    goal.click();
    const friend = root.querySelector('[data-sunday-choice="who"][data-value="friend"]');
    friend.click();

    expect(renders).toEqual([]);
    expect(root.querySelector("#months")).toBe(months);
    expect(who.isConnected).toBe(true);
    expect(friend.isConnected).toBe(true);
    expect(document.activeElement).toBe(who);
    expect(who.classList.contains("selected")).toBe(false);
    expect(friend.classList.contains("selected")).toBe(true);
    expect(nationality.classList.contains("selected")).toBe(true);
    expect(goal.classList.contains("selected")).toBe(true);
    expect(host.sunday.whoKnows).toBe("friend");
    expect(host.sunday.nationality).toBe("filipino");
    expect(host.sunday.goals).toEqual(["rights"]);
    expect(host.persistSunday).toHaveBeenCalledWith("sunday-situation");
    expect(host.go).not.toHaveBeenCalled();
  });

  it("toggles a goal off in place", () => {
    const sunday = newSundayPack("en");
    sunday.goals = ["rights"];
    const { root, host, renders } = mount("sunday-situation", sunday);
    const goal = root.querySelector('[data-sunday-choice="goal"][data-value="rights"]');
    expect(goal.classList.contains("selected")).toBe(true);
    goal.click();
    expect(renders).toEqual([]);
    expect(goal.classList.contains("selected")).toBe(false);
    expect(host.sunday.goals).toEqual([]);
  });

  it("strips non-digits in place and keeps the caret without saving on every key", async () => {
    vi.useFakeTimers();
    const sunday = newSundayPack("en");
    sunday.screen = "sunday-situation";
    const { root, host, renders } = mount("sunday-situation", sunday, { replaceOnSave: true });
    const months = root.querySelector("#months");

    typeInto(months, "1a9", 2);
    expect(months.value).toBe("19");
    expect(months.selectionStart).toBe(1);
    expect(document.activeElement).toBe(months);
    expect(host.sunday.monthsLeft).toBe("19");
    expect(host.persistSunday).not.toHaveBeenCalled();
    expect(renders).toEqual([]);

    await vi.advanceTimersByTimeAsync(SITUATION_PERSIST_MS);
    expect(host.persistSunday).toHaveBeenCalledTimes(1);
    expect(host.persistSunday).toHaveBeenCalledWith("sunday-situation");
    expect(root.querySelector("#months")).toBe(months);
    expect(document.activeElement).toBe(months);

    typeInto(months, "198", 3);
    expect(host.sunday.monthsLeft).toBe("198");
    expect(months.value).toBe("198");
    expect(document.activeElement).toBe(months);
    expect(root.querySelector("#months")).toBe(months);
  });

  it("does not let a paused months save pull the screen back after continue", async () => {
    vi.useFakeTimers();
    const sunday = newSundayPack("en");
    sunday.screen = "sunday-situation";
    sunday.nationality = "filipino";
    sunday.whoKnows = "friend";
    sunday.goals = ["rights"];
    const { root, host } = mount("sunday-situation", sunday);
    typeInto(root.querySelector("#months"), "8");
    root.querySelector(".btn-primary").click();
    await vi.waitFor(() => expect(host.go).toHaveBeenCalledWith("sunday-debts"));
    expect(host.sunday.monthsLeft).toBe("8");
    expect(host.sunday.screen).toBe("sunday-debts");
    await vi.advanceTimersByTimeAsync(SITUATION_PERSIST_MS + 50);
    expect(host.persistSunday.mock.calls.map((call) => call[0])).toEqual(["sunday-debts"]);
  });
});

describe("Sunday text fields that already stay mounted", () => {
  it("keeps the debt nickname field mounted while typing", () => {
    const sunday = newSundayPack("en");
    const { root, host, renders } = mount("sunday-debts", sunday);
    const nick = root.querySelector("#nick");
    typeInto(nick, "Happy");
    expect(renders).toEqual([]);
    expect(root.querySelector("#nick")).toBe(nick);
    expect(document.activeElement).toBe(nick);
    expect(nick.value).toBe("Happy");
    expect(host.draftLoan.nickname).toBe("Happy");
  });

  it("keeps remittance split fields mounted while typing", () => {
    const sunday = newSundayPack("en");
    const { root, renders } = mount("sunday-split", sunday);
    const bills = root.querySelector("#bills");
    const note = root.querySelector("#note");
    typeInto(bills, "40");
    note.focus();
    note.value = "allowance only";
    note.dispatchEvent(new Event("input", { bubbles: true }));
    expect(renders).toEqual([]);
    expect(root.querySelector("#bills")).toBe(bills);
    expect(root.querySelector("#note")).toBe(note);
    expect(sunday.split.bills).toBe("40");
    expect(sunday.splitNote).toBe("allowance only");
  });
});

describe("Sunday status truth", () => {
  it("says Live in one tap and leaves Offshore outside the phone flow", () => {
    expect(st("en", "version")).toBe("PoC v0.8.0");
    expect(st("tl", "statusLive")).toBe("Live");
    expect(st("id", "statusLive")).toBe("Live");
    const root = document.createElement("div");
    root.innerHTML = `<button class="status-about" type="button" data-act="status">About</button><button type="button" data-act="version">PoC v0.8.0</button>`;
    document.body.append(root);
    expect(root.textContent).not.toMatch(/\bLive\b/);
    expect(sundayStatusHtml(escapeHtml, "en")).not.toMatch(/Offshore|Testing/i);
    attachSundayStatus(root, "en", escapeHtml);
    root.querySelector("[data-act='status']").click();
    expect(root.textContent).toContain("Sunday Pack");
    expect(root.textContent).toContain("Live");
    expect(root.textContent).not.toMatch(/Offshore/i);
    expect(root.textContent).not.toContain("Testing");
    root.querySelector("[data-act='close-status']").click();
    expect(root.querySelector("[data-status-sheet]")).toBeNull();
  });
});
