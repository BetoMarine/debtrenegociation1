import { recommendSundayDoor, normalizeFlags, hasCrisisFlags } from "./door.js";

export const LOAN_TYPES = [
  "hk_money_lender",
  "hk_bank",
  "loan_agency",
  "ph_id_loan",
  "friend_family",
  "employer_advance",
  "unknown",
];

export const BALANCE_BANDS = ["lt_1k", "1_5k", "6_10k", "11_20k", "21_25k", "gt_25k"];
export const MONTHLY_BANDS = ["lt_1k", "1_5k", "6_10k", "11_20k", "21_25k", "gt_25k"];
export const GUARANTOR = ["no", "friend_helper", "family", "other"];
export const STILL_BORROWING = ["no", "trying_to_stop", "yes"];
export const NATIONALITIES = ["filipino", "indonesian", "other"];
export const WHO_KNOWS = ["friend", "family", "employer", "nobody", "other"];
export const GOALS = ["stop_borrowing", "payoff_plan", "remittance_vs_bills", "rights", "other"];
export const SUNDAY_LANGS = ["tl", "id", "en"];

export function newSundayPack(lang) {
  return {
    id: "sunday-local",
    lang: SUNDAY_LANGS.includes(lang) ? lang : "en",
    privacyAccepted: false,
    flags: [],
    noneOfAbove: false,
    nationality: null,
    monthsLeft: "",
    whoKnows: null,
    goals: [],
    loans: [],
    split: { bills: "", allowance: "", keep: "" },
    splitNote: "",
    door: null,
    screen: "sunday-privacy",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function migrateSundayPack(raw, lang) {
  if (!raw) return raw;
  const split = raw.split || {};
  return {
    ...newSundayPack(lang || raw.lang),
    ...raw,
    flags: normalizeFlags(raw.flags),
    noneOfAbove: !!raw.noneOfAbove && normalizeFlags(raw.flags).length === 0,
    goals: Array.isArray(raw.goals) ? raw.goals.filter((g) => GOALS.includes(g)) : [],
    loans: Array.isArray(raw.loans) ? raw.loans.map(normalizeLoan) : [],
    split: {
      bills: split.bills ?? "",
      allowance: split.allowance ?? "",
      keep: split.keep ?? "",
    },
    splitNote: raw.splitNote || "",
    door: raw.door || recommendSundayDoor(raw.flags),
  };
}

export function normalizeLoan(loan) {
  return {
    id: loan?.id || "loan",
    nickname: String(loan?.nickname || "").slice(0, 60),
    type: LOAN_TYPES.includes(loan?.type) ? loan.type : "unknown",
    balanceBand: BALANCE_BANDS.includes(loan?.balanceBand) ? loan.balanceBand : "lt_1k",
    monthlyBand: MONTHLY_BANDS.includes(loan?.monthlyBand) ? loan.monthlyBand : "lt_1k",
    guarantor: GUARANTOR.includes(loan?.guarantor) ? loan.guarantor : "no",
    stillBorrowing: STILL_BORROWING.includes(loan?.stillBorrowing) ? loan.stillBorrowing : "no",
  };
}

export function parsePct(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n);
}

export function splitTotal(split) {
  const bills = parsePct(split?.bills);
  const allowance = parsePct(split?.allowance);
  const keep = parsePct(split?.keep);
  if (bills == null || allowance == null || keep == null) return null;
  return bills + allowance + keep;
}

export function splitIsValid(split) {
  return splitTotal(split) === 100;
}

export function hasGuarantor(loans) {
  return (loans || []).some((loan) => loan.guarantor && loan.guarantor !== "no");
}

export function canGeneratePdf(pack) {
  if (!pack?.privacyAccepted) return false;
  if (hasCrisisFlags(pack.flags)) return true;
  return Array.isArray(pack.loans) && pack.loans.length >= 1;
}

export function triageComplete(pack) {
  return hasCrisisFlags(pack?.flags) || !!pack?.noneOfAbove;
}

export function goalLine(pack, labelFn) {
  const goals = pack?.goals || [];
  if (!goals.length) return labelFn("goals.unspecified");
  return goals.map((g) => labelFn(`goals.${g}`)).join(" · ");
}

export function languagePreferenceLabel(lang, labelFn) {
  if (lang === "tl") return labelFn("langNames.tl");
  if (lang === "id") return labelFn("langNames.id");
  return labelFn("langNames.en");
}

export function contractLeftLabel(monthsLeft, labelFn) {
  const raw = String(monthsLeft || "").trim();
  if (!raw) return labelFn("meta.contractUnknown");
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return raw;
  return labelFn("meta.contractMonths", { n: String(Math.round(n)) });
}

export function emptyDraftLoan() {
  return {
    nickname: "",
    type: "hk_money_lender",
    balanceBand: "lt_1k",
    monthlyBand: "lt_1k",
    guarantor: "no",
    stillBorrowing: "no",
  };
}
