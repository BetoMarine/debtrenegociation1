import {
  migrationAllowed,
  previewCacheDetails,
  previewCacheNames,
  resolveStorageNs,
  webPrefixFor,
  isPreviewNs,
} from "./ns-policy.js";

export function storageNs() {
  const override = globalThis.__PYL_STORAGE_NS__;
  if (typeof override === "string" && override) return override;
  return resolveStorageNs(import.meta.env?.VITE_STORAGE_NS);
}

export function webPrefix() {
  return webPrefixFor(storageNs());
}

export function deployMode() {
  return import.meta.env?.VITE_DEPLOY || "";
}

export function isPreviewDeploy() {
  return deployMode() === "preview" || isPreviewNs(storageNs());
}

export function shouldMigrateNamespaces() {
  return migrationAllowed({
    ns: storageNs(),
    deploy: deployMode(),
    mode: import.meta.env?.MODE,
    force: globalThis.__PYL_RUN_MIGRATION__ === true,
  });
}

export function workboxCacheDetails() {
  if (!isPreviewDeploy()) return null;
  return previewCacheDetails(storageNs());
}

export function ownCacheNames() {
  if (!isPreviewDeploy()) return null;
  return previewCacheNames(storageNs());
}

export { isPreviewNs, previewCacheNames, webPrefixFor };
