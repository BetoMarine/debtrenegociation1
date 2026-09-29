export const KV = {
  rdPack: "rd:pack",
  rdLang: "rd:lang",
  rdExport: "rd:export",
  ftPlan: "ft:plan",
  ftForecast: "ft:forecast",
  ftUi: "ft:ui",
  ftRdPack: "ft:rdPack",
  ftRdLang: "ft:rdLang",
  ftErasedAt: "ft:erasedAt",
  ftHandoff: "ft:handoff",
  sunPack: "sun:pack",
  sunLang: "sun:lang",
  metaNs: "meta:nsMigration",
};

export const LEGACY_KV = {
  pack: "pack",
  lang: "lang",
  sundayPack: "sundayPack",
  sundayLang: "sundayLang",
  fortunePlan: "fortunePlan",
  fortuneForecast: "fortuneForecast",
  fortuneUi: "fortuneUi",
  fortuneFireHandoff: "fortuneFireHandoff",
};

export const ATT = {
  rd: "rd:att:",
  ft: "ft:att:",
  sun: "sun:att:",
};

export const RD_EVENT_TYPES = [
  "assessment_started",
  "assessment_done",
  "pack_created",
  "door_chosen",
  "share_tapped",
  "status_tapped",
];

export const FT_EVENT_PREFIX = "fortune_";
export const SUN_EVENT_PREFIX = "sunday_";
export const SHARED_EVENT = "app_open";

export function monthStamp(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function attKey(prefix, id) {
  const raw = String(id || "");
  if (raw.startsWith(prefix)) return raw;
  return `${prefix}${raw}`;
}
