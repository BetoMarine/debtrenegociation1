/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { el, escapeHtml } from "../dom.js";
import { emptyDraftLoan, newSundayPack } from "./model.js";
import { ENRICH, HELP, POLICE } from "./contacts.js";
import {
  SITUATION_PERSIST_MS,
  SUNDAY_PILL_GAP_PX,
  SUNDAY_PILL_MIN_PX,
  attachSundayStatus,
  renderSunday,
  shouldLeaveApp,
  sundayCornerHtml,
  sundayStatusHtml,
} from "./ui.js";
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
    openExternal: vi.fn(),
    handleSundayPdf: vi.fn(),
    clearSunday: vi.fn(),
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

describe("Sunday situation choice taps", () => {
  it("does not call host.render from nationality, who-knows, or goal taps", () => {
    const src = readFileSync(join(process.cwd(), "src/sunday/ui.js"), "utf8");
    const body = src.slice(src.indexOf("function renderSituation"), src.indexOf("function renderDebts"));
    const taps = [...body.matchAll(/data-sunday-choice[\s\S]*?addEventListener\("click", \(\) => \{([\s\S]*?)\n    \}\);/g)].map(
      (match) => match[1],
    );
    expect(taps).toHaveLength(3);
    for (const tap of taps) expect(tap).not.toContain("host.render");
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

describe("Sunday next door 3a–3c", () => {
  it("dials 999 directly, with a 44px pill and a 16px gap before the eye", () => {
    expect(shouldLeaveApp("tel:999")).toBe(false);
    expect(shouldLeaveApp(POLICE.phoneHref)).toBe(false);
    expect(shouldLeaveApp(ENRICH.booking)).toBe(true);
    expect(SUNDAY_PILL_GAP_PX).toBe(16);
    expect(SUNDAY_PILL_MIN_PX).toBe(44);
    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const cornerCss = css.slice(css.indexOf(".sunday-corner {"), css.indexOf(".pill-999 {"));
    const pillCss = css.slice(css.indexOf(".pill-999 {"), css.indexOf(".eye-off {"));
    const eyeCss = css.slice(css.indexOf(".eye-off {"), css.indexOf(".text-back {"));
    expect(cornerCss).toContain("gap: 16px");
    expect(pillCss).toContain("min-height: 44px");
    expect(pillCss).toContain("min-width: 44px");
    expect(eyeCss).toContain("min-height: 44px");
    expect(eyeCss).toContain("min-width: 44px");

    const wrap = document.createElement("div");
    wrap.innerHTML = sundayCornerHtml(escapeHtml, "en");
    document.body.append(wrap);
    const cluster = wrap.querySelector(".sunday-corner");
    const pill = wrap.querySelector(".pill-999");
    const eye = wrap.querySelector(".eye-off");
    expect(cluster.style.gap).toBe("16px");
    expect(pill.tagName).toBe("A");
    expect(pill.getAttribute("href")).toBe("tel:999");
    expect(pill.style.minHeight).toBe("44px");
    expect(pill.style.minWidth).toBe("44px");
    expect(eye.style.minHeight).toBe("44px");
    expect(eye.style.minWidth).toBe("44px");
    expect(pill.nextElementSibling).toBe(eye);
    pill.click();
    expect(document.querySelector("[data-leave-sheet]")).toBeNull();
    expect(pill.getAttribute("data-leave")).toBeNull();
  });

  it("puts Not affiliated with Enrich under Book, and asks before opening Enrich", async () => {
    const sunday = newSundayPack("en");
    sunday.door = "enrich";
    sunday.privacyAccepted = true;
    sunday.loans = [{ id: "1", nickname: "School", type: "hk_money_lender", balanceBand: "lt_1k", monthlyBand: "lt_1k", guarantor: "no", stillBorrowing: "no" }];
    const { root, host } = mount("sunday-door", sunday);
    expect(root.textContent).toContain("Your next door");
    expect(root.textContent).toContain("Enrich: money counselling");
    expect(root.textContent).toContain("A confidential session. You book it.");
    expect(root.textContent).not.toMatch(/Step 1 of 4/);
    const book = [...root.querySelectorAll("button")].find((btn) => btn.textContent === "Book with Enrich");
    expect(book.tagName).toBe("BUTTON");
    expect(book.getAttribute("href")).toBeNull();
    expect(book.nextElementSibling?.dataset.affiliation).toBe("");
    expect(book.nextElementSibling.textContent).toBe("Not affiliated with Enrich");
    book.click();
    const sheet = document.querySelector("[data-leave-sheet]");
    expect(sheet.textContent).toContain("Leaving Plan Your Life");
    expect(sheet.textContent).toContain("Enrich's form opens in your browser.");
    expect(sheet.textContent).toContain("Your pack stays saved here.");
    expect(sheet.textContent).toContain("Open Enrich");
    expect(sheet.textContent).toContain("Stay here");
    sheet.querySelector("[data-act='stay-here']").click();
    expect(document.querySelector("[data-leave-sheet]")).toBeNull();
    expect(host.openExternal).not.toHaveBeenCalled();
    book.click();
    document.querySelector("[data-act='confirm-leave']").click();
    expect(host.openExternal).toHaveBeenCalledWith(ENRICH.booking);

    const save = root.querySelector("[data-act='save-pack']");
    save.click();
    await vi.waitFor(() => expect(host.go).toHaveBeenCalledWith("sunday-done"));
    expect(host.persistSunday).toHaveBeenCalledWith("sunday-done");
    expect(host.log).toHaveBeenCalledWith("sunday_pack_created");
  });

  it("uses the same leaving sheet for WhatsApp and keeps tel links direct", () => {
    const sunday = newSundayPack("en");
    sunday.flags = ["shark"];
    sunday.door = "shark";
    const { root, host } = mount("sunday-door", sunday);
    const dials = [...root.querySelectorAll("a[href^='tel:']")];
    expect(dials.length).toBeGreaterThan(0);
    for (const link of dials) {
      expect(link.getAttribute("data-leave")).toBeNull();
      link.click();
    }
    expect(document.querySelector("[data-leave-sheet]")).toBeNull();
    const wa = [...root.querySelectorAll("[data-leave='whatsapp']")].find((btn) => btn.getAttribute("data-href") === HELP.whatsappHref);
    expect(wa).toBeTruthy();
    wa.click();
    const sheet = document.querySelector("[data-leave-sheet]");
    expect(sheet.textContent).toContain("Open WhatsApp");
    expect(sheet.textContent).toContain("WhatsApp opens in your browser.");
    sheet.querySelector("[data-act='stay-here']").click();
    expect(host.openExternal).not.toHaveBeenCalled();
    wa.click();
    document.querySelector("[data-act='confirm-leave']").click();
    expect(host.openExternal).toHaveBeenCalledWith(HELP.whatsappHref);
  });

  it("keeps a crisis 999 control on tel:999 and off the leaving sheet", () => {
    const sunday = newSundayPack("en");
    sunday.flags = ["passport"];
    const { root } = mount("sunday-crisis", sunday);
    const pill = [...root.querySelectorAll("a")].find((link) => link.getAttribute("href") === "tel:999");
    expect(pill).toBeTruthy();
    pill.click();
    expect(document.querySelector("[data-leave-sheet]")).toBeNull();
    expect(root.querySelector("[data-leave='whatsapp']")).toBeTruthy();
  });

  it("shows the saved screen with Done and a PDF copy", () => {
    const sunday = newSundayPack("en");
    sunday.privacyAccepted = true;
    sunday.loans = [{ id: "1", nickname: "School", type: "hk_money_lender", balanceBand: "lt_1k", monthlyBand: "lt_1k", guarantor: "no", stillBorrowing: "no" }];
    const { root, host } = mount("sunday-done", sunday);
    expect(root.textContent).toContain("Saved on this phone.");
    expect(root.textContent).toContain("Pick it up on your next day off.");
    expect(root.textContent).not.toMatch(/Step 1 of 4/);
    root.querySelector("[data-act='done']").click();
    expect(host.go).toHaveBeenCalledWith("sunday-door");
    root.querySelector("[data-act='pdf-copy']").click();
    expect(host.handleSundayPdf).toHaveBeenCalledWith("download");
    expect(root.querySelector("[data-go='sunday-door']").textContent).toContain("Door");
  });
});

describe("Sunday no longer hands a Fortune step", () => {
  it("does not write a sunday handoff from the Sunday app", () => {
    const src = readFileSync(join(process.cwd(), "src/sunday/app.js"), "utf8");
    expect(src).not.toMatch(/makeFireHandoff/);
    expect(src).not.toMatch(/source:\s*["']sunday["']/);
    expect(src).toContain("sundayCornerHtml");
    expect(src).not.toMatch(/Step 1 of 4/);
  });
});
