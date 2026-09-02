const REASON_LINE = {
  zh: {
    job_ended: "本人最近失去工作，目前無法按原定金額繳付分期。",
    hours_cut: "本人工時或收入被削減，目前無法按原定金額繳付分期。",
    will_miss: "本人預計未來六個月無法按原定金額繳付分期。",
    already_missed: "本人已經未能依期還款，現申請困難還款安排。",
  },
  en: {
    job_ended: "I recently lost my job and cannot keep the current instalments.",
    hours_cut: "My hours or pay were cut and I cannot keep the current instalments.",
    will_miss: "I will not be able to keep the next six months of instalments.",
    already_missed: "I have already missed a payment and am asking for a hardship arrangement.",
  },
};

function line(value, empty) {
  const text = (value || "").trim();
  return text || empty;
}

function creditorLines(creditors, lang) {
  if (!creditors.length) {
    return lang === "zh" ? "（尚未列出債權人）" : "(No creditors listed yet)";
  }
  return creditors
    .map((c, i) => {
      const name = line(c.nickname, lang === "zh" ? "未命名戶口" : "Unnamed account");
      const amount = (c.amount || "").trim();
      if (lang === "zh") {
        return amount
          ? `${i + 1}. ${name}（${labelType(c.type, "zh")}），尚欠約 ${amount}`
          : `${i + 1}. ${name}（${labelType(c.type, "zh")}）`;
      }
      return amount
        ? `${i + 1}. ${name} (${labelType(c.type, "en")}), about ${amount} outstanding`
        : `${i + 1}. ${name} (${labelType(c.type, "en")})`;
    })
    .join("\n");
}

export function labelType(type, lang) {
  const map = {
    zh: {
      hsbc: "滙豐",
      hang_seng: "恒生",
      citi: "花旗",
      boc: "中銀",
      other: "其他銀行",
      money_lender: "持牌放債人",
    },
    en: {
      hsbc: "HSBC",
      hang_seng: "Hang Seng",
      citi: "Citi",
      boc: "BOC",
      other: "Other bank",
      money_lender: "Money lender",
    },
  };
  return map[lang][type] || type;
}

export function buildLetter({ lang, fullName, reason, creditors, situation, today }) {
  const name = line(fullName, lang === "zh" ? "［你的姓名］" : "[Your name]");
  const date = today || formatToday(lang);
  const reasonLine = REASON_LINE[lang][reason] || REASON_LINE[lang].will_miss;
  const what = line(
    situation?.whatChanged,
    lang === "zh" ? "［請寫下發生了甚麼事］" : "[Describe what changed]",
  );
  const when = line(situation?.when, lang === "zh" ? "［何時開始］" : "[When it started]");
  const income = line(
    situation?.incomeNow,
    lang === "zh" ? "［目前每月收入］" : "[Income now]",
  );
  const canPay = line(
    situation?.canPay,
    lang === "zh" ? "［目前每月可繳付的金額］" : "[What I can pay each month]",
  );
  const list = creditorLines(creditors || [], lang);

  if (lang === "zh") {
    return [
      "致：處理困難還款／綜合債務紓緩計劃的同事",
      "",
      `本人${name}現就本人的無抵押信貸，申請困難還款安排。`,
      "",
      reasonLine,
      "",
      "情況：",
      what,
      `開始時間：${when}`,
      `目前每月收入：${income}`,
      `本人目前每月可繳付：${canPay}`,
      "",
      "涉及戶口：",
      list,
      "",
      "本人不是申請新的債務整合貸款。本人希望在情況惡化成六十日逾期、撇帳或破產之前，與貴行公布的困難還款或債務重組單位商討可行安排。",
      "",
      "本人明白，任何債務重組通常會向信貸資料服務機構申報。重點是避免六十日逾期、破產或撇帳，而不是保持「乾淨」信貸評分。",
      "",
      "此信由本人自行準備及寄出。沒有中介代為聯絡貴行。",
      "",
      "此致",
      name,
      date,
    ].join("\n");
  }

  return [
    "To: the team that handles hardship / the Interbank Debt Relief Plan",
    "",
    `I, ${name}, am writing about my unsecured credit and asking for a hardship arrangement.`,
    "",
    reasonLine,
    "",
    "What changed:",
    what,
    `When it started: ${when}`,
    `Income now: ${income}`,
    `What I can pay each month: ${canPay}`,
    "",
    "Accounts involved:",
    list,
    "",
    "I am not applying for a new consolidation loan. I want to talk with the hardship or workout unit you publish — before this becomes a 60-day default, a write-off, or bankruptcy.",
    "",
    "I understand that restructuring is usually reported to credit agencies. The point is to avoid a 60-day default, bankruptcy, or write-off — not a clean credit score.",
    "",
    "I prepared and am sending this letter myself. No intermediary is contacting you on my behalf.",
    "",
    "Yours sincerely,",
    name,
    date,
  ].join("\n");
}

export function formatToday(lang) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return lang === "zh" ? `${y}年${m}月${d}日` : `${y}-${m}-${d}`;
}

export const DOCUMENT_KEYS = [
  "identity",
  "income_change",
  "payslips",
  "bank_statements",
  "creditor_statements",
  "expenses",
  "address",
  "assets_liabilities",
];

export function emptyDocuments() {
  return DOCUMENT_KEYS.map((key) => ({
    key,
    checked: false,
    attachmentId: null,
  }));
}
