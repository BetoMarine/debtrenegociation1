/** A2 found-state. Pure. No URL, no pack record, no network. */

export function monthOf(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Found state only when an export exists and its month is after ft:erasedAt.
 * Same month stays on the manual tap. No export → nothing to find.
 */
export function a2FoundState({ rdExport, erasedAt } = {}) {
  if (!rdExport || typeof rdExport !== "object") {
    return { found: false, manualCanFind: false, path: "nothing" };
  }
  const exported = monthOf(rdExport.exportedAt);
  const erased = monthOf(erasedAt);
  if (!erased || (exported && exported > erased)) {
    return { found: true, manualCanFind: true, path: "found" };
  }
  return { found: false, manualCanFind: true, path: "manual" };
}
