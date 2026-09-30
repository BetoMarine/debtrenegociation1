import { monthStamp } from "../../shared/storage/keys.js";
import { decodeShortCode } from "../../shared/shortcode.js";
import { stageWord } from "../../shared/stage-words.js";
import {
  askStage1Again,
  declineStage1,
  emptyStage1,
  isLivingGoal,
  newFortunePlan,
  normalizeStage1,
  stage1Ticked,
  upsertLivingGoal,
} from "../model.js";
import { stabilizeSnapshot } from "../stabilize.js";
import { hostCopy } from "../../shared/ft-host-copy.js";
import { v3 } from "./copy.js";

export const RD_SCREENS = new Set(["s01", "s01a", "s01b", "s01c", "letter", "s02", "s03", "s03a", "s03b", "n1", "n1b"]);

const SCREEN_STAGE = {
  a2: "fix",
  code: "fix",
  s01: "fix",
  s01a: "fix",
  s01b: "fix",
  s01c: "fix",
  letter: "fix",
  s02: "fix",
  s03: "fix",
  s03a: "fix",
  s03b: "fix",
  n1: "fix",
  n1b: "fix",
  dates: "fix",
  s05: "stabilize",
  s07: "plan",
  s08: "plan",
  s12: "invest",
  cards: "invest",
};

const STAGE_START = {
  fix: "s01",
  stabilize: "s05",
  plan: "s07",
  invest: "s12",
};

export function emptyRd() {
  return {
    fullName: "",
    tenorMonths: "6",
    reason: null,
    letter: "",
    letterTouched: false,
    proof: 0,
    statements: 0,
    identity: 0,
    other: 0,
  };
}

export function emptyUi() {
  return {
    lenderCount: null,
    askedRoute: null,
    lastByStage: {},
    transition: null,
    counsellingShown: false,
    pickedCard: null,
    goalChoice: null,
    goalAmount: "",
    goalMonths: 14,
    goalChance: 70,
    coverHintSeen: false,
  };
}

export function freshState(extra = {}) {
  return {
    screen: "cover",
    revealed: false,
    sheet: null,
    lang: "en",
    plan: newFortunePlan(),
    ui: emptyUi(),
    rd: emptyRd(),
    codeDraft: "",
    codeError: "",
    history: [],
    pendingErase: false,
    foundExport: null,
    manualExport: false,
    standalone: false,
    ...extra,
  };
}

export function ym(date = new Date()) {
  return monthStamp(date);
}

export function monthAfter(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return ym(d);
}

export function addYm(value, delta) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1 + Number(delta || 0), 1);
  return ym(d);
}

export function formatMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (!match) return "";
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(match[2]) - 1]} ${match[1]}`;
}

export function monthsAskedForFromTenor(tenor) {
  const n = Number(tenor);
  if (n === 3) return 3;
  if (n === 6 || n === 9 || n === 12) return 6;
  return null;
}

export function docsComplete(rd) {
  return Number(rd?.proof) >= 1 && Number(rd?.statements) >= 3;
}

export function documentReason(rd) {
  const proof = Math.max(0, 1 - Number(rd?.proof || 0));
  const statements = Math.max(0, 3 - Number(rd?.statements || 0));
  if (proof === 1 && statements === 3) return hostCopy("en", "docsReasonBoth");
  if (proof === 0 && statements === 0) return "";
  if (proof === 0) return statements === 1 ? "1 statement photo to go." : `${statements} statement photos to go.`;
  if (statements === 0) return proof === 1 ? "1 proof photo to go." : `${proof} proof photos to go.`;
  const proofBit = proof === 1 ? "1 proof photo" : `${proof} proof photos`;
  const statementBit = statements === 1 ? "1 statement photo" : `${statements} statement photos`;
  return `Add ${proofBit} and ${statementBit} to continue.`;
}

export function otherRoute(route) {
  return route === "idrp" ? "hardship" : "idrp";
}

export function noDestination(ui) {
  const routes = ui?.declinedRoutes || [];
  if (Number(ui?.lenderCount) === 1) return { screen: "n1b", caritasPrimary: true };
  if (routes.includes("idrp") && routes.includes("hardship")) return { screen: "n1", caritasPrimary: true };
  return { screen: "n1", caritasPrimary: false };
}

export function goalPinned(plan) {
  return (plan?.milestones || []).some((m) => m.pinned && isLivingGoal(m));
}

export function mapAction(plan) {
  if (!stage1Ticked(plan)) return { stage: "fix", kind: "start" };
  if (!plan?.cushionStartedAt) return { stage: "stabilize", kind: "continue" };
  if (!plan?.cushionBuiltAt && !goalPinned(plan)) return { stage: "plan", kind: "continue" };
  if (!plan?.cushionBuiltAt) return { stage: null, kind: "none" };
  return { stage: "invest", kind: "continue" };
}

export function rowStatus(id, plan) {
  const ticked = stage1Ticked(plan);
  if (id === "fix") return ticked ? "done" : "here";
  if (id === "stabilize") {
    if (plan?.cushionBuiltAt) return "done";
    if (plan?.cushionStartedAt) return "progress";
    if (ticked) return "here";
    return "upcoming";
  }
  if (id === "plan") {
    if (goalPinned(plan)) return "done";
    if (plan?.cushionStartedAt && !plan?.cushionBuiltAt) return "here";
    if (plan?.cushionBuiltAt && !goalPinned(plan)) return "upcoming";
    return "upcoming";
  }
  if (!plan?.cushionBuiltAt) return "locked";
  return mapAction(plan).stage === "invest" ? "here" : "upcoming";
}

export function stageForScreen(screen) {
  return SCREEN_STAGE[screen] || null;
}

export function stageLabel(lang, id) {
  return stageWord(lang === "zh" ? "en" : "en", id);
}

function remember(ui, screen) {
  const stage = SCREEN_STAGE[screen];
  if (!stage) return ui;
  return { ...ui, lastByStage: { ...(ui.lastByStage || {}), [stage]: screen } };
}

function go(state, screen, extra = {}) {
  const history = [...(state.history || [])];
  if (state.screen && state.screen !== "cover" && state.screen !== "map" && state.screen !== "e1") {
    history.push(state.screen);
  }
  return {
    ...state,
    ...extra,
    screen,
    sheet: null,
    history,
    ui: remember(extra.ui || state.ui, screen),
  };
}

function toMap(state, transition, extra = {}) {
  return {
    ...state,
    ...extra,
    screen: "map",
    sheet: null,
    history: [],
    revealed: false,
    ui: { ...(extra.ui || state.ui), transition: transition || null },
  };
}

export function applyBroughtIn(plan, record, source, importedAt) {
  const tenor = Number(record.tenorMonths);
  return {
    ...plan,
    stage1: normalizeStage1({
      route: "bank",
      source,
      monthsAskedFor: record.monthsAskedFor ?? monthsAskedForFromTenor(tenor),
      tenorMonths: tenor,
      startMonth: record.startMonth || null,
      done: !!record.done,
      doneAt: record.done ? record.doneAt || importedAt : null,
      status: "asked",
      importedAt,
      edited: false,
      agreedAt: null,
      declinedAt: null,
      declinedRoutes: [],
    }),
  };
}

function finishStage1(state, summary) {
  const prev = normalizeStage1(state.plan.stage1);
  const nextPlan =
    prev.status === "declined" || prev.status === "asked"
      ? askStage1Again(state.plan, summary)
      : {
          ...state.plan,
          stage1: normalizeStage1({
            ...prev,
            ...summary,
            route: "bank",
            source: prev.source || "ft-rd-steps",
            status: "asked",
            edited: prev.edited,
          }),
        };
  if (prev.status === "declined" || prev.status === "asked") {
    nextPlan.stage1 = normalizeStage1({
      ...nextPlan.stage1,
      route: "bank",
      source: prev.source || "ft-rd-steps",
      declinedRoutes: prev.declinedRoutes,
    });
  }
  return toMap(state, "month", { plan: nextPlan });
}

export function reduce(state, action) {
  const type = action?.type;
  if (state.sheet && (type === "back" || type === "close-sheet")) {
    return { ...state, sheet: null };
  }
  if (type === "exit") {
    return {
      ...state,
      screen: "cover",
      revealed: false,
      sheet: null,
      codeDraft: "",
      codeError: "",
      history: [],
      pendingErase: false,
      ui: { ...state.ui, coverHintSeen: true },
    };
  }
  if (type === "back") {
    if (state.screen === "map" || state.screen === "cover" || state.screen === "e1") return state;
    const history = [...(state.history || [])];
    const prev = history.pop();
    if (!prev) return { ...state, screen: "map", history: [], sheet: null };
    return { ...state, screen: prev, history, sheet: null };
  }
  if (type === "home") return { ...state, screen: "map", history: [], sheet: null, revealed: false };
  if (type === "lang") {
    if (!RD_SCREENS.has(state.screen)) return state;
    return { ...state, lang: state.lang === "zh" ? "en" : "zh" };
  }
  if (type === "cover-continue") {
    if (state.pendingErase) return { ...state, screen: "e1", pendingErase: true };
    if (state.foundExport && !state.manualExport) return go({ ...state, history: [] }, "a2");
    return { ...state, screen: "map", history: [], sheet: null };
  }
  if (type === "used-already") return go(state, state.foundExport || state.manualExport ? "a2" : "code");
  if (type === "bring") {
    if (!state.foundExport) return state;
    const plan = applyBroughtIn(state.plan, state.foundExport, "rd-export", ym());
    return toMap(state, "import", { plan });
  }
  if (type === "fresh") return toMap(state, null);
  if (type === "code-input") return { ...state, codeDraft: action.value, codeError: "" };
  if (type === "code-submit") {
    const decoded = decodeShortCode(state.codeDraft);
    if (!decoded.ok) return { ...state, codeError: decoded.error };
    const plan = applyBroughtIn(state.plan, decoded.record, "code", ym());
    return toMap(state, "import", { plan, codeDraft: "", codeError: "" });
  }
  if (type === "answer-01") {
    if (action.id === "bank") {
      const plan = { ...state.plan, stage1: normalizeStage1({ ...state.plan.stage1, route: "bank", status: state.plan.stage1.status === "none" ? "none" : state.plan.stage1.status }) };
      return go(state, "s01a", { plan });
    }
    const route = action.id === "not-bank" ? "no-bank-debt" : "managing";
    const plan = {
      ...state.plan,
      stage1: normalizeStage1({
        ...emptyStage1(),
        route,
        source: "ft-rd-steps",
        status: "asked",
        done: true,
        doneAt: ym(),
      }),
    };
    return go(state, "s05", { plan, ui: { ...state.ui, counsellingShown: route === "no-bank-debt" ? state.ui.counsellingShown : false } });
  }
  if (type === "reason") return go(state, "s01b", { rd: { ...state.rd, reason: action.id } });
  if (type === "lenders") {
    const count = action.count === 1 ? 1 : 2;
    const askedRoute = count === 1 ? "hardship" : "idrp";
    return go(state, "s01c", { ui: { ...state.ui, lenderCount: count, askedRoute } });
  }
  if (type === "tenor") return { ...state, rd: { ...state.rd, tenorMonths: String(action.months) } };
  if (type === "name") return { ...state, rd: { ...state.rd, fullName: action.value } };
  if (type === "continue-situation") {
    if (!String(state.rd.fullName || "").trim()) return { ...state, sheet: { type: "need-name" } };
    return go(state, "s02");
  }
  if (type === "open-letter") return go(state, "letter");
  if (type === "letter-input") return { ...state, rd: { ...state.rd, letter: action.value, letterTouched: true } };
  if (type === "show-script") return go(state, "s03");
  if (type === "next-docs") return go(state, "s03a");
  if (type === "next-letter-ready") {
    if (!docsComplete(state.rd)) return state;
    return go(state, "s03b");
  }
  if (type === "finish-month") {
    if (!docsComplete(state.rd)) return { ...state, screen: "s03a" };
    const summary = {
      monthsAskedFor: monthsAskedForFromTenor(state.rd.tenorMonths),
      tenorMonths: Number(state.rd.tenorMonths),
      startMonth: monthAfter(),
      done: true,
      doneAt: ym(),
    };
    return finishStage1(state, summary);
  }
  if (type === "cushion") {
    const months = action.months === 3 ? 3 : 6;
    const started = state.plan.cushionStartedAt || ym();
    const plan = {
      ...state.plan,
      cushionStartedAt: started,
      stabilizeTargetMonths: months,
      stabilizeMonthsPicked: true,
      net: { ...state.plan.net, emergencyMonths: months },
    };
    const ui = { ...state.ui, counsellingShown: state.plan.stage1.route === "no-bank-debt" ? true : state.ui.counsellingShown };
    return toMap(state, "cushion", { plan, ui });
  }
  if (type === "toggle-reveal") return { ...state, revealed: !state.revealed };
  if (type === "open-dates") return go(state, "dates");
  if (type === "save-dates") {
    const plan = {
      ...state.plan,
      stage1: normalizeStage1({
        ...state.plan.stage1,
        startMonth: action.startMonth || state.plan.stage1.startMonth,
        tenorMonths: Number(action.tenorMonths || state.plan.stage1.tenorMonths),
        monthsAskedFor: monthsAskedForFromTenor(action.tenorMonths || state.plan.stage1.tenorMonths),
        edited: true,
        status: state.plan.stage1.status === "agreed" ? "asked" : state.plan.stage1.status,
        agreedAt: null,
      }),
    };
    return toMap(state, state.ui.transition, { plan, revealed: true });
  }
  if (type === "mark-agreed") {
    const plan = {
      ...state.plan,
      stage1: normalizeStage1({ ...state.plan.stage1, status: "agreed", agreedAt: ym() }),
    };
    return { ...state, plan, revealed: true };
  }
  if (type === "they-said-no") {
    const route = state.ui.askedRoute === "hardship" ? "hardship" : "idrp";
    const plan = declineStage1(state.plan, route, ym());
    const ui = { ...state.ui, declinedRoutes: plan.stage1.declinedRoutes, askedRoute: route };
    const dest = noDestination({ ...ui, lenderCount: state.ui.lenderCount });
    return go(state, dest.screen, { plan, ui: { ...ui, caritasPrimary: dest.caritasPrimary } });
  }
  if (type === "other-way") {
    if (state.ui.caritasPrimary || Number(state.ui.lenderCount) === 1) return state;
    const next = otherRoute(state.ui.askedRoute);
    return go(state, "s03", { ui: { ...state.ui, askedRoute: next, caritasPrimary: false } });
  }
  if (type === "goal") {
    const drawn = action.id === "skills" ? { amount: "12000", months: 14, chance: 70 } : action.id === "family" ? { amount: "18000", months: 18, chance: null } : { amount: "", months: 18, chance: null };
    return go(state, "s08", {
      ui: { ...state.ui, goalChoice: action.id, goalAmount: drawn.amount, goalMonths: drawn.months, goalChance: drawn.chance },
    });
  }
  if (type === "goal-amount") return { ...state, ui: { ...state.ui, goalAmount: action.value } };
  if (type === "delay-goal") {
    return { ...state, ui: { ...state.ui, goalMonths: Number(state.ui.goalMonths || 12) + 12, goalChance: state.ui.goalChance == null ? null : Math.min(90, Number(state.ui.goalChance) + 10) } };
  }
  if (type === "pin") {
    const names = { place: v3("goalPlace"), skills: v3("goalSkills"), family: v3("goalFamily"), own: v3("goalOwn") };
    const amount = String(state.ui.goalAmount || "").trim();
    if (!amount) return state;
    let plan = upsertLivingGoal(state.plan, {
      name: names[state.ui.goalChoice] || v3("goalOwn"),
      amount,
      months: state.ui.goalMonths || 12,
    });
    const living = [...(plan.milestones || [])].reverse().find((m) => isLivingGoal(m));
    if (living) {
      plan = {
        ...plan,
        milestones: plan.milestones.map((m) => (m.id === living.id ? { ...m, pinned: true, pinnedAt: ym() } : m)),
      };
    }
    return toMap(state, "pinned", { plan });
  }
  if (type === "savings") {
    const amount = Math.max(0, Math.round(Number(action.amount) || 0));
    let plan = {
      ...state.plan,
      money: { ...state.plan.money, savings: amount },
      net: { ...state.plan.net, currentHkd: amount },
    };
    const snap = stabilizeSnapshot(plan);
    if (snap.ready && state.plan.cushionStartedAt && !plan.cushionBuiltAt) {
      plan = { ...plan, cushionBuiltAt: ym() };
    }
    const transition = plan.cushionBuiltAt && !state.plan.cushionBuiltAt ? "built" : state.ui.transition;
    return { ...state, plan, ui: { ...state.ui, transition }, revealed: true };
  }
  if (type === "pick-card") return { ...state, ui: { ...state.ui, pickedCard: action.id } };
  if (type === "open-cards") return go(state, "cards");
  if (type === "redo") {
    const plan = { ...state.plan, stage1: normalizeStage1({ ...emptyStage1() }) };
    return go(state, "s01", { plan, ui: { ...state.ui, lenderCount: null, askedRoute: null, declinedRoutes: [], caritasPrimary: false } });
  }
  if (type === "map-go") {
    const actionMap = mapAction(state.plan);
    if (actionMap.kind === "none" || !actionMap.stage) return { ...state, ui: { ...state.ui, transition: null } };
    const screen = state.ui.lastByStage?.[actionMap.stage] || STAGE_START[actionMap.stage];
    return go(state, screen, { ui: { ...state.ui, transition: null } });
  }
  if (type === "info") return { ...state, sheet: { type: "info", id: action.id } };
  if (type === "leave") return { ...state, sheet: { type: "leave", href: action.href } };
  if (type === "ask-erase") return { ...state, sheet: { type: "erase" } };
  if (type === "ask-bring") return { ...state, sheet: { type: "bring" } };
  if (type === "confirm-bring") {
    if (!state.foundExport) return { ...state, sheet: null };
    const plan = applyBroughtIn(state.plan, state.foundExport, state.plan.stage1.source || "rd-export", ym());
    return toMap(state, "import", { plan });
  }
  if (type === "erased") {
    return {
      ...freshState({ standalone: state.standalone }),
      screen: "e1",
      pendingErase: false,
      foundExport: null,
    };
  }
  if (type === "e1-ok") return { ...freshState({ standalone: state.standalone }), screen: "map" };
  return state;
}

export function buttonLabel(kind, stage) {
  const word = stageLabel("en", stage);
  return kind === "start" ? v3("startStage", { stage: word }) : v3("continueStage", { stage: word });
}

export function counsellingOn(plan, ui) {
  return plan?.stage1?.route === "no-bank-debt" && !ui?.counsellingShown;
}
