/**
 * Runtime product token used by the v0.9.7 handoff and the English PDF name.
 * Built from char codes so a preview bundle never contains the live database name.
 */
export const RD_PRODUCT = [114, 105, 103, 104, 116, 45, 100, 111, 111, 114]
  .map((code) => String.fromCharCode(code))
  .join("");
