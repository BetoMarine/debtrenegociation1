import { getFortuneHandoff, getFortuneSlice, getPack, saveFortuneSlice, wipeFortune } from "../../db.js";
import { freshState, futureSnapshot, hydrate, landOnDoor, reduce } from "./flow.js";
import { buildFutureLifePdf } from "./timeline.js";
import { formatIsoDate, rightDoorJoined } from "./life.js";
import { renderFirstBuild } from "./view.js";

const EXIT_URL = "https://www.google.com/";

let state = freshState();
let saveTimer = 0;
let doorJoined = false;

/** One writer at a time. A late save of the old plan cannot land after Erase. */
export function createPersistGate() {
  let chain = Promise.resolve();
  return function exclusive(task) {
    const run = chain.then(() => task(), () => task());
    chain = run.then(
      () => {},
      () => {},
    );
    return run;
  };
}

const exclusive = createPersistGate();

function root() {
  return document.getElementById("app");
}

function syncHash() {
  const want = `#/${state.screen}`;
  if (location.hash !== want) {
    history.replaceState(null, "", `${location.pathname}${location.search}${want}`);
  }
}

function viewState() {
  return { ...state, rightDoorJoined: doorJoined };
}

function draw() {
  const host = root();
  if (!host) return;
  const active = document.activeElement;
  const field = active && host.contains(active) ? active.getAttribute("data-field") : "";
  const caret = field && typeof active.selectionStart === "number" ? active.selectionStart : null;
  host.innerHTML = renderFirstBuild(viewState());
  if (field) {
    const next = host.querySelector(`[data-field="${field}"]`);
    if (next) {
      next.focus();
      if (caret != null && next.setSelectionRange) {
        const pos = Math.min(caret, String(next.value || "").length);
        next.setSelectionRange(pos, pos);
      }
    }
  }
  syncHash();
}

function storedSlice(current) {
  const { rightDoorJoined: _door, lifeBaseline: _baseline, lifeDetail: _detail, privacyOpen: _privacy, ...stored } = current;
  return stored;
}

async function persist() {
  const snapshot = storedSlice(state);
  try {
    await exclusive(() => saveFortuneSlice(snapshot));
  } catch {
    /* Session still runs if the on-device store is blocked. */
  }
}

function schedulePersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist();
  }, 200);
}

function readDrafts() {
  const host = root();
  if (!host) return [];
  const keys = [];
  host.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.getAttribute("data-key");
    if (key && !keys.includes(key)) keys.push(key);
  });
  return keys.map((key) => {
    const nodes = [...host.querySelectorAll(`[data-key="${key}"]`)];
    const value = (name) => nodes.find((node) => node.getAttribute("data-field") === name)?.value;
    return {
      type: "edit",
      key,
      amount: value("amount"),
      days: value("days"),
      text: value("text"),
      date: value("date"),
      months: value("months"),
      note: value("note") ?? "",
    };
  });
}

function commitDraft() {
  for (const draft of readDrafts()) state = reduce(state, draft).state;
}

function paintDate(field) {
  if (!field || field.getAttribute("data-field") !== "date") return;
  const shown = field.parentElement?.querySelector(".ft-date-shown");
  if (!shown) return;
  const text = formatIsoDate(field.value);
  shown.textContent = text || "Pick a date";
  shown.classList.toggle("is-placeholder", !text);
  field.parentElement.classList.toggle("is-empty", !text);
  if (field.value) field.setAttribute("value", field.value);
}

function keepDoor(next) {
  state = { ...next, rightDoorJoined: doorJoined };
}

async function apply(result) {
  clearTimeout(saveTimer);
  if (result.wipe) {
    const next = { ...result.state, rightDoorJoined: doorJoined };
    try {
      await exclusive(async () => {
        await wipeFortune();
        state = next;
        await saveFortuneSlice(storedSlice(state));
      });
    } catch {
      return;
    }
    draw();
    return;
  }
  keepDoor(result.state);
  draw();
  await persist();
}

async function exitApp() {
  commitDraft();
  await persist();
  location.replace(EXIT_URL);
}

function onClick(event) {
  const dateInput = event.target.closest?.("input[type='date']");
  if (dateInput && root()?.contains(dateInput) && typeof dateInput.showPicker === "function") {
    try {
      dateInput.showPicker();
      event.preventDefault();
    } catch {
      /* The browser's own calendar is already opening from this tap. */
    }
  }
  const btn = event.target.closest("[data-act]");
  if (!btn || !root()?.contains(btn)) return;
  const act = btn.getAttribute("data-act");
  if (act === "exit") {
    event.preventDefault();
    exitApp();
    return;
  }
  if (act === "continue" || act === "back" || act === "open-erase" || act === "open-life" || act === "show-plan") commitDraft();
  if (act === "continue") {
    apply(reduce(state, { type: "continue" }));
    return;
  }
  if (act === "back") {
    apply(reduce(state, { type: "back" }));
    return;
  }
  if (act === "pick-entry" || act === "pick-fix" || act === "pick-cushion" || act === "pick-grow" || act === "pick-next") {
    const value = btn.getAttribute("data-value");
    const action =
      act === "pick-entry"
        ? { type: "pick-entry", entry: value }
        : act === "pick-fix"
          ? { type: "pick-fix", situation: value }
          : act === "pick-cushion"
            ? { type: "pick-cushion", situation: value }
            : act === "pick-next"
              ? { type: "pick-next", pick: value }
              : { type: "pick-grow", pick: value };
    apply(reduce(state, action));
    return;
  }
  if (act === "info" || act === "privacy-info") {
    if (act === "privacy-info") commitDraft();
    apply(reduce(state, { type: act === "privacy-info" ? "privacy-info" : "info" }));
    return;
  }
  if (act === "open-erase" || act === "cancel-erase" || act === "confirm-erase" || act === "erase-ok") {
    apply(reduce(state, { type: act }));
    return;
  }
  if (act === "download-life") {
    event.preventDefault();
    buildFutureLifePdf(futureSnapshot(state)).save("your-future-life.pdf");
    return;
  }
  if (act === "open-boost" || act === "pick-boost" || act === "boost-mode") {
    event.preventDefault();
    const value = btn.getAttribute("data-value");
    apply(reduce(state, { type: act, id: value, mode: value }));
    return;
  }
  if (act === "open-life" || act === "open-net" || act === "close-net" || act === "show-plan" || act === "back-to-input" || act === "project-next" || act === "skip-fund" || act === "add-goal" || act === "open-savings") {
    apply(reduce(state, { type: act }));
    return;
  }
  if (act === "open-milestone") {
    apply(reduce(state, { type: act, id: btn.getAttribute("data-value") }));
  }
}

function onInput(event) {
  const field = event.target.closest("[data-field]");
  if (!field || !root()?.contains(field)) return;
  paintDate(field);
  commitDraft();
  schedulePersist();
}

function onDateBlur(event) {
  const field = event.target?.closest?.("[data-field]");
  if (!field || !root()?.contains(field) || field.getAttribute("data-field") !== "date") return;
  if (!field.value) return;
  paintDate(field);
  commitDraft();
  schedulePersist();
}

function onKeydown(event) {
  if (event.key !== "Enter") return;
  if (!event.target.matches?.("[data-field]")) return;
  event.preventDefault();
  commitDraft();
  apply(reduce(state, { type: "continue" }));
}

async function loadDoor() {
  try {
    const [pack, handoff] = await Promise.all([getPack(), getFortuneHandoff()]);
    doorJoined = rightDoorJoined(pack, handoff);
  } catch {
    doorJoined = false;
  }
}

export async function boot() {
  let saved = null;
  try {
    saved = hydrate(await getFortuneSlice());
  } catch {
    saved = null;
  }
  await loadDoor();
  state = { ...(saved || freshState()), rightDoorJoined: doorJoined };
  if (state.screen === "l2" && !doorJoined) state = { ...state, screen: "l0" };
  state = landOnDoor(state);
  const host = root();
  if (!host) return;
  host.addEventListener("click", onClick);
  host.addEventListener("input", onInput);
  host.addEventListener("change", onInput);
  host.addEventListener("focusout", onDateBlur);
  host.addEventListener("keydown", onKeydown);
  draw();
  await persist();
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    state = landOnDoor(state);
    draw();
    persist();
  });
}
