/**
 * Deterministic Sunday Pack door. Crisis flags beat Enrich.
 * We only suggest a door and deep-link; we never message anyone.
 */
export const SUNDAY_DOORS = {
  PASSPORT: "passport",
  SHARK: "shark",
  AGENCY: "agency",
  ENRICH: "enrich",
};

export const TRIAGE_FLAGS = ["passport", "shark", "agency"];

export function normalizeFlags(flags) {
  const set = new Set(Array.isArray(flags) ? flags : []);
  return TRIAGE_FLAGS.filter((flag) => set.has(flag));
}

export function hasCrisisFlags(flags) {
  return normalizeFlags(flags).length > 0;
}

/**
 * Priority: passport/coercion → shark/threats → illegal agency fee → Enrich.
 */
export function recommendSundayDoor(flags) {
  const list = normalizeFlags(flags);
  if (list.includes("passport")) return SUNDAY_DOORS.PASSPORT;
  if (list.includes("shark")) return SUNDAY_DOORS.SHARK;
  if (list.includes("agency")) return SUNDAY_DOORS.AGENCY;
  return SUNDAY_DOORS.ENRICH;
}

export function consulateFor(nationality) {
  if (nationality === "filipino") return "ph";
  if (nationality === "indonesian") return "id";
  return "both";
}
