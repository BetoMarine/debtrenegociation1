import { EF_MILESTONE_ID, FIX_MILESTONE_ID, fixGoalLabel } from "../handoff.js";
import { RD_PRODUCT } from "../shared/product-id.js";
import { JOURNEY_STAGES } from "../shared/stage-words.js";
import { THEMES, THEME_IDS, canonicalThemeId, getTheme } from "./themes.js";
import { TEMPLATE_IDS, canonicalTemplateId, getTemplate } from "./templates.js";

export { JOURNEY_STAGES };

export const INCOME_BANDS = [
  { id: "0", label: "None — HK$0", value: 0 },
  { id: "lt15", label: "Under HK$15,000 / month", value: 10000 },
  { id: "15_30", label: "HK$15,000 – 30,000", value: 22000 },
  { id: "30_50", label: "HK$30,000 – 50,000", value: 40000 },
  { id: "50_80", label: "HK$50,000 – 80,000", value: 65000 },
  { id: "80_120", label: "HK$80,000 – 120,000", value: 100000 },
  { id: "gt120", label: "HK$120,000+", value: 150000 },
];

export const SPEND_BANDS = [
  { id: "lt10", label: "Under HK$10,000 / month", value: 7000 },
  { id: "10_20", label: "HK$10,000 – 20,000", value: 15000 },
  { id: "20_35", label: "HK$20,000 – 35,000", value: 27000 },
  { id: "35_50", label: "HK$35,000 – 50,000", value: 42000 },
  { id: "50_80", label: "HK$50,000 – 80,000", value: 65000 },
  { id: "gt80", label: "HK$80,000+", value: 100000 },
];

export const LEFTOVER_BANDS = [
  { id: "0", label: "None — HK$0", value: 0 },
  { id: "lt5", label: "Under HK$5,000", value: 2500 },
  { id: "5_10", label: "HK$5,000 – 10,000", value: 7500 },
  { id: "10_20", label: "HK$10,000 – 20,000", value: 15000 },
  { id: "20_40", label: "HK$20,000 – 40,000", value: 30000 },
  { id: "gt40", label: "HK$40,000+", value: 50000 },
];

export const SAVINGS_BANDS = [
  { id: "0", label: "None — HK$0", value: 0 },
  { id: "lt50", label: "Under HK$50,000", value: 25000 },
  { id: "50_150", label: "HK$50,000 – 150,000", value: 100000 },
  { id: "150_400", label: "HK$150,000 – 400,000", value: 250000 },
  { id: "400_800", label: "HK$400,000 – 800,000", value: 600000 },
  { id: "800_2m", label: "HK$800,000 – 2 million", value: 1400000 },
  { id: "gt2m", label: "Over HK$2 million", value: 3000000 },
];

export const DEBT_BANDS = [
  { id: "0", label: "None — HK$0", value: 0 },
  { id: "lt50", label: "Under HK$50,000", value: 25000 },
  { id: "50_150", label: "HK$50,000 – 150,000", value: 100000 },
  { id: "150_400", label: "HK$150,000 – 400,000", value: 250000 },
  { id: "400_1m", label: "HK$400,000 – 1 million", value: 700000 },
  { id: "gt1m", label: "Over HK$1 million", value: 1500000 },
];

const BANDS = {
  incomeBand: INCOME_BANDS,
  spendBand: SPEND_BANDS,
  leftoverBand: LEFTOVER_BANDS,
  savingsBand: SAVINGS_BANDS,
  debtsBand: DEBT_BANDS,
};

export function bandById(list, id) {
  return list.find((b) => b.id === id) || list[0];
}

export function newId(prefix = "g") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function addMonths(from, months) {
  const d = new Date(from.getFullYear(), from.getMonth() + Number(months || 0), 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function monthsUntil({ year, month }, from = new Date()) {
  return (Number(year) - from.getFullYear()) * 12 + (Number(month) - (from.getMonth() + 1));
}

export function monthYearLabel(months, from = new Date()) {
  const { year, month } = addMonths(from, months);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[month - 1]} ${year}`;
}

export function hkd(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `HK$${Math.round(Number(n)).toLocaleString("en-HK")}`;
}

function approxDebtService(debts) {
  const bal = Math.max(0, Number(debts) || 0);
  if (bal <= 0) return 0;
  return Math.min(bal, Math.max(800, bal * 0.02));
}

function inferStage(raw) {
  const role = milestoneRole(raw);
  if (role === "fix") return "fix";
  if (role === "floor") return "stabilize";
  if (JOURNEY_STAGES.includes(raw?.stage)) return raw.stage;
  if ((Number(raw?.amount) || 0) >= 500000) return "invest";
  return "plan";
}

export function milestoneRole(raw) {
  if (raw?.role === "fix") return "fix";
  if (raw?.role === "floor") return "floor";
  if (raw?.role === "placeholder") return "placeholder";
  if (raw?.role === "living") return "living";
  if (raw?.id === FIX_MILESTONE_ID) return "fix";
  if (raw?.id === EF_MILESTONE_ID) return "floor";
  return "living";
}

function livingMilestoneId(raw, role, index) {
  const requested = raw?.id;
  if (role === "fix") return FIX_MILESTONE_ID;
  if (role === "floor") return EF_MILESTONE_ID;
  if (requested && requested !== FIX_MILESTONE_ID && requested !== EF_MILESTONE_ID) return requested;
  return newId(`g${index}`);
}

export function parseGoalAmount(raw) {
  return Math.max(0, Math.round(Number(String(raw ?? "").replace(/[^\d.]/g, "")) || 0));
}

/** Milestone target tenor. 1–240 months from today. */
export function clampGoalMonths(n) {
  return Math.max(1, Math.min(240, Math.round(Number(n) || 1)));
}

/**
 * Drag a living goal in time. Stage stays put (moves are within a phase).
 * Fix / EF are not user-invented here — RD/Sunday own Fix; EF stays distinct.
 */
export function setLivingGoalMonths(plan, goalId, months) {
  if (!plan || !goalId) return plan;
  const found = (plan.milestones || []).find((m) => m.id === goalId);
  if (!found || milestoneRole(found) !== "living") return plan;
  return upsertLivingGoal(
    plan,
    { name: found.name, amount: found.amount, months: clampGoalMonths(months) },
    found.id,
  );
}

export function shiftLivingGoalMonths(plan, goalId, delta) {
  const found = (plan.milestones || []).find((m) => m.id === goalId);
  if (!found || milestoneRole(found) !== "living") return plan;
  const current = clampGoalMonths(found.months);
  return setLivingGoalMonths(plan, goalId, current + Math.round(Number(delta) || 0));
}

export function emergencySnapshot(plan) {
  const floor = (plan?.milestones || []).find((m) => milestoneRole(m) === "floor") || null;
  return {
    currentHkd: plan?.net?.currentHkd ?? null,
    floorHkd: plan?.net?.floorHkd ?? null,
    emergencyMonths: plan?.net?.emergencyMonths ?? null,
    floorId: floor?.id || EF_MILESTONE_ID,
    floorAmount: floor ? Math.max(0, Math.round(Number(floor.amount) || 0)) : emergencyCurrentHkd(plan),
    floorName: floor?.name || "Emergency fund",
  };
}

function isFirstGrowthPot(m) {
  return milestoneRole(m) === "living" && /^first growth pot$/i.test(String(m.name || "").trim());
}

function isDefaultFirstGrowthPot(m) {
  return isFirstGrowthPot(m) && Number(m.amount) === 25000 && Number(m.months) === 36;
}

function restoreAndDedupeGrowthPots(milestones) {
  const next = (milestones || []).map((m) =>
    isFirstGrowthPot(m) && m.stage !== "invest" ? { ...m, stage: "invest" } : m,
  );
  const potIdx = [];
  next.forEach((m, i) => {
    if (isFirstGrowthPot(m)) potIdx.push(i);
  });
  if (potIdx.length <= 1) return next;
  const custom = potIdx.filter((i) => !isDefaultFirstGrowthPot(next[i]));
  const keep = new Set(custom.length ? custom : [potIdx[0]]);
  return next.filter((_, i) => !potIdx.includes(i) || keep.has(i));
}

/**
 * Pin / edit a Plan–Invest living goal. Never writes EF / Fix ids or net fields.
 * Upserts by id so a second "Pin this goal" cannot append a duplicate row.
 */
export function upsertLivingGoal(plan, raw, editingId = null) {
  if (!plan) return plan;
  const existing = editingId ? (plan.milestones || []).find((m) => m.id === editingId) : null;
  if (existing && (milestoneRole(existing) === "floor" || milestoneRole(existing) === "fix")) {
    return plan;
  }
  const frozenNet = {
    emergencyMonths: plan.net?.emergencyMonths,
    floorHkd: plan.net?.floorHkd,
    currentHkd: plan.net?.currentHkd ?? null,
  };
  const next = normalizeMilestone(
    {
      ...(existing || {}),
      id: existing?.id,
      name: raw?.name,
      amount: parseGoalAmount(raw?.amount),
      months: raw?.months,
      role: "living",
      stage: existing?.stage,
      boardOrder: existing?.boardOrder,
      source: existing?.source,
      monthsKnown: existing?.monthsKnown,
    },
    (plan.milestones || []).length,
  );
  next.role = "living";
  if (next.id === EF_MILESTONE_ID || next.id === FIX_MILESTONE_ID) next.id = newId("g");
  if (existing?.stage && JOURNEY_STAGES.includes(existing.stage)) next.stage = existing.stage;

  const milestones = [...(plan.milestones || [])];
  const idx = existing ? milestones.findIndex((m) => m.id === existing.id) : milestones.findIndex((m) => m.id === next.id);
  if (idx >= 0) milestones[idx] = next;
  else milestones.push(next);

  return {
    ...plan,
    milestones,
    net: { ...(plan.net || {}), ...frozenNet },
    compareMilestoneId: plan.compareMilestoneId && plan.compareMilestoneId !== EF_MILESTONE_ID
      ? plan.compareMilestoneId
      : next.id,
  };
}

export function isLivingGoal(raw) {
  return milestoneRole(raw) === "living";
}

/** Current emergency-fund amount. 0 is allowed and still keeps the milestone. */
export function emergencyCurrentHkd(plan) {
  if (plan?.net?.currentHkd != null && Number.isFinite(Number(plan.net.currentHkd))) {
    return Math.max(0, Math.round(Number(plan.net.currentHkd)));
  }
  if (plan?.moneyCapturedAtStabilize) return resolveMoney(plan.money || {}).savings;
  return 0;
}

export function newFortunePlan() {
  return {
    id: "fortune-local",
    privacyAccepted: false,
    theme: null,
    debtHeat: null,
    boardReached: false,
    phase2Unlocked: false,
    phase2Override: false,
    moneyCapturedAtStabilize: false,
    thinFloorWarned: false,
    stabilizeTargetMonths: 6,
    stabilizeMonthsPicked: false,
    fixMonths: 3,
    fixMonthsPicked: false,
    money: {
      incomeBand: "30_50",
      spendBand: "20_35",
      leftoverBand: "5_10",
      savingsBand: "50_150",
      debtsBand: "0",
    },
    milestones: [],
    net: { emergencyMonths: 6, floorHkd: 150000, currentHkd: null },
    templateId: "balanced",
    inflationOn: true,
    seed: 20260909,
    compareMilestoneId: null,
    screen: "start",
    schemaVersion: 2,
    cushionStartedAt: null,
    cushionBuiltAt: null,
    stage1: emptyStage1(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function emptyDraftGoal() {
  return { name: "", amount: "", months: 12 };
}

export function normalizeMilestone(raw, index = 0) {
  const role = milestoneRole(raw);
  const amount = Math.max(0, Math.round(Number(raw?.amount) || 0));
  const months = clampGoalMonths(raw?.months || 12);
  const out = {
    id: livingMilestoneId(raw, role, index),
    name: String(raw?.name || "Living goal").trim().slice(0, 80) || "Living goal",
    amount,
    months,
    stage: inferStage({ ...raw, amount, role }),
    role,
    boardOrder: Number.isFinite(Number(raw?.boardOrder)) ? Math.round(Number(raw.boardOrder)) : index,
  };
  if (raw?.source === RD_PRODUCT || raw?.source === "sunday" || raw?.source === "legacy") out.source = raw.source;
  if (raw?.pinned === true) out.pinned = true;
  if (typeof raw?.pinnedAt === "string" && raw.pinnedAt) out.pinnedAt = raw.pinnedAt;
  if (raw?.monthsKnown === true) out.monthsKnown = true;
  return out;
}

export function migrateFortunePlan(raw) {
  if (!raw) return raw;
  const base = newFortunePlan();
  const money = { ...base.money, ...(raw.money || {}) };
  if (raw.money && raw.money.leftoverBand == null && raw.money.leftoverMonthly == null) {
    delete money.leftoverBand;
  }
  Object.keys(BANDS).forEach((key) => {
    if (money[key] == null) {
      if (key === "leftoverBand") return;
      money[key] = base.money[key];
      return;
    }
    if (!BANDS[key].some((b) => b.id === money[key])) money[key] = base.money[key];
  });
  let milestones = Array.isArray(raw.milestones) ? raw.milestones.map(normalizeMilestone) : [];
  const net = raw.net || base.net;
  const theme = canonicalThemeId(raw.theme);
  milestones = restoreAndDedupeGrowthPots(milestones);
  if (theme === "rebuild" && !milestones.some((m) => m.stage === "invest" && milestoneRole(m) === "living")) {
    milestones.push(
      normalizeMilestone({ name: "First growth pot", amount: 25000, months: 36, stage: "invest" }, milestones.length),
    );
  }
  const legacyBoard =
    raw.boardReached === true ||
    raw.phase2Unlocked === true ||
    raw.phase2Override === true ||
    (raw.phase2Unlocked == null &&
      !!raw.privacyAccepted &&
      !!theme &&
      (milestones.length > 0 || raw.screen === "board"));
  const targetMonths = Number(raw.stabilizeTargetMonths) === 3 ? 3 : 6;
  const fixMonths = Number(raw.fixMonths) === 6 ? 6 : 3;
  const fixMonthsPicked = !!raw.fixMonthsPicked;
  milestones.forEach((m, i) => {
    if (milestoneRole(m) !== "fix") return;
    const months = Number(m.months) === 6 || fixMonths === 6 ? 6 : 3;
    const picked = fixMonthsPicked || !!m.monthsKnown;
    milestones[i] = { ...m, months, name: fixGoalLabel({ months, picked }) };
  });
  return {
    ...base,
    ...raw,
    money,
    milestones,
    debtHeat: ["none", "paying", "heavy", "fdw"].includes(raw.debtHeat) ? raw.debtHeat : null,
    boardReached: legacyBoard,
    phase2Unlocked: legacyBoard,
    phase2Override: !!raw.phase2Override,
    moneyCapturedAtStabilize: !!raw.moneyCapturedAtStabilize,
    thinFloorWarned: !!raw.thinFloorWarned,
    stabilizeTargetMonths: targetMonths,
    stabilizeMonthsPicked: !!raw.stabilizeMonthsPicked,
    fixMonths,
    fixMonthsPicked,
    net: {
      emergencyMonths: Math.max(0, Math.min(36, Math.round(Number(net.emergencyMonths) || 0))),
      floorHkd: Math.max(0, Math.round(Number(net.floorHkd) || 0)),
      currentHkd:
        net.currentHkd != null && Number.isFinite(Number(net.currentHkd))
          ? Math.max(0, Math.round(Number(net.currentHkd)))
          : null,
    },
    templateId: canonicalTemplateId(raw.templateId),
    inflationOn: raw.inflationOn !== false,
    seed: Number(raw.seed) || base.seed,
    theme,
    compareMilestoneId: raw.compareMilestoneId || milestones[0]?.id || null,
    schemaVersion: 2,
    cushionStartedAt: raw.cushionStartedAt ?? null,
    cushionBuiltAt: raw.cushionBuiltAt ?? null,
    stage1: stage1FromRaw(raw, milestones),
  };
}

const STAGE1_STATUSES = new Set(["none", "asked", "agreed", "declined"]);
const STAGE1_ROUTES = new Set(["bank", "no-bank-debt", "managing"]);
const STAGE1_SOURCES = new Set(["ft-rd-steps", "rd-export", "code", "legacy"]);
const DECLINE_ROUTES = new Set(["idrp", "hardship"]);

export function emptyStage1() {
  return {
    route: null,
    source: null,
    monthsAskedFor: null,
    tenorMonths: null,
    startMonth: null,
    done: false,
    doneAt: null,
    status: "none",
    agreedAt: null,
    declinedAt: null,
    declinedRoutes: [],
    importedAt: null,
    edited: false,
  };
}

export function normalizeStage1(raw) {
  const base = emptyStage1();
  if (!raw || typeof raw !== "object") return base;
  const status = STAGE1_STATUSES.has(raw.status) ? raw.status : "none";
  const route = STAGE1_ROUTES.has(raw.route) ? raw.route : null;
  const source = STAGE1_SOURCES.has(raw.source) ? raw.source : null;
  const declinedRoutes = Array.isArray(raw.declinedRoutes)
    ? [...new Set(raw.declinedRoutes.filter((item) => DECLINE_ROUTES.has(item)))]
    : [];
  return {
    ...base,
    route,
    source,
    monthsAskedFor: raw.monthsAskedFor == null ? null : Number(raw.monthsAskedFor),
    tenorMonths: raw.tenorMonths == null ? null : Number(raw.tenorMonths),
    startMonth: raw.startMonth || null,
    done: !!raw.done,
    doneAt: raw.doneAt || null,
    status,
    agreedAt: raw.agreedAt || null,
    declinedAt: raw.declinedAt || null,
    declinedRoutes,
    importedAt: raw.importedAt || null,
    edited: !!raw.edited,
  };
}

function stage1FromRaw(raw, milestones) {
  if (raw?.stage1 && typeof raw.stage1 === "object") return normalizeStage1(raw.stage1);
  const fix = (milestones || []).find((m) => m.role === "fix" || m.id === FIX_MILESTONE_ID);
  if (!fix) return emptyStage1();
  const fromLegacy =
    fix.id === FIX_MILESTONE_ID || fix.source === RD_PRODUCT || fix.source === "sunday" || fix.source === "legacy";
  if (!fromLegacy) return emptyStage1();
  const months = Number(fix.months) === 6 ? 6 : Number(fix.months) === 3 ? 3 : null;
  return normalizeStage1({
    route: "bank",
    source: "legacy",
    monthsAskedFor: months,
    tenorMonths: months,
    startMonth: null,
    done: false,
    status: "asked",
  });
}

/** Map tick. A decline does not tick stage 1. Cushion fields are not involved. */
export function stage1Ticked(plan) {
  const status = plan?.stage1?.status;
  return status === "asked" || status === "agreed";
}

/** Reserve N1. Does not reset cushionStartedAt or cushionBuiltAt. No UI in this step. */
export function declineStage1(plan, route, month) {
  const stage1 = normalizeStage1(plan?.stage1);
  const declinedRoutes = DECLINE_ROUTES.has(route) ? [...new Set([...stage1.declinedRoutes, route])] : stage1.declinedRoutes;
  return {
    ...plan,
    stage1: {
      ...stage1,
      status: "declined",
      declinedAt: month || null,
      declinedRoutes,
    },
  };
}

/** Asking again replaces the stage-1 dates and sets status back to asked. */
export function askStage1Again(plan, dates = {}) {
  const prev = normalizeStage1(plan?.stage1);
  return {
    ...plan,
    stage1: normalizeStage1({
      ...prev,
      monthsAskedFor: dates.monthsAskedFor ?? prev.monthsAskedFor,
      tenorMonths: dates.tenorMonths ?? prev.tenorMonths,
      startMonth: Object.prototype.hasOwnProperty.call(dates, "startMonth") ? dates.startMonth : prev.startMonth,
      done: Object.prototype.hasOwnProperty.call(dates, "done") ? !!dates.done : false,
      doneAt: Object.prototype.hasOwnProperty.call(dates, "doneAt") ? dates.doneAt : null,
      agreedAt: null,
      declinedAt: null,
      status: "asked",
      importedAt: Object.prototype.hasOwnProperty.call(dates, "importedAt") ? dates.importedAt : prev.importedAt,
      edited: Object.prototype.hasOwnProperty.call(dates, "edited") ? !!dates.edited : prev.edited,
    }),
  };
}

export function applyTheme(plan, themeId) {
  const theme = getTheme(themeId);
  if (!theme) return plan;
  const kept = (plan.milestones || [])
    .map((m, i) => normalizeMilestone(m, i))
    .filter((m) => m.role === "fix" || m.role === "floor");
  const seeded = theme.milestones.map((m, i) => normalizeMilestone({ ...m, id: newId(`t${i}`) }, kept.length + i));
  const milestones = [...kept, ...seeded];
  const keepFloor = !!plan.moneyCapturedAtStabilize;
  return {
    ...plan,
    theme: theme.id,
    money: keepFloor ? plan.money : { ...plan.money, ...theme.moneyBands },
    milestones,
    net: keepFloor ? { ...plan.net } : { ...theme.net, currentHkd: plan.net?.currentHkd ?? null },
    compareMilestoneId: milestones.find((m) => isLivingGoal(m))?.id || milestones[0]?.id || null,
  };
}

export function resolveMoney(money = {}) {
  const incomeMonthly = numberOrBand(money.incomeMonthly, INCOME_BANDS, money.incomeBand);
  const savings = numberOrBand(money.savings, SAVINGS_BANDS, money.savingsBand);
  const debts = numberOrBand(money.debts, DEBT_BANDS, money.debtsBand);
  const leftoverSet =
    (money.leftoverMonthly != null && Number.isFinite(Number(money.leftoverMonthly))) ||
    (money.leftoverBand && LEFTOVER_BANDS.some((b) => b.id === money.leftoverBand));
  let spendMonthly;
  let leftoverMonthly;
  if (leftoverSet) {
    leftoverMonthly = numberOrBand(money.leftoverMonthly, LEFTOVER_BANDS, money.leftoverBand);
    spendMonthly = Math.max(0, incomeMonthly - leftoverMonthly - approxDebtService(debts));
  } else {
    spendMonthly = numberOrBand(money.spendMonthly, SPEND_BANDS, money.spendBand);
    leftoverMonthly = Math.max(0, incomeMonthly - spendMonthly - approxDebtService(debts));
  }
  return { incomeMonthly, spendMonthly, savings, debts, leftoverMonthly };
}

function numberOrBand(numeric, list, bandId) {
  if (numeric != null && Number.isFinite(Number(numeric))) return Math.max(0, Number(numeric));
  return bandById(list, bandId).value;
}

export function toEnginePlan(plan) {
  const migrated = migrateFortunePlan(plan);
  const money = resolveMoney(migrated.money);
  money.savings = emergencyCurrentHkd(migrated);
  const fix = (migrated.milestones || []).find((m) => milestoneRole(m) === "fix");
  let fixMonths = 0;
  if (fix) fixMonths = Number(migrated.fixMonths) === 6 || Number(fix.months) === 6 ? 6 : 3;
  return {
    theme: migrated.theme,
    money,
    milestones: migrated.milestones.map((m, i) => ({ ...normalizeMilestone(m, i), role: milestoneRole(m) })),
    net: { ...migrated.net, currentHkd: emergencyCurrentHkd(migrated) },
    templateId: migrated.templateId,
    inflationOn: migrated.inflationOn,
    seed: migrated.seed,
    fixMonths,
  };
}

export function netNeedNow(plan) {
  const money = resolveMoney(plan.money);
  return Math.max(plan.net.floorHkd || 0, (plan.net.emergencyMonths || 0) * money.spendMonthly);
}

export function defaultUiState() {
  return {
    loginTeaseDismissed: true,
    crumbsShown: {},
  };
}

export function migrateUiState(raw) {
  const base = defaultUiState();
  if (!raw) return base;
  return {
    loginTeaseDismissed: raw.loginTeaseDismissed !== false,
    crumbsShown: raw.crumbsShown && typeof raw.crumbsShown === "object" ? { ...raw.crumbsShown } : {},
  };
}

export { THEMES, THEME_IDS, canonicalThemeId, getTheme, TEMPLATE_IDS, canonicalTemplateId, getTemplate };
