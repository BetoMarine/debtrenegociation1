export const APP_VERSION = "PoC v0.8.1";

export const PDF_FOOTER_ORG =
  "Plan Your Life / Fortune Teller · illustrative model · not regulated advice · not a product sale";

export const PDF_FOOTER_LEGAL =
  "Execute this plan elsewhere with a licensed intermediary. Fortune Teller does not hold money, sell funds, or give regulated advice. Not affiliated with HSBC.";

const en = {
  brand: "Fortune Teller",
  pylStudio: "Plan Your Life",
  version: APP_VERSION,
  continue: "Continue",
  back: "Back",
  save: "Save on this phone",
  remove: "Delete this goal",
  cancel: "Cancel",
  add: "Add a goal",
  edit: "Edit",
  done: "Done",
  skip: "Skip",
  optional: "Optional",
  localOnly:
    "This plan stays on this phone. No account required. Uninstall wipes it. We do not upload your numbers.",
  footerCompact: "On this phone · not advice · not a sale. Not affiliated with HSBC.",
  otherToolsRight: "Right Door",
  otherToolsSunday: "Sunday Pack",
  otherToolsLabel: "Other tools from Plan Your Life",
  addHome: "Add to Home Screen",
  addHomeHow: "Safari → Share → Add to Home Screen. Then it works offline.",
  countersTitle: "On-device counters (no personal data)",
  countersHint: "Event names and times only. No goal names, amounts, or plan text.",
  eventLabels: {
    fortune_started: "Fortune Teller started",
    fortune_forecast_run: "Forecast run",
    fortune_pdf: "Implementation sheet created",
    fortune_export: "Plan exported",
  },

  startKicker: "Privacy",
  startTitle: "Stays on this phone.",
  startLead: "A sketch of today → a new life. Not advice.",
  startBullets: [
    "Plan stays here. No account.",
    "Not advice. Not a product we sell.",
    "You act elsewhere — we never contact a bank.",
  ],
  startCta: "Continue",
  resumeCta: "Open your plan",

  privacyTitle: "On this phone only",
  privacyBody: "Uninstall wipes it. We do not upload your numbers.",

  teaseText: "New portfolio valuations — log in to see impact",
  teaseDismiss: "Not now",
  teaseHint: "Stub only. There is no login in this build.",

  whereKicker: "Step 1 · Where you are today",
  whereTitle: "Where are you today?",
  whereLead: "Pick the card that fits. You can change it later.",
  themeHeroTag: "Start here",
  themes: {
    rebuild: {
      label: "I need to rebuild",
      blurb: "Fix first. Then a floor.",
    },
    steady: {
      label: "I'm steady",
      blurb: "Hold the floor. Then plan.",
    },
    grow: {
      label: "I want to grow",
      blurb: "Pin a goal. Watch the path.",
    },
  },

  nextKicker: "Step 2 · Correct actions",
  nextRebuildTitle: "Fix first.",
  nextRebuildLead: "If debt is on fire, open the right tool. Then set a floor.",
  nextSteadyTitle: "Hold the floor.",
  nextSteadyLead: "A light snapshot. Skip if you want the board now.",
  nextGrowTitle: "Add a goal.",
  nextGrowLead: "Pin one living goal on the path from today.",
  nextSeeLife: "See your new life",
  nextSkipBoard: "Skip to the board",

  moneyTitle: "Me now",
  moneyHint: "Four numbers. Bands are enough.",
  income: "Monthly income",
  leftover: "Left each month",
  savings: "Cash / savings",
  debts: "Debts still owed",
  spend: "Monthly spending",

  triageTitle: "Debt on fire?",
  debtHeat: {
    none: { label: "No debt heat", blurb: "" },
    paying: { label: "Paying on time", blurb: "" },
    heavy: { label: "Heavy or missing payments", blurb: "" },
    fdw: { label: "Helper debt stress", blurb: "" },
  },
  fireTitle: "Fix the fire first",
  fireLead: "Open the hardship tool, then come back.",
  fireLeadFdw: "Helper debt? Start with Sunday Pack.",
  fireRightDoor: "Open Right Door",
  fireSunday: "Open Sunday Pack",
  fireHint: "Links only. We do not email a bank or a lender.",

  floorLabel: "Your floor",
  stabilizeMonths3: "3 months",
  stabilizeMonths6: "6 months",
  backWhere: "Back to today",

  livingDial: "Living",
  netDial: "Security-net",
  livingHint: "Goals funded on time",
  netHint: "Floor still standing",
  dialsKicker: "Living and the net",

  verdicts: {
    wrecked: "Does not hold — yet.",
    stretched: "Both sides are under pressure.",
    living_heavy: "Living is ahead. The net is thin.",
    net_heavy: "The net is safer. Living is at risk.",
    shared: "This plan holds.",
  },
  wreckedDetail: "The floor and these goals cannot share the pot yet.",
  notSet: "A sketch of trade-offs — never “you're set.”",

  coachTitle: "Does not hold — yet.",
  coachTitleStretched: "Both sides are tight.",
  coachSub: "Try one move.",
  coachEmpty: "No income and no savings — this cannot hold yet.",
  coachKeepGoing: "Still does not hold. Keep going.",

  boardKicker: "Step 3 · Your new life",
  boardTitle: "Your new life",
  timelineTitle: "Today → future",
  timelineHint: "Each beat is a chance it works. Drag a living goal along the path.",
  youAreIn: "You're in {stage}.",
  pathPending: "Reading the path…",
  today: "Today",
  pathNow: "now",
  stageFix: "Fix",
  stageStabilize: "Stabilize",
  stagePlan: "Plan",
  stageInvest: "Invest",
  goalsTitle: "Your goals",
  goalsEmpty: "Add a living goal to pin on the path.",
  netTitle: "Security net",
  netSummary: "{months} months, or {floor} — need {need} today.",
  adjustCta: "Adjust",
  addGoalCta: "Add a goal",

  goalName: "Goal name",
  goalNamePh: "e.g. trip, course, wedding…",
  goalAmount: "HKD amount",
  goalWhen: "Target month",
  saveGoal: "Pin this goal",
  editGoal: "Edit goal",
  addGoalTitle: "Add a goal",

  netEditTitle: "Security net",
  netMonths: "Emergency months",
  netFloor: "Floor (HKD)",
  netHintEdit: "Months of spending to stand on, or a HKD floor.",
  saveNet: "Save the net",

  adjustTitle: "Adjust",
  adjustLead: "Mix, floor, and extras. Not on the main path.",
  templateTitle: "Portfolio mix",
  templatesHint: "Benchmarks only. Not a fund we sell.",
  inflationLabel: "Price rise (~4.5% a year)",
  shuffle: "Shuffle the paths",
  compareCta: "Save vs borrow one goal",
  sheetCta: "One-page sheet (PDF)",
  moreCta: "Export / clear",

  compareTitle: "Save vs borrow",
  compareHint: "Saving waits. Borrowing buys the day — the net pays interest.",
  comparePick: "Which goal?",
  compareSave: "Save for it",
  compareBorrow: "Borrow the gap",
  compareGap: "Typical gap if you wait",
  compareInterest: "Modelled interest (6.5% / 36 months)",
  compareLiving: "This goal funded",
  compareNet: "Security net still standing",
  borrowAprNote: "Assumed 6.5% a year, 36 months. Not a loan offer.",

  sheetTitle: "Implementation sheet",
  sheetLead: "Take this to a licensed intermediary. We do not execute or sell a product.",
  sheetShare: "Share PDF",
  sheetDownload: "Download PDF",
  sheetError: "Could not build the PDF on this phone.",
  shareFail: "Share sheet unavailable. The PDF downloaded instead.",

  moreTitle: "This plan on this phone",
  exportJson: "Export plan as JSON",
  exportHint: "Plan + last forecast. A file you choose where to put.",
  clear: "Clear this Fortune Teller plan",
  clearConfirm:
    "Erase the Fortune Teller plan and last forecast on this phone? Right Door and Sunday Pack are not touched. This cannot be undone.",
  compliance:
    "Illustrative model, not regulated advice, not a product sale. Execute elsewhere with a licensed intermediary. Plan Your Life / Fortune Teller. Not affiliated with HSBC.",

  crumbClose: "Got it",
  running: "Updating the path…",
  medianPot: "Median pot",
  pathsLine: "{n} paths · seed {seed}",
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
  return typeof cur === "string" || Array.isArray(cur) ? cur : null;
}
