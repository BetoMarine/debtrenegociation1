import { THEMES, THEME_IDS, getTheme } from "./themes.js";
import { TEMPLATE_IDS, getTemplate } from "./templates.js";

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

export function newFortunePlan() {
  return {
    id: "fortune-local",
    privacyAccepted: false,
    theme: null,
    debtHeat: null,
    phase2Unlocked: false,
    phase2Override: false,
    moneyCapturedAtStabilize: false,
    thinFloorWarned: false,
    stabilizeTargetMonths: 6,
    money: {
      incomeBand: "30_50",
      spendBand: "20_35",
      savingsBand: "50_150",
      debtsBand: "0",
    },
    milestones: [],
    net: { emergencyMonths: 6, floorHkd: 150000 },
    templateId: "balanced",
    inflationOn: true,
    seed: 20260909,
    compareMilestoneId: null,
    screen: "start",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function emptyDraftGoal() {
  return { name: "", amount: "", months: 12 };
}

export function normalizeMilestone(raw, index = 0) {
  const amount = Math.max(0, Math.round(Number(raw?.amount) || 0));
  const months = Math.max(1, Math.min(240, Math.round(Number(raw?.months) || 12)));
  return {
    id: raw?.id || newId(`g${index}`),
    name: String(raw?.name || "Living goal").trim().slice(0, 80) || "Living goal",
    amount,
    months,
  };
}

export function migrateFortunePlan(raw) {
  if (!raw) return raw;
  const base = newFortunePlan();
  const money = { ...base.money, ...(raw.money || {}) };
  Object.keys(BANDS).forEach((key) => {
    if (!BANDS[key].some((b) => b.id === money[key])) money[key] = base.money[key];
  });
  const milestones = Array.isArray(raw.milestones) ? raw.milestones.map(normalizeMilestone) : [];
  const net = raw.net || base.net;
  const legacyPhase2 =
    raw.phase2Unlocked == null &&
    !!raw.privacyAccepted &&
    THEME_IDS.includes(raw.theme) &&
    (milestones.length > 0 || raw.screen === "board");
  const targetMonths = Number(raw.stabilizeTargetMonths) === 3 ? 3 : 6;
  return {
    ...base,
    ...raw,
    money,
    milestones,
    debtHeat: ["none", "paying", "heavy", "fdw"].includes(raw.debtHeat) ? raw.debtHeat : null,
    phase2Unlocked: raw.phase2Unlocked === true || legacyPhase2,
    phase2Override: !!raw.phase2Override,
    moneyCapturedAtStabilize: !!raw.moneyCapturedAtStabilize,
    thinFloorWarned: !!raw.thinFloorWarned,
    stabilizeTargetMonths: targetMonths,
    net: {
      emergencyMonths: Math.max(0, Math.min(36, Math.round(Number(net.emergencyMonths) || 0))),
      floorHkd: Math.max(0, Math.round(Number(net.floorHkd) || 0)),
    },
    templateId: TEMPLATE_IDS.includes(raw.templateId) ? raw.templateId : "balanced",
    inflationOn: raw.inflationOn !== false,
    seed: Number(raw.seed) || base.seed,
    theme: THEME_IDS.includes(raw.theme) ? raw.theme : raw.theme || null,
    compareMilestoneId: raw.compareMilestoneId || milestones[0]?.id || null,
  };
}

export function applyTheme(plan, themeId) {
  const theme = getTheme(themeId);
  if (!theme) return plan;
  const milestones = theme.milestones.map((m, i) => normalizeMilestone({ ...m, id: newId(`t${i}`) }, i));
  const keepFloor = !!plan.moneyCapturedAtStabilize;
  return {
    ...plan,
    theme: theme.id,
    money: keepFloor ? plan.money : { ...plan.money, ...theme.moneyBands },
    milestones,
    net: keepFloor ? { ...plan.net } : { ...theme.net },
    compareMilestoneId: milestones[0]?.id || null,
  };
}

export function resolveMoney(money = {}) {
  return {
    incomeMonthly: numberOrBand(money.incomeMonthly, INCOME_BANDS, money.incomeBand),
    spendMonthly: numberOrBand(money.spendMonthly, SPEND_BANDS, money.spendBand),
    savings: numberOrBand(money.savings, SAVINGS_BANDS, money.savingsBand),
    debts: numberOrBand(money.debts, DEBT_BANDS, money.debtsBand),
  };
}

function numberOrBand(numeric, list, bandId) {
  if (numeric != null && Number.isFinite(Number(numeric))) return Math.max(0, Number(numeric));
  return bandById(list, bandId).value;
}

export function toEnginePlan(plan) {
  const migrated = migrateFortunePlan(plan);
  return {
    theme: migrated.theme,
    money: resolveMoney(migrated.money),
    milestones: migrated.milestones.map(normalizeMilestone),
    net: migrated.net,
    templateId: migrated.templateId,
    inflationOn: migrated.inflationOn,
    seed: migrated.seed,
  };
}

export function netNeedNow(plan) {
  const money = resolveMoney(plan.money);
  return Math.max(plan.net.floorHkd || 0, (plan.net.emergencyMonths || 0) * money.spendMonthly);
}

export function defaultUiState() {
  return {
    loginTeaseDismissed: false,
    crumbsShown: {},
  };
}

export function migrateUiState(raw) {
  const base = defaultUiState();
  if (!raw) return base;
  return {
    loginTeaseDismissed: !!raw.loginTeaseDismissed,
    crumbsShown: raw.crumbsShown && typeof raw.crumbsShown === "object" ? { ...raw.crumbsShown } : {},
  };
}

export { THEMES, THEME_IDS, getTheme, TEMPLATE_IDS, getTemplate };
