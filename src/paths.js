/** Public product URLs. Root stays Right Door; Sunday Pack lives at /sunday/. */
export function productHref(which) {
  const base = import.meta.env.BASE_URL || "/";
  return which === "sunday" ? `${base}sunday/` : base;
}

export const SUNDAY_HASH_PREFIX = "sunday-";
