/**
 * Fortune Teller first build.
 * Slice A: one continuous flow. Cold start and post-erase land on Where are you? (W0).
 * Invest and Boost stay open while a cushion is still building. Still-due and overdue keep them shut.
 * Slice B: Your life timeline on these inputs. Live Right Door UI stays untouched.
 */

import { buildLife, cushionDateViable, cushionFinish, formatIsoDate, formatPlain, parseIsoDate } from "./life.js";
import { fortuneOutboundHref } from "../../refer.js";
import { earlierText, forecastReturn, moreMoneyText, portfolioReturns } from "./timeline.js";

export const SCREEN_IDS = [
  "w0",
  "i0",
  "hw",
  "hn",
  "hy",
  "hx",
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
  "bx",
  "e0",
  "e1",
  "l0",
  "l1",
  "l2",
  "l3",
  "l4",
  "l5",
  "l6",
  "dt",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
  "d10",
  "sv",
  "ex",
  "ml",
  "mt",
  "gy",
  "cd",
  "cd2",
  "gn",
  "xb",
  "ix",
  "pk",
  "rk",
  "pm",
  "st",
];

const DEBT_KINDS = [
  { id: "cards", label: "Credit cards" },
  { id: "loans", label: "Loans" },
  { id: "mortgage", label: "Mortgage" },
];

/** Live Sunday Pack already runs build → upload → book. Bare /sunday/ 404s. */
export const PACK_HANDOFF_URL = "https://betomarine.github.io/debtrenegociation1/sunday/?from=fortune";

const DEBT_SHOW = new Set(["dt", "d3", "d4", "d5", "d6", "d8", "d9"]);

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

const SLICE_G_FRAMES = {
  dt: "FD02-debt-type",
  d3: "FD03-debt-totals",
  d4: "FD04-expense-split",
  d5: "FD05-your-now",
  d6: "FD06-right-door-target",
  d7: "FD07-month-fits",
  d8: "FD08-month-short",
  d9: "FD09-pack-handoff",
  d10: "FD10-after-package",
};

function frameOf(id, ready) {
  if (id === "g3") return ready ? "Gd4-invest-unlocked" : "Gd3-invest-still-locked";
  return SLICE_G_FRAMES[id] || SLICE_C_FRAMES[id] || FRAME_IDS[id] || "";
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

const INFO_SCREENS = new Set(["i0", "ic", "sd", "gd", "gd2", "ig", "ig2", "d3", "sv", "cd", "hw", "ix"]);

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
      debtOwed: blankMoney(),
      debtInstallment: blankMoney(),
      spendDebt: blankMoney(),
      spendBills: blankMoney(),
      spendPersonal: blankMoney(),
      sendHome: blankMoney(),
    },
    helper: null,
    debtTypes: [],
    debtSuggest: "",
    debtFork: null,
    debtVia: null,
    debtGate: false,
    noDebt: false,
    rdTaken: false,
    boostFrom: null,
    investFrom: null,
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
    fundSpanMonths: null,
    fundSpanSave: null,
    fundSpanTarget: null,
    boostPick: null,
    boostMode: "sooner",
    boostFor: null,
    goalResume: null,
    dateFrom: null,
    dateHeld: "",
    fundPending: false,
    dateRejected: false,
    debtLate: null,
    installmentInExpenses: null,
    packChosen: false,
    goalFrom: null,
  };
}

export const PRIVACY_STRIP = "This plan stays on this phone. Erase any time.";
export const PRIVACY_INFO =
  "Not advice. Not a guarantee. We do not email a bank or a lender. Erase clears Fortune Teller on this phone. Your other Plan Your Life apps keep their data.";
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
  if (/^\d{4}-\d{2}$/.test(s)) {
    const day = `${s}-01`;
    return parseIsoDate(day) ? day : "";
  }
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
    case "dt":
      return true;
    case "sv":
      return parseAmount(state.inputs.cushionNow.amount) !== null;
    case "ex":
    case "xb":
      return parseAmount(state.inputs.spendBills.amount) !== null && parseAmount(state.inputs.spendPersonal.amount) !== null;
    case "w0":
      return true;
    case "mt":
      return state.planFrom === "inputs";
    case "pk":
    case "rk":
    case "pm":
      return true;
    case "gy":
      return (
        cleanText(state.inputs.goalName.text).trim().length > 0 &&
        parseAmount(state.inputs.goalAmount.amount) !== null &&
        parseIsoDate(state.inputs.goalDate.date) !== null
      );
    case "cd":
      return parseIsoDate(state.inputs.fundWhen.date) !== null;
    case "cd2":
    case "gn":
      return true;
    case "d3": {
      const amounts =
        parseAmount(state.inputs.debtOwed.amount) !== null && parseAmount(state.inputs.debtInstallment.amount) !== null;
      if (state.planFrom === "inputs") return amounts && state.debtLate != null;
      return amounts;
    }
    case "d4":
      return (
        parseAmount(state.inputs.spendDebt.amount) !== null &&
        parseAmount(state.inputs.spendBills.amount) !== null &&
        parseAmount(state.inputs.spendPersonal.amount) !== null
      );
    case "d5":
    case "d6":
    case "d8":
    case "hn":
      return true;
    case "hy":
      return parseAmount(state.inputs.sendHome.amount) !== null;
    case "hx":
      return (
        parseAmount(state.inputs.debtInstallment.amount) !== null &&
        parseAmount(state.inputs.spendBills.amount) !== null &&
        parseAmount(state.inputs.spendPersonal.amount) !== null
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

/**
 * Months the PDF draws for the fund. Your life still uses the gap left.
 * A saved cushion keeps the months the monthly amount took, and never draws 0.
 */
export function timelineFundMonths(state) {
  const now = parseAmount(state?.inputs?.cushionNow?.amount);
  const target = parseAmount(state?.inputs?.cushionTarget?.amount);
  const save = parseAmount(state?.inputs?.monthlySave?.amount);
  if (!(save > 0) || !(target > 0)) return null;
  const remembered =
    state?.fundSpanMonths > 0 && state.fundSpanSave === save && state.fundSpanTarget === target
      ? state.fundSpanMonths
      : null;
  if (now != null && now < target) return Math.ceil((target - now) / save);
  if (remembered) return remembered;
  return Math.ceil(target / save);
}

function stampFundSpan(state) {
  const now = parseAmount(state?.inputs?.cushionNow?.amount);
  const target = parseAmount(state?.inputs?.cushionTarget?.amount);
  const save = parseAmount(state?.inputs?.monthlySave?.amount);
  if (now == null || !(target > 0) || !(save > 0)) return state;
  const gap = target - now;
  if (gap > 0) {
    return {
      ...state,
      fundSpanMonths: Math.ceil(gap / save),
      fundSpanSave: save,
      fundSpanTarget: target,
    };
  }
  if (state.fundSpanMonths > 0 && state.fundSpanSave === save && state.fundSpanTarget === target) return state;
  return {
    ...state,
    fundSpanMonths: Math.ceil(target / save),
    fundSpanSave: save,
    fundSpanTarget: target,
  };
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

function applyDebtSuggest(state) {
  const installment = state.inputs.debtInstallment.amount;
  const current = state.inputs.spendDebt.amount;
  const prior = state.debtSuggest || "";
  if (current !== "" && current !== prior) return state;
  return {
    ...state,
    debtSuggest: installment,
    inputs: {
      ...state.inputs,
      spendDebt: { ...state.inputs.spendDebt, amount: installment },
    },
  };
}

/** Debt % is monthly debt repayment ÷ take-home. Left is pay minus the three buckets she entered. */
export function debtPicture(state) {
  const pay = parseAmount(state?.inputs?.takeHome?.amount);
  const repay = parseAmount(state?.inputs?.spendDebt?.amount);
  const bills = parseAmount(state?.inputs?.spendBills?.amount);
  const personal = parseAmount(state?.inputs?.spendPersonal?.amount);
  const complete = pay != null && repay != null && bills != null && personal != null;
  const left = complete ? pay - repay - bills - personal : null;
  const pct = complete && pay > 0 ? Math.round((repay / pay) * 100) : null;
  return { pay, repay, bills, personal, left, pct };
}

function inputsJourney(state) {
  return state?.planFrom === "inputs";
}

/** Salary of exactly 5,000 uses Sunday Pack. Any other salary opens Right Door only above 30% of income. */
function debtDoor(state) {
  if (state.noDebt) return "none";
  const pay = parseAmount(state.inputs.takeHome.amount);
  const installment = parseAmount(state.inputs.debtInstallment.amount) || 0;
  if (!(pay > 0) || !(installment > 0)) return "none";
  if (pay === 5000) return "pack";
  if (installment / pay > 0.3) return "rd";
  return "none";
}

function debtTypeLabel(state) {
  const names = {
    cards: "Credit cards",
    loans: "Personal loan",
    mortgage: "Mortgage",
  };
  const labels = (state.debtTypes || []).map((id) => names[id]).filter(Boolean);
  return labels.join(" · ") || "Debt";
}

function shareText(pay, installment) {
  if (!(pay > 0) || installment == null) return "";
  const rounded = Math.round((installment / pay) * 1000) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function addCalendarMonths(date, count) {
  const next = new Date(date.getTime());
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + count);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));
  return next;
}

function monitorWhen(state) {
  const asOf = state?.asOf instanceof Date ? state.asOf : new Date();
  const due = addCalendarMonths(asOf, 3);
  const iso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
  return formatIsoDate(iso);
}

function applyInstallmentChoice(state, pick) {
  const bills = parseAmount(state.inputs.spendBills.amount) || 0;
  const personal = parseAmount(state.inputs.spendPersonal.amount) || 0;
  const loan = parseAmount(state.inputs.debtInstallment.amount) || 0;
  if (pick === "yes") {
    return {
      ...state,
      installmentInExpenses: true,
      screen: "mt",
      showRequired: false,
      infoOpen: false,
      inputs: {
        ...state.inputs,
        spendDebt: blankMoney(),
        monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(bills + personal) },
      },
    };
  }
  if (pick === "no") {
    return {
      ...state,
      installmentInExpenses: false,
      screen: "mt",
      showRequired: false,
      infoOpen: false,
      inputs: {
        ...state.inputs,
        spendDebt: { ...state.inputs.spendDebt, amount: String(loan) },
        monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(bills + personal + loan) },
      },
    };
  }
  return state;
}

function derivedEntry(state) {
  const net = buildLife(state).today.net;
  if (net != null && net <= 0) return "stressed";
  const installment = parseAmount(state.inputs.debtInstallment.amount) || 0;
  if (!state.noDebt && installment > 0) return "stable";
  if (net != null && net > 0) return "ok";
  return state.entry;
}

/** She has opened the emergency fund: a savings figure, a target, a monthly save, or a Done-by date. */
function efStarted(state) {
  if (parseAmount(state?.inputs?.cushionNow?.amount) != null) return true;
  const target = parseAmount(state?.inputs?.cushionTarget?.amount);
  if (target != null && target > 0) return true;
  const save = parseAmount(state?.inputs?.monthlySave?.amount);
  if (save != null && save > 0) return true;
  if (parseIsoDate(state?.inputs?.fundWhen?.date)) return true;
  if (state?.cushionSituation) return true;
  return false;
}

/** Boost stays hidden on the input journey until the emergency fund is started. An unfinished cushion does not hide it after that. */
function showBoost(state) {
  if (!boostAvailable(state)) return false;
  if (inputsJourney(state) && !efStarted(state)) return false;
  return true;
}

function advance(state) {
  switch (state.screen) {
    case "w0":
      return { ...state, screen: "i0", planFrom: "inputs", showRequired: false, infoOpen: false };
    case "i0":
      if (inputsJourney(state)) return { ...state, screen: "xb", showRequired: false, infoOpen: false };
      return { ...state, screen: "hw", showRequired: false, infoOpen: false };
    case "hn":
      return { ...state, screen: "dt", showRequired: false, infoOpen: false };
    case "hy":
      if (parseAmount(state.inputs.sendHome.amount) == null) return { ...state, showRequired: true };
      return { ...state, helper: true, screen: "hx", showRequired: false, infoOpen: false };
    case "hx": {
      const loan = parseAmount(state.inputs.debtInstallment.amount);
      const bills = parseAmount(state.inputs.spendBills.amount);
      const personal = parseAmount(state.inputs.spendPersonal.amount);
      const send = parseAmount(state.inputs.sendHome.amount);
      if (loan == null || bills == null || personal == null || send == null) return { ...state, showRequired: true };
      const costs = loan + bills + personal + send;
      return {
        ...state,
        helper: true,
        planFrom: "hx",
        screen: "mt",
        showRequired: false,
        infoOpen: false,
        inputs: {
          ...state.inputs,
          spendDebt: { ...state.inputs.spendDebt, amount: String(loan) },
          monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(costs) },
        },
      };
    }
    case "xb": {
      const bills = parseAmount(state.inputs.spendBills.amount);
      const personal = parseAmount(state.inputs.spendPersonal.amount);
      if (bills == null || personal == null) return { ...state, showRequired: true };
      return {
        ...state,
        screen: "dt",
        showRequired: false,
        infoOpen: false,
        inputs: {
          ...state.inputs,
          monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(bills + personal) },
        },
      };
    }
    case "dt":
      if (state.noDebt || state.debtTypes.length === 0) {
        return {
          ...state,
          noDebt: true,
          debtTypes: [],
          debtSuggest: "",
          screen: inputsJourney(state) ? "mt" : "sv",
          showRequired: false,
          infoOpen: false,
          inputs: {
            ...state.inputs,
            debtOwed: blankMoney(),
            debtInstallment: blankMoney(),
            spendDebt: blankMoney(),
          },
        };
      }
      return { ...state, noDebt: false, screen: "d3", showRequired: false, infoOpen: false };
    case "d3":
      if (inputsJourney(state)) {
        if (state.debtLate == null) return { ...state, showRequired: true };
        return { ...state, screen: "ix", showRequired: false, infoOpen: false };
      }
      return { ...applyDebtSuggest(state), screen: "d4", showRequired: false, infoOpen: false };
    case "mt":
      if (!inputsJourney(state)) return state;
      {
        const door = debtDoor(state);
        const entry = derivedEntry(state);
        if (door === "pack") return { ...state, entry, screen: "pk", showRequired: false, infoOpen: false };
        if (door === "rd") return { ...state, entry, screen: "rk", showRequired: false, infoOpen: false };
        return { ...state, entry, screen: "st", showRequired: false, infoOpen: false };
      }
    case "pk":
      return { ...state, packChosen: true, screen: "pm", showRequired: false, infoOpen: false };
    case "rk":
      return { ...state, rdTaken: true, screen: "st", showRequired: false, infoOpen: false };
    case "pm":
      return { ...state, screen: "st", showRequired: false, infoOpen: false };
    case "d4": {
      const repay = parseAmount(state.inputs.spendDebt.amount) || 0;
      const bills = parseAmount(state.inputs.spendBills.amount) || 0;
      const personal = parseAmount(state.inputs.spendPersonal.amount) || 0;
      const sum = repay + bills + personal;
      const inputs =
        sum > 0
          ? { ...state.inputs, monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(sum) } }
          : state.inputs;
      return { ...state, inputs, screen: "d5", showRequired: false, infoOpen: false };
    }
    case "d5":
      return { ...state, screen: "d6", showRequired: false, infoOpen: false };
    case "d6": {
      const left = debtPicture(state).left;
      if (left == null) return { ...state, showRequired: true };
      if (left < 0) return { ...state, screen: "d8", debtFork: "short", showRequired: false, infoOpen: false };
      return { ...state, screen: "d7", debtFork: "fit", showRequired: false, infoOpen: false };
    }
    case "d8":
      return { ...state, screen: "d9", rdTaken: true, showRequired: false, infoOpen: false };
    case "sv": {
      const now = parseAmount(state.inputs.cushionNow.amount);
      if (now == null) return { ...state, showRequired: true };
      const target = parseAmount(state.inputs.cushionTarget.amount);
      const inputs =
        now > 0 && !(target > 0)
          ? {
              ...state.inputs,
              cushionTarget: { ...state.inputs.cushionTarget, amount: state.inputs.cushionNow.amount },
            }
          : state.inputs;
      if (inputsJourney(state)) return { ...state, inputs, screen: "ml", showRequired: false, infoOpen: false };
      return { ...state, inputs, screen: "ex", showRequired: false, infoOpen: false };
    }
    case "ex": {
      const bills = parseAmount(state.inputs.spendBills.amount);
      const personal = parseAmount(state.inputs.spendPersonal.amount);
      if (bills == null || personal == null) return { ...state, showRequired: true };
      return {
        ...state,
        planFrom: "ex",
        screen: "ml",
        showRequired: false,
        infoOpen: false,
        inputs: {
          ...state.inputs,
          spendDebt: blankMoney(),
          monthlyCosts: { ...state.inputs.monthlyCosts, amount: String(bills + personal) },
        },
      };
    }
    case "gy":
      return savePlanGoal(state);
    case "cd":
      return acceptCushionDate(state);
    case "cd2": {
      const back = state.dateFrom === "ml" || state.dateFrom === "l0" ? state.dateFrom : "l0";
      return { ...state, screen: back, showRequired: false, infoOpen: false, dateRejected: false, fundPending: false };
    }
    case "gn":
      return state;
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
      if (boostAvailable(state)) return { ...state, screen: "bx", boostFrom: "g3", showRequired: false, infoOpen: false };
      return { ...state, screen: "g0" };
    default:
      return state;
  }
}

function backTo(state) {
  switch (state.screen) {
    case "i0":
      return "w0";
    case "hw":
      return "i0";
    case "hn":
    case "hy":
      return "hw";
    case "hx":
      return "hy";
    case "dt":
      if (inputsJourney(state)) return "xb";
      return state.helper === false ? "hn" : "i0";
    case "xb":
      return "i0";
    case "ix":
      return "d3";
    case "pk":
    case "rk":
      return "mt";
    case "pm":
      return "pk";
    case "st":
      return state.packChosen ? "pm" : state.rdTaken ? "rk" : "mt";
    case "d3":
      return "dt";
    case "d4":
      return "d3";
    case "d5":
      return "d4";
    case "d6":
      return "d5";
    case "d7":
      return "d6";
    case "d8":
      return "d6";
    case "d9":
      return state.debtFork === "short" ? "d8" : "d7";
    case "d10":
      return state.debtVia === "d9" ? "d9" : "d7";
    case "sv":
      return inputsJourney(state) ? "st" : "dt";
    case "ex":
      return "sv";
    case "ml":
      if (inputsJourney(state)) return "st";
      return state.planFrom === "d10" ? "d10" : "ex";
    case "mt":
      if (inputsJourney(state)) return state.noDebt ? "dt" : "ix";
      return state.planFrom === "hx" ? "hx" : "ml";
    case "gy":
      return state.goalFrom === "st" ? "st" : "ml";
    case "cd":
      return state.dateFrom === "ml" ? "ml" : state.dateFrom === "sf" ? "sf" : "l0";
    case "cd2":
      return "cd";
    case "gn":
      return state.goalResume === "gy" ? "gy" : "ig2";
    case "ic":
      if (state.costsReturn === "fd3") return "fd2";
      if (state.debtGate) return "d10";
      return "i0";
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
      if (state.planFrom === "d10") return "d10";
      if (state.planFrom === "sd3") return "sd3";
      if (state.planFrom === "sd2") return "sd2";
      if (state.planFrom === "i3b") return "i3b";
      return "ic";
    case "g1":
    case "g2":
      return "g0";
    case "g3":
      if (state.investFrom === "ml" || state.investFrom === "l0") return state.investFrom;
      return "g0";
    case "bx":
      return ["ml", "gy", "l0", "gn", "g3"].includes(state.boostFrom) ? state.boostFrom : "g3";
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
    return stampFundSpan({ ...next, lifeMove: state.lifeMove?.key === key ? null : state.lifeMove });
  }
  return stampFundSpan({
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
  });
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

function finishFund(state) {
  const amount = parseAmount(state.inputs.fundTarget.amount);
  const label = String(state.inputs.fundTarget.note || "").trim();
  const save = parseAmount(state.inputs.fundSave.amount);
  const committed = {
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
    fundPending: false,
    dateRejected: false,
    showRequired: false,
    infoOpen: false,
    lifeDetail: false,
  };
  return stampFundSpan(committed);
}

function commitFund(state) {
  const amount = parseAmount(state.inputs.fundTarget.amount);
  const label = String(state.inputs.fundTarget.note || "").trim();
  const when = parseIsoDate(state.inputs.fundWhen.date);
  const save = parseAmount(state.inputs.fundSave.amount);
  if (amount === null || amount <= 0 || !label || !when || save === null || save <= 0) {
    return { ...state, showRequired: true };
  }
  const pending = { ...state, fundPending: true };
  if (!cushionDateViable(pending, when)) {
    return {
      ...state,
      screen: "cd",
      dateFrom: "sf",
      dateHeld: "",
      fundPending: true,
      dateRejected: true,
      showRequired: true,
      infoOpen: false,
    };
  }
  return finishFund(state);
}

function acceptCushionDate(state) {
  const when = parseIsoDate(state.inputs.fundWhen.date);
  if (!when || !cushionDateViable(state, when)) {
    return { ...state, screen: "cd", dateRejected: true, showRequired: true, infoOpen: false };
  }
  const stamped = {
    ...state,
    dateRejected: false,
    showRequired: false,
    infoOpen: false,
    inputs: {
      ...state.inputs,
      fundWhen: { date: state.inputs.fundWhen.date, note: state.inputs.fundWhen.note || "" },
    },
  };
  if (state.fundPending) {
    const committed = finishFund(stamped);
    return { ...committed, fundPending: false, screen: "cd2", dateFrom: "l0", dateRejected: false };
  }
  return { ...stamped, screen: "cd2", fundPending: false };
}

function goalStartsTooEarly(state) {
  const finish = cushionFinish(state);
  const picked = parseIsoDate(state.inputs.goalDate.date);
  if (!finish.doneBy || !picked) return false;
  return picked.getTime() < finish.doneBy.getTime();
}

function nudgeGoal(state, resume) {
  return { ...state, screen: "gn", goalResume: resume, showRequired: false, infoOpen: false };
}

function savePlanGoal(state) {
  const name = cleanText(state.inputs.goalName.text).trim();
  const date = parseIsoDate(state.inputs.goalDate.date) ? state.inputs.goalDate.date : "";
  const price = parseAmount(state.inputs.goalAmount.amount);
  if (!name || !date || price === null) return { ...state, showRequired: true };
  if (goalStartsTooEarly(state)) return nudgeGoal(state, "gy");
  const goals = Array.isArray(state.goals) ? state.goals.slice() : [];
  goals.push({ name, amount: String(price), date });
  return {
    ...state,
    goals,
    screen: "ml",
    goalResume: null,
    showRequired: false,
    infoOpen: false,
    inputs: {
      ...state.inputs,
      goalName: { text: "", note: "" },
      goalAmount: blankMoney(),
      goalDate: { date: "", note: "" },
    },
  };
}

function commitGoal(state) {
  const name = String(state.inputs.goalName.text || "").trim();
  const date = state.inputs.goalDate.date;
  const price = parseAmount(state.inputs.goalAmount.amount);
  if (!name || !parseIsoDate(date) || price === null) return { ...state, showRequired: true };
  if (goalStartsTooEarly(state)) return nudgeGoal(state, "ig2");
  const goals = Array.isArray(state.goals) ? state.goals.slice() : [];
  const next = { name, amount: String(price), date };
  if (state.goalEdit === true && Number.isInteger(state.goalIndex) && goals[state.goalIndex]) goals[state.goalIndex] = next;
  else goals.push(next);
  return {
    ...state,
    goals,
    goalEdit: false,
    goalIndex: null,
    goalResume: null,
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
    case "toggle-debt": {
      if (state.screen !== "dt") return state;
      const id = action.id;
      if (!DEBT_KINDS.some((kind) => kind.id === id)) return state;
      const debtTypes = state.debtTypes.includes(id)
        ? state.debtTypes.filter((kind) => kind !== id)
        : [...state.debtTypes, id];
      return { ...state, debtTypes, noDebt: false, showRequired: false };
    }
    case "no-debt":
      if (state.screen !== "dt") return state;
      return { ...state, noDebt: state.noDebt !== true, debtTypes: [], showRequired: false };
    case "pick-helper":
      if (state.screen !== "hw") return state;
      if (action.pick === "yes") {
        return { ...state, helper: true, screen: "hy", showRequired: false, infoOpen: false };
      }
      if (action.pick === "no") {
        return {
          ...state,
          helper: false,
          screen: "hn",
          showRequired: false,
          infoOpen: false,
          inputs: { ...state.inputs, sendHome: blankMoney() },
        };
      }
      return state;
    case "pick-debt-fork":
      if (state.screen !== "d7") return state;
      if (action.pick === "improve") return { ...state, screen: "d9", debtFork: "fit", rdTaken: true, showRequired: false, infoOpen: false };
      if (action.pick === "later") return { ...state, screen: "d10", debtVia: "d7", debtFork: "fit", showRequired: false, infoOpen: false };
      return state;
    case "pick-after":
      if (state.screen !== "d10") return state;
      if (action.pick === "stabilize") {
        return { ...state, screen: "ic", debtGate: true, showRequired: false, infoOpen: false };
      }
      if (action.pick === "plan") {
        return { ...state, screen: "ml", planFrom: "d10", showRequired: false, infoOpen: false };
      }
      if (action.pick === "now") return { ...state, screen: "d5", showRequired: false, infoOpen: false };
      return state;
    case "pack-opened":
      if (state.screen !== "d9") return state;
      return { ...state, screen: "d10", debtVia: "d9", rdTaken: true, showRequired: false, infoOpen: false };
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
      if (action.pick === "invest") return { ...state, screen: "g3", investFrom: "g0" };
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
      if (state.screen === "l3") {
        const when = parseIsoDate(state.inputs.fundWhen.date);
        if (when && !cushionDateViable(state, when)) {
          return {
            ...state,
            screen: "cd",
            dateFrom: "l0",
            dateRejected: true,
            showRequired: true,
            fundPending: false,
            lifeDetail: false,
            infoOpen: false,
          };
        }
      }
      if (state.screen === "cd" && state.dateFrom !== "sf") {
        return {
          ...state,
          screen: state.dateFrom === "ml" ? "ml" : "l0",
          showRequired: false,
          infoOpen: false,
          dateRejected: false,
          lifeDetail: false,
          inputs: {
            ...state.inputs,
            fundWhen: { date: state.dateHeld || "", note: "" },
          },
        };
      }
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
      if (!INPUT_SCREENS[state.screen] && !SUMMARY_PLAN.has(state.screen) && !DEBT_SHOW.has(state.screen) && !["sv", "ex", "mt", "gy"].includes(state.screen)) return state;
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
      if (action.id === "ef") {
        if (!fundEntered(state)) return state;
        return { ...state, screen: "l3", dateHeld: state.inputs.fundWhen.date || "", lifeDetail: false };
      }
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
    case "open-boost": {
      if (state.screen !== "l0" || !boostAvailable(state)) return state;
      const id = String(action.id || "");
      if (id !== "life" && !/^goal-\d+$/.test(id)) return state;
      return { ...state, boostFor: state.boostFor === id ? null : id };
    }
    case "pick-boost": {
      const onInvest = state.screen === "bx" && boostAvailable(state);
      if ((state.screen !== "l0" || !boostAvailable(state)) && !onInvest) return state;
      const id = oneOf(action.id, BOOST_IDS);
      if (!id) return state;
      return { ...state, boostPick: id };
    }
    case "boost-mode": {
      const onInvest = state.screen === "bx" && boostAvailable(state);
      if ((state.screen !== "l0" || !boostAvailable(state)) && !onInvest) return state;
      const mode = action.mode === "more" || action.mode === "sooner" ? action.mode : oneOf(action.id, ["more", "sooner"]);
      if (!mode) return state;
      return { ...state, boostMode: mode };
    }
    case "savings-later":
      if (state.screen !== "sv") return state;
      if (inputsJourney(state)) {
        return {
          ...state,
          screen: "st",
          showRequired: false,
          infoOpen: false,
          inputs: { ...state.inputs, cushionNow: blankMoney() },
        };
      }
      return {
        ...state,
        screen: "ex",
        showRequired: false,
        infoOpen: false,
        inputs: { ...state.inputs, cushionNow: blankMoney() },
      };
    case "open-me":
      if (state.screen !== "ml") return state;
      return { ...state, screen: "mt", showRequired: false, infoOpen: false };
    case "open-rd":
      if (state.screen !== "ml" || state.rdTaken !== true) return state;
      return { ...state, screen: "d9", showRequired: false, infoOpen: false };
    case "open-stabilize":
      if (state.screen !== "ml") return state;
      return { ...state, screen: "ic", debtGate: true, showRequired: false, infoOpen: false };
    case "open-goals":
      if (state.screen !== "ml" && state.screen !== "st") return state;
      return {
        ...state,
        screen: "gy",
        goalFrom: state.screen,
        goalEdit: false,
        showRequired: false,
        infoOpen: false,
        inputs: {
          ...state.inputs,
          goalName: { text: "", note: "" },
          goalAmount: blankMoney(),
          goalDate: { date: "", note: "" },
        },
      };
    case "open-boost-mix":
      if (!["ml", "gy", "l0", "gn"].includes(state.screen) || !showBoost(state)) return state;
      return { ...state, screen: "bx", boostFrom: state.screen, showRequired: false, infoOpen: false, lifeDetail: false };
    case "use-done-by": {
      if (state.screen !== "gn") return state;
      const finish = cushionFinish(state);
      if (!finish.doneByIso) return state;
      const next = {
        ...state,
        inputs: {
          ...state.inputs,
          goalDate: { date: finish.doneByIso, note: state.inputs.goalDate.note || "" },
        },
      };
      return next.goalResume === "gy" ? savePlanGoal(next) : commitGoal(next);
    }
    case "pick-later-date":
      if (state.screen !== "gn") return state;
      return {
        ...state,
        screen: state.goalResume === "gy" ? "gy" : "ig2",
        showRequired: false,
        infoOpen: false,
      };
    case "edit-cushion-date": {
      if (!["ml", "l0", "cd2"].includes(state.screen)) return state;
      if (state.screen !== "cd2" && !cushionFinish(state).incomplete) return state;
      const finish = cushionFinish(state);
      return {
        ...state,
        screen: "cd",
        dateFrom: state.screen === "cd2" ? state.dateFrom || "l0" : state.screen,
        dateHeld: finish.viable ? state.inputs.fundWhen.date : state.dateHeld || "",
        dateRejected: false,
        showRequired: false,
        fundPending: false,
        infoOpen: false,
        lifeDetail: false,
      };
    }
    case "open-invest":
      if ((state.screen !== "ml" && state.screen !== "l0") || !showBoost(state)) return state;
      return { ...state, screen: "g3", investFrom: state.screen, showRequired: false, infoOpen: false, lifeDetail: false };
    case "edit-split":
      if (state.screen !== "ml" && state.screen !== "mt") return state;
      if (inputsJourney(state)) return { ...state, screen: "xb", showRequired: false, infoOpen: false };
      if (state.helper === true) return { ...state, screen: "hx", showRequired: false, infoOpen: false };
      return { ...state, screen: state.noDebt || state.planFrom === "ex" ? "ex" : "d4", showRequired: false, infoOpen: false };
    case "pick-overdue":
      if (state.screen !== "d3") return state;
      if (action.pick === "yes") return { ...state, debtLate: true, showRequired: false };
      if (action.pick === "no") return { ...state, debtLate: false, showRequired: false };
      return state;
    case "pick-installment":
      if (state.screen !== "ix") return state;
      return applyInstallmentChoice(state, action.pick);
    case "start-ef":
      if (!["st", "ml"].includes(state.screen)) return state;
      return { ...state, screen: "sv", showRequired: false, infoOpen: false, lifeDetail: false };
    case "choose-rd":
      if (state.screen !== "rk") return state;
      return { ...state, rdTaken: true, screen: "st", showRequired: false, infoOpen: false };
    case "open-monitor":
      if (state.screen !== "ml" && state.screen !== "st") return state;
      if (!state.packChosen) return state;
      return { ...state, screen: "pm", showRequired: false, infoOpen: false };
    case "edit-send-home":
      if (state.helper !== true || !["mt", "ml", "hx"].includes(state.screen)) return state;
      return { ...state, screen: "hy", showRequired: false, infoOpen: false };
    case "open-now":
      if (state.screen !== "ml") return state;
      return { ...state, screen: "d5", showRequired: false, infoOpen: false };
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
  const planFrom = ["i1", "i3b", "sd2", "sd3", "ic", "d10", "ex", "hx", "inputs"].includes(raw.planFrom) ? raw.planFrom : "i0";
  if (["xb", "ix", "pk", "rk", "pm", "st"].includes(screen) && planFrom !== "inputs") screen = "w0";
  const debtTypes = DEBT_KINDS.map((kind) => kind.id).filter((id) => Array.isArray(raw.debtTypes) && raw.debtTypes.includes(id));
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
    fundSpanMonths: parseDays(raw.fundSpanMonths) > 0 ? parseDays(raw.fundSpanMonths) : null,
    fundSpanSave: parseAmount(raw.fundSpanSave),
    fundSpanTarget: parseAmount(raw.fundSpanTarget),
    boostPick: oneOf(raw.boostPick, ["firm", "balanced", "growth", "frontier"]),
    boostMode: raw.boostMode === "more" ? "more" : "sooner",
    boostFor: null,
    debtTypes,
    debtSuggest: cleanAmount(raw.debtSuggest),
    debtFork: oneOf(raw.debtFork, ["fit", "short"]),
    debtVia: oneOf(raw.debtVia, ["d7", "d9"]),
    debtGate: raw.debtGate === true,
    noDebt: raw.noDebt === true,
    helper: raw.helper === true ? true : raw.helper === false ? false : null,
    rdTaken: raw.rdTaken === true,
    debtLate: raw.debtLate === true ? true : raw.debtLate === false ? false : null,
    installmentInExpenses: raw.installmentInExpenses === true ? true : raw.installmentInExpenses === false ? false : null,
    packChosen: raw.packChosen === true,
    goalFrom: raw.goalFrom === "st" || raw.goalFrom === "ml" ? raw.goalFrom : null,
    boostFrom: ["ml", "g3", "gy", "l0", "gn"].includes(raw.boostFrom) ? raw.boostFrom : null,
    investFrom: raw.investFrom === "ml" || raw.investFrom === "l0" || raw.investFrom === "g0" ? raw.investFrom : null,
  };
}

const INPUT_COPY = {
  i0: {
    title: "Your take-home",
    body: "What you get paid each month.",
    chip: "Income",
    label: "Amount",
    prefix: "HK$",
    mode: "money",
    info: "One actual number you get paid each month. Not a range.",
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
  const target = parseAmount(state?.inputs?.cushionTarget?.amount);
  const save = parseAmount(state?.inputs?.monthlySave?.amount);
  const months = timelineFundMonths(state);
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
    boostOpen: boostAvailable(state),
    boostPick: state?.boostPick || null,
    boostMode: state?.boostMode === "more" ? "more" : "sooner",
  };
}

const BOOST_IDS = ["firm", "balanced", "growth", "frontier"];

/** Cards on the unlocked Invest door. None is chosen until she picks. */
function investBoost(state) {
  const chosenId = BOOST_IDS.includes(state.boostPick) ? state.boostPick : null;
  const mode = state.boostMode === "more" ? "more" : "sooner";
  const picked = chosenId ? forecastReturn(chosenId) : null;
  const life = buildLife(state);
  const surplus = life.today.net > 0 ? life.today.net : 0;
  let line = "";
  if (picked && surplus > 0) {
    if (mode === "more") line = moreMoneyText(picked.label, surplus, 12, picked.mu);
    else {
      const goal = (life.goals || []).find((item) => item.funding?.target > 0);
      if (goal) line = earlierText(picked.label, surplus, goal.funding.target, picked.mu);
    }
  }
  return { pick: chosenId, mode, portfolios: portfolioReturns(), line };
}

/** Nothing still due or overdue, and cash left over after the month. An unfinished cushion does not close this. */
export function boostAvailable(state) {
  const still = parseAmount(state.inputs.stillDue.amount) || 0;
  const overdue = parseAmount(state.inputs.overdue.amount) || 0;
  if (still + overdue > 0) return false;
  const net = buildLife(state).today.net;
  return net != null && net > 0;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthText(iso) {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function monthValue(iso) {
  const date = parseIsoDate(iso);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function plusAmount(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  if (n > 0) return `+${formatPlain(n)}`;
  return signedAmount(n);
}

/** Declared split for Me today. A loan row stays off when she has no installment. */
function meTodayPicture(state) {
  const pic = debtPicture(state);
  const helper = state.helper === true;
  const send = helper ? parseAmount(state.inputs.sendHome.amount) : null;
  const skipLoan = state.installmentInExpenses === true && !(pic.repay > 0);
  const loan = skipLoan ? null : pic.repay != null ? pic.repay : parseAmount(state.inputs.debtInstallment.amount);
  const showLoan = loan != null && loan > 0;
  const showSend = send != null && send > 0;
  const splitDeclared = showLoan || (pic.bills != null && pic.bills > 0) || (pic.personal != null && pic.personal > 0) || showSend;
  const rows = [{ label: "Pay / income", value: formatPlain(pic.pay) }];
  if (splitDeclared && showLoan) rows.push({ label: "Loan installment", value: outflow(loan), neg: true });
  if (splitDeclared && pic.bills != null) rows.push({ label: "Bills", value: pic.bills > 0 ? outflow(pic.bills) : formatPlain(pic.bills), neg: pic.bills > 0 });
  if (splitDeclared && pic.personal != null) {
    rows.push({
      label: inputsJourney(state) ? "Personal / self" : "Self / personal",
      value: pic.personal > 0 ? outflow(pic.personal) : formatPlain(pic.personal),
      neg: pic.personal > 0,
    });
  }
  if (showSend) rows.push({ label: "Send money home", value: outflow(send), neg: true });
  const splitSum = (showLoan ? loan : 0) + (pic.bills || 0) + (pic.personal || 0) + (showSend ? send : 0);
  const expense = splitDeclared ? splitSum : parseAmount(state.inputs.monthlyCosts.amount);
  if (!splitDeclared && expense != null) rows.push({ label: "Expenses", value: formatPlain(expense) });
  const left = pic.pay != null && expense != null ? pic.pay - expense : null;
  rows.push({
    label: "Left this month",
    value: inputsJourney(state) && left > 0 ? formatPlain(left) : plusAmount(left),
    neg: left < 0,
    pos: left > 0,
  });
  const parts = [];
  if (splitDeclared && showLoan) parts.push(loan);
  if (splitDeclared && pic.bills != null) parts.push(pic.bills);
  if (splitDeclared && pic.personal != null) parts.push(pic.personal);
  if (showSend) parts.push(send);
  const equation =
    pic.pay != null && parts.length && left != null
      ? `${[pic.pay, ...parts].map((n) => formatPlain(n)).join(" \u2013 ")} = ${formatPlain(left)}`
      : "";
  const owed = parseAmount(state.inputs.debtOwed.amount);
  const owedNote =
    owed > 0
      ? inputsJourney(state)
        ? `Loan total ${formatPlain(owed)} stays on the debt card \u2014 not counted twice here.`
        : `Loan total ${formatPlain(owed)} still on the debt card \u2014 not in this month\u2019s net twice.`
      : "";
  const summary = equation || `Pay ${formatPlain(pic.pay)} \u00b7 Expenses ${formatPlain(expense)} \u00b7 Left ${plusAmount(left)}`;
  return { rows, summary, showLoan, left, equation, owedNote };
}

function debtScreens(state, base) {
  const id = state.screen;
  const quietPlan = { showLifeLink: false, showPlan: true };
  if (id === "dt") {
    return {
      ...base,
      ...quietPlan,
      kind: "checks",
      chip: "Debt",
      title: "What kind of debt?",
      body: "Pick what fits — or say you have none.",
      checks: DEBT_KINDS.map((kind) => ({ ...kind, on: state.debtTypes.includes(kind.id) })),
      debtSkip: {
        on: state.noDebt === true,
        label: "I don't have debt",
        sub: "Skip — continue without inventing debt",
      },
      note: inputsJourney(state) ? "You can skip. Next is You today, then your emergency fund." : "Healthy month. You can skip. Next: savings on hand.",
      primary: state.debtTypes.length > 0 && !state.noDebt ? "Continue" : "Continue without debt",
      showRequired: false,
      requiredHint: "",
    };
  }
  if (id === "d3") {
    const pay = parseAmount(state.inputs.takeHome.amount);
    const installment = parseAmount(state.inputs.debtInstallment.amount);
    const share = shareText(pay, installment);
    if (inputsJourney(state)) {
      return {
        ...base,
        ...quietPlan,
        kind: "fields",
        chip: "Debt",
        title: "Your debt",
        body: "Type, totals, and whether it is overdue.",
        frame: "M02-your-debt",
        typeLabel: debtTypeLabel(state),
        fields: [
          { key: "debtOwed", label: "Amount owed", amount: state.inputs.debtOwed.amount, hint: "" },
          {
            key: "debtInstallment",
            label: "Monthly installment",
            amount: state.inputs.debtInstallment.amount,
            hint: "What you repay each month. The loan total stays off this month until you say to add it.",
          },
        ],
        overdue: { value: state.debtLate },
        note: share ? `Installment is ${share}% of income.` : "",
        primary: "Continue",
        showRequired: state.showRequired === true,
        requiredHint: "Enter the amount, the installment, and whether it is overdue.",
      };
    }
    return {
      ...base,
      ...quietPlan,
      kind: "fields",
      chip: "Debt",
      title: "Debt totals",
      body: "From the types you picked.",
      info: "One total you still owe, and the installment across those debts.",
      fields: [
        { key: "debtOwed", label: "Total you still owe", amount: state.inputs.debtOwed.amount, hint: "" },
        {
          key: "debtInstallment",
          label: "Monthly installment(s)",
          amount: state.inputs.debtInstallment.amount,
          hint: "Repayment you owe each month across those debts.",
        },
      ],
      primary: "Continue",
      showRequired: state.showRequired === true,
      requiredHint: "Enter both totals to continue.",
    };
  }
  if (id === "d4") {
    return {
      ...base,
      ...quietPlan,
      kind: "fields",
      chip: "Spend",
      title: "Split this month’s spend",
      body: "Three buckets from what you actually spend.",
      fields: [
        {
          key: "spendDebt",
          label: "Debt repayment",
          amount: state.inputs.spendDebt.amount,
          hint: "From your monthly installment. Edit if this month differs.",
        },
        { key: "spendBills", label: "Bills", amount: state.inputs.spendBills.amount, hint: "" },
        { key: "spendPersonal", label: "Personal", amount: state.inputs.spendPersonal.amount, hint: "" },
      ],
      primary: "Continue",
      showRequired: state.showRequired === true,
      requiredHint: "Enter each bucket. A blank is not a number.",
    };
  }
  if (id === "d5") {
    const pic = debtPicture(state);
    return {
      ...base,
      ...quietPlan,
      kind: "picture",
      chip: "Your Now",
      title: "Your Now",
      body: "From amounts you entered.",
      rows: [
        { label: "Pay", value: formatPlain(pic.pay) },
        { label: "Debt % of pay", value: pic.pct == null ? "\u2014" : `${pic.pct}%` },
        { label: "Debt repayment", value: formatPlain(pic.repay) },
        { label: "Bills", value: formatPlain(pic.bills) },
        { label: "Personal", value: formatPlain(pic.personal) },
        { label: "Left", value: signedAmount(pic.left), neg: pic.left < 0, pos: pic.left > 0 },
      ],
      note: "Nothing invented. Change any part next.",
      primary: "See Right Door target",
    };
  }
  if (id === "d6") {
    const pic = debtPicture(state);
    const share =
      pic.pct == null
        ? {
            title: "Your Right Door target follows the debt share of your pay",
            body: "Take-home is not above zero, so this share is not a percent yet.",
          }
        : {
            title: `Your Right Door target follows debt as ${pic.pct}% of pay`,
            body: `Debt repayment ${formatPlain(pic.repay)} is ${pic.pct}% of take-home ${formatPlain(pic.pay)}. That share guides the package aim — not a promise of a new amount.`,
          };
    return {
      ...base,
      ...quietPlan,
      kind: "picture",
      chip: "Right Door",
      title: "Your Right Door target",
      body: "From the debt share of your pay.",
      facts: [
        share,
        {
          title: "Next step depends on this month",
          body: "If the month fits, you can still improve with Right Door. If the month is short, starting a package is the path.",
        },
      ],
      primary: "Continue",
    };
  }
  if (id === "d7") {
    const left = debtPicture(state).left;
    return {
      ...base,
      kind: "choices",
      choiceAct: "pick-debt-fork",
      showLifeLink: false,
      chip: "This month",
      title: "This month fits",
      body: "You still can improve the debt share.",
      facts: [
        {
          title: left > 0 ? "Left is positive" : "Left is zero",
          body:
            left > 0
              ? "Pay covers debt repayment, bills, and personal from what you entered."
              : "Pay meets debt repayment, bills, and personal from what you entered.",
        },
      ],
      choices: [
        choice("improve", "Improve with Right Door", { sub: "Renegotiate / package — optional improve" }),
        choice("later", "Not now", { sub: "Keep picture · plan when ready" }),
      ],
    };
  }
  if (id === "d8") {
    const pic = debtPicture(state);
    return {
      ...base,
      ...quietPlan,
      kind: "picture",
      chip: "This month",
      title: "This month is short",
      body: "We will help you start a package first.",
      rows: [{ label: "Left", value: signedAmount(pic.left), neg: true }],
      facts: [
        {
          title: "Pay does not cover debt repayment, bills, and personal yet",
          body: "Fix first — then stabilize and plan.",
        },
        {
          title: "Start a Right Door package",
          body: "Build the package from your picture, then upload docs, then book help. Order matters.",
        },
      ],
      primary: "Start Right Door package",
      primaryTone: "warn",
    };
  }
  if (id === "d9") {
    return {
      ...base,
      ...quietPlan,
      kind: "handoff",
      chip: "Package",
      title: "Next: build your package",
      body: "Fortune hands you to Right Door / Pack. Live screens stay as they are.",
      steps: [
        { title: "1 Build the package", body: "Use your debt picture and target" },
        { title: "2 Upload your documents", body: "Papers that match the package" },
        { title: "3 Then book help", body: "NGO / helper after build + upload — not before" },
      ],
      note: "Do not open book-first. Order is the product.",
      handoff: { href: PACK_HANDOFF_URL, label: "Open Right Door / Pack" },
    };
  }
  if (id === "d10") {
    return {
      ...base,
      kind: "choices",
      choiceAct: "pick-after",
      showLifeLink: false,
      chip: "Next",
      title: "After your package",
      body: "When you are ready, steady the month — then plan.",
      choices: [
        choice("stabilize", "Stabilize first", { sub: "Cushion · keep Left from going short again" }),
        choice("plan", "Plan a goal", { sub: "When the month fits — better to save than to loan" }),
        choice("now", "Back to Your Now", { sub: "Review the picture you entered" }),
      ],
    };
  }
  return null;
}

function cushionWhy(state) {
  const finish = cushionFinish(state);
  const picked = formatIsoDate(state.inputs.fundWhen.date);
  if (finish.left == null || finish.left <= 0) {
    return "This month does not leave enough to name a cushion date yet. A date is viable once Left can cover the gap.";
  }
  const leftText = `+${formatPlain(finish.left)}`;
  return `With Left ${leftText} and Now ${formatPlain(finish.now || 0)} toward ${formatPlain(finish.target)}, ${picked || "that date"} is too soon. Pick a date your month can reach.`;
}

function helperScreens(state, base) {
  const id = state.screen;
  const quiet = { showLifeLink: false, showPlan: false };
  if (id === "hw") {
    return {
      ...base,
      ...quiet,
      kind: "choices",
      choiceAct: "pick-helper",
      chip: "About you",
      title: "Are you a helper?",
      body: "Overseas domestic worker / helper in Hong Kong \u2014 so we pick the right path for you.",
      frame: "K01-early-ask",
      choices: [
        choice("yes", "Yes \u00b7 I am a helper", { sub: "Send money home \u00b7 Sunday Pack debt route" }),
        choice("no", "No \u00b7 not a helper", { sub: "Fortune plan \u00b7 Right Door when you have debt" }),
      ],
      note: "One ask early. Paths do not mix mid-journey.",
      info: "Helpers send money home, and debt help opens Sunday Pack. If you are not a helper, the plan stays in Fortune and debt uses Right Door.",
      quiet: "Why we ask",
      quietAct: "info",
    };
  }
  if (id === "hn") {
    return {
      ...base,
      ...quiet,
      kind: "continue",
      chip: "No \u00b7 not a helper",
      title: "Fortune path",
      body: "Your plan stays in Fortune. Debt uses Right Door when you have it.",
      frame: "K03-fortune-path",
      facts: [
        {
          title: "No send-home line",
          body: "Net = income \u2013 installment \u2013 bills \u2013 self. Send-home only on the helper path.",
        },
        {
          title: "When you have debt \u2014 Right Door",
          body: "Type \u2192 totals \u2192 split \u2192 debt% \u2192 Improve / package",
        },
        {
          title: "Your Life / Me today",
          body: "Shows the full expense split \u2014 not income alone",
        },
      ],
      note: "Debt lock unchanged. Cushion date kept.",
      primary: "Continue in Fortune",
    };
  }
  if (id === "hy") {
    return {
      ...base,
      ...quiet,
      kind: "fields",
      chip: "Yes \u00b7 ODW / helper",
      title: "Helper path",
      body: "We count money you send home \u2014 and open Sunday Pack for debt.",
      frame: "K02-helper-path",
      fields: [
        {
          key: "sendHome",
          label: "Send money home each month",
          amount: state.inputs.sendHome.amount,
          hint: "Example amount \u2014 she enters her own.",
        },
      ],
      callout: {
        tone: "ok",
        title: "Sunday Pack debt route",
        body: "Debt support for helpers. Build, then upload, then book. Never book-first.",
      },
      steps: [
        { title: "1 Send-home in Your Life math", body: "Counts in net every month" },
        { title: "2 Sunday Pack for debt", body: "Not the Fortune Right Door letter path" },
        { title: "3 Build \u2192 upload \u2192 book", body: "Never book-first" },
      ],
      primary: "Continue on helper path",
      quiet: "Open Sunday Pack",
      quietHref: PACK_HANDOFF_URL,
      showRequired: state.showRequired === true,
      requiredHint: "Enter what you send home. A blank is not a number.",
    };
  }
  if (id === "hx") {
    return {
      ...base,
      ...quiet,
      kind: "fields",
      chip: "Yes \u00b7 ODW / helper",
      title: "This month on the helper path",
      body: "Loan installment, bills, and what you keep for yourself. Send-home is already in the math.",
      frame: "K02-helper-spend",
      fields: [
        {
          key: "debtInstallment",
          label: "Loan installment",
          amount: state.inputs.debtInstallment.amount,
          hint: "What you repay each month. The loan total stays off this month.",
        },
        { key: "spendBills", label: "Bills", amount: state.inputs.spendBills.amount, hint: "" },
        { key: "spendPersonal", label: "Self / personal", amount: state.inputs.spendPersonal.amount, hint: "" },
      ],
      primary: "See what\u2019s left",
      showRequired: state.showRequired === true,
      requiredHint: "Enter installment, bills, and self. A blank is not a number.",
    };
  }
  return null;
}

function planScreens(state, base) {
  const id = state.screen;
  const quiet = { showLifeLink: false, showPlan: true };
  if (id === "cd") {
    const why = cushionWhy(state);
    const rejected = state.dateRejected === true;
    return {
      ...base,
      kind: "input",
      chip: "Cushion",
      title: "Change cushion date",
      body: "That finish date does not fit your plan yet.",
      frame: "CJ02-cushion-date",
      showLifeLink: false,
      showPlan: false,
      info: why,
      quiet: "Show why",
      quietAct: "info",
      primary: "Pick a new date",
      showRequired: rejected || state.showRequired === true,
      requiredHint: "Not viable yet. Pick a date your month can reach.",
      callout: rejected ? { tone: "warn", title: "Not viable yet", body: why } : null,
      input: {
        key: "fundWhen",
        mode: "date",
        label: "Done by",
        date: state.inputs.fundWhen.date,
        note: "",
      },
    };
  }
  if (id === "cd2") {
    const finish = cushionFinish(state);
    return {
      ...base,
      kind: "confirm",
      chip: "Cushion",
      title: "Cushion date set",
      body: "This finish date fits the month.",
      frame: "CJ03-cushion-date-set",
      showLifeLink: false,
      showPlan: false,
      primary: "Continue",
      quiet: "Edit date",
      quietAct: "edit-cushion-date",
      callout: {
        tone: "ok",
        title: finish.doneByText || "Viable",
        body: "Viable · locked in. Goals stay creatable. Start on this day or later.",
      },
    };
  }
  if (id === "gn") {
    const finish = cushionFinish(state);
    const picked = formatIsoDate(state.inputs.goalDate.date);
    const name = cleanText(state.inputs.goalName.text).trim();
    const price = parseAmount(state.inputs.goalAmount.amount);
    return {
      ...base,
      kind: "picture",
      chip: "Goal",
      title: "Move your start date",
      body: "Your cushion finishes first — then this goal plan can start.",
      frame: "CJ05-date-nudge",
      showLifeLink: false,
      showPlan: false,
      callout: {
        tone: "warn",
        title: "Start is before cushion-done",
        body: `You picked ${picked}. Cushion Done by ${finish.label}. Move start to that day or later.`,
      },
      rows: [
        { label: "Goal", value: `${name} · HK$ ${formatPlain(price)}` },
        { label: "Plan start", value: picked },
        { label: "Suggested", value: finish.label },
      ],
      primary: finish.label ? `Use ${finish.label}` : "Use cushion date",
      primaryAct: "use-done-by",
      quiet: "Pick a later date",
      quietAct: "pick-later-date",
    };
  }
  if (id === "sv") {
    return {
      ...base,
      ...quiet,
      kind: "fields",
      chip: "Savings",
      title: "Savings on hand",
      body: "How much do you have set aside right now?",
      frame: "I11-savings-on-hand",
      info: "Cash you already have set aside. Invest waits until this floor is in place.",
      fields: [{ key: "cushionNow", label: "Amount on hand", amount: state.inputs.cushionNow.amount, hint: "" }],
      facts: [
        {
          title: "Feeds your cushion",
          body: "This amount helps unlock Stabilize → Invest when the floor is ready.",
        },
      ],
      note: "Empty until she enters. Never invent.",
      primary: "Continue",
      quiet: "Not sure yet",
      quietAct: "savings-later",
      showRequired: state.showRequired === true,
      requiredHint: "Enter an amount, or choose Not sure yet.",
    };
  }
  if (id === "ex") {
    return {
      ...base,
      ...quiet,
      kind: "fields",
      chip: "Spend",
      title: "This month’s spend",
      body: "Bills and personal. Nothing added for debt.",
      frame: "I14-expenses",
      fields: [
        { key: "spendBills", label: "Bills", amount: state.inputs.spendBills.amount, hint: "" },
        { key: "spendPersonal", label: "Personal", amount: state.inputs.spendPersonal.amount, hint: "" },
      ],
      note: "Empty until she enters. Never invent.",
      primary: "Continue",
      showRequired: state.showRequired === true,
      requiredHint: "Enter bills and personal. A blank is not a number.",
    };
  }
  if (id === "ml") {
    const today = meTodayPicture(state);
    const goal = (state.goals || [])[0];
    const goalBody = goal
      ? `${goal.name} · ${monthText(goal.date)}`
      : "Name what you are saving toward";
    const lead = [{ id: "me", act: "open-me", title: "Me today", body: today.summary }];
    const rest = [];
    if (state.rdTaken) {
      rest.push({
        id: "rd",
        act: "open-rd",
        kicker: "First after Me today",
        title: "Right Door",
        body: "You chose Improve — package path stays on plan even while Left is positive.",
      });
      if (!inputsJourney(state)) {
        rest.push({
          id: "stabilize",
          act: "open-stabilize",
          title: "Stabilize",
          body: "Emergency fund / cushion",
        });
      }
    }
    if (inputsJourney(state) && state.packChosen) {
      rest.push({
        id: "monitor",
        act: "open-monitor",
        kicker: "Pack",
        title: "Package monitoring",
        body: `Sunday Pack check-in · due ${monitorWhen(state)}`,
      });
    }
    if (inputsJourney(state) && !efStarted(state)) {
      rest.push({
        id: "start-ef",
        act: "start-ef",
        kicker: "Stable",
        title: "Start Emergency fund",
        body: "Emergency fund first — then goals — then Boost.",
      });
    }
    rest.push({
      id: "goals",
      act: "open-goals",
      title: "Goals",
      body: goal ? `Created · ${goalBody}` : "Create anytime — name what you are saving toward",
    });
    const building = cushionFinish(state);
    if (building.incomplete) {
      rest.push({
        id: "cushion-date",
        act: "edit-cushion-date",
        title: "Cushion date",
        body: building.doneByText || "Set a finish date your month can reach",
      });
    }
    if (showBoost(state)) {
      rest.push({
        id: "invest",
        act: "open-invest",
        title: "Invest",
        body: "Still open after a goal. Continue on this door opens the cards.",
      });
      rest.push({
        id: "boost",
        act: "open-boost-mix",
        title: "Boost",
        body: building.incomplete
          ? "Open while your cushion is still building"
          : state.noDebt
            ? "Open — cushion ready · no debt"
            : "Open — cushion ready",
      });
      rest.push({
        id: "open-boost",
        act: "open-boost-mix",
        title: "Open Boost",
        body: "Firm · Balanced · Growth · Frontier",
      });
    }
    return {
      ...base,
      kind: "hub",
      chip: "Plan",
      title: "My Life",
      body: state.rdTaken ? "Plan · after she took Right Door" : "Me today · expenses visible",
      frame: state.rdTaken ? "I04-plan-rd-first" : "I14-my-life",
      showLifeLink: false,
      showPlan: false,
      lead,
      rows: today.rows,
      rest,
      note: state.rdTaken ? "" : "No Right Door card — she did not take RD.",
      quiet: state.rdTaken ? "Back to Your Now" : "Edit expenses",
      quietAct: state.rdTaken ? "open-now" : "edit-split",
    };
  }
  if (id === "mt") {
    const today = meTodayPicture(state);
    const helper = state.helper === true;
    if (inputsJourney(state)) {
      const already = state.installmentInExpenses === true;
      return {
        ...base,
        kind: "picture",
        chip: "Expenses counted",
        title: "You today",
        body: "What this month really leaves — current life.",
        frame: "M04-you-today",
        showLifeLink: false,
        showPlan: false,
        rows: today.rows,
        callout: {
          tone: "ok",
          title: "Net uses expenses",
          body: today.equation || "Income, installment, bills, and personal.",
        },
        note: already
          ? "Installment was already in bills or personal, so it is not subtracted again."
          : [today.equation, today.owedNote].filter(Boolean).join(" "),
        primary: "Back to plan",
        primaryAct: "continue",
      };
    }
    return {
      ...base,
      kind: "picture",
      chip: helper ? "Yes · ODW · send-home counted" : "No-ODW · expenses counted",
      title: "Me today",
      body: helper ? "Helper month — money home included." : "What this month really leaves.",
      frame: helper ? "K07-odw-me-today" : "K05-me-today-net",
      showLifeLink: true,
      showPlan: false,
      rows: today.rows,
      callout: helper
        ? {
            tone: "ok",
            title: "Sunday Pack",
            body: "Left is tight — open Pack · build → upload → book",
          }
        : {
            tone: "ok",
            title: "Net uses expenses",
            body: today.equation || "Income, installment, bills, and self.",
          },
      note: helper ? today.equation : [today.equation, today.owedNote].filter(Boolean).join(" "),
      primary: helper ? null : "Back to Your life",
      primaryAct: helper ? "" : "back",
      handoff: helper ? { href: PACK_HANDOFF_URL, label: "Open Sunday Pack" } : null,
      quiet: helper ? "Edit send-home" : "Edit split",
      quietAct: helper ? "edit-send-home" : "edit-split",
    };
  }
  if (id === "gy") {
    const when = monthText(state.inputs.goalDate.date);
    const finish = cushionFinish(state);
    const open = showBoost(state);
    return {
      ...base,
      kind: "goal",
      chip: "Goals",
      title: "Name a goal",
      body: "Create anytime — we will fit the start to your cushion date.",
      frame: "CJ04-goals-unlocked",
      showLifeLink: false,
      showPlan: false,
      goalForm: {
        name: state.inputs.goalName.text,
        amount: state.inputs.goalAmount.amount,
        month: monthValue(state.inputs.goalDate.date),
        monthText: when,
      },
      callout: {
        tone: "ok",
        title: "Unlocked to build",
        body: finish.label
          ? `Cushion Done by ${finish.label}. If your start is earlier, we will ask you to move it to that day or later.`
          : "Create anytime. We only adjust the start when it falls before your cushion date.",
      },
      primary: "Continue",
      quiet: open ? "Open Boost" : "Not now",
      quietAct: open ? "open-boost-mix" : "back",
      showRequired: state.showRequired === true,
      requiredHint: "Enter a name, an amount, and a month.",
    };
  }
  return null;
}

function journeyScreens(state, base) {
  const id = state.screen;
  const quiet = { showLifeLink: false, showPlan: false };
  if (id === "xb") {
    return {
      ...base,
      ...quiet,
      kind: "fields",
      chip: "Expenses",
      title: "Expenses",
      body: "Bills and personal / self. Debt comes after this.",
      frame: "M01-expenses",
      fields: [
        { key: "spendBills", label: "Bills", amount: state.inputs.spendBills.amount, hint: "" },
        { key: "spendPersonal", label: "Personal / self", amount: state.inputs.spendPersonal.amount, hint: "" },
      ],
      note: "Nothing added for debt yet. A blank is not a number.",
      primary: "Continue",
      showRequired: state.showRequired === true,
      requiredHint: "Enter bills and personal. A blank is not a number.",
    };
  }
  if (id === "ix") {
    const loan = parseAmount(state.inputs.debtInstallment.amount);
    return {
      ...base,
      ...quiet,
      kind: "choices",
      choiceAct: "pick-installment",
      chip: "Cashflow",
      title: "Already in expenses?",
      body: `Is your HK$ ${formatPlain(loan)} installment already counted in bills or personal?`,
      frame: "M03-installment-in-expenses",
      choices: [
        choice("yes", "Yes \u00b7 already in expenses", { sub: "We will not add it again for cashflow" }),
        choice("no", "No \u00b7 add it for cashflow", { sub: `Count \u2013${formatPlain(loan)} in You today so Left is honest` }),
      ],
      facts: [
        {
          tone: "warn",
          title: "Why we ask",
          body: "If installment is missing from expenses, Left looks too high. Add it before You today.",
        },
      ],
      note: "Yes keeps the expenses you entered. No adds the installment once.",
      quiet: "Why this matters",
      quietAct: "info",
      info: "Counting the installment twice makes Left too small. Leaving it out makes Left too high. One honest count.",
    };
  }
  if (id === "pk") {
    const pay = parseAmount(state.inputs.takeHome.amount);
    const installment = parseAmount(state.inputs.debtInstallment.amount);
    return {
      ...base,
      ...quiet,
      kind: "picture",
      chip: "Exception \u00b7 salary 5k",
      title: "Sunday Pack",
      body: "Salary is HK$ 5,000 — Pack path, not Right Door.",
      frame: "M07-sunday-pack",
      rows: [
        { label: "Salary", value: formatPlain(pay) },
        { label: "Installment", value: outflow(installment), neg: true },
        { label: "% of income", value: `${shareText(pay, installment)}%` },
      ],
      facts: [
        {
          title: "5k salary \u2192 Pack (not RD)",
          body: "This salary uses Sunday Pack even when the installment share is high. Other salaries use Right Door only above 30%.",
        },
        {
          title: "Open Pack",
          body: "build \u2192 upload \u2192 THEN book. Never book-first.",
        },
      ],
      callout: {
        tone: "ok",
        title: "Exception lock",
        body: `Salary 5,000 always \u2192 Sunday Pack \u2014 even if installment % is high. ${PACK_HANDOFF_URL}`,
      },
      primary: "Continue to Sunday Pack",
      primaryTone: "pack",
    };
  }
  if (id === "rk") {
    const pay = parseAmount(state.inputs.takeHome.amount);
    const installment = parseAmount(state.inputs.debtInstallment.amount);
    const share = shareText(pay, installment);
    return {
      ...base,
      ...quiet,
      kind: "picture",
      chip: "Rule \u00b7 >30%",
      title: "Right Door",
      body: "Installment is over 30% of income — open Right Door.",
      frame: "M06-right-door",
      rows: [
        { label: "Salary", value: formatPlain(pay) },
        { label: "Installment", value: outflow(installment), neg: true },
        { label: "Installment % of income", value: `${share}%` },
      ],
      facts: [
        {
          title: "Right Door",
          body: "Type \u2192 totals \u2192 split \u2192 Improve / package \u00b7 monitor and lessons",
        },
      ],
      callout: {
        tone: "warn",
        title: "Not the 5k exception",
        body: `Salary is ${formatPlain(pay)} \u2014 not 5,000. So above 30% goes to Right Door, not Sunday Pack.`,
      },
      handoff: { href: fortuneOutboundHref("right-door"), label: "Open Right Door", act: "choose-rd" },
    };
  }
  if (id === "pm") {
    const due = monitorWhen(state);
    return {
      ...base,
      ...quiet,
      kind: "picture",
      chip: "Pack chosen",
      title: "Package monitoring",
      body: "We check in on your Pack — due in three months.",
      frame: "M08-pack-monitor",
      callout: {
        tone: "ok",
        title: "Sunday Pack check-in",
        body: "Review progress \u00b7 keep build \u2192 upload \u2192 book order",
      },
      facts: [
        { title: "Pack chosen", body: "Sunday Pack from the 5k salary path" },
        { title: "Monitoring card on", body: "3-month due visible" },
        { title: "Then stable", body: "Emergency fund, then goals, then Boost" },
      ],
      note: `Due in 3 months \u00b7 ${due}`,
      primary: "Got it",
      primaryTone: "pack",
      quiet: "Open Pack",
      quietHref: PACK_HANDOFF_URL,
    };
  }
  if (id === "st") {
    const finish = cushionFinish(state);
    return {
      ...base,
      ...quiet,
      kind: "continue",
      chip: "Stable",
      title: "Stable next",
      body: "Emergency fund first — then goals — then Boost.",
      frame: "M09-stable-order",
      steps: [
        { title: "Start Emergency fund", body: "EF Done-by date \u00b7 cushion floor" },
        { title: "Goals", body: "Feasibility and dates \u00b7 unlocked to build" },
        { title: "Then Boost", body: "Never before EF understood / started" },
      ],
      callout: {
        tone: "ok",
        title: "Start your cushion",
        body: finish.doneByText ? finish.doneByText : "Plan the floor first. Boost waits until this fund is started.",
      },
      facts: [
        {
          title: "Boost waits here",
          body: "Open Boost after the emergency fund is understood and started. Goals stay unlocked. Boost is not locked forever for a cushion that is still building.",
        },
      ],
      note: state.packChosen ? `Pack check-in due ${monitorWhen(state)}.` : state.rdTaken ? "Right Door stays on the plan." : "",
      primary: "Start Emergency fund",
      primaryAct: "start-ef",
      quiet: "See goals",
      quietAct: "open-goals",
    };
  }
  return null;
}

export function present(state) {
  const id = state.screen;
  const floor = cushionReady(state);
  const open = boostAvailable(state);
  const base = {
    id,
    frame: frameOf(id, open),
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
    lockedInvest: !open,
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
    const offer = showBoost(state);
    const chosenId = BOOST_IDS.includes(state.boostPick) ? state.boostPick : null;
    const mode = state.boostMode === "more" ? "more" : "sooner";
    const picked = chosenId ? forecastReturn(chosenId) : null;
    if (offer) {
      for (const goal of life.goals || []) {
        goal.funding.offerBoost = true;
        if (!picked) continue;
        const text =
          mode === "more"
            ? moreMoneyText(picked.label, surplus, goal.funding?.months, picked.mu)
            : earlierText(picked.label, surplus, goal.funding?.target, picked.mu);
        if (text) goal.funding.boostText = text;
      }
    }
    const parts = (life.goals || []).map((goal) => goal.funding?.boostText).filter(Boolean);
    let lifeText = parts.join(" · ");
    if (offer && picked && mode === "more" && !lifeText) {
      const year = moreMoneyText(picked.label, surplus, 12, picked.mu);
      lifeText = year ? `Over 12 months · ${year}` : "";
    }
    life.boost = {
      offer,
      open: typeof state.boostFor === "string" ? state.boostFor : "",
      pick: chosenId,
      mode,
      portfolios: portfolioReturns(),
      lifeText,
    };
    life.journey = state.entry === "ok" && floor ? "comfortable" : state.entry === "stable" ? "stable" : "";
    life.journeyLabel = life.journey === "comfortable" ? "Comfortable" : life.journey === "stable" ? "Stable" : "";
    return {
      ...base,
      kind: "life",
      chip: "Your life",
      showLifeLink: false,
      offerSavings: id === "l0" && state.entry === "stable" && !floor,
      offerInvest: id === "l0" && offer,
      offerDate: id === "l0" && cushionFinish(state).incomplete,
      offerDoor: id === "l0" && (!monthCovered(state) || !nothingOverdue(state)),
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
      frame: LIFE_FRAME[id],
    };
  }

  if (id === "w0") {
    return {
      ...base,
      chip: "Your plan",
      kicker: "From inputs",
      title: "Start with numbers",
      body: "We read Fix / Stable / Invest from what you enter — no separate \u201cwhere are you today\u201d.",
      kind: "continue",
      steps: [
        { title: "1 Income", body: "Take-home / salary" },
        { title: "2 Expenses", body: "Bills + personal / self" },
        { title: "3 Then debt", body: "Only after expenses — type, amount, installment, overdue" },
      ],
      facts: [
        {
          title: "No early stage picker",
          body: "Path comes from cashflow and debt load — not a \u201cwhere are you today\u201d screen.",
        },
      ],
      note: "ODW early-gate optional \u00b7 not required as the gate.",
      primary: "Enter income",
      quiet: "Erase",
      privacy: true,
      privacyText: PRIVACY_STRIP,
      privacyInfo: PRIVACY_INFO,
      privacyOpen: state.privacyOpen === true,
    };
  }

  const journey = journeyScreens(state, base);
  if (journey) return journey;

  const helperView = helperScreens(state, base);
  if (helperView) return helperView;
  const debt = debtScreens(state, base);
  if (debt) return debt;
  const plan = planScreens(state, base);
  if (plan) return plan;

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
          locked: !open,
          sub: open ? "" : "Opens when nothing is still due",
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
    if (open) {
      return {
        ...base,
        kind: "confirm",
        title: "Invest",
        body: floor
          ? "Your cushion is ready \u2014 this can open."
          : "Boost stays open while your cushion is still building.",
        chip: "Plan",
        showPlan: true,
        primary: "Continue",
        lockedInvest: false,
        callout: {
          tone: "ok",
          title: "Unlocked",
          body: floor ? "Cushion gate met. Continue opens the cards." : "Cushion still building. Continue opens the cards.",
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

  if (id === "bx") {
    const picked = BOOST_IDS.includes(state.boostPick) ? forecastReturn(state.boostPick) : null;
    return {
      ...base,
      kind: "confirm",
      title: "Boost",
      body: "Investment benchmark · pick a mix",
      chip: "Boost",
      showPlan: false,
      showLifeLink: false,
      frame: floor ? "H11-boost-cards" : "CJ06-boost-open",
      investBoost: investBoost(state),
      callout: {
        tone: "ok",
        title: "Benchmark open",
        body: "Pick a mix. None is chosen until you do.",
      },
      primary: picked ? `Use ${picked.label}` : "Use this mix",
      primaryAct: "back",
      quiet: "Back to Your life",
      quietAct: "back",
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
