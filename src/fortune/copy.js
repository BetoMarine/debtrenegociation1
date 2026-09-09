export const APP_VERSION = "PoC v0.4.0";

export const PDF_FOOTER_ORG =
  "Plan Your Life / Fortune Teller · illustrative model · not regulated advice · not a product sale";

export const PDF_FOOTER_LEGAL =
  "Execute this plan elsewhere with a licensed intermediary. Fortune Teller does not hold money, sell funds, or give regulated advice. Not affiliated with HSBC.";

const en = {
  brand: "Fortune Teller",
  version: APP_VERSION,
  continue: "Continue",
  back: "Back",
  save: "Save on this phone",
  remove: "Delete this goal",
  cancel: "Cancel",
  add: "Add a living goal",
  edit: "Edit",
  done: "Done",
  optional: "Optional",
  localOnly:
    "This plan stays on this phone. No account required. Uninstall wipes it. We do not upload your numbers.",
  otherToolsRight: "Right Door",
  otherToolsSunday: "Sunday Pack",
  otherToolsLabel: "Other tools from Plan Your Life",
  addHome: "Add to Home Screen",
  addHomeHow:
    "iPhone: open this Fortune Teller page in Safari → Share → Add to Home Screen. After the first load it works offline.",
  countersTitle: "On-device counters (no personal data)",
  countersHint: "Event names and times only. No goal names, amounts, or plan text.",
  eventLabels: {
    fortune_started: "Fortune Teller started",
    fortune_forecast_run: "Forecast run",
    fortune_pdf: "Implementation sheet created",
    fortune_export: "Plan exported",
  },

  startKicker: "Plan Your Life · living vs a security net",
  startTitle: "Living goals vs a security net.",
  startLead:
    "See whether the wedding, the 50th, the car, the house — and a floor you can stand on — can share the same pot.",
  startBody:
    "This is not a retirement countdown and not a product we sell. Two dials, always: Living % and Net %. An owned Monte Carlo model runs on this phone. Illustrative only.",
  startNever:
    "Not regulated advice. Not affiliated with HSBC. Execute any real portfolio elsewhere with a licensed intermediary.",
  startCta: "Pick a life theme",
  resumeCta: "Open your plan",

  privacyTitle: "The plan stays on this phone.",
  privacyBody:
    "Milestones, bands, and the last forecast are stored in IndexedDB on this device. We do not create an account. There is no live market feed in this PoC. Uninstalling wipes the plan.",

  teaseText: "New portfolio valuations — log in to see impact",
  teaseDismiss: "Not now",
  teaseHint: "Stub only. There is no login in this build.",

  themeTitle: "Where are you in life?",
  themeHint: "A theme seeds suggested living goals and a security net. You can rewrite every line.",
  themes: {
    young_family: { label: "Young family", blurb: "Kids, a first-home stretch, and a buffer still being built." },
    peak_career: {
      label: "Peak career",
      blurb: "Earning power is high. What you spend it on — and what you keep — is the question.",
    },
    empty_nest: {
      label: "Empty nest",
      blurb: "The house is quieter. Living goals get more personal. The floor matters more.",
    },
    fresh_start: {
      label: "Fresh start",
      blurb: "Reset the board. Smaller living goals, a real emergency floor, room to grow.",
    },
  },

  moneyTitle: "Money now — in bands",
  moneyHint: "Bands are enough for a PoC. The model uses the mid-point of each band. Stored on this phone only.",
  income: "Monthly income",
  spend: "Monthly spending",
  savings: "Savings / cash now",
  debts: "Debts still owed",

  livingDial: "Living",
  netDial: "Net",
  livingHint: "Share of living milestones funded by their date",
  netHint: "Share of paths that still hold the security net",
  dialsKicker: "Two dials. Always.",

  verdicts: {
    wrecked: "This plan does not hold.",
    stretched: "Both sides are under pressure.",
    living_heavy: "Living is ahead. The net is thin.",
    net_heavy: "The net is safer. Living goals are at risk.",
    shared: "Living and the net can share the pot.",
  },
  wreckedDetail:
    "The model cannot fund these living goals and still keep a floor. This is a hard fail — not a green light.",
  notSet: "This is never a “you're set” score. It is a sketch of trade-offs.",

  boardTitle: "Your board",
  timelineTitle: "Drag living goals earlier or later",
  timelineHint: "Slide a chip. The model re-runs. Watch both dials.",
  goalsTitle: "Living milestones",
  goalsEmpty: "Add a wedding, a 50th, a car, a house, or a custom micro-goal.",
  netTitle: "Security net",
  netLead: "Emergency months and a future floor — not years to retirement.",
  netSummary: "{months} months of spending, or at least {floor} — whichever is higher ({need} today).",
  templateTitle: "Portfolio template",
  templateDisclaimer: "Illustrative, not a fund we sell.",
  inflationLabel: "Simple inflation shock (~2.5% a year)",
  shuffle: "Shuffle the random paths",
  compareCta: "Save vs borrow one goal",
  sheetCta: "Implementation sheet (PDF)",
  moreCta: "Export / clear",

  goalName: "Goal name",
  goalNamePh: "e.g. Daughter's wedding, new car, custom…",
  goalAmount: "HKD amount",
  goalWhen: "Target month",
  goalYear: "Year",
  saveGoal: "Save this goal",
  editGoal: "Edit living goal",
  addGoalTitle: "Add a living goal",

  netEditTitle: "Security net",
  netMonths: "Emergency months",
  netFloor: "Future floor (HKD)",
  netHintEdit:
    "Plain language: how many months of spending you want standing, and a minimum HKD floor if spending is low.",
  saveNet: "Save the net",

  templatesHint: "Benchmarks with assumed μ / σ. Not advice. Not a fund we sell.",
  cashCompare: "Same plan in a cash-like mix",
  cashCompareHint: "Cash barely compounds. The template you picked does — in the model only.",

  compareTitle: "Save vs borrow",
  compareHint: "Pick one living goal. Saving waits for the pot. Borrowing buys the day and the net pays interest.",
  comparePick: "Which goal?",
  compareSave: "Save for it",
  compareBorrow: "Borrow the gap",
  compareGap: "Typical gap if you wait to save",
  compareInterest: "Modelled interest if you borrow the gap (6.5% / 36 months)",
  compareLiving: "This goal funded",
  compareNet: "Security net still standing",
  borrowAprNote: "Assumed 6.5% a year, 36 months. Illustrative. Not a loan offer.",

  sheetTitle: "Implementation sheet",
  sheetLead:
    "One page you can take to a licensed intermediary. We do not execute, hold money, or sell a product.",
  sheetShare: "Share PDF",
  sheetDownload: "Download PDF",
  sheetError: "Could not build the PDF on this phone.",
  shareFail: "Share sheet unavailable. The PDF downloaded instead.",

  moreTitle: "This plan on this phone",
  exportJson: "Export plan as JSON",
  exportHint: "Plan + last forecast. Stays a file you choose where to put.",
  clear: "Clear this Fortune Teller plan",
  clearConfirm:
    "Erase the Fortune Teller plan and last forecast on this phone? Right Door and Sunday Pack are not touched. This cannot be undone.",
  compliance:
    "Illustrative model, not regulated advice, not a product sale. Execute elsewhere with a licensed intermediary. Plan Your Life / Fortune Teller. Not affiliated with HSBC.",

  crumbClose: "Got it",
  running: "Re-running the model…",
  medianPot: "Median pot at the horizon",
  pathsLine: "{n} paths · monthly steps · seed {seed}",
};

export const FORTUNE_STRINGS = { en };

export function ft(key, vars) {
  const text = lookup(en, key) ?? key;
  if (!vars || typeof text !== "string") return text;
  return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
}

function lookup(table, key) {
  let cur = table;
  for (const part of key.split(".")) {
    cur = cur?.[part];
  }
  return typeof cur === "string" ? cur : null;
}
