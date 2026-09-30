import { webPrefix } from "./ns.js";

function prefixed(key) {
  return `${webPrefix()}${key}`;
}

function canUse(storage) {
  if (!storage) return false;
  try {
    const probe = "__pyl_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function session() {
  try {
    return canUse(globalThis.sessionStorage) ? globalThis.sessionStorage : null;
  } catch {
    return null;
  }
}

function local() {
  try {
    return canUse(globalThis.localStorage) ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

export function sessionGet(key) {
  try {
    return session()?.getItem(prefixed(key)) ?? null;
  } catch {
    return null;
  }
}

export function sessionSet(key, value) {
  try {
    session()?.setItem(prefixed(key), String(value));
  } catch {
    /* private mode */
  }
}

export function sessionRemove(key) {
  try {
    session()?.removeItem(prefixed(key));
  } catch {
    /* private mode */
  }
}

export function localGet(key) {
  try {
    return local()?.getItem(prefixed(key)) ?? null;
  } catch {
    return null;
  }
}

export function localSet(key, value) {
  try {
    local()?.setItem(prefixed(key), String(value));
  } catch {
    /* private mode */
  }
}

export function localRemove(key) {
  try {
    local()?.removeItem(prefixed(key));
  } catch {
    /* private mode */
  }
}

/** Default session handle. Logical keys are prefixed; callers never clear storage. */
export function prefixedSessionStore() {
  return {
    getItem: (key) => sessionGet(key),
    setItem: (key, value) => sessionSet(key, value),
    removeItem: (key) => sessionRemove(key),
  };
}
