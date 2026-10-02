/**
 * Fortune Teller Slice A — one continuous flow.
 * Cold start and post-erase land on Where are you? (W0).
 * Invest stays locked until the cushion floor is real.
 * Fix ends before live Right Door; this slice does not open RD.
 */

export const SCREEN_IDS = [
  "w0",
  "i0",
  "f0",
  "i1",
  "f1",
  "f2",
  "f3",
  "i2",
  "i2b",
  "s0",
  "s1",
  "s2",
  "s3",
  "i3",
  "i3b",
  "g0",
  "g1",
  "g2",
  "g3",
  "e0",
  "e1",
];

export const FRAME_IDS = {
  w0: "W0-where-are-you",
  i0: "I0-input-start",
  f0: "F0-get-through-this-month",
  i1: "I1-input-before-fix-options",
  f1: "F1-missed",
  f2: "F2-soon",
  f3: "F3-ok-worry",
  i2: "I2-missed-amount",
  i2b: "I2b-days-late",
  s0: "S0-build-cushion",
  s1: "S1-none",
  s2: "S2-small",
  s3: "S3-ok",
  i3: "I3-cushion-now",
  i3b: "I3b-cushion-target",
  g0: "G0-plan-next",
  g1: "G1-goals",
  g2: "G2-insurance",
  g3: "G3-invest-locked",
  e0: "E0-erase-confirm",
  e1: "E1-erase-done",
};

const ENTRY_SCREEN = {
  stressed: "f0",
  stable: "s0",
  ok: "g0",
};

const FIX_DETAIL = {
  missed: "f1",
  soon: "f2",
  worry: "f3",
};

const CUSHION_DETAIL = {
  none: "s1",
  small: "s2",
  ok: "s3",
};

const INPUT_SCREENS = {
  i0: "takeHome",
  i1: "stillDue",
  i2: "overdue",
  i2b: "daysLate",
  i3: "cushionNow",
  i3b: "cushionTarget",
};

function blankMoney() {
  return { amount: "", note: "" };
}

function blankDays() {
  return { days: "", note: "" };
}

export function freshState() {
  return {
    version: 1,
    screen: "w0",
    entry: null,
    fixSituation: null,
    cushionSituation: null,
    planFrom: "i0",
    inputs: {
      takeHome: blankMoney(),
      stillDue: blankMoney(),
      overdue: blankMoney(),
      daysLate: blankDays(),
      cushionNow: blankMoney(),
      cushionTarget: blankMoney(),
    },
    infoOpen: false,
    showRequired: false,
    fixHeldForRightDoor: false,
    eraseFrom: null,
  };
}

export function parseAmount(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(/HK\$/gi, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDays(raw) {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

function cleanNote(raw) {
  return String(raw ?? "").slice(0, 280);
}

function cleanAmount(raw) {
  return String(raw ?? "")
    .replace(/HK\$/gi, "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")
    .slice(0, 16);
}

function cleanDays(raw) {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, 5);
}

export function canContinue(state) {
  switch (state.screen) {
    case "i0":
      return parseAmount(state.inputs.takeHome.amount) !== null;
    case "i1":
      return parseAmount(state.inputs.stillDue.amount) !== null;
    case "i2":
      return parseAmount(state.inputs.overdue.amount) !== null;
    case "i2b":
      return parseDays(state.inputs.daysLate.days) !== null;
    case "i3":
      return parseAmount(state.inputs.cushionNow.amount) !== null;
    case "i3b":
      return parseAmount(state.inputs.cushionTarget.amount) !== null;
    case "f1":
    case "f2":
    case "f3":
    case "s1":
    case "s2":
    case "s3":
    case "g1":
    case "g2":
      return true;
    default:
      return false;
  }
}

/** Floor is real only from actual amounts, not from tapping Plan. */
export function cushionReady(state) {
  const now = parseAmount(state.inputs.cushionNow.amount);
  const target = parseAmount(state.inputs.cushionTarget.amount);
  if (now === null || target === null || target <= 0) return false;
  return now >= target;
}

function advance(state) {
  switch (state.screen) {
    case "i0": {
      const dest = ENTRY_SCREEN[state.entry];
      if (!dest) return state;
      return { ...state, screen: dest, planFrom: "i0", showRequired: false, infoOpen: false };
    }
    case "i1": {
      const dest = FIX_DETAIL[state.fixSituation];
      if (!dest) return { ...state, screen: "f0", showRequired: false };
      return { ...state, screen: dest, showRequired: false };
    }
    case "f1":
      return { ...state, screen: "i2", showRequired: false };
    case "f2":
    case "f3":
    case "i2b":
      return { ...state, fixHeldForRightDoor: true };
    case "i2":
      return { ...state, screen: "i2b", showRequired: false };
    case "s1":
    case "s2":
    case "s3":
      return { ...state, screen: "i3", showRequired: false };
    case "i3":
      return { ...state, screen: "i3b", showRequired: false };
    case "i3b":
      return { ...state, screen: "g0", planFrom: "i3b", showRequired: false };
    case "g1":
    case "g2":
      return { ...state, screen: "g0" };
    default:
      return state;
  }
}

function backTo(state) {
  switch (state.screen) {
    case "i0":
      return "w0";
    case "f0":
    case "s0":
      return "i0";
    case "i1":
      return "f0";
    case "f1":
    case "f2":
    case "f3":
      return "i1";
    case "i2":
      return "f1";
    case "i2b":
      return "i2";
    case "s1":
    case "s2":
    case "s3":
      return "s0";
    case "i3":
      return CUSHION_DETAIL[state.cushionSituation] || "s0";
    case "i3b":
      return "i3";
    case "g0":
      return state.planFrom === "i3b" ? "i3b" : "i0";
    case "g1":
    case "g2":
    case "g3":
      return "g0";
    default:
      return null;
  }
}

function withInput(state, action) {
  const key = action.key;
  if (!state.inputs[key]) return state;
  const inputs = { ...state.inputs };
  if (key === "daysLate") {
    inputs.daysLate = {
      days: cleanDays(action.days ?? inputs.daysLate.days),
      note: cleanNote(action.note ?? inputs.daysLate.note),
    };
  } else {
    inputs[key] = {
      amount: cleanAmount(action.amount ?? inputs[key].amount),
      note: cleanNote(action.note ?? inputs[key].note),
    };
  }
  return { ...state, inputs, showRequired: false };
}

function step(state, action) {
  switch (action.type) {
    case "pick-entry":
      if (!ENTRY_SCREEN[action.entry]) return state;
      return {
        ...state,
        entry: action.entry,
        screen: "i0",
        infoOpen: false,
        showRequired: false,
      };
    case "pick-fix":
      if (!FIX_DETAIL[action.situation]) return state;
      return { ...state, fixSituation: action.situation, screen: "i1", showRequired: false };
    case "pick-cushion":
      if (!CUSHION_DETAIL[action.situation]) return state;
      return {
        ...state,
        cushionSituation: action.situation,
        screen: CUSHION_DETAIL[action.situation],
        showRequired: false,
      };
    case "pick-grow":
      if (action.pick === "goals") return { ...state, screen: "g1" };
      if (action.pick === "insurance") return { ...state, screen: "g2" };
      if (action.pick === "invest") return { ...state, screen: "g3" };
      return state;
    case "edit":
      return withInput(state, action);
    case "continue":
      if (!canContinue(state)) return { ...state, showRequired: true };
      return advance(state);
    case "back": {
      const screen = backTo(state);
      if (!screen) return state;
      return { ...state, screen, showRequired: false, infoOpen: false };
    }
    case "info":
      if (state.screen !== "i0") return state;
      return { ...state, infoOpen: !state.infoOpen };
    case "open-erase":
      if (state.screen !== "w0") return state;
      return { ...state, screen: "e0", eraseFrom: "w0" };
    case "cancel-erase":
      if (state.screen !== "e0") return state;
      return { ...state, screen: "w0", eraseFrom: null };
    case "erase-ok":
      if (state.screen !== "e1") return state;
      return freshState();
    default:
      return state;
  }
}

export function reduce(state, action) {
  const current = state || freshState();
  if (!action || typeof action.type !== "string") return { wipe: false, state: current };
  if (action.type === "confirm-erase") {
    if (current.screen !== "e0") return { wipe: false, state: current };
    return { wipe: true, state: { ...freshState(), screen: "e1" } };
  }
  return { wipe: false, state: step(current, action) };
}

function oneOf(value, allowed) {
  return allowed.includes(value) ? value : null;
}

export function hydrate(raw) {
  if (!raw || raw.version !== 1 || !SCREEN_IDS.includes(raw.screen)) return null;
  const base = freshState();
  const inputs = { ...base.inputs };
  for (const key of Object.keys(base.inputs)) {
    const src = raw.inputs?.[key];
    if (!src || typeof src !== "object") continue;
    if (key === "daysLate") {
      inputs.daysLate = { days: cleanDays(src.days), note: cleanNote(src.note) };
    } else {
      inputs[key] = { amount: cleanAmount(src.amount), note: cleanNote(src.note) };
    }
  }
  let screen = raw.screen === "e0" ? "w0" : raw.screen;
  const entry = oneOf(raw.entry, ["stressed", "stable", "ok"]);
  const fixSituation = oneOf(raw.fixSituation, ["missed", "soon", "worry"]);
  const cushionSituation = oneOf(raw.cushionSituation, ["none", "small", "ok"]);
  if (["f1", "i2", "i2b"].includes(screen) && fixSituation !== "missed") screen = "f0";
  if (screen === "f2" && fixSituation !== "soon") screen = "f0";
  if (screen === "f3" && fixSituation !== "worry") screen = "f0";
  if (screen === "i1" && !fixSituation) screen = "f0";
  if (screen === "s1" && cushionSituation !== "none") screen = "s0";
  if (screen === "s2" && cushionSituation !== "small") screen = "s0";
  if (screen === "s3" && cushionSituation !== "ok") screen = "s0";
  if (["i3", "i3b"].includes(screen) && !cushionSituation) screen = "s0";
  if (["f0", "i1", "f1", "f2", "f3", "i2", "i2b"].includes(screen) && entry !== "stressed") {
    screen = entry ? "i0" : "w0";
  }
  if (["s0", "s1", "s2", "s3", "i3", "i3b"].includes(screen) && entry !== "stable" && raw.planFrom !== "i3b") {
    if (entry !== "stable") screen = entry ? "i0" : "w0";
  }
  return {
    ...base,
    screen,
    entry,
    fixSituation,
    cushionSituation,
    planFrom: raw.planFrom === "i3b" ? "i3b" : "i0",
    inputs,
    fixHeldForRightDoor: raw.fixHeldForRightDoor === true,
    infoOpen: false,
    showRequired: false,
    eraseFrom: null,
  };
}

const INPUT_COPY = {
  i0: {
    title: "Monthly take-home",
    body: "Your actual amount after tax.",
    chip: "Start",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "One actual number, after tax. Not a range.",
    requiredHint: "Enter an amount to continue.",
  },
  i1: {
    title: "Still due this month",
    body: "What you still need to cover.",
    chip: "This month",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter an amount to continue.",
  },
  i2: {
    title: "Amount overdue",
    body: "Total you have already missed.",
    chip: "This month",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter an amount to continue.",
  },
  i2b: {
    title: "Days late",
    body: "How many days past due.",
    chip: "This month",
    label: "Days",
    prefix: "",
    mode: "days",
    requiredHint: "Enter the number of days to continue.",
    rdLater: true,
  },
  i3: {
    title: "Current savings",
    body: "What you have set aside now.",
    chip: "Cushion",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter an amount to continue.",
  },
  i3b: {
    title: "Cushion target",
    body: "The emergency amount you want.",
    chip: "Cushion",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter an amount to continue.",
  },
};

const CONTINUE_COPY = {
  f1: {
    title: "Missed payments",
    body: "We’ll ask two numbers only.",
    chip: "This month",
  },
  f2: {
    title: "Will miss soon",
    body: "Act before the due date.",
    chip: "This month",
    rdLater: true,
  },
  f3: {
    title: "OK for now — debt worrying",
    body: "Stay steady. Then build a cushion.",
    chip: "This month",
    rdLater: true,
  },
  s1: {
    title: "No savings yet",
    body: "We’ll set a real target next.",
    chip: "Cushion",
  },
  s2: {
    title: "Small savings",
    body: "Good start. Let’s size the gap.",
    chip: "Cushion",
  },
  s3: {
    title: "Emergency fund ok",
    body: "Floor looks real. Planning can open.",
    chip: "Cushion",
  },
  g1: {
    title: "Plan future goals",
    body: "Name what you’re saving toward.",
    chip: "Plan",
  },
  g2: {
    title: "Add insurance",
    body: "Cover that protects the plan.",
    chip: "Plan",
  },
};

function choice(id, label, extra = {}) {
  return { id, label, locked: false, ...extra };
}

export function present(state) {
  const id = state.screen;
  const ready = cushionReady(state);
  const base = {
    id,
    frame: FRAME_IDS[id],
    brand: id === "w0" || id === "e0" || id === "e1",
    showBack: !["w0", "e0", "e1"].includes(id),
    chip: null,
    title: "",
    body: "",
    kind: "choices",
    choices: [],
    input: null,
    info: null,
    infoOpen: state.infoOpen === true,
    primary: null,
    quiet: null,
    danger: null,
    rdLater: false,
    showRequired: false,
    requiredHint: "",
    lockedInvest: !ready,
    skip: false,
  };

  if (id === "w0") {
    return {
      ...base,
      title: "Where are you?",
      body: "Pick what fits today.",
      kind: "choices",
      choices: [
        choice("stressed", "Under money stress"),
        choice("stable", "Stable — building a cushion"),
        choice("ok", "Ready to plan what’s next"),
      ],
      quiet: "Erase",
    };
  }

  if (id === "e0") {
    return {
      ...base,
      kind: "erase",
      brand: true,
      showBack: false,
      title: "Erase Fortune Teller on this phone?",
      body: "Your other Plan Your Life apps keep what they saved. This can’t be undone.",
      danger: "Erase everything",
      quiet: "Cancel",
      choices: [],
    };
  }

  if (INPUT_COPY[id]) {
    const copy = INPUT_COPY[id];
    const key = INPUT_SCREENS[id];
    const field = state.inputs[key];
    return {
      ...base,
      kind: "input",
      title: copy.title,
      body: copy.body,
      chip: copy.chip,
      info: copy.info || null,
      rdLater: copy.rdLater === true,
      showRequired: state.showRequired === true,
      requiredHint: copy.requiredHint,
      skip: false,
      primary: "Continue",
      input: {
        key,
        mode: copy.mode,
        label: copy.label,
        prefix: copy.prefix,
        amount: copy.mode === "days" ? field.days : field.amount,
        note: field.note,
      },
    };
  }

  if (CONTINUE_COPY[id]) {
    const copy = CONTINUE_COPY[id];
    return {
      ...base,
      kind: "continue",
      title: copy.title,
      body: copy.body,
      chip: copy.chip,
      rdLater: copy.rdLater === true,
      primary: "Continue",
      skip: false,
    };
  }

  if (id === "f0") {
    return {
      ...base,
      kind: "choices",
      title: "Get through this month",
      body: "What’s true right now?",
      chip: "This month",
      choices: [
        choice("missed", "Missed payments"),
        choice("soon", "No missed payments but will soon"),
        choice("worry", "All good for now but debt is concerning"),
      ],
    };
  }

  if (id === "s0") {
    return {
      ...base,
      kind: "choices",
      title: "Build a cushion",
      body: "Where is your emergency fund?",
      chip: "Cushion",
      choices: [
        choice("none", "No savings"),
        choice("small", "Small savings"),
        choice("ok", "Emergency fund ok"),
      ],
    };
  }

  if (id === "g0") {
    return {
      ...base,
      kind: "choices",
      title: "Plan what’s next",
      body: "Pick one to work on.",
      chip: "Plan",
      choices: [
        choice("goals", "Plan future goals"),
        choice("insurance", "Add insurance"),
        choice("invest", "Invest", {
          locked: !ready,
          sub: ready ? "" : "Opens when your cushion is ready",
        }),
      ],
    };
  }

  if (id === "g3") {
    if (ready) {
      return {
        ...base,
        kind: "locked",
        title: "Invest",
        body: "Your cushion is ready.",
        chip: "Plan",
        quiet: "Back to plan",
        lockedInvest: false,
      };
    }
    return {
      ...base,
      kind: "locked",
      title: "Invest",
      body: "Opens when your cushion is ready.",
      chip: "Plan",
      quiet: "Back to plan",
      lockTitle: "Still locked",
      lockBody: "Build your emergency floor first. Then Help it grow can open.",
      lockedInvest: true,
    };
  }

  if (id === "e1") {
    return {
      ...base,
      kind: "done",
      brand: true,
      showBack: false,
      title: "Fortune Teller erased from this phone.",
      body: "Other Plan Your Life apps keep their own data.",
      primary: "OK",
      choices: [],
      quiet: null,
    };
  }

  return base;
}
