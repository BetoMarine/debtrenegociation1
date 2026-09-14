/**
 * Append-only house-mix rebalance log for later disclosure.
 * Shape only in 0.9.2 — no drift / % trigger evaluation.
 */

export function emptyRebalanceLog() {
  return [];
}

export function normalizeRebalanceEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const fromWeights = cloneWeights(raw.fromWeights);
  const toWeights = cloneWeights(raw.toWeights);
  if (!fromWeights || !toWeights) return null;
  return {
    at: Number.isFinite(Number(raw.at)) ? Number(raw.at) : Date.now(),
    reason: String(raw.reason || ""),
    fromWeights,
    toWeights,
  };
}

export function appendRebalanceLog(log, entry) {
  const next = Array.isArray(log) ? log.slice() : emptyRebalanceLog();
  const normalized = normalizeRebalanceEntry(entry);
  if (!normalized) return next;
  next.push(normalized);
  return next;
}

function cloneWeights(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    out[key] = n;
  }
  return out;
}
