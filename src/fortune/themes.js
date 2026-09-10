/** Three “where you are today” cards. Each seeds a floor + suggested living goals. */

export const THEME_IDS = ["rebuild", "steady", "grow"];

export const LEGACY_THEME_MAP = {
  young_family: "steady",
  empty_nest: "steady",
  peak_career: "grow",
  fresh_start: "rebuild",
};

export const THEMES = {
  rebuild: {
    id: "rebuild",
    label: "I need to rebuild",
    blurb: "Fix first. Then a floor.",
    hero: true,
    chips: ["Fix", "Floor", "Modest goals"],
    moneyBands: {
      incomeBand: "30_50",
      spendBand: "20_35",
      leftoverBand: "5_10",
      savingsBand: "lt50",
      debtsBand: "50_150",
    },
    milestones: [
      { name: "Replace a worn-out phone", amount: 4000, months: 8, stage: "plan" },
      { name: "Skills course", amount: 12000, months: 14, stage: "plan" },
      { name: "Small family visit", amount: 18000, months: 18, stage: "plan" },
    ],
    net: { emergencyMonths: 6, floorHkd: 120000 },
  },
  steady: {
    id: "steady",
    label: "I'm steady",
    blurb: "Hold the floor. Then plan.",
    chips: ["Floor", "Buffer", "Next goal"],
    moneyBands: {
      incomeBand: "50_80",
      spendBand: "20_35",
      leftoverBand: "10_20",
      savingsBand: "150_400",
      debtsBand: "50_150",
    },
    milestones: [
      { name: "Family trip", amount: 45000, months: 12, stage: "plan" },
      { name: "School deposit", amount: 80000, months: 18, stage: "plan" },
      { name: "New car", amount: 180000, months: 36, stage: "plan" },
    ],
    net: { emergencyMonths: 6, floorHkd: 150000 },
  },
  grow: {
    id: "grow",
    label: "I want to grow",
    blurb: "Pin a goal. Watch the path.",
    chips: ["A goal", "The path", "Chance it works"],
    moneyBands: {
      incomeBand: "80_120",
      spendBand: "35_50",
      leftoverBand: "20_40",
      savingsBand: "400_800",
      debtsBand: "150_400",
    },
    milestones: [],
    net: { emergencyMonths: 6, floorHkd: 250000 },
  },
};

export function canonicalThemeId(id) {
  if (THEME_IDS.includes(id)) return id;
  return LEGACY_THEME_MAP[id] || null;
}

export function getTheme(id) {
  const canonical = canonicalThemeId(id);
  return canonical ? THEMES[canonical] : null;
}
