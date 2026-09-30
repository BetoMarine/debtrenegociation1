/**
 * Fortune v3 screen copy (map, bring-in, cushion, plan, grow, erase).
 * Stage names are composed at render time from stage-words.js.
 * 01 answers are the Design frame strings. HOLD pending Beto — do not invent replacements.
 * New zh is unreviewed. Map and these screens stay English in this preview.
 */

export const V3_ZH_REVIEW = "unreviewed";

export const V3_EN = {
  brand: "Fortune Teller",
  coverLead: "Stays on this phone.",
  coverHint: "Exit keeps your answers on this phone.",
  continue: "Continue",
  back: "Back",
  backAria: "Back",
  backPath: "Back to your path",
  exit: "Exit",
  exitZh: "離開",
  exitAria: "Quick exit",
  langAria: "中文 (Chinese)",
  yourPath: "Your path",
  oneStep: "One step at a time.",
  youAreHere: "You are here",
  inProgress: "In progress",
  lockedGrow: "Opens when your cushion is built",
  doneMark: "Done",
  startStage: "Start: {stage}",
  continueStage: "Continue: {stage}",
  noBankRevealed: "No bank plan needed",
  askedFor: "Asked for: {range}",
  agreed: "Agreed: {range}",
  cushionRange: "Cushion: {start} → about {end}",
  cushionBuilt: "Cushion: built {month}",
  changeDates: "Change dates",
  theySaidNo: "They said no",
  fromRightDoor: "from Right Door, {date}",
  bringAgain: "Bring in again",
  bringAgainBody: "Bring in again replaces these dates. Your edits here will be replaced.",
  markAgreed: "Mark agreed",
  transitionMonth: "This month has a plan. Next: a small cushion so it doesn't happen again.",
  transitionImport: "Your bank plan is in. Next: a small cushion so it doesn't happen again.",
  transitionCushion: "Your cushion is on its way. Next: plan what you want after this.",
  transitionPinned: "Your goal is pinned. The next stage opens once your cushion is built.",
  transitionBuilt: "Your cushion is built.",
  somethingChanged: "Something changed?",
  updateSavings: "Update savings",
  savingsLabel: "Savings on this phone (HK$)",
  s01Title: "Struggling to pay, or about to?",
  s01Body: "Stays on this phone. Not advice.",
  s01Bank: "Yes, bank cards or loans",
  s01NotBank: "Yes, but not a bank",
  s01Managing: "No, I'm managing",
  cushionTitle: "How big a cushion?",
  cushionInfo: "Money set aside so one hard month does not wipe you out.",
  cushion3: "3 months of spending",
  cushion6: "6 months of spending",
  why: "Why?",
  planTitle: "What do you want next?",
  goalPlace: "A place of my own",
  goalSkills: "A skills course",
  goalFamily: "A family visit",
  goalOwn: "My own goal",
  amountLabel: "Amount (HK$)",
  pin: "Pin this goal",
  delay: "Delay 12 months for better odds",
  chance: "{n}% chance",
  chanceInfo: "An example on this preview. Not a promise.",
  growInfo: "A date only. No comparison with cash.",
  cardsTitle: "Example mixes",
  cardsLead: "You pick. This app does not assign one.",
  badYear: "A bad year can lose about {n}%.",
  perYear: "{n}% a year",
  firmNote: "Mostly bonds and cash. Still not a deposit. Not a fund we sell.",
  balancedNote: "A mix of bonds and shares. Not a fund we sell.",
  growthNote: "More shares than bonds. Not a fund we sell.",
  frontierNote: "This mix can fall hard in a bad year. Not a fund we sell.",
  useMix: "Use this mix",
  mixesQuiet: "See example mixes",
  datesTitle: "Change dates",
  startMonth: "Start month",
  saveDates: "Save on this phone",
  a2: {
    title: "We found a Right Door plan on this phone. Bring it in?",
    bring: "Bring it in",
    fresh: "Start fresh",
    used: "Used Right Door already?",
    codeTitle: "Enter the 6-character code",
    codeLength: "That code is 6 letters and numbers. Check and try again.",
    codeCheck: "That code doesn't look right. Check each letter.",
    codeVersion: "Update this app, then try again.",
  },
  erase: {
    link: "Erase everything",
    title: "Erase everything in Fortune Teller on this phone?",
    body: "Your other Plan Your Life apps keep what they saved. This can't be undone.",
    confirm: "Erase everything",
    stay: "Keep it",
  },
  e1: {
    title: "Fortune Teller erased from this phone.",
    body: "Right Door keeps its own copy. To erase it too, open Right Door and use Erase there.",
    ok: "OK",
  },
  leaving: {
    title: "This opens another site.",
    body: "You are leaving this app.",
    go: "Continue",
    stay: "Stay",
  },
  letterTitle: "Letter (edit every word)",
  needName: "Add your name so the letter can be in your name.",
};

export function v3(key, vars) {
  const parts = String(key).split(".");
  let cur = V3_EN;
  for (const part of parts) cur = cur?.[part];
  if (typeof cur !== "string") return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
}
