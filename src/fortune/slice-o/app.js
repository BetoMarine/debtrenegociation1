import { buildSliceOPdf } from "./pdf.js";
import { SCREENS, clearState, loadState, previewFrame, reduce, storeState } from "./flow.js";
import { renderSliceO } from "./view.js";

const EXIT_URL = "https://www.google.com/";

let state = loadState(safeStorage());
let saveTimer = 0;

function safeStorage() {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function root() {
  return document.getElementById("app");
}

export function keyboardOverlap(innerHeight, viewportHeight, offsetTop = 0) {
  const inner = Number(innerHeight);
  const height = Number(viewportHeight);
  const top = Number(offsetTop) || 0;
  if (!Number.isFinite(inner) || !Number.isFinite(height)) return 0;
  return Math.max(0, Math.round(inner - height - top));
}

function syncHash() {
  const want = `#/${state.screen}`;
  if (location.hash !== want) {
    history.replaceState(null, "", `${location.pathname}${location.search}${want}`);
  }
}

function draw() {
  const host = root();
  if (!host) return;
  const active = document.activeElement;
  const field = active && host.contains(active) ? active.getAttribute("data-field") : "";
  const caret = field && typeof active.selectionStart === "number" ? active.selectionStart : null;
  host.innerHTML = renderSliceO(state);
  if (field) {
    const next = host.querySelector(`[data-field="${CSS.escape(field)}"]`);
    if (next) {
      next.focus();
      if (caret != null && next.setSelectionRange) {
        const pos = Math.min(caret, String(next.value || "").length);
        try {
          next.setSelectionRange(pos, pos);
        } catch {
          /* date inputs */
        }
      }
    }
  }
  syncHash();
}

function persist() {
  storeState(safeStorage(), state);
}

function schedulePersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 200);
}

function commitFields() {
  const host = root();
  if (!host) return;
  host.querySelectorAll("[data-field]").forEach((el) => {
    state = reduce(state, { type: "edit", key: el.getAttribute("data-field"), value: el.value }).state;
  });
}

function apply(action) {
  clearTimeout(saveTimer);
  const result = reduce(state, action);
  if (result.wipe) {
    clearState(safeStorage());
    state = result.state;
    draw();
    return;
  }
  state = result.state;
  draw();
  persist();
  if (result.href) location.assign(result.href);
}

async function download() {
  commitFields();
  persist();
  const file = buildSliceOPdf(state).output("blob");
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fortune-dated-plan.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function onClick(event) {
  const node = event.target.closest?.("[data-act]");
  if (!node || !root()?.contains(node)) return;
  const act = node.getAttribute("data-act");
  if (act === "stay") return;
  if (act === "door" || act === "next" || act === "go" || act === "download" || act === "decode") {
    event.preventDefault();
  }
  commitFields();
  if (act === "exit") {
    persist();
    location.replace(EXIT_URL);
    return;
  }
  if (act === "download") {
    download();
    return;
  }
  if (act === "choose") {
    apply({ type: "choose", field: node.getAttribute("data-field"), value: node.getAttribute("data-value") });
    return;
  }
  if (act === "door") {
    apply({ type: "door", door: node.getAttribute("data-value") });
    return;
  }
  if (act === "go") {
    apply({ type: "go", screen: node.getAttribute("data-value") });
    return;
  }
  if (act === "remove-goal") {
    apply({ type: "remove-goal", id: node.getAttribute("data-value") });
    return;
  }
  if (act === "browse") return;
  apply({ type: act });
}

function onInput(event) {
  const field = event.target?.getAttribute?.("data-field");
  if (!field) return;
  state = reduce(state, { type: "edit", key: field, value: event.target.value }).state;
  schedulePersist();
  if (state.screen === "cushion" || state.screen === "goals" || state.screen === "shelf") {
    draw();
  }
}

function onKey(event) {
  if (event.key !== "Enter") return;
  if (event.target?.matches?.("textarea")) return;
  if (!event.target?.matches?.("input")) return;
  event.preventDefault();
  commitFields();
  apply({ type: "next" });
}

function bindKeyboard() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const applyOverlap = () => {
    const overlap = keyboardOverlap(window.innerHeight, viewport.height, viewport.offsetTop);
    document.documentElement.style.setProperty("--so-keyboard", `${overlap}px`);
  };
  viewport.addEventListener("resize", applyOverlap);
  viewport.addEventListener("scroll", applyOverlap);
  applyOverlap();
}

export function boot() {
  const frame = new URLSearchParams(location.search).get("frame");
  state = frame && SCREENS.includes(frame) ? previewFrame(frame) : loadState(safeStorage());
  const host = root();
  if (!host) return;
  host.addEventListener("click", onClick);
  host.addEventListener("input", onInput);
  host.addEventListener("keydown", onKey);
  bindKeyboard();
  draw();
}
