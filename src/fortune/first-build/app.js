import { getFortuneHandoff, getFortuneSlice, getPack, saveFortuneSlice, wipeFortune } from "../../db.js";
import { freshState, hydrate, reduce } from "./flow.js";
import { rightDoorJoined } from "./life.js";
import { renderFirstBuild } from "./view.js";

const EXIT_URL = "https://www.google.com/";

let state = freshState();
let saveTimer = 0;
let doorJoined = false;

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

async function persist() {
  try {
    const { rightDoorJoined: _door, lifeBaseline: _baseline, lifeDetail: _detail, ...stored } = state;
    await saveFortuneSlice(stored);
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

function readDraft() {
  const host = root();
  if (!host) return null;
  const amount = host.querySelector("[data-field=amount]");
  const days = host.querySelector("[data-field=days]");
  const note = host.querySelector("[data-field=note]");
  if (!amount && !days) return null;
  const key = (amount || days).getAttribute("data-key");
  return {
    type: "edit",
    key,
    amount: amount ? amount.value : undefined,
    days: days ? days.value : undefined,
    note: note ? note.value : "",
  };
}

function commitDraft() {
  const draft = readDraft();
  if (!draft) return;
  state = reduce(state, draft).state;
}

function keepDoor(next) {
  state = { ...next, rightDoorJoined: doorJoined };
}

async function apply(result) {
  clearTimeout(saveTimer);
  if (result.wipe) {
    try {
      await wipeFortune();
    } catch {
      return;
    }
    keepDoor(result.state);
    await persist();
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
  if (act === "pick-entry" || act === "pick-fix" || act === "pick-cushion" || act === "pick-grow") {
    const value = btn.getAttribute("data-value");
    const action =
      act === "pick-entry"
        ? { type: "pick-entry", entry: value }
        : act === "pick-fix"
          ? { type: "pick-fix", situation: value }
          : act === "pick-cushion"
            ? { type: "pick-cushion", situation: value }
            : { type: "pick-grow", pick: value };
    apply(reduce(state, action));
    return;
  }
  if (act === "info") {
    apply(reduce(state, { type: "info" }));
    return;
  }
  if (act === "open-erase" || act === "cancel-erase" || act === "confirm-erase" || act === "erase-ok") {
    apply(reduce(state, { type: act }));
    return;
  }
  if (act === "open-life" || act === "open-net" || act === "close-net" || act === "show-plan" || act === "back-to-input") {
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
  const host = root();
  if (!host) return;
  host.addEventListener("click", onClick);
  host.addEventListener("input", onInput);
  host.addEventListener("keydown", onKeydown);
  draw();
  await persist();
}
