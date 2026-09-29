/**
 * Fortune will mount the shared Right Door steps with host "fortune".
 * Not wired into the live Fortune boot in this step (no behaviour change).
 * Only this module may import src/rd/steps from under src/fortune.
 */
import { stageLineHtml } from "../rd/steps/chrome.js";

export const FT_RD_HOST = "fortune";

export function fortuneStageLine(label) {
  return stageLineHtml(FT_RD_HOST, label);
}
