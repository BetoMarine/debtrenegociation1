import { renderDoor } from "./door-step.js";
import { renderDocuments, renderPack } from "./documents-step.js";
import { renderCreditors, renderReason, renderSituation } from "./script-step.js";

export { KEYS_USED as DOOR_KEYS } from "./door-step.js";
export { KEYS_USED as DOCUMENT_KEYS } from "./documents-step.js";
export { KEYS_USED as SCRIPT_KEYS } from "./script-step.js";

const STEPS = {
  reason: renderReason,
  creditors: renderCreditors,
  situation: renderSituation,
  door: renderDoor,
  documents: renderDocuments,
  pack: renderPack,
};

export function renderRdStep(name, ctx) {
  const render = STEPS[name];
  if (!render) throw new Error(`unknown_rd_step:${name}`);
  return render(ctx);
}

export { renderDoor, renderDocuments, renderPack, renderCreditors, renderReason, renderSituation };
