export const APP_VERSION = "PoC v0.7.0";

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

  startKicker: "Plan Your Life",
  startTitle: "Fix. Floor. Then goals.",
  startLead: "Don't assume the pot is healthy. Fix first, then plan.",
  startTip: "Fix the fire → build the floor → then living goals. Not a retirement clock. Not “you're set.”",
  startBody:
    "Not a retirement countdown. Not a product we sell. Phase 1 is the floor. Phase 2 is Living % and Net %. Illustrative only.",
  startNever:
    "Not regulated advice. Not affiliated with HSBC. Execute any real portfolio elsewhere with a licensed intermediary.",
  startCta: "Start with “I need to rebuild”",
  resumeCta: "Open your plan",

  privacyTitle: "Stays on this phone.",
  privacyBody:
    "Plan and forecast stay in IndexedDB here. No account. No live market feed. Uninstall wipes it.",

  teaseText: "New portfolio valuations — log in to see impact",
  teaseDismiss: "Not now",
  teaseHint: "Stub only. There is no login in this build.",

  themeTitle: "Your chapter",
  themeHint: "Pick one. You can rewrite every goal later.",
  themeHeroTag: "Start here",
  themes: {
    rebuild: {
      label: "I need to rebuild",
      blurb: "Fix the fire, then a floor, then modest goals.",
    },
    young_family: { label: "Young family", blurb: "Kids, a first home, a buffer." },
    peak_career: {
      label: "Peak career",
      blurb: "High earn. What you keep vs spend.",
    },
    empty_nest: {
      label: "Empty nest",
      blurb: "Quieter house. Stronger floor.",
    },
    fresh_start: {
      label: "Fresh start",
      blurb: "Reset. Smaller goals, a real floor.",
    },
  },

  moneyTitle: "Money now — in bands",
  moneyHint: "Bands are enough for a PoC. The model uses the mid-point of each band. Stored on this phone only.",
  income: "Monthly income",
  spend: "Monthly spending",
  savings: "Savings / cash now",
  debts: "Debts still owed",

  triageTitle: "Any fire?",
  triageHint: "Heavy debt first — then a floor. Links only. We never write to a bank for you.",
  debtHeat: {
    none: { label: "No debt heat", blurb: "Build the floor." },
    paying: { label: "Paying on time", blurb: "Keep paying. Floor first." },
    heavy: {
      label: "Heavy debt or missing payments",
      blurb: "Fire first. Right Door writes the hardship letter.",
    },
    fdw: { label: "FDW / helper debt stress", blurb: "Sunday Pack — you bring the briefing." },
  },
  fireTitle: "Fix the fire first",
  fireLead: "A living-vs-net board will not save a plan on fire. Open the hardship tool, then come back.",
  fireLeadFdw: "Helper debt? Start with Sunday Pack. Right Door if the bank letter is the better door.",
  fireRightDoor: "Open Right Door",
  fireSunday: "Open Sunday Pack",
  fireContinue: "I've stabilized — continue to the floor",
  fireHint: "Links only. We do not email a bank, Enrich, or a lender.",

  stabilizeKicker: "Phase 1 · the floor",
  stabilizeTitle: "Build the floor first.",
  stabilizeLead: "Emergency months before living goals. Not a retirement clock. Not “you're set.”",
  stabilizeMonths: "Months of spending to stand on",
  stabilizeMonths3: "3 months",
  stabilizeMonths6: "6 months",
  stabilizeFloor: "HKD floor (optional extra)",
  surplusLabel: "Monthly surplus (income − spend − debt service)",
  surplusHint: "Debt service is a simple 3% of the balance (5% if heat is heavy). Sketch only.",
  reachDate: "At this surplus, a {n}-month fund looks reachable around {when}.",
  reachReady: "The floor is standing today. Phase 2 can open.",
  reachStuck: "The floor is not moving — cut spend, raise income, or fix debt first.",
  reachNeed: "Need {need} on the floor. Cash now {cash}.",
  boneTitle: "Meat on the bone",
  boneNow: "Funded today: about {n} months of spending",
  boneMark: "{n} mo",
  phase2Cta: "Start real planning (Phase 2)",
  phase2Blocked: "Need the floor at your {n}-month / HKD target first. This is not a green light yet.",
  phase2Anyway: "Plan anyway — I accept a thin floor",
  phase2Warn:
    "A thin floor means living goals and the net will fight. This is not “you're set.” Continue only if you know the pot is still building.",
  phase2WarnGo: "I accept a thin floor — continue",
  backTriage: "Back to debt heat",
  backFloor: "Back to the floor",
  backTheme: "Back to life theme",
  phaseTag: "Phase 2 · living vs net",

  livingDial: "Living",
  netDial: "Net",
  livingHint: "Share of living milestones funded by their date",
  netHint: "Share of paths that still hold the security net",
  dialsKicker: "Two dials. Always.",

  verdicts: {
    wrecked: "This plan does not hold — yet.",
    stretched: "Both sides are under pressure.",
    living_heavy: "Living is ahead. The net is thin.",
    net_heavy: "The net is safer. Living goals are at risk.",
    shared: "Living and the net can share the pot.",
  },
  wreckedDetail:
    "The model cannot fund these living goals and still keep a floor. Not a green light — here is a way to rebuild.",
  notSet: "This is never a “you're set” score. It is a sketch of trade-offs.",

  coachTitle: "This plan does not hold — yet.",
  coachTitleStretched: "Both sides are under pressure — here is a rebuild.",
  coachSub: "Here's what to change so Living and the net can share the pot.",
  coachBreaking: "What's breaking",
  coachEmpty:
    "Delaying a HK$15M-scale goal will not save a plan with no income and no savings. Add money-now bands first.",
  coachKeepGoing: "Still wrecked. Keep rebuilding — this is not a dead end.",


  boardTitle: "Your board",
  timelineTitle: "Goals on the path",
  timelineHint: "Drag a pin. % is that goal’s success. Watch both dials.",
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
