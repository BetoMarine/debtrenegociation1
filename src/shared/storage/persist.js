let asked = false;

/** Once, after the first meaningful save. Never call this on open. Result is a hint. */
export function noteMeaningfulSave() {
  if (asked) return;
  asked = true;
  try {
    const storage = globalThis.navigator?.storage;
    const persist = globalThis.__PYL_PERSIST__ || storage?.persist;
    if (typeof persist !== "function") return;
    Promise.resolve(persist.call(storage)).catch(() => {});
  } catch {
    /* unsupported */
  }
}

export function resetPersistForTests() {
  asked = false;
}
