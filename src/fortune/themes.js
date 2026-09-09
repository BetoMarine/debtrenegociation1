/** Life themes seed suggested living milestones + a security net. User can edit freely. */

export const THEME_IDS = ["young_family", "peak_career", "empty_nest", "fresh_start"];

export const THEMES = {
  young_family: {
    id: "young_family",
    label: "Young family",
    blurb: "Kids, a first-home stretch, and a buffer that is still being built.",
    moneyBands: {
      incomeBand: "50_80",
      spendBand: "20_35",
      savingsBand: "150_400",
      debtsBand: "50_150",
    },
    milestones: [
      { name: "Family trip", amount: 45000, months: 12 },
      { name: "Daughter's school deposit", amount: 80000, months: 18 },
      { name: "New car", amount: 180000, months: 36 },
    ],
    net: { emergencyMonths: 6, floorHkd: 150000 },
  },
  peak_career: {
    id: "peak_career",
    label: "Peak career",
    blurb: "Earning power is high. The question is what you spend it on — and what you keep.",
    moneyBands: {
      incomeBand: "80_120",
      spendBand: "35_50",
      savingsBand: "400_800",
      debtsBand: "150_400",
    },
    milestones: [
      { name: "Wife's 50th", amount: 80000, months: 24 },
      { name: "New house down payment", amount: 1500000, months: 48 },
      { name: "Daughter's wedding", amount: 250000, months: 84 },
    ],
    net: { emergencyMonths: 9, floorHkd: 400000 },
  },
  empty_nest: {
    id: "empty_nest",
    label: "Empty nest",
    blurb: "The house is quieter. Living goals get more personal. The floor matters more.",
    moneyBands: {
      incomeBand: "30_50",
      spendBand: "20_35",
      savingsBand: "800_2m",
      debtsBand: "0",
    },
    milestones: [
      { name: "Long trip together", amount: 120000, months: 12 },
      { name: "Kitchen remodel", amount: 200000, months: 18 },
      { name: "Help with a grandchild", amount: 100000, months: 36 },
    ],
    net: { emergencyMonths: 12, floorHkd: 600000 },
  },
  fresh_start: {
    id: "fresh_start",
    label: "Fresh start",
    blurb: "Reset the board. Smaller living goals, a real emergency floor, room to grow.",
    moneyBands: {
      incomeBand: "15_30",
      spendBand: "10_20",
      savingsBand: "lt50",
      debtsBand: "50_150",
    },
    milestones: [
      { name: "Career course", amount: 30000, months: 6 },
      { name: "Emergency catch-up (extra)", amount: 50000, months: 8 },
      { name: "Move deposit", amount: 80000, months: 14 },
    ],
    net: { emergencyMonths: 4, floorHkd: 80000 },
  },
};

export function getTheme(id) {
  return THEMES[id] || null;
}
