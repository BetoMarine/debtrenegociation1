/**
 * Fortune Teller first build.
 * Slice A: one continuous flow. Cold start and post-erase land on Where are you? (W0).
 * Invest stays locked until the cushion floor is real.
 * Slice B: Your life timeline on these inputs. Live Right Door UI stays untouched.
 */

import { buildLife, formatIsoDate, formatPlain, parseIsoDate } from "./life.js";
import { boostTextFor } from "./timeline.js";

export const SCREEN_IDS = [
  "w0",
  "i0",
  "ic",
  "f0",
  "i1",
  "f1",
  "f2",
  "f3",
  "i2",
  "i2b",
  "fd",
  "fd2",
  "fd3",
  "rc",
  "sf",
  "tl",
  "tl2",
  "tl3",
  "tl4",
  "s0",
  "s1",
  "s2",
  "s3",
  "i3",
  "i3b",
  "sd",
  "sd2",
  "sd3",
  "g0",
  "g1",
  "g2",
  "ig",
  "ig2",
  "gd",
  "gd2",
  "g3",
  "e0",
  "e1",
  "l0",
  "l1",
  "l2",
  "l3",
  "l4",
  "l5",
  "l6",
];

const LIFE_FRAME = {
  l0: "L0-your-life-scroll",
  l1: "L1-today",
  l2: "L2-right-door-complete",
  l3: "L3-emergency-fund",
  l4: "L4-invest-stub",
  l5: "L5-goals-stub",
  l6: "L6-age-stub",
};

const LIFE_FOCUS = {
  l0: "scroll",
  l1: "today",
  l2: "rd",
  l3: "ef",
  l4: "invest",
  l5: "goals",
  l6: "age",
};

const MILESTONE_SCREEN = {
  today: "l1",
  rd: "l2",
  ef: "l3",
  invest: "l4",
  goals: "l5",
  age: "l6",
};

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

export const SLICE_C_FRAMES = {
  ic: "Ic-monthly-costs",
  fd: "Fd-this-month-picture",
  fd2: "Fd2-what-you-can-do",
  fd3: "Fd3-costs-updated",
  sd: "Sd-save-each-month",
  sd2: "Sd2-cushion-plan",
  sd3: "Sd3-cushion-ready-gate",
  gd: "Gd-goal-amount",
  gd2: "Gd2-insurance-cover",
  ig: "Ig-goal-name",
  ig2: "Ig2-goal-date-by",
  tl: "Tl-debt-amount",
  tl2: "Tl2-total-contract",
  tl3: "Tl3-monthly-premium",
  tl4: "Tl4-duration",
};

function frameOf(id, ready) {
  if (id === "g3") return ready ? "Gd4-invest-unlocked" : "Gd3-invest-still-locked";
  return SLICE_C_FRAMES[id] || FRAME_IDS[id] || "";
}

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
  ic: "monthlyCosts",
  i1: "stillDue",
  i2: "overdue",
  i2b: "daysLate",
  i3: "cushionNow",
  i3b: "cushionTarget",
  sd: "monthlySave",
  gd: "goalAmount",
  gd2: "cover",
  ig: "goalName",
  ig2: "goalDate",
  tl: "lenderDebt",
  tl2: "lenderContract",
  tl3: "lenderPremium",
  tl4: "lenderDuration",
  rc: "costCut",
  sf: "fundTarget",
};

const SUMMARY_PLAN = new Set(["fd", "fd3", "sd2", "sd3", "g3"]);

const INFO_SCREENS = new Set(["i0", "ic", "sd", "gd", "gd2", "ig", "ig2"]);

function blankMoney() {
  return { amount: "", note: "" };
}

function blankDays() {
  return { days: "", note: "" };
}

/**
 * Every open, reload, and return visit starts on Where are you.
 * Saved answers, goals, and the fund stay until Erase.
 */
export function landOnDoor(state) {
  const current = state || freshState();
  return {
    ...current,
    screen: "w0",
    infoOpen: false,
    showRequired: false,
    privacyOpen: false,
    lifeDetail: false,
    fromInput: false,
  };
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
      monthlyCosts: blankMoney(),
      monthlySave: blankMoney(),
      goalAmount: blankMoney(),
      goalName: { text: "", note: "" },
      goalDate: { date: "", note: "" },
      cover: blankMoney(),
      lenderDebt: blankMoney(),
      lenderContract: blankMoney(),
      lenderPremium: blankMoney(),
      lenderDuration: { months: "", note: "" },
      costCut: blankMoney(),
      fundTarget: blankMoney(),
      fundWhen: { date: "", note: "" },
      fundSave: blankMoney(),
    },
    goals: [],
    goalIndex: null,
    action: null,
    projectNext: false,
    goalEdit: false,
    cushionFrom: null,
    infoOpen: false,
    showRequired: false,
    fixHeldForRightDoor: false,
    costsReturn: null,
    fixFrom: null,
    eraseFrom: null,
    lifeFrom: null,
    lifeDetail: false,
    lifeBaseline: null,
    lifeMove: null,
    fromInput: false,
    privacyOpen: false,
    rightDoorJoined: false,
    stressedSpans: [],
  };
}

export const PRIVACY_STRIP = "Stays on this phone. Erase any time.";
export const PRIVACY_INFO = "Erase clears Fortune Teller on this phone. Your other Plan Your Life apps keep their data.";
export const LIFE_DISCLAIMER = "Not advice. Not a guarantee.";

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

function cleanText(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, 80);
}

function cleanDate(raw) {
  const s = String(raw ?? "").trim();
  return parseIsoDate(s) ? s : "";
}

export function canContinue(state) {
  switch (state.screen) {
    case "i0":
      return parseAmount(state.inputs.takeHome.amount) !== null;
    case "ic":
      return parseAmount(state.inputs.monthlyCosts.amount) !== null;
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
    case "sd":
      return parseAmount(state.inputs.monthlySave.amount) !== null;
    case "gd":
      return parseAmount(state.inputs.goalAmount.amount) !== null;
    case "ig":
      return cleanText(state.inputs.goalName.text).trim().length > 0;
    case "ig2":
      return parseIsoDate(state.inputs.goalDate.date) !== null;
    case "tl":
      return parseAmount(state.inputs.lenderDebt.amount) !== null;
    case "tl2":
      return parseAmount(state.inputs.lenderContract.amount) !== null;
    case "tl3":
      return parseAmount(state.inputs.lenderPremium.amount) !== null;
    case "tl4":
      return parseDays(state.inputs.lenderDuration.months) !== null;
    case "gd2":
      return parseAmount(state.inputs.cover.amount) !== null;
    case "rc":
      return (parseAmount(state.inputs.costCut.amount) || 0) > 0;
    case "sf":
      return (
        (parseAmount(state.inputs.fundTarget.amount) || 0) > 0 &&
        String(state.inputs.fundTarget.note || "").trim().length > 0 &&
        parseIsoDate(state.inputs.fundWhen.date) !== null &&
        (parseAmount(state.inputs.fundSave.amount) || 0) > 0
      );
    case "f1":
    case "f2":
    case "f3":
    case "fd":
    case "fd3":
    case "s1":
    case "s2":
    case "s3":
    case "sd2":
    case "sd3":
    case "g1":
    case "g2":
    case "g3":
      return true;
    default:
      return false;
  }
}

/** Whole months from the entered save. Costs stay on TODAY; they do not replace this amount. */
export function monthsToCushion(now, target, save) {
  if (now == null || target == null || save == null || save <= 0) return null;
  const gap = target - now;
  if (gap <= 0) return 0;
  return Math.ceil(gap / save);
}

/** The emergency-fund plan exists once both amounts the person entered are real. */
export function fundEntered(state) {
  const now = parseAmount(state?.inputs?.cushionNow?.amount);
  const target = parseAmount(state?.inputs?.cushionTarget?.amount);
  return now !== null && target !== null && target > 0;
}

/** The month is covered when take-home meets costs and what is still due. Overdue is a separate gate. */
export function monthCovered(state) {
  const income = parseAmount(state?.inputs?.takeHome?.amount);
  const costs = parseAmount(state?.inputs?.monthlyCosts?.amount);
  if (income == null || income <= 0 || costs == null) return false;
  const still = parseAmount(state?.inputs?.stillDue?.amount) || 0;
  return income - costs - still >= 0;
}

/** Stressed leaves on this. It is not the same gate as "nothing is due". */
export function nothingOverdue(state) {
  return (parseAmount(state?.inputs?.overdue?.amount) || 0) === 0;
}

/**
 * Stressed finishes as stable once the month is covered and nothing is overdue.
 * Stable finishes as comfortable once the cushion is saved and nothing is due.
 * Comfortable uses the existing Invest gate. Nothing is due stays still due plus overdue.
 */
export function promoteJourney(state) {
  let next = state;
  const acted = next.action === "reduce" || next.action === "lenders";
  if (next.entry === "stressed" && acted && monthCovered(next) && nothingOverdue(next)) {
    next = { ...next, entry: "stable" };
  }
  const cushionDone = next.screen === "l0" || next.screen === "g0" || next.screen === "sd3";
  if (next.entry === "stable" && cushionDone && cushionReady(next)) {
    next = { ...next, entry: "ok" };
  }
  return next;
}

function rememberSpan(spans, span) {
  const list = Array.isArray(spans) ? spans.slice() : [];
  if (!span || !(span.months > 0) || list.some((item) => item.kind === span.kind)) return list;
  return [...list, span];
}

/** Invest opens when savings already cover a real target and nothing is still due or overdue. */
export function cushionReady(state) {
  const now = parseAmount(state.inputs.cushionNow.amount);
  const target = parseAmount(state.inputs.cushionTarget.amount);
  if (now === null || target === null || target <= 0 || now < target) return false;
  const still = parseAmount(state.inputs.stillDue.amount) || 0;
  const overdue = parseAmount(state.inputs.overdue.amount) || 0;
  return still + overdue === 0;
}

function monthNet(state) {
  const income = parseAmount(state.inputs.takeHome.amount);
  const costs = parseAmount(state.inputs.monthlyCosts.amount);
  if (income == null || costs == null) return null;
  const still = parseAmount(state.inputs.stillDue.amount) || 0;
  const overdue = parseAmount(state.inputs.overdue.amount) || 0;
  return income - costs - still - overdue;
}

/** Stable and plan stay only when take-home is real and the month is ahead after what is still due. */
function placeDoor(state) {
  const income = parseAmount(state.inputs.takeHome.amount);
  const net = monthNet(state);
  const ahead = income != null && income > 0 && net != null && net > 0;
  if (!ahead) {
    return { ...state, entry: "stressed", screen: "f0", showRequired: false, infoOpen: false };
  }
  if (state.entry === "ok") {
    return { ...state, screen: "i3", showRequired: false, infoOpen: false };
  }
  return { ...state, screen: "s0", planFrom: "i1", showRequired: false, infoOpen: false };
}

function advance(state) {
  switch (state.screen) {
    case "i0":
      return { ...state, screen: "ic", showRequired: false, infoOpen: false };
    case "ic": {
      if (state.costsReturn === "fd3") {
        return { ...state, screen: "fd3", costsReturn: null, showRequired: false, infoOpen: false };
      }
      if (state.entry === "stable" || state.entry === "ok") {
        return { ...state, screen: "i1", showRequired: false, infoOpen: false };
      }
      const dest = ENTRY_SCREEN[state.entry];
      if (!dest) return state;
      return { ...state, screen: dest, planFrom: "ic", showRequired: false, infoOpen: false };
    }
    case "i1": {
      const dest = FIX_DETAIL[state.fixSituation];
      if ((state.entry === "stable" || state.entry === "ok") && !dest) return placeDoor(state);
      if (!dest) return { ...state, screen: "f0", showRequired: false };
      return { ...state, screen: dest, showRequired: false };
    }
    case "f1":
      return { ...state, screen: "i2", showRequired: false };
    case "f2":
    case "f3":
    case "i2b":
      return { ...state, screen: "fd", fixFrom: state.screen, showRequired: false, infoOpen: false };
    case "fd":
      return { ...state, screen: "fd2" };
    case "fd3":
      return { ...state, screen: "fd2" };
    case "i2":
      return { ...state, screen: "i2b", showRequired: false };
    case "s1":
    case "s2":
    case "s3":
      return { ...state, screen: "i3", showRequired: false };
    case "i3":
      return { ...state, screen: "i3b", showRequired: false };
    case "i3b":
      if (state.entry === "ok") {
        return { ...state, screen: "g0", planFrom: "i3b", showRequired: false, infoOpen: false };
      }
      return { ...state, screen: "sd", planFrom: "i3b", showRequired: false, infoOpen: false };
    case "sd":
      return { ...state, screen: "sd2", showRequired: false, infoOpen: false };
    case "sd2":
      if (cushionReady(state)) return { ...state, screen: "sd3" };
      return { ...state, screen: "g0", planFrom: "sd2" };
    case "sd3":
      return { ...state, screen: "g0", planFrom: "sd3" };
    case "g1":
      if (state.entry === "ok" || fundEntered(state)) {
        return { ...state, screen: "ig", showRequired: false, infoOpen: false };
      }
      if (state.entry === "stressed" && (state.action === "reduce" || state.action === "lenders")) {
        return { ...state, screen: "sf", showRequired: false, infoOpen: false };
      }
      return state;
    case "ig":
      return { ...state, screen: "gd", showRequired: false, infoOpen: false };
    case "ig2":
      return commitGoal(state);
    case "g2":
      return { ...state, screen: "gd2", showRequired: false, infoOpen: false };
    case "gd":
      return { ...state, screen: "ig2", showRequired: false, infoOpen: false };
    case "rc":
      return applyCostCut(state);
    case "sf":
      return commitFund(state);
    case "gd2":
      return { ...state, screen: "g0", showRequired: false, infoOpen: false };
    case "tl":
      return { ...state, screen: "tl2", showRequired: false, infoOpen: false };
    case "tl2":
      return { ...state, screen: "tl3", showRequired: false, infoOpen: false };
    case "tl3":
      return { ...state, screen: "tl4", showRequired: false, infoOpen: false };
    case "tl4": {
      const months = parseDays(state.inputs.lenderDuration.months);
      const withSpan =
        months != null && months > 0
          ? {
              ...state,
              stressedSpans: rememberSpan(state.stressedSpans, {
                kind: "lenders",
                label: "Talk to lenders",
                months,
              }),
            }
          : state;
      return projectLife(withSpan, "lenders");
    }
    case "g3":
      return { ...state, screen: "g0" };
    default:
      return state;
  }
}

function backTo(state) {
  switch (state.screen) {
    case "i0":
      return "w0";
    case "ic":
      return state.costsReturn === "fd3" ? "fd2" : "i0";
    case "f0":
      return "ic";
    case "fd":
      return ["f2", "f3", "i2b"].includes(state.fixFrom) ? state.fixFrom : "f0";
    case "fd2":
      return "fd";
    case "fd3":
      return "fd2";
    case "sd":
      return "i3b";
    case "sd2":
      return "sd";
    case "sd3":
      return "sd2";
    case "ig":
      return state.goalEdit ? "l0" : "g1";
    case "ig2":
      return "gd";
    case "gd":
      return "ig";
    case "rc":
      return "fd2";
    case "sf":
      return "l0";
    case "tl":
      return "fd2";
    case "tl2":
      return "tl";
    case "tl3":
      return "tl2";
    case "tl4":
      return "tl3";
    case "s0":
      if (state.cushionFrom === "project") return "l0";
      if (state.planFrom === "i1") return "i1";
      return "ic";
    case "gd2":
      return "g2";
    case "i1":
      if ((state.entry === "stable" || state.entry === "ok") && !state.fixSituation) return "ic";
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
      if (state.entry === "ok") return "i1";
      return CUSHION_DETAIL[state.cushionSituation] || "s0";
    case "i3b":
      return "i3";
    case "g0":
      if (state.planFrom === "sd3") return "sd3";
      if (state.planFrom === "sd2") return "sd2";
      if (state.planFrom === "i3b") return "i3b";
      return "ic";
    case "g1":
    case "g2":
    case "g3":
      return "g0";
    case "l1":
    case "l2":
    case "l3":
    case "l4":
    case "l5":
    case "l6":
      return "l0";
    case "l0": {
      const from = state.lifeFrom;
      if (from && SCREEN_IDS.includes(from) && !from.startsWith("l") && from !== "e0" && from !== "e1") return from;
      return "w0";
    }
    default:
      return null;
  }
}

function returnToInput(state) {
  const screen = state.lifeFrom;
  if (!state.fromInput || !INPUT_SCREENS[screen]) return null;
  return { ...state, screen, fromInput: false, lifeDetail: false, showRequired: false, infoOpen: false };
}

function lifeSnap(state) {
  const life = buildLife(state);
  return {
    net: life.today.net,
    expenses: life.today.expenses,
    now: life.ef.now,
    pct: life.ef.pct,
    days: life.today.daysLate,
    goal: life.goal,
    cover: life.cover,
    save: life.save,
    burden: life.today.burden,
  };
}

function withInput(state, action) {
  const key = action.key;
  if (!state.inputs[key]) return state;
  const baseline = state.lifeBaseline?.key === key ? state.lifeBaseline : { key, ...lifeSnap(state) };
  const inputs = { ...state.inputs };
  if (key === "daysLate") {
    inputs.daysLate = {
      days: cleanDays(action.days ?? inputs.daysLate.days),
      note: cleanNote(action.note ?? inputs.daysLate.note),
    };
  } else if (key === "goalName") {
    inputs.goalName = {
      text: cleanText(action.text ?? inputs.goalName.text),
      note: cleanNote(action.note ?? inputs.goalName.note),
    };
  } else if (key === "goalDate" || key === "fundWhen") {
    inputs[key] = {
      date: cleanDate(action.date ?? inputs[key].date),
      note: cleanNote(action.note ?? inputs[key].note),
    };
  } else if (key === "lenderDuration") {
    inputs.lenderDuration = {
      months: cleanDays(action.months ?? inputs.lenderDuration.months),
      note: cleanNote(action.note ?? inputs.lenderDuration.note),
    };
  } else {
    inputs[key] = {
      amount: cleanAmount(action.amount ?? inputs[key].amount),
      note: cleanNote(action.note ?? inputs[key].note),
    };
  }
  const next = { ...state, inputs, showRequired: false, lifeBaseline: baseline };
  const after = lifeSnap(next);
  const moved =
    after.net !== baseline.net ||
    after.expenses !== baseline.expenses ||
    after.now !== baseline.now ||
    after.pct !== baseline.pct ||
    after.days !== baseline.days ||
    after.goal !== baseline.goal ||
    after.cover !== baseline.cover ||
    after.save !== baseline.save ||
    after.burden !== baseline.burden;
  if (!moved) {
    return { ...next, lifeMove: state.lifeMove?.key === key ? null : state.lifeMove };
  }
  return {
    ...next,
    lifeMove: {
      key,
      wasNet: baseline.net,
      wasNow: baseline.now,
      wasPct: baseline.pct,
      wasDays: baseline.days,
      wasExpenses: baseline.expenses,
      wasGoal: baseline.goal,
      wasCover: baseline.cover,
      wasSave: baseline.save,
      wasBurden: baseline.burden,
    },
  };
}

function projectLife(state, actionName) {
  return {
    ...state,
    action: actionName,
    screen: "l0",
    lifeFrom: actionName === "lenders" ? "tl4" : "fd2",
    fromInput: false,
    lifeDetail: false,
    projectNext: true,
    goalEdit: false,
    showRequired: false,
    infoOpen: false,
  };
}

function applyCostCut(state) {
  const nextCost = parseAmount(state.inputs.costCut.amount);
  if (nextCost === null || nextCost <= 0) return { ...state, showRequired: true };
  const before = lifeSnap(state);
  const inputs = {
    ...state.inputs,
    monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(nextCost) },
    costCut: blankMoney(),
  };
  return {
    ...projectLife(
      {
        ...state,
        inputs,
        stressedSpans: rememberSpan(state.stressedSpans, { kind: "reduce", label: "Reduce cost", months: 1 }),
      },
      "reduce",
    ),
    lifeMove: {
      key: "monthlyCosts",
      wasNet: before.net,
      wasNow: before.now,
      wasPct: before.pct,
      wasDays: before.days,
      wasExpenses: before.expenses,
      wasGoal: before.goal,
      wasCover: before.cover,
      wasSave: before.save,
      wasBurden: before.burden,
    },
  };
}

function commitFund(state) {
  const amount = parseAmount(state.inputs.fundTarget.amount);
  const label = String(state.inputs.fundTarget.note || "").trim();
  const when = parseIsoDate(state.inputs.fundWhen.date);
  const save = parseAmount(state.inputs.fundSave.amount);
  if (amount === null || amount <= 0 || !label || !when || save === null || save <= 0) {
    return { ...state, showRequired: true };
  }
  return {
    ...state,
    inputs: {
      ...state.inputs,
      cushionTarget: { amount: String(amount), note: label },
      cushionNow: { amount: "0", note: "" },
      monthlySave: { ...state.inputs.monthlySave, amount: String(save) },
      fundTarget: blankMoney(),
    },
    screen: "l0",
    projectNext: true,
    fromInput: false,
    lifeFrom: null,
    showRequired: false,
    infoOpen: false,
    lifeDetail: false,
  };
}

function commitGoal(state) {
  const name = String(state.inputs.goalName.text || "").trim();
  const date = state.inputs.goalDate.date;
  const price = parseAmount(state.inputs.goalAmount.amount);
  if (!name || !parseIsoDate(date) || price === null) return { ...state, showRequired: true };
  const goals = Array.isArray(state.goals) ? state.goals.slice() : [];
  const next = { name, amount: String(price), date };
  if (state.goalEdit === true && Number.isInteger(state.goalIndex) && goals[state.goalIndex]) goals[state.goalIndex] = next;
  else goals.push(next);
  return {
    ...state,
    goals,
    goalEdit: false,
    goalIndex: null,
    projectNext: false,
    fromInput: false,
    screen: "l0",
    showRequired: false,
    infoOpen: false,
    lifeDetail: false,
    inputs: {
      ...state.inputs,
      goalName: { text: "", note: "" },
      goalAmount: blankMoney(),
      goalDate: { date: "", note: "" },
    },
  };
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
      if (action.pick === "goals") {
        if (state.entry === "ok" || fundEntered(state)) return { ...state, screen: "g1" };
        if (state.entry === "stressed" && (state.action === "reduce" || state.action === "lenders")) {
          return { ...state, screen: "sf", showRequired: false, infoOpen: false };
        }
        return state;
      }
      if (action.pick === "insurance") return { ...state, screen: "g2" };
      if (action.pick === "invest") return { ...state, screen: "g3" };
      return state;
    case "pick-next":
      if (state.screen !== "fd2") return state;
      if (action.pick === "reduce") return { ...state, screen: "rc", showRequired: false, infoOpen: false };
      if (action.pick === "lenders") {
        return { ...state, screen: "tl", showRequired: false, infoOpen: false };
      }
      return state;
    case "project-next":
      if (state.screen !== "l0" || !state.projectNext) return state;
      if (!fundEntered(state)) {
        return { ...state, screen: "sf", projectNext: false, showRequired: false, infoOpen: false, lifeDetail: false };
      }
      return {
        ...state,
        screen: "ig",
        projectNext: false,
        goalEdit: false,
        goalIndex: null,
        showRequired: false,
        infoOpen: false,
        lifeDetail: false,
        inputs: {
          ...state.inputs,
          goalName: { text: "", note: "" },
          goalAmount: blankMoney(),
          goalDate: { date: "", note: "" },
        },
      };
    case "skip-fund":
      if (state.screen !== "sf") return state;
      return {
        ...state,
        inputs: {
          ...state.inputs,
          fundTarget: blankMoney(),
          fundWhen: { date: "", note: "" },
          fundSave: blankMoney(),
        },
        screen: "l0",
        projectNext: true,
        fromInput: false,
        goalEdit: false,
        showRequired: false,
        infoOpen: false,
        lifeDetail: false,
      };
    case "add-goal":
      if (state.entry !== "ok" && !fundEntered(state)) return state;
      return {
        ...state,
        screen: "ig",
        goalEdit: false,
        goalIndex: null,
        projectNext: false,
        showRequired: false,
        infoOpen: false,
        inputs: {
          ...state.inputs,
          goalName: { text: "", note: "" },
          goalAmount: blankMoney(),
          goalDate: { date: "", note: "" },
        },
      };
    case "edit":
      return withInput(state, action);
    case "continue":
      if (!canContinue(state)) return { ...state, showRequired: true };
      return advance(state);
    case "back": {
      if (state.lifeDetail) return { ...state, lifeDetail: false, showRequired: false, infoOpen: false };
      if (state.screen === "l0") {
        const backInput = returnToInput(state);
        if (backInput) return backInput;
      }
      const screen = backTo(state);
      if (!screen) return state;
      return { ...state, screen, showRequired: false, infoOpen: false, lifeDetail: false };
    }
    case "info":
      if (!INFO_SCREENS.has(state.screen)) return state;
      return { ...state, infoOpen: !state.infoOpen };
    case "privacy-info":
      if (state.screen !== "w0" && state.screen !== "i0") return state;
      return { ...state, privacyOpen: !state.privacyOpen };
    case "open-erase":
      if (state.screen !== "w0" && state.screen !== "l0") return state;
      return { ...state, screen: "e0", eraseFrom: state.screen };
    case "cancel-erase":
      if (state.screen !== "e0") return state;
      return { ...state, screen: state.eraseFrom === "l0" ? "l0" : "w0", eraseFrom: null };
    case "erase-ok":
      if (state.screen !== "e1") return state;
      return freshState();
    case "open-savings":
      if (state.screen !== "l0" || state.entry !== "stable" || cushionReady(state)) return state;
      return {
        ...state,
        screen: "i3",
        cushionSituation: state.cushionSituation || "small",
        projectNext: false,
        showRequired: false,
        infoOpen: false,
        lifeDetail: false,
      };
    case "open-life":
      if (["e0", "e1"].includes(state.screen) || state.screen.startsWith("l")) return state;
      return {
        ...state,
        screen: "l0",
        lifeFrom: state.screen,
        fromInput: false,
        lifeDetail: false,
        showRequired: false,
        infoOpen: false,
      };
    case "show-plan":
      if (!INPUT_SCREENS[state.screen] && !SUMMARY_PLAN.has(state.screen)) return state;
      return {
        ...state,
        screen: "l0",
        lifeFrom: state.screen,
        fromInput: Boolean(INPUT_SCREENS[state.screen]),
        lifeDetail: false,
        showRequired: false,
        infoOpen: false,
      };
    case "back-to-input":
      return returnToInput(state) || state;
    case "open-milestone": {
      if (state.screen !== "l0") return state;
      if (action.id === "ef" && !fundEntered(state)) return state;
      if (String(action.id || "").startsWith("goal-")) {
        const index = Number(String(action.id).slice(5));
        const goal = state.goals?.[index];
        if (!goal) return state;
        return {
          ...state,
          screen: "ig",
          goalEdit: true,
          goalIndex: index,
          showRequired: false,
          infoOpen: false,
          lifeDetail: false,
          inputs: {
            ...state.inputs,
            goalName: { text: goal.name, note: "" },
            goalAmount: { amount: String(goal.amount), note: "" },
            goalDate: { date: goal.date, note: "" },
          },
        };
      }
      const screen = MILESTONE_SCREEN[action.id];
      if (!screen) return state;
      return { ...state, screen, lifeDetail: false };
    }
    case "open-net":
      if (state.screen !== "l0" && state.screen !== "l1") return state;
      return { ...state, screen: "l1", lifeDetail: true };
    case "close-net":
      if (!state.lifeDetail) return state;
      return { ...state, lifeDetail: false };
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
  const stepped = step(current, action);
  const next = stepped.screen !== current.screen ? { ...stepped, lifeBaseline: null } : stepped;
  return { wipe: false, state: promoteJourney(next) };
}

function oneOf(value, allowed) {
  return allowed.includes(value) ? value : null;
}

function cleanSpans(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((span) => {
      const kind = span?.kind === "lenders" ? "lenders" : span?.kind === "reduce" ? "reduce" : "";
      const months = parseDays(span?.months);
      if (!kind || months == null || months <= 0) return null;
      return { kind, label: kind === "lenders" ? "Talk to lenders" : "Reduce cost", months };
    })
    .filter(Boolean);
}

function cleanMove(raw) {
  if (!raw || typeof raw !== "object") return null;
  const keys = [
    "takeHome",
    "stillDue",
    "overdue",
    "daysLate",
    "cushionNow",
    "cushionTarget",
    "monthlyCosts",
    "monthlySave",
    "goalAmount",
    "cover",
  ];
  if (!keys.includes(raw.key)) return null;
  const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  return {
    key: raw.key,
    wasNet: num(raw.wasNet),
    wasNow: num(raw.wasNow),
    wasPct: num(raw.wasPct),
    wasDays: num(raw.wasDays),
    wasExpenses: num(raw.wasExpenses),
    wasGoal: num(raw.wasGoal),
    wasCover: num(raw.wasCover),
    wasSave: num(raw.wasSave),
    wasBurden: num(raw.wasBurden),
  };
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
    } else if (key === "goalName") {
      inputs.goalName = { text: cleanText(src.text), note: cleanNote(src.note) };
    } else if (key === "goalDate" || key === "fundWhen") {
      inputs[key] = { date: cleanDate(src.date), note: cleanNote(src.note) };
    } else if (key === "lenderDuration") {
      inputs.lenderDuration = { months: cleanDays(src.months), note: cleanNote(src.note) };
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
  if (screen === "i1" && !fixSituation && entry !== "stable" && entry !== "ok") screen = "f0";
  if (screen === "s1" && cushionSituation !== "none") screen = "s0";
  if (screen === "s2" && cushionSituation !== "small") screen = "s0";
  if (screen === "s3" && cushionSituation !== "ok") screen = "s0";
  if (["i3", "i3b"].includes(screen) && !cushionSituation && entry !== "ok") screen = "s0";
  if (screen === "ic" && !entry) screen = "w0";
  if (["fd", "fd2", "fd3", "tl", "tl2", "tl3", "tl4"].includes(screen) && entry !== "stressed") screen = entry ? "i0" : "w0";
  if (["sd", "sd2", "sd3"].includes(screen) && entry !== "stable") screen = entry ? "i0" : "w0";
  if (["gd", "gd2", "ig", "ig2"].includes(screen) && !entry) screen = "w0";
  if (["f0", "i1", "f1", "f2", "f3", "i2", "i2b"].includes(screen) && entry !== "stressed") {
    if (!(screen === "i1" && (entry === "stable" || entry === "ok"))) screen = entry ? "i0" : "w0";
  }
  if (["s0", "s1", "s2", "s3", "i3", "i3b"].includes(screen) && entry !== "stable" && raw.planFrom !== "i3b") {
    if (!(entry === "ok" && (screen === "i3" || screen === "i3b"))) screen = entry ? "i0" : "w0";
  }
  const planFrom = ["i1", "i3b", "sd2", "sd3", "ic"].includes(raw.planFrom) ? raw.planFrom : "i0";
  return {
    ...base,
    screen,
    entry,
    fixSituation,
    cushionSituation,
    planFrom,
    inputs,
    costsReturn: raw.costsReturn === "fd3" ? "fd3" : null,
    fixFrom: ["f2", "f3", "i2b"].includes(raw.fixFrom) ? raw.fixFrom : null,
    action: raw.action === "reduce" || raw.action === "lenders" ? raw.action : null,
    projectNext: false,
    goalEdit: false,
    cushionFrom: raw.cushionFrom === "project" ? "project" : null,
    fixHeldForRightDoor: raw.fixHeldForRightDoor === true,
    infoOpen: false,
    showRequired: false,
    privacyOpen: false,
    eraseFrom: null,
    lifeFrom:
      typeof raw.lifeFrom === "string" &&
      SCREEN_IDS.includes(raw.lifeFrom) &&
      !raw.lifeFrom.startsWith("l") &&
      raw.lifeFrom !== "e0" &&
      raw.lifeFrom !== "e1"
        ? raw.lifeFrom
        : null,
    lifeDetail: false,
    lifeBaseline: null,
    lifeMove: cleanMove(raw.lifeMove),
    fromInput: raw.fromInput === true && INPUT_SCREENS[raw.lifeFrom] && String(raw.screen || "").startsWith("l"),
    goals: Array.isArray(raw.goals)
      ? raw.goals
          .map((goal) => ({
            name: cleanText(goal?.name).trim(),
            amount: cleanAmount(goal?.amount),
            date: cleanDate(goal?.date),
          }))
          .filter((goal) => goal.name && goal.amount !== "" && goal.date)
      : [],
    goalIndex: null,
    rightDoorJoined: false,
    stressedSpans: cleanSpans(raw.stressedSpans),
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
  ic: {
    title: "Monthly costs",
    body: "What you usually spend in a month.",
    chip: "Start",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "Usual monthly spend. This sets expenses on Your life.",
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
  sd: {
    title: "Save each month",
    body: "Toward your cushion target.",
    chip: "Cushion",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "What you can put toward the cushion each month.",
    requiredHint: "Enter an amount to continue.",
  },
  ig: {
    title: "Goal name",
    body: "What are you saving toward?",
    chip: "Plan",
    label: "Name",
    prefix: "",
    mode: "text",
    info: "One name for this goal.",
    requiredHint: "Enter a name to continue.",
  },
  ig2: {
    title: "Date by",
    body: "When do you want this ready?",
    chip: "Plan",
    label: "Target date",
    prefix: "",
    mode: "date",
    info: "The day you want this ready.",
    requiredHint: "Pick a date to continue.",
  },
  gd: {
    title: "Goal amount",
    body: "What this goal needs.",
    chip: "Plan",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "The amount this goal needs.",
    requiredHint: "Enter an amount to continue.",
  },
  tl: {
    title: "Debt amount",
    body: "What you would take to the lenders.",
    chip: "This month",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "The debt you want to talk about. This stays in Fortune.",
    requiredHint: "Enter an amount to continue.",
  },
  tl2: {
    title: "Total contract",
    body: "The full amount of the contract.",
    chip: "This month",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter an amount to continue.",
  },
  tl3: {
    title: "Monthly premium",
    body: "What you would pay each month.",
    chip: "This month",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter an amount to continue.",
  },
  tl4: {
    title: "Duration",
    body: "How many months.",
    chip: "This month",
    label: "Months",
    prefix: "",
    mode: "months",
    requiredHint: "Enter the number of months to continue.",
  },
  rc: {
    title: "Reduce cost",
    body: "Your new monthly cost.",
    chip: "This month",
    label: "New monthly cost",
    prefix: "HK$",
    mode: "money",
    info: "The number you enter is the monthly cost on Your life.",
    requiredHint: "Enter the new monthly cost.",
  },
  sf: {
    title: "Emergency fund",
    body: "Name it, then set the amount you want set aside. Say when, and how much you will put in.",
    chip: "Cushion",
    label: "Target",
    prefix: "HK$",
    mode: "money",
    requiredHint: "Enter a label, a target, a date, and how much you will put in.",
  },
  gd2: {
    title: "Monthly cover",
    body: "Premium you plan to pay.",
    chip: "Plan",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "The premium you plan to pay each month.",
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

function outflow(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  if (n === 0) return "0";
  return `\u2013${formatPlain(n)}`;
}

function signedAmount(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  const rounded = Math.round(n);
  if (rounded < 0) return `\u2013${formatPlain(Math.abs(rounded))}`;
  return formatPlain(rounded);
}

function monthPicture(state) {
  const income = parseAmount(state.inputs.takeHome.amount);
  const costs = parseAmount(state.inputs.monthlyCosts.amount);
  const still = parseAmount(state.inputs.stillDue.amount);
  const overdue = parseAmount(state.inputs.overdue.amount);
  const burden = still == null && overdue == null ? null : (still || 0) + (overdue || 0);
  const left = income == null || costs == null ? null : income - costs - (burden || 0);
  return { income, costs, burden, left };
}

/** Plain numbers for the downloadable timeline. Omits a stretch that was never entered. */
export function futureSnapshot(state) {
  const asOf = state?.asOf instanceof Date ? state.asOf : new Date();
  const now = parseAmount(state?.inputs?.cushionNow?.amount);
  const target = parseAmount(state?.inputs?.cushionTarget?.amount);
  const save = parseAmount(state?.inputs?.monthlySave?.amount);
  const months = monthsToCushion(now, target, save);
  const by = formatIsoDate(state?.inputs?.fundWhen?.date);
  const life = buildLife({ ...state, asOf });
  return {
    asOf,
    horizon: "Today → age 70",
    disclaimer: LIFE_DISCLAIMER,
    stressed: Array.isArray(state?.stressedSpans) ? state.stressedSpans : [],
    fund:
      save != null && save > 0 && target != null && target > 0 && months != null
        ? { monthly: save, months, target, byText: by ? `By ${by}` : "" }
        : null,
    goals: (Array.isArray(state?.goals) ? state.goals : [])
      .map((goal) => {
        const date = parseIsoDate(goal?.date);
        const amount = parseAmount(goal?.amount);
        const name = String(goal?.name || "").trim();
        if (!name || !date || amount == null || amount <= 0) return null;
        return { name, amount, date, dateText: formatIsoDate(goal.date) };
      })
      .filter(Boolean),
    surplus: life.today.net > 0 ? life.today.net : 0,
    boostOpen: cushionReady(state),
  };
}

export function present(state) {
  const id = state.screen;
  const ready = cushionReady(state);
  const base = {
    id,
    frame: frameOf(id, ready),
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
    showLifeLink: !["e0", "e1"].includes(id) && !id.startsWith("l") && !INPUT_SCREENS[id],
    showPlan: false,
    fromInput: false,
    privacy: false,
    privacyText: "",
    privacyInfo: "",
    privacyOpen: false,
    disclaimer: "",
    life: null,
    lifeOverlay: null,
    lifeFocus: null,
    lifeDetail: false,
  };

  if (id.startsWith("l")) {
    const life = buildLife(state);
    const surplus = life.today.net > 0 ? life.today.net : 0;
    if (ready) {
      for (const goal of life.goals || []) {
        const text = boostTextFor(surplus, goal.funding?.target);
        if (text) goal.funding.boostText = text;
      }
    }
    life.journey = state.entry === "ok" && ready ? "comfortable" : state.entry === "stable" ? "stable" : "";
    life.journeyLabel = life.journey === "comfortable" ? "Comfortable" : life.journey === "stable" ? "Stable" : "";
    return {
      ...base,
      kind: "life",
      chip: "Your life",
      showLifeLink: false,
      offerSavings: id === "l0" && state.entry === "stable" && !ready,
      life,
      lifeFocus: LIFE_FOCUS[id],
      lifeDetail: state.lifeDetail === true && id === "l1",
      fromInput: state.fromInput === true && id === "l0",
      projectNext: state.projectNext === true && id === "l0",
      addGoal:
        id === "l0" &&
        state.projectNext !== true &&
        state.fromInput !== true &&
        (state.entry === "ok" || fundEntered(state)),
      disclaimer: LIFE_DISCLAIMER,
      frame: LIFE_FRAME[id],
    };
  }

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
      privacy: true,
      privacyText: PRIVACY_STRIP,
      privacyInfo: PRIVACY_INFO,
      privacyOpen: state.privacyOpen === true,
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
      showLifeLink: false,
      showPlan: id !== "sf",
      quiet: id === "sf" ? "Skip" : null,
      quietAct: id === "sf" ? "skip-fund" : "",
      info: copy.info || null,
      rdLater: copy.rdLater === true,
      showRequired: state.showRequired === true,
      requiredHint: copy.requiredHint,
      skip: false,
      primary: "Continue",
      privacy: id === "i0",
      privacyText: id === "i0" ? PRIVACY_STRIP : "",
      privacyInfo: id === "i0" ? PRIVACY_INFO : "",
      privacyOpen: id === "i0" && state.privacyOpen === true,
      input: {
        key,
        mode: copy.mode,
        label: copy.label,
        prefix: copy.prefix,
        noteLabel: id === "sf" ? "Label" : "",
        labelFirst: id === "sf",
        amount:
          copy.mode === "days"
            ? field.days
            : copy.mode === "months"
              ? field.months
              : copy.mode === "money"
                ? field.amount
                : "",
        text: copy.mode === "text" ? field.text : "",
        date: copy.mode === "date" ? field.date : "",
        note: field.note,
      },
      fundAsk:
        id === "sf"
          ? { when: state.inputs.fundWhen.date, save: state.inputs.fundSave.amount }
          : null,
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
        choice("goals", "Plan future goals", {
          locked: state.entry !== "ok" && !fundEntered(state),
          sub: state.entry === "ok" || fundEntered(state) ? "" : "Opens after your emergency fund",
        }),
        choice("insurance", "Add insurance"),
        choice("invest", "Invest", {
          locked: !ready,
          sub: ready ? "" : "Opens when your cushion is ready",
        }),
      ],
    };
  }

  if (id === "fd") {
    const pic = monthPicture(state);
    return {
      ...base,
      kind: "picture",
      title: "This month",
      body: "Your picture from what you entered.",
      chip: "This month",
      showPlan: true,
      primary: "Continue",
      rows: [
        { label: "Take-home", value: formatPlain(pic.income) },
        { label: "Monthly costs", value: outflow(pic.costs), neg: pic.costs > 0 },
        { label: "Still due / overdue", value: outflow(pic.burden), neg: pic.burden > 0 },
        { label: "Left this month", value: signedAmount(pic.left), neg: pic.left < 0, tone: pic.left < 0 ? "warm" : "" },
      ],
    };
  }

  if (id === "fd2") {
    return {
      ...base,
      kind: "choices",
      title: "What you can do",
      body: "Pick one to work on.",
      chip: "This month",
      rdLater: state.fixHeldForRightDoor === true,
      choices: [
        choice("reduce", "Reduce cost"),
        choice("lenders", "Talk to lenders"),
      ],
    };
  }

  if (id === "fd3") {
    const costs = parseAmount(state.inputs.monthlyCosts.amount);
    return {
      ...base,
      kind: "confirm",
      title: "Costs updated",
      body: "TODAY moved with your new spend.",
      chip: "This month",
      showPlan: true,
      primary: "Continue",
      callout: {
        tone: "ok",
        title: `Monthly costs now ${formatPlain(costs)}`,
        body: "Expenses and net on Your life updated.",
      },
    };
  }

  if (id === "sd2") {
    const now = parseAmount(state.inputs.cushionNow.amount);
    const target = parseAmount(state.inputs.cushionTarget.amount);
    const save = parseAmount(state.inputs.monthlySave.amount);
    const months = monthsToCushion(now, target, save);
    return {
      ...base,
      kind: "picture",
      title: "Cushion plan",
      body: "How long to your target.",
      chip: "Cushion",
      showPlan: true,
      primary: "Continue",
      rows: [
        { label: "Now", value: formatPlain(now) },
        { label: "Target", value: formatPlain(target) },
        { label: "Save each month", value: formatPlain(save) },
        { label: "Months to cushion", value: months == null ? "\u2014" : String(months), pos: months != null, tone: "em" },
      ],
    };
  }

  if (id === "sd3") {
    return {
      ...base,
      kind: "confirm",
      title: "Cushion ready",
      body: "Your emergency floor is in place.",
      chip: "Cushion",
      showPlan: true,
      primary: "Continue to Plan what\u2019s next",
      callout: {
        tone: "ok",
        title: "Invest can open",
        body: "Grow \u00b7 Invest unlocks on Plan what\u2019s next. You can keep building or plan ahead.",
      },
    };
  }

  if (id === "g3") {
    if (ready) {
      return {
        ...base,
        kind: "confirm",
        title: "Invest",
        body: "Your cushion is ready \u2014 this can open.",
        chip: "Plan",
        showPlan: true,
        primary: "Continue",
        lockedInvest: false,
        callout: {
          tone: "ok",
          title: "Unlocked",
          body: "Cushion gate met. You can plan how Help it grow fits your life.",
        },
      };
    }
    return {
      ...base,
      kind: "confirm",
      title: "Invest",
      body: "Still locked until your cushion is ready.",
      chip: "Plan",
      showPlan: true,
      primary: "Continue",
      lockedInvest: true,
      callout: {
        tone: "lock",
        title: "Cushion not ready",
        body: "Build your emergency floor first (Stabilize). Then Invest can open on Plan what\u2019s next.",
      },
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
