export const DOORS = {
  IDRP: "idrp",
  HSBC_WORKOUT: "hsbc_workout",
  CITI: "citi",
  OTHER: "other",
};

const BANK_TYPES = new Set(["hsbc", "hang_seng", "citi", "boc", "other", "money_lender"]);

export function isBankType(type) {
  return BANK_TYPES.has(type);
}

/**
 * Deterministic door. Multiple unsecured creditors → IDRP.
 * Single HSBC → published Debt Workout Unit / Collection Services path.
 * Single Citi → CitiPhone + script. Everyone else → statement number.
 */
export function recommendDoor(creditors) {
  const list = Array.isArray(creditors) ? creditors.filter((c) => c && isBankType(c.type)) : [];
  if (list.length >= 2) return DOORS.IDRP;
  if (list.length === 1) {
    if (list[0].type === "hsbc") return DOORS.HSBC_WORKOUT;
    if (list[0].type === "citi") return DOORS.CITI;
  }
  return DOORS.OTHER;
}

export const VERIFIED_URLS = {
  hkmaCreditEn: "https://www.hkma.gov.hk/eng/smart-consumers/personal-credit/",
  hkmaCreditZh: "https://www.hkma.gov.hk/chi/smart-consumers/personal-credit/",
  hkmaGuideEn:
    "https://www.hkma.gov.hk/media/eng/doc/smart-consumers/Attachment_Consumer_Guide_(EN)_2020.pdf",
  hkmaGuideZh:
    "https://www.hkma.gov.hk/media/chi/doc/smart-consumers/Attachment_Consumer_Guide_(CH)_2020.pdf",
  hsbcEn: "https://www.hsbc.com.hk/help/money-worries/",
  hsbcZh: "https://www.hsbc.com.hk/zh-hk/help/money-worries/",
  citiPhone: "https://www.citibank.com.hk/english/personal-banking/services/phone-banking/",
};

export const HSBC_CONTACT = {
  phone: "+852 2269 2444",
  hours: { zh: "星期一至五 09:00–17:30", en: "Mon–Fri 9:00–17:30" },
  email: "cruu@hsbc.com.hk",
  mailEn:
    "HSBC Collection Services, 5/F, Tower 2 & 3, HSBC Centre, 1 Sham Mong Road, Kowloon",
  mailZh: "香港九龍深旺道1號滙豐中心2及3座5樓 滙豐銀行債務重組部／Collection Services",
};

export const CITI_CONTACT = {
  phone: "2860 0333",
  label: "CitiPhone",
};
