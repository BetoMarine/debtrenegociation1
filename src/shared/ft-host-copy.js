/**
 * Fortune-host wording for Right Door steps. Standalone keeps the base strings in i18n.js.
 * zh lines are unreviewed (live blocker, not a preview blocker). C3 REVISED lines may have no zh yet.
 * 01 answer wording is NOT here — it stays on the Design frame until Beto answers the HOLD.
 */

export const FT_ZH_REVIEW = "unreviewed";

export const HKMA_DEBT_URL = "https://www.hkma.gov.hk/eng/smart-consumers/personal-credit/";

export const FT_HOST_EN = {
  reasonTitle: "Why are you here?",
  reasonHint: "Pick one. Do not write us a story — nothing leaves this phone.",
  "reasons.job_ended": "The job ended",
  "reasons.hours_cut": "Hours or pay were cut",
  "reasons.will_miss": "I will miss the next payments",
  "reasons.already_missed": "I already missed a payment",
  creditorsTitle: "How many lenders do you owe?",
  creditorsHint: "Count banks and licensed money lenders.",
  creditorsInfo:
    "Count each lender once, cards and loans together. Family, friends and unlicensed lenders don't count here.",
  lenderOne: "1",
  lenderMany: "2 or more",
  situationTitle: "Your situation",
  situationHint: "You can edit every word before the PDF.",
  fullName: "Your name (goes in the letter)",
  tenor: "How many months to ask for?",
  creditShort: "This usually shows on your credit report.",
  creditInfo:
    "Restructuring is usually reported to credit agencies. The win is avoiding a 60-day default, bankruptcy, or write-off — not a clean score.",
  seeLetter: "See and edit the letter",
  doorTitle: "Ask your bank for this",
  doorIdrpTitle: "Interbank Debt Relief Plan (IDRP)",
  doorIdrpBody: "Banks rarely advertise it. Ask by name. Big licensed money lenders take part too. Ask if yours does.",
  doorIdrpInfo:
    "IDRP is one plan agreed with all your lenders together. It's for people who owe two or more banks or big licensed money lenders, on loans and cards with no collateral. It has no fees or charges. Your bank should tell you about it if you owe more than one lender.",
  hkmaLink: "HKMA: dealing with debt problems",
  doorOtherTitle: "The hardship number on your statement",
  doorOtherBody: "Call it. Ask for hardship help, not the branch.",
  doorIdrpSay:
    "I cannot keep the current repayments. I do not want a consolidation loan. Please put me through to the team that handles hardship or the Interbank Debt Relief Plan. I have a letter and a document list ready to email or post.",
  doorOtherSay:
    "I cannot keep the current repayments. Please put me through to the hardship number on my statement. Not the branch. I am not applying for a new loan. I have a letter ready to email or post.",
  showScript: "Show me what to say",
  sayTitle: "What to say",
  youSend: "You send it. We never contact your bank.",
  nextDocuments: "Next: your documents",
  docsTitle: "Your documents",
  docsHint: "Photos stay on this phone.",
  docsInfo: "This phone cannot check that three statements are three different months. Please add three images.",
  "docs.hardship_proof": "Proof of what changed (for example job loss, pay cut or medical bills). 1 photo.",
  "docs.bank_statements": "Bank statements (last 3 months, 3 photos)",
  "docs.identity": "HKID copy (optional)",
  "docs.other": "Other (optional)",
  nextLetter: "Next: your letter",
  docsReasonBoth: "Add 1 proof photo and 3 statement photos to continue.",
  letterReadyTitle: "Your letter is ready",
  letterReadyBody: "Built on this phone. You send it. We never contact your bank.",
  sharePdf: "Share PDF",
  complianceLender: "Not affiliated with any bank or lender.",
  accountPlaceholder: "[Your accounts: card or loan, last 4 digits]",
  collectorLine: "Already passed to a debt collector? Talk to Caritas first: 3161 0102",
  caritas: "Talk to a social worker about money worries, 24 hours: Caritas 3161 0102",
  notAffiliated: "Not affiliated.",
  n1Title: "Your lender said no. Here's another way.",
  backPath: "Back to your path",
  continue: "Continue",
  addPhoto: "Add photo",
};

/** Draft zh where we have a line. Missing keys stay English in the preview. */
export const FT_HOST_ZH = {
  caritas: "財困壓力輔導專線（24小時社工接聽）：明愛 3161 0102",
  collectorLine: "已經轉交收數公司？先打給明愛：3161 0102",
  notAffiliated: "沒有關聯。",
  continue: "繼續",
  backPath: "回到你的路徑",
};

export function applyVars(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
}

/** Fortune screens use the host table only, never a live string that names a bank. */
export function hostCopy(lang, key, vars) {
  if (lang === "zh" && typeof FT_HOST_ZH[key] === "string") return applyVars(FT_HOST_ZH[key], vars);
  const en = FT_HOST_EN[key];
  return typeof en === "string" ? applyVars(en, vars) : key;
}
