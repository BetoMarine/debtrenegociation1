/** Shared Fix-milestone handoff. Created by Right Door / Sunday Pack; Fortune receives it. */

export const FIX_MILESTONE_ID = "fix-renegotiate";
export const EF_MILESTONE_ID = "ef-floor";
export const INVEST_PLACEHOLDER_ID = "invest-placeholder";

export const FIX_GOAL_NAME = "Debt renegotiation";
export const EF_GOAL_NAME = "Emergency fund";
export const INVEST_PLACEHOLDER_NAME = "Suggested mix (after floor) — not a product";

/** True once Right Door actually captured a situation tenor (not the new-pack default). */
export function packStoredTenor(pack) {
  const sit = pack?.situation;
  if (!sit) return false;
  if (sit.tenorStored === true) return true;
  return Boolean(String(pack?.fullName || "").trim());
}

/** RD tenor is 3/6/9/12. Fortune Fix only offers 3 or 6. Missing/default tenor stays null so Fortune can pick once. */
export function packImpliedFixMonths(pack) {
  if (!packStoredTenor(pack)) return null;
  const n = Number(pack?.situation?.tenorMonths);
  if (n === 3) return 3;
  if (n === 6 || n === 9 || n === 12) return 6;
  return null;
}

export function makeFireHandoff({ source, months } = {}) {
  const src = source === "sunday" ? "sunday" : "right-door";
  const known = months === 3 || months === 6 ? months : null;
  return {
    source: src,
    name: FIX_GOAL_NAME,
    months: known,
    createdAt: Date.now(),
  };
}

export function isFireHandoff(raw) {
  if (!raw || typeof raw !== "object") return false;
  return raw.source === "right-door" || raw.source === "sunday";
}
