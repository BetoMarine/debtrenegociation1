import { escapeHtml } from "../../dom.js";
import { stageWord } from "../../shared/stage-words.js";

/** Fortune host only. Standalone returns an empty string so the markup stays as it is today. */
export function stageLineHtml(host, label) {
  if (host !== "fortune" || !label) return "";
  return `<p class="stage-line" data-stage-line>${escapeHtml(label)}</p>`;
}

export function stageLabel(ctx) {
  if (ctx?.stageWord) return ctx.stageWord;
  return stageWord("en", ctx?.stageId || "fix");
}
