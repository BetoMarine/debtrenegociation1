/** Build-time namespace policy. No live database name in this file. */

export const DEV_STORAGE_NS = "pyl-dev";

export function assertBuildStorageNs({ command, storageNs } = {}) {
  if (command === "build" && !String(storageNs || "").trim()) {
    throw new Error("VITE_STORAGE_NS is required for vite build");
  }
}

export function resolveStorageNs(envValue) {
  const value = String(envValue || "").trim();
  return value || DEV_STORAGE_NS;
}

export function isPreviewNs(ns) {
  return String(ns || "").startsWith("pyl-preview-");
}

/** Main keeps the historical web prefix. Previews and dev are namespaced. */
export function webPrefixFor(ns) {
  const name = String(ns || "");
  if (isPreviewNs(name) || name === DEV_STORAGE_NS) return `${name}:`;
  return "pyl:";
}

export function previewCacheDetails(ns) {
  return { prefix: String(ns), precache: "pc", runtime: "rt", suffix: "v1" };
}

export function previewCacheNames(ns) {
  const prefix = String(ns);
  return {
    ownPrefix: `${prefix}-`,
    precache: `${prefix}-pc-v1`,
    runtime: `${prefix}-rt-v1`,
  };
}

export function migrationAllowed({ ns, deploy, mode, force } = {}) {
  if (deploy === "preview") return false;
  if (isPreviewNs(ns)) return false;
  if (ns === DEV_STORAGE_NS && mode === "test" && !force) return false;
  if (ns === DEV_STORAGE_NS && !force) return false;
  return true;
}
