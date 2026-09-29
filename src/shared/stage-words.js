/** Internal stage ids. Single export for the Fortune model and the journey board. */
export const JOURNEY_STAGES = ["fix", "stabilize", "plan", "invest"];

/**
 * User-facing stage words (EN). zh is pending native review and is not invented here.
 * This file is the only place these four phrases may appear.
 */
export const STAGE_WORDS = {
  en: {
    fix: "Get through this month",
    stabilize: "Build a cushion",
    plan: "Plan what's next",
    invest: "Help it grow",
  },
};

export function stageWord(lang, id) {
  const table = STAGE_WORDS[lang] || STAGE_WORDS.en;
  return table[id] || STAGE_WORDS.en[id] || "";
}
