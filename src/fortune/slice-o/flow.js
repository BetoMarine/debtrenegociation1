/**
 * Slice O journey. One dated spine.
 * Debt path before the cushion. Goals and Boost only after those dates. Shelf only at Boost.
 */

import {
  asOfDate,
  cashflowDate,
  cashflowLabel,
  cushionDefaults,
  cushionPlan,
  formatDay,
  formatMoney,
  parseAmount,
  parseIso,
  pdfRows,
  timelineCards,
  toIso,
  todayIso,
  todayRows,
  youToday,
} from "./dates.js";
import { SAMPLE_OFFER, decodeOffer } from "./shelf.js";

export const STORAGE_KEY = "pyl-fortune-slice-o";
export const SUNDAY_PACK_URL = "https://betomarine.github.io/debtrenegociation1/sunday/?from=fortune";
export const RIGHT_DOOR_HREF = "https://betomarine.github.io/debtrenegociation1/?from=fortune#/reason";

export const MIXES = [
  { id: "balanced", label: "Balanced (reference)", mix: "60/40" },
  { id: "growth", label: "Growth (reference)", mix: "80/20" },
  { id: "steady", label: "Steady (reference)", mix: "40/60" },
];

export const SCREENS = [
  "home",
  "start",
  "income",
  "expenses",
  "debt",
  "today",
  "debtpath",
  "cashflow",
  "cushion",
  "timeline",
  "after",
  "goals",
  "boost",
  "shelf",
  "pdf",
];

const FIELDS = [
  "income",
  "bills",
  "personal",
  "debtOwed",
  "installment",
  "cushionNow",
  "cushionTarget",
  "cushionSave",
  "goalName",
  "goalAmount",
  "goalDate",
  "offerText",
];

const DOORS = {
  rd: RIGHT_DOOR_HREF,
  pack: SUNDAY_PACK_URL,
};

export function freshState(overrides = {}) {
  return {
    version: 1,
    screen: "home",
    asOf: todayIso(),
    income: "",
    bills: "",
    personal: "",
    debtProblems: null,
    debtOwed: "",
    installment: "",
    installmentInExpenses: null,
    debtDoor: null,
    pathStarted: false,
    cushionNow: "",
    cushionTarget: "",
    cushionSave: "",
    cushionPrimed: false,
    cushionSet: false,
    fundedOn: "",
    goals: [],
    goalSeq: 1,
    goalName: "",
    goalAmount: "",
    goalDate: "",
    goalMoved: false,
    boostRef: "balanced",
    offerText: SAMPLE_OFFER,
    offerDecoded: false,
    infoOpen: false,
    showRequired: false,
    ...overrides,
  };
}

export function datesReady(state) {
  if (state?.cushionSet !== true) return false;
  if (state.debtProblems === true && state.pathStarted !== true) return false;
  return cushionPlan(state).viable === true;
}

export function allowed(state, screen) {
  switch (screen) {
    case "home":
    case "start":
    case "income":
    case "expenses":
    case "debt":
    case "today":
      return true;
    case "debtpath":
    case "cashflow":
      return state.debtProblems === true;
    case "cushion":
      return state.debtProblems !== true || state.pathStarted === true;
    case "timeline":
    case "pdf":
    case "after":
    case "goals":
    case "boost":
    case "shelf":
      return datesReady(state);
    default:
      return false;
  }
}

export function resumeScreen(state) {
  if (datesReady(state)) return "timeline";
  if (state.cushionPrimed && allowed(state, "cushion")) return "cushion";
  if (state.pathStarted && allowed(state, "cashflow")) return "cashflow";
  if (state.debtProblems === true && allowed(state, "debtpath")) return "debtpath";
  if (state.debtProblems !== null && parseAmount(state.income) != null) return "today";
  if (parseAmount(state.bills) != null && parseAmount(state.personal) != null) return "debt";
  if (parseAmount(state.income) != null) return "expenses";
  if (state.screen === "income" || state.screen === "start") return state.screen;
  return "home";
}

export function settle(state) {
  const screen = SCREENS.includes(state.screen) ? state.screen : "";
  if (screen && allowed(state, screen)) return { ...state, screen };
  return { ...state, screen: resumeScreen(state) };
}

function cleanGoals(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((goal) => ({
      id: String(goal?.id || "").slice(0, 40),
      name: String(goal?.name || "").trim().slice(0, 80),
      amount: String(goal?.amount || "").slice(0, 16),
      date: parseIso(goal?.date) ? String(goal.date) : "",
    }))
    .filter((goal) => goal.id && goal.name && goal.date);
}

export function hydrate(raw) {
  const base = freshState();
  if (!raw || typeof raw !== "object") return settle(base);
  const next = { ...base, infoOpen: false, showRequired: false };
  next.asOf = parseIso(raw.asOf) ? String(raw.asOf) : base.asOf;
  for (const key of FIELDS) {
    if (raw[key] != null) next[key] = String(raw[key]).slice(0, key === "offerText" ? 2000 : key === "goalName" ? 80 : 16);
  }
  next.debtProblems = raw.debtProblems === true ? true : raw.debtProblems === false ? false : null;
  next.installmentInExpenses =
    raw.installmentInExpenses === true ? true : raw.installmentInExpenses === false ? false : null;
  next.debtDoor = raw.debtDoor === "rd" || raw.debtDoor === "pack" ? raw.debtDoor : null;
  next.pathStarted = raw.pathStarted === true;
  next.cushionPrimed = raw.cushionPrimed === true;
  next.cushionSet = raw.cushionSet === true;
  next.fundedOn = parseIso(raw.fundedOn) ? String(raw.fundedOn) : "";
  next.goals = cleanGoals(raw.goals);
  next.goalSeq = Number.isFinite(raw.goalSeq) && raw.goalSeq > 0 ? Math.floor(raw.goalSeq) : next.goals.length + 1;
  next.goalMoved = raw.goalMoved === true;
  next.boostRef = MIXES.some((mix) => mix.id === raw.boostRef) ? raw.boostRef : "balanced";
  next.offerDecoded = raw.offerDecoded === true;
  next.offerText = raw.offerText == null ? SAMPLE_OFFER : String(raw.offerText).slice(0, 2000);
  next.screen = SCREENS.includes(raw.screen) ? raw.screen : "home";
  return settle(next);
}

export function serialize(state) {
  const current = settle(state);
  return {
    version: 1,
    screen: current.screen,
    asOf: current.asOf,
    income: current.income,
    bills: current.bills,
    personal: current.personal,
    debtProblems: current.debtProblems,
    debtOwed: current.debtOwed,
    installment: current.installment,
    installmentInExpenses: current.installmentInExpenses,
    debtDoor: current.debtDoor,
    pathStarted: current.pathStarted,
    cushionNow: current.cushionNow,
    cushionTarget: current.cushionTarget,
    cushionSave: current.cushionSave,
    cushionPrimed: current.cushionPrimed,
    cushionSet: current.cushionSet,
    fundedOn: current.fundedOn,
    goals: current.goals,
    goalSeq: current.goalSeq,
    goalName: current.goalName,
    goalAmount: current.goalAmount,
    goalDate: current.goalDate,
    goalMoved: current.goalMoved,
    boostRef: current.boostRef,
    offerText: current.offerText,
    offerDecoded: current.offerDecoded,
  };
}

export function loadState(storage) {
  if (!storage) return freshState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    return hydrate(JSON.parse(raw));
  } catch {
    return freshState();
  }
}

export function storeState(storage, state) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
}

export function clearState(storage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

function stampFunded(state) {
  const plan = cushionPlan(state);
  if (plan.funded && !state.fundedOn) return { ...state, fundedOn: toIso(asOfDate(state)) };
  if (!plan.funded && state.fundedOn) return { ...state, fundedOn: "" };
  return state;
}

function primeCushion(state) {
  if (state.cushionPrimed) return stampFunded(state);
  const defaults = cushionDefaults(state);
  return stampFunded({
    ...state,
    cushionPrimed: true,
    cushionNow: state.cushionNow === "" ? defaults.now : state.cushionNow,
    cushionTarget: state.cushionTarget === "" ? defaults.target : state.cushionTarget,
    cushionSave: state.cushionSave === "" ? defaults.save : state.cushionSave,
  });
}

function enter(state, screen) {
  let next = { ...state, screen, showRequired: false, infoOpen: false };
  if (screen === "cushion") next = primeCushion(next);
  if (screen === "goals" && !parseIso(next.goalDate)) {
    const plan = cushionPlan(next);
    if (plan.iso) next = { ...next, goalDate: plan.iso };
  }
  return next;
}

function commitGoal(state) {
  const name = String(state.goalName || "").trim();
  const amount = parseAmount(state.goalAmount);
  const plan = cushionPlan(state);
  let date = parseIso(state.goalDate) || plan.date;
  let moved = false;
  if (!name || !(amount > 0) || !(date instanceof Date)) return { ...state, showRequired: true };
  if (plan.date && date.getTime() < plan.date.getTime()) {
    date = plan.date;
    moved = true;
  }
  const goal = {
    id: `g${state.goalSeq || 1}`,
    name: name.slice(0, 80),
    amount: String(amount),
    date: toIso(date),
  };
  return {
    ...state,
    goals: [...state.goals, goal],
    goalSeq: (state.goalSeq || 1) + 1,
    goalName: "",
    goalAmount: "",
    goalDate: plan.iso || "",
    goalMoved: moved,
    showRequired: false,
  };
}

function goNext(state) {
  switch (state.screen) {
    case "home":
      return enter(state, "start");
    case "start":
      return enter(state, "income");
    case "income":
      if (!(parseAmount(state.income) > 0)) return { ...state, showRequired: true };
      return enter(state, "expenses");
    case "expenses":
      if (parseAmount(state.bills) == null || parseAmount(state.personal) == null) return { ...state, showRequired: true };
      return enter(state, "debt");
    case "debt":
      if (state.debtProblems == null) return { ...state, showRequired: true };
      if (state.debtProblems) {
        if (parseAmount(state.installment) == null) return { ...state, showRequired: true };
        if (state.installmentInExpenses == null) return { ...state, showRequired: true };
      }
      return enter(state, "today");
    case "today":
      return state.debtProblems === true ? enter(state, "debtpath") : enter(state, "cushion");
    case "debtpath":
      return enter({ ...state, pathStarted: true }, "cashflow");
    case "cashflow":
      return enter(state, "cushion");
    case "cushion":
      if (!cushionPlan(state).viable) return { ...state, showRequired: true };
      return enter({ ...state, cushionSet: true }, "timeline");
    case "timeline":
      return enter(state, "after");
    case "after":
      return enter(state, "goals");
    case "goals":
      return commitGoal(state);
    case "boost":
      return enter(state, "shelf");
    case "shelf":
      return { ...state, offerDecoded: true, showRequired: false };
    default:
      return state;
  }
}

function goBack(state) {
  if (state.infoOpen) return { ...state, infoOpen: false };
  if (state.screen === "home") return state;
  if (state.screen === "cushion" && state.debtProblems !== true) return enter(state, "today");
  const backTo = {
    start: "home",
    income: "start",
    expenses: "income",
    debt: "expenses",
    today: "debt",
    debtpath: "today",
    cashflow: "debtpath",
    cushion: "cashflow",
    timeline: "cushion",
    after: "timeline",
    goals: "after",
    boost: "after",
    shelf: "boost",
    pdf: "timeline",
  };
  const dest = backTo[state.screen] || "home";
  if (!allowed(state, dest)) return enter(state, "home");
  return enter(state, dest);
}

function apply(state, action) {
  const type = action?.type;
  if (type === "edit") {
    const key = action.key;
    if (!FIELDS.includes(key)) return { state };
    const cap = key === "offerText" ? 2000 : key === "goalName" ? 80 : 16;
    let next = { ...state, [key]: String(action.value ?? "").slice(0, cap) };
    if (key === "cushionNow" || key === "cushionTarget" || key === "cushionSave") next = stampFunded(next);
    return { state: next };
  }
  if (type === "choose") {
    if (action.field === "debt") {
      const yes = action.value === "yes";
      return {
        state: {
          ...state,
          debtProblems: yes,
          showRequired: false,
          ...(yes ? {} : { pathStarted: false, debtDoor: null, installmentInExpenses: null }),
        },
      };
    }
    if (action.field === "installmentIn") {
      if (action.value !== "yes" && action.value !== "no") return { state };
      return { state: { ...state, installmentInExpenses: action.value === "yes", showRequired: false } };
    }
    if (action.field === "mix") {
      if (!MIXES.some((mix) => mix.id === action.value)) return { state };
      return { state: { ...state, boostRef: action.value } };
    }
    return { state };
  }
  if (type === "door") {
    const href = DOORS[action.door];
    if (!href || state.debtProblems !== true) return { state };
    return { state: enter({ ...state, pathStarted: true, debtDoor: action.door }, "cashflow"), href };
  }
  if (type === "go") {
    if (!allowed(state, action.screen)) return { state };
    return { state: enter(state, action.screen) };
  }
  if (type === "next") return { state: goNext(state) };
  if (type === "back") return { state: goBack(state) };
  if (type === "info") return { state: { ...state, infoOpen: true } };
  if (type === "close") return { state: { ...state, infoOpen: false } };
  if (type === "decode") return { state: { ...state, offerDecoded: true } };
  if (type === "remove-goal") {
    return { state: { ...state, goals: state.goals.filter((goal) => goal.id !== action.id) } };
  }
  if (type === "erase") return { state: freshState(), wipe: true };
  if (type === "browse") return { state };
  return { state };
}

/** London numbers from 3 Nov 2026, stopped on a real screen. For a frame check, not a second product. */
export function previewFrame(id) {
  let state = freshState({ asOf: "2026-11-03" });
  const go = (action) => {
    state = reduce(state, action).state;
  };
  if (id === "home") return state;
  go({ type: "next" });
  if (id === "start") return state;
  go({ type: "next" });
  go({ type: "edit", key: "income", value: "24000" });
  if (id === "income") return state;
  go({ type: "next" });
  go({ type: "edit", key: "bills", value: "6000" });
  go({ type: "edit", key: "personal", value: "6000" });
  if (id === "expenses") return state;
  go({ type: "next" });
  go({ type: "choose", field: "debt", value: "yes" });
  go({ type: "edit", key: "installment", value: "8000" });
  go({ type: "choose", field: "installmentIn", value: "no" });
  if (id === "debt") return state;
  go({ type: "next" });
  if (id === "today") return state;
  go({ type: "next" });
  if (id === "debtpath") return state;
  go({ type: "next" });
  if (id === "cashflow") return state;
  go({ type: "next" });
  if (id === "cushion") return state;
  go({ type: "next" });
  if (id === "after") go({ type: "next" });
  else if (id === "goals" || id === "boost" || id === "shelf" || id === "pdf") {
    state = reduce(state, { type: "go", screen: id }).state;
  }
  return state;
}

export function reduce(state, action) {
  const result = apply(state, action);
  return { state: settle(result.state), wipe: result.wipe === true, href: result.href || "" };
}

function requiredText(state) {
  if (!state.showRequired) return "";
  switch (state.screen) {
    case "income":
      return "Enter your take-home to continue.";
    case "expenses":
      return "Enter bills and personal. Zero is all right if that is true.";
    case "debt":
      if (state.debtProblems == null) return "Choose yes or no to continue.";
      if (parseAmount(state.installment) == null) return "Enter the monthly installment.";
      return "Say whether that installment is already inside bills or personal.";
    case "cushion":
      return "There is no spare money for a cushion yet. When this month can set something aside, a ready date appears here.";
    case "goals":
      return "Add a name and an amount.";
    default:
      return "";
  }
}

function pack(state, spec) {
  const blocks = spec.blocks.slice();
  const alert = requiredText(state);
  if (alert) blocks.push({ type: "alert", text: alert });
  if (spec.strip) blocks.push({ type: "strip" });
  return {
    id: spec.id,
    brand: spec.brand === true,
    chip: spec.chip || "",
    infoOpen: state.infoOpen === true,
    blocks,
    primary: spec.primary || null,
    quiet: spec.quiet || null,
  };
}

function moneyField(key, label, value) {
  return { key, label, value, input: "money" };
}

function buildHome(state) {
  return pack(state, {
    id: "home",
    brand: true,
    strip: true,
    primary: { label: "Start with numbers", act: "next", tone: "primary" },
    blocks: [
      { type: "title", text: "Dated plan + Shelf" },
      { type: "body", text: "One new-user spine. Cards by date. Shelf only at Boost \u2014 not the front door." },
      {
        type: "pills",
        items: [
          { tone: "fix", label: "FIX" },
          { tone: "ef", label: "EF" },
          { tone: "boost", label: "GOALS+BOOST" },
          { tone: "shelf", label: "SHELF" },
        ],
      },
      {
        type: "fact",
        tone: "fix",
        title: "1\u20133 \u00b7 Debt first",
        body: "Income \u2192 expenses \u2192 debt \u2192 Right Door or Sunday Pack \u2192 ~3 mo cashflow+ date on the plan.",
      },
      {
        type: "fact",
        tone: "ef",
        title: "4 \u00b7 Emergency fund",
        body: "EF next \u00b7 ready date on the future life timeline.",
      },
      {
        type: "fact",
        tone: "boost",
        title: "5\u20136 \u00b7 After those dates",
        body: "Goals + Boost together. Cards ordered by execution date.",
      },
      {
        type: "fact",
        tone: "shelf",
        title: "7 \u00b7 Shelf at Boost",
        body: "Models = reference only \u2192 research your bank \u2192 bring the offer \u2192 unbiased decode.",
      },
    ],
  });
}

function buildStart(state) {
  return pack(state, {
    id: "start",
    chip: "Your plan",
    primary: { label: "Enter income", act: "next", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "ok", label: "New user" },
      { type: "title", text: "Start with numbers" },
      { type: "body", text: "Simple clear steps. We build the dated plan from what you enter." },
      {
        type: "steps",
        items: [
          { n: "1", title: "Income", sub: "Take-home / salary" },
          { n: "2", title: "Expenses", sub: "Bills + personal / self" },
          { n: "3", title: "Then debt", sub: "Only after expenses" },
        ],
      },
      {
        type: "confirm",
        tone: "ok",
        title: "One path",
        body: "No hop between apps. Debt problems open Right Door or Sunday Pack first \u2014 then the plan dates fill in.",
      },
    ],
  });
}

function buildIncome(state) {
  return pack(state, {
    id: "income",
    chip: "Income",
    primary: { label: "Continue", act: "next", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "fix", label: "Step 1" },
      { type: "title", text: "Take-home" },
      { type: "body", text: "What you actually receive. Salary or other pay." },
      { type: "fields", items: [moneyField("income", "Income", state.income)] },
    ],
  });
}

function buildExpenses(state) {
  return pack(state, {
    id: "expenses",
    chip: "Expenses",
    primary: { label: "Continue", act: "next", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "fix", label: "Step 2" },
      { type: "title", text: "Bills and personal" },
      { type: "body", text: "Debt comes after this. A blank is not a number. Zero is all right." },
      {
        type: "fields",
        items: [moneyField("bills", "Bills", state.bills), moneyField("personal", "Personal / self", state.personal)],
      },
    ],
  });
}

function buildDebt(state) {
  const blocks = [
    { type: "kicker", tone: "fix", label: "Step 3" },
    { type: "title", text: "Any debt problems?" },
    { type: "body", text: "We ask after income and expenses. Goals and Boost wait until this is clear." },
    {
      type: "choices",
      items: [
        {
          field: "debt",
          value: "yes",
          on: state.debtProblems === true,
          title: "Yes \u00b7 debt is a problem",
          body: "Right Door or Sunday Pack comes before the cushion.",
          tone: "yes",
        },
        {
          field: "debt",
          value: "no",
          on: state.debtProblems === false,
          title: "No debt problem",
          body: "We go on to your cushion.",
          tone: "no",
        },
      ],
    },
  ];
  if (state.debtProblems === true) {
    blocks.push({
      type: "fields",
      items: [
        moneyField("installment", "Monthly installment", state.installment),
        moneyField("debtOwed", "Roughly how much is owed (optional)", state.debtOwed),
      ],
    });
    blocks.push({
      type: "choices",
      items: [
        {
          field: "installmentIn",
          value: "no",
          on: state.installmentInExpenses === false,
          title: "No \u00b7 count it this month",
          body: "We subtract it once so Left stays honest.",
          tone: "yes",
        },
        {
          field: "installmentIn",
          value: "yes",
          on: state.installmentInExpenses === true,
          title: "Yes \u00b7 already in bills or personal",
          body: "We will not subtract it again.",
          tone: "no",
        },
      ],
    });
  }
  return pack(state, {
    id: "debt",
    chip: "Debt",
    primary: { label: "See You today", act: "next", tone: "primary" },
    blocks,
  });
}

function buildToday(state) {
  const today = youToday(state);
  const owed = parseAmount(state.debtOwed);
  const blocks = [
    { type: "kicker", tone: "ok", label: "You today" },
    { type: "title", text: "You today" },
    { type: "body", text: "Income, expenses, and what is left this month." },
    { type: "rows", items: todayRows(state) },
    {
      type: "confirm",
      tone: "ok",
      title: "Net uses expenses",
      body: today.installmentIncluded
        ? `Left is ${formatMoney(today.income)} minus bills and personal. The installment is already inside those expenses, so it is not subtracted again.`
        : `Left is income minus the expenses we counted${today.installment ? ", including the installment once" : ""}.`,
    },
  ];
  if (owed > 0) {
    blocks.push({ type: "hint", text: `Owed about HK$ ${formatMoney(owed)}. This month\u2019s installment is what Left uses.` });
  }
  return pack(state, {
    id: "today",
    chip: "You today",
    strip: true,
    primary: {
      label: state.debtProblems === true ? "Fix debt first" : "Build your cushion",
      act: "next",
      tone: "primary",
    },
    blocks,
  });
}

function buildDebtPath(state) {
  return pack(state, {
    id: "debtpath",
    chip: "Debt path",
    primary: { label: "Continue with path", act: "next", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "fix", label: "Debt yes" },
      { type: "title", text: "Fix debt first" },
      { type: "body", text: "You flagged debt problems \u2014 open a path before we plan goals or Boost." },
      {
        type: "cards",
        items: [
          {
            tone: "rd",
            tag: "Right Door",
            title: "Open Right Door",
            body: "Type \u2192 totals \u2192 Improve / package \u00b7 monitor",
            href: RIGHT_DOOR_HREF,
            act: "door",
            value: "rd",
          },
          {
            tone: "pack",
            tag: "Sunday Pack",
            title: "Open Sunday Pack",
            body: "build \u2192 upload \u2192 THEN book",
            href: SUNDAY_PACK_URL,
            act: "door",
            value: "pack",
          },
        ],
      },
      {
        type: "confirm",
        tone: "warn",
        title: "~3 months expected",
        body: "When the path sticks, we put a positive-cashflow date on your plan (~3 months out).",
      },
    ],
  });
}

function buildCashflow(state) {
  const label = cashflowLabel(state);
  const day = formatDay(cashflowDate(state));
  return pack(state, {
    id: "cashflow",
    chip: "Your plan",
    primary: { label: "Add to life timeline", act: "next", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "pack", label: "Plan date" },
      { type: "title", text: "Cashflow turns+" },
      { type: "body", text: "Debt-fix path started. We mark when money should turn positive." },
      {
        type: "cards",
        items: [
          {
            tone: "pack",
            tag: "Debt fix",
            title: "Positive cashflow expected",
            body: "After Right Door / Sunday Pack sticks \u2014 ~3 months",
            date: `${label} \u00b7 cashflow+`,
            act: "stay",
          },
        ],
      },
      {
        type: "timeline",
        items: [
          { tone: "pack", title: "Today \u00b7 path opened", sub: "RD or Pack from Fortune" },
          { tone: "pack", title: "~3 months \u00b7 cashflow+", sub: `Date on the plan card \u00b7 ${day}` },
          { tone: "wait", title: "Then Emergency fund", sub: "Ready date after this" },
        ],
      },
      {
        type: "confirm",
        tone: "pack",
        title: "On the plan",
        body: "This date lines up the next cards. Not a promise \u2014 an expected completion we track.",
      },
    ],
  });
}

function buildCushion(state) {
  const plan = cushionPlan(state);
  const dateText = plan.date ? (plan.funded ? `Ready \u00b7 ${formatDay(plan.date)}` : `Ready by ${formatDay(plan.date)}`) : "";
  const blocks = [
    { type: "kicker", tone: "ok", label: "Emergency fund" },
    { type: "title", text: "Build your cushion" },
    {
      type: "body",
      text: state.debtProblems
        ? "After cashflow turns positive \u2014 start the emergency fund with a ready date."
        : "Start the emergency fund with a ready date your month can reach.",
    },
  ];
  if (plan.viable && plan.date) {
    blocks.push({
      type: "cards",
      items: [
        {
          tone: "ef",
          tag: "Emergency fund",
          title: "Cushion ready",
          body: "Viable completion date on the future life timeline",
          date: dateText,
          act: "stay",
        },
      ],
    });
    blocks.push({
      type: "confirm",
      tone: "ok",
      title: "Date on arrival",
      body: plan.funded
        ? "This cushion is already in place. The completion date is on the plan."
        : "This ready date is already on the plan \u2014 the earliest this month can reach.",
    });
  }
  blocks.push({
    type: "fields",
    items: [
      moneyField("cushionNow", "Already saved", state.cushionNow),
      moneyField("cushionTarget", "Cushion target", state.cushionTarget),
      moneyField("cushionSave", "Each month", state.cushionSave),
    ],
  });
  if (plan.viable && !plan.funded) {
    blocks.push({
      type: "hint",
      text: `HK$ ${formatMoney(plan.save)} a month toward HK$ ${formatMoney(plan.target)}.${plan.clamped ? " The month cannot set aside more than what is spare, so the date uses that." : ""}`,
    });
  }
  blocks.push({ type: "hint", text: "Floor first. Goals and Boost wait until after this date on the timeline." });
  return pack(state, {
    id: "cushion",
    chip: "Stable",
    primary: { label: "Set cushion plan", act: "next", tone: "primary" },
    blocks,
  });
}

function buildTimeline(state) {
  const cards = timelineCards(state).map((card) => ({
    tone: card.tone,
    tag: card.tag,
    title: card.title,
    body: card.body,
    date: card.date,
    act: "go",
    value: card.go,
  }));
  return pack(state, {
    id: "timeline",
    chip: "Life timeline",
    strip: true,
    primary: { label: "Open goals and Boost", act: "next", tone: "primary" },
    quiet: { label: "See the PDF", act: "go", value: "pdf", tone: "quiet" },
    blocks: [
      { type: "kicker", tone: "ok", label: "Ordered by date" },
      { type: "title", text: "Your life plan" },
      { type: "body", text: "One card per action \u00b7 lined up by when it runs." },
      { type: "cards", items: cards },
      {
        type: "confirm",
        tone: "ok",
        title: "One timeline",
        body: "No separate surfaces. The PDF prints this same dated order.",
      },
    ],
  });
}

function buildAfter(state) {
  const plan = cushionPlan(state);
  const when = plan.date ? formatDay(plan.date) : "";
  return pack(state, {
    id: "after",
    chip: "After dates",
    primary: { label: "Open goals & Boost", act: "next", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "ok", label: "Unlocked together" },
      { type: "title", text: "Goals + Boost" },
      {
        type: "body",
        text: state.debtProblems
          ? "Debt-fix and EF dates are on the timeline \u2014 open both in one go."
          : "The cushion date is on the timeline \u2014 open goals and Boost together.",
      },
      {
        type: "cards",
        items: [
          {
            tone: "goal",
            tag: "Goals",
            title: "Build your goals",
            body: "Feasibility + target dates \u00b7 after cushion",
            date: when ? `Open after ${when}` : "",
            act: "go",
            value: "goals",
          },
          {
            tone: "boost",
            tag: "Boost",
            title: "See Boost",
            body: "Reference mixes \u00b7 then research your bank",
            date: "Same beat \u00b7 after EF ready",
            act: "go",
            value: "boost",
          },
        ],
      },
      {
        type: "confirm",
        tone: "ok",
        title: "One go",
        body: "Goals and Boost appear together after the earlier dates \u2014 then Shelf at Boost.",
      },
    ],
  });
}

function buildGoals(state) {
  const plan = cushionPlan(state);
  const shown = formatDay(parseIso(state.goalDate) || plan.date);
  const blocks = [
    { type: "kicker", tone: "ok", label: "Goals" },
    { type: "title", text: "Build your goals" },
    { type: "body", text: "A goal starts on the cushion date or later. Boost is on this same beat." },
  ];
  if (state.goals.length) {
    blocks.push({
      type: "cards",
      items: state.goals.map((goal) => ({
        tone: "goal",
        tag: "Goal",
        title: goal.name,
        body: `HK$ ${formatMoney(parseAmount(goal.amount))}`,
        date: formatDay(parseIso(goal.date)),
        act: "stay",
        remove: goal.id,
      })),
    });
  }
  blocks.push({
    type: "fields",
    items: [
      { key: "goalName", label: "Goal name", value: state.goalName, input: "text" },
      moneyField("goalAmount", "Target amount", state.goalAmount),
      { key: "goalDate", label: "Target date", value: state.goalDate || plan.iso || "", shown, input: "date", min: plan.iso || "" },
    ],
  });
  if (state.goalMoved) {
    blocks.push({ type: "hint", text: "That date was before the cushion. It now starts when the cushion is ready." });
  }
  blocks.push({
    type: "cards",
    items: [
      {
        tone: "boost",
        tag: "Boost",
        title: "See Boost",
        body: "Reference mixes \u00b7 same beat as these goals",
        date: plan.date ? `After ${formatDay(plan.date)}` : "",
        act: "go",
        value: "boost",
      },
    ],
  });
  return pack(state, {
    id: "goals",
    chip: "Goals",
    primary: { label: "Save goal", act: "next", tone: "primary" },
    quiet: { label: "See Boost", act: "go", value: "boost", tone: "quiet" },
    blocks,
  });
}

function buildBoost(state) {
  return pack(state, {
    id: "boost",
    chip: "Boost",
    primary: { label: "Open Shelf", act: "go", value: "shelf", tone: "shelf" },
    quiet: { label: "Keep browsing mixes", act: "browse", tone: "quiet" },
    blocks: [
      { type: "kicker", tone: "warn", label: "Reference only" },
      { type: "title", text: "Boost mixes" },
      { type: "body", text: "PYL model portfolios are a benchmark \u2014 not what to buy." },
      {
        type: "mixes",
        items: MIXES.map((mix) => ({ ...mix, on: mix.id === state.boostRef })),
      },
      { type: "badge", text: "Benchmark \u00b7 not a product to buy" },
      {
        type: "confirm",
        tone: "shelf",
        title: "Next: your bank",
        body: "Research what your bank or insurer is pushing. Then bring that offer into Shelf for an unbiased break-down.",
      },
    ],
  });
}

function buildShelf(state) {
  const decoded = decodeOffer(state.offerText);
  return pack(state, {
    id: "shelf",
    chip: "Shelf",
    primary: { label: "Continue decode", act: "next", tone: "shelf" },
    quiet: { label: "Back to Boost", act: "go", value: "boost", tone: "quiet" },
    blocks: [
      { type: "kicker", tone: "shelf", label: "Tool at Boost" },
      { type: "title", text: "Bring the bank offer" },
      { type: "body", text: "Paste or describe what they showed you. We decode it \u2014 we don\u2019t tell you to buy." },
      {
        type: "fields",
        items: [{ key: "offerText", label: "Drop the offer here", value: state.offerText, input: "area", hint: "Paste the bank / insurer wording \u00b7 or describe the product in plain words." }],
      },
      {
        type: "shelf",
        rows: [
          { tone: "", k: "What it is", v: decoded.what },
          { tone: "", k: "What it costs", v: decoded.costs },
          { tone: decoded.conflict ? "conflict" : "", k: "Who may get paid", v: decoded.paid },
        ],
      },
      {
        type: "confirm",
        tone: "shelf",
        title: "Unbiased decode",
        body: "Education only. Pause and questions for the person who showed it to you.",
      },
    ],
  });
}

function buildPdf(state) {
  return pack(state, {
    id: "pdf",
    chip: "PDF",
    strip: true,
    primary: { label: "Download PDF", act: "download", tone: "primary" },
    blocks: [
      { type: "kicker", tone: "ok", label: "Export" },
      { type: "title", text: "Your dated plan" },
      { type: "body", text: "PDF = this same timeline in detail \u2014 one spine, every action dated." },
      { type: "pdf", rows: pdfRows(state) },
      {
        type: "confirm",
        tone: "ok",
        title: "Same as on screen",
        body: "Not a second product story. Print or share the dated cards in order.",
      },
    ],
  });
}

export function present(state) {
  const current = settle(state);
  switch (current.screen) {
    case "home":
      return buildHome(current);
    case "start":
      return buildStart(current);
    case "income":
      return buildIncome(current);
    case "expenses":
      return buildExpenses(current);
    case "debt":
      return buildDebt(current);
    case "today":
      return buildToday(current);
    case "debtpath":
      return buildDebtPath(current);
    case "cashflow":
      return buildCashflow(current);
    case "cushion":
      return buildCushion(current);
    case "timeline":
      return buildTimeline(current);
    case "after":
      return buildAfter(current);
    case "goals":
      return buildGoals(current);
    case "boost":
      return buildBoost(current);
    case "shelf":
      return buildShelf(current);
    case "pdf":
      return buildPdf(current);
    default:
      return buildHome(current);
  }
}
