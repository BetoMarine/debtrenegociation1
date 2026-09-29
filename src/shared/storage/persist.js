let asked = false;

/** Once, after the first meaningful save. Never call this on open. Result is a hint. */
export function noteMeaningfulSave() {
  if (asked) return;
  asked = true;
  try {
    const persist = globalThis.__PYL_PERSIST__ || globalThis.navigator?.storage?.persist;
    if (typeof persist !== "function") return;
    Promise.resolve(persist.call(globalThis.navigator.storage)).catch(() => {});
  } catch {
    /* unsupported */
  }
}

export function resetPersistForTests() {
  asked = false;
}
