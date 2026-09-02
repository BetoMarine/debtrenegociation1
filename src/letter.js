import { DOORS, HSBC_CONTACT, CITI_CONTACT, recommendDoor } from "./door.js";
import { attachedMarks } from "./docs.js";

const REASON_LINE = {
  zh: {
    job_ended: "僱傭關係最近結束，本人目前無法按原定金額繳付分期。",
    hours_cut: "本人工時或收入被削減，目前無法按原定金額繳付分期。",
    will_miss: "本人預計未來數月無法按原定金額繳付分期。",
    already_missed: "本人已經未能依期還款，現正式請求困難還款覆核。",
  },
  en: {
    job_ended: "My employment recently ended and I cannot keep the current instalments.",
    hours_cut: "My hours or pay were cut and I cannot keep the current instalments.",
    will_miss: "I will not be able to keep the coming months of instalments.",
    already_missed: "I have already missed a payment and I am making a formal request for hardship review.",
  },
};

function line(value, empty) {
  const text = (value || "").trim();
  return text || empty;
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

export function doorAddressee(door, lang) {
  if (door === DOORS.HSBC_WORKOUT) {
    return lang === "zh"
      ? [
          "滙豐銀行 債務重組部／Collection Services",
          `電郵：${HSBC_CONTACT.email}`,
          `電話：${HSBC_CONTACT.phone}（${HSBC_CONTACT.hours.zh}）`,
          HSBC_CONTACT.mailZh,
          "（見貴行公布：https://www.hsbc.com.hk/zh-hk/help/money-worries/）",
        ].join("\n")
      : [
          "HSBC Debt Workout Unit / Collection Services",
          `Email: ${HSBC_CONTACT.email}`,
          `Phone: ${HSBC_CONTACT.phone} (${HSBC_CONTACT.hours.en})`,
          HSBC_CONTACT.mailEn,
          "(As published: https://www.hsbc.com.hk/help/money-worries/)",
        ].join("\n");
  }
  if (door === DOORS.IDRP) {
    return lang === "zh"
      ? "綜合債務紓緩計劃（IDRP）經辦同事\n（本人將直接向其中一位債權人遞交，不經中介。）"
      : "The team that handles the Interbank Debt Relief Plan (IDRP)\n(I will send this to one creditor directly. No intermediary.)";
  }
  if (door === DOORS.CITI) {
    return lang === "zh"
      ? `花旗銀行（香港）處理困難還款／債務重組的同事\n${CITI_CONTACT.label} ${CITI_CONTACT.phone}\n（未見對等公開專頁。請勿轉介整合貸款。）`
      : `The colleagues at Citibank (Hong Kong) who handle hardship / debt restructuring\n${CITI_CONTACT.label} ${CITI_CONTACT.phone}\n(No equivalent public hardship page found. Not a consolidation-loan request.)`;
  }
  return lang === "zh"
    ? "月結單或貸款合約上公布的困難還款／綜合債務紓緩計劃單位\n（不是分行客戶經理。）"
    : "The hardship / Interbank Debt Relief Plan unit on my statement or loan contract\n(Not the branch relationship manager.)";
}

function accountRefs(creditors, lang) {
  if (!creditors?.length) return lang === "zh" ? "（尚未列出戶口）" : "(No accounts listed)";
  return creditors
    .map((c, i) => {
      const name = line(c.nickname, lang === "zh" ? "未命名戶口" : "Unnamed account");
      const ref = (c.ref || "").trim();
      const amount = (c.amount || "").trim();
      const type = labelType(c.type, lang);
      const bits = [name, type];
      if (ref) bits.push(lang === "zh" ? `編號 ${ref}` : `ref. ${ref}`);
      if (amount) bits.push(lang === "zh" ? `尚欠約 ${amount}` : `about ${amount} outstanding`);
      return `${i + 1}. ${bits.join(" · ")}`;
    })
    .join("\n");
}

function money(value, empty) {
  return line(value, empty);
}

export function formatToday(lang) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return lang === "zh" ? `${y}年${m}月${d}日` : `${y}-${m}-${d}`;
}

export function letterContext(pack, lang) {
  const sit = pack?.situation || {};
  return {
    lang,
    fullName: pack?.fullName || "",
    hkid: pack?.hkid || "",
    phone: pack?.phone || "",
    reason: pack?.reason,
    creditors: pack?.creditors || [],
    situation: sit,
    door: pack?.door || recommendDoor(pack?.creditors || []),
    documents: pack?.documents || [],
    today: formatToday(lang),
  };
}

export function buildLetter(ctx) {
  const lang = ctx.lang === "en" ? "en" : "zh";
  const name = line(ctx.fullName, lang === "zh" ? "［姓名］" : "[Name]");
  const hkid = line(ctx.hkid, lang === "zh" ? "［香港身分證號碼］" : "[HKID]");
  const phone = line(ctx.phone, lang === "zh" ? "［電話］" : "[Phone]");
  const date = ctx.today || formatToday(lang);
  const sit = ctx.situation || {};
  const reasonLine = REASON_LINE[lang][ctx.reason] || REASON_LINE[lang].will_miss;
  const what = line(sit.whatChanged, lang === "zh" ? "［發生了甚麼事］" : "[What changed]");
  const when = line(sit.when, lang === "zh" ? "［何時開始］" : "[When it started]");
  const incomeItems = line(
    sit.incomeItems,
    lang === "zh" ? "［收入項目］" : "[Income items]",
  );
  const incomeAmount = money(sit.incomeAmount || sit.incomeNow, lang === "zh" ? "［每月收入］" : "[Monthly income]");
  const expenseItems = line(
    sit.expenseItems,
    lang === "zh" ? "［必要開支］" : "[Essential expenses]",
  );
  const expenseAmount = money(sit.expenseAmount, lang === "zh" ? "［每月必要開支］" : "[Monthly essential expenses]");
  const surplus = money(sit.surplus || sit.canPay, lang === "zh" ? "［可供還款盈餘］" : "[Surplus for repayment]");
  const tenor = String(sit.tenorMonths || "6");
  const freeze = !!sit.askInterestFreeze;
  const door = ctx.door || recommendDoor(ctx.creditors || []);
  const marks = attachedMarks(ctx.documents);
  const markLine = (key, zh, en) => {
    const row = marks.find((m) => m.key === key);
    const tick = row?.attached ? "X" : " ";
    const extra = row?.have ? (lang === "zh" ? `（${row.have}張）` : ` (${row.have} file${row.have > 1 ? "s" : ""})`) : "";
    return `[${tick}] ${lang === "zh" ? zh : en}${extra}`;
  };

  if (lang === "zh") {
    const pause =
      door === DOORS.IDRP
        ? "在牽頭債權人按綜合債務紓緩計劃框架獲委任後，按該計劃公布的三十日協調期處理；在覆核期間暫停逾期費用及追收行動。"
        : "在貴行覆核此檔期間，暫停逾期費用及追收行動。此請求並非援引綜合債務紓緩計劃的三十日協調期。";
    const freezeLine = freeze
      ? "本人另外請求，在重組期內考慮凍結或暫停計算利息。此項為額外請求，不是本案的前提。"
      : "本人此次並未請求凍結利息或零利率。";
    return [
      "CONFIDENTIAL　機密",
      "",
      "正式請求：財務困難覆核",
      `日期：${date}`,
      "",
      "致：",
      doorAddressee(door, "zh"),
      "",
      "借款人",
      `姓名：${name}`,
      `香港身分證號碼：${hkid}`,
      `電話：${phone}`,
      "戶口：",
      accountRefs(ctx.creditors || [], "zh"),
      "",
      "1. 困難陳述",
      `本人${name}現以第一人稱、自行準備並將自行寄出此信，就本人的無抵押信貸，正式請求財務困難覆核。沒有中介代為聯絡。`,
      reasonLine,
      `事實：${what}`,
      `開始時間：${when}`,
      "本人在情況惡化成六十日逾期、撇帳或破產之前，本著善意聯絡貴行公布的困難還款途徑。本人不是申請新的債務整合貸款。",
      "本人援引金管局認可的《銀行營運守則》第24.16段：客戶如有還款困難，應通知認可機構；機構亦應告知客戶債務重組服務。",
      "本人明白債務重組通常會向信貸資料服務機構申報。重點是避免六十日逾期、破產或撇帳，而不是保持「乾淨」信貸評分。",
      "",
      "2. 每月收入與開支（自行申報，未經審計）",
      "以下數字由本人自行申報，未經審計，亦未經任何第三方核實。",
      `收入項目：${incomeItems}`,
      `每月收入：${incomeAmount}`,
      `必要開支：${expenseItems}`,
      `每月必要開支：${expenseAmount}`,
      `可供還款盈餘：${surplus}`,
      "",
      "3. 建議安排",
      `（a）${pause}`,
      `（b）按本人申報的盈餘，重組每月還款為 ${surplus}，為期 ${tenor} 個月。`,
      freezeLine,
      "",
      "4. 隨附文件",
      markLine("hardship_proof", "困難證明（解僱信、減薪／減工時信或同類文件）", ""),
      markLine("bank_statements", "近三個月銀行月結單", ""),
      markLine("identity", "香港身分證副本（可選）", ""),
      markLine("other", "其他（可選）", ""),
      "",
      "請將此信交予債務重組／困難還款同事處理，並在十四個工作天內以書面回覆。",
      "",
      "此致",
      name,
      "（打字署名。此信由本人自行寄出，並非經核證的電子簽署。）",
    ].join("\n");
  }

  const pause =
    door === DOORS.IDRP
      ? "After a lead creditor is appointed under the published Interbank Debt Relief Plan framework, apply the 30-day coordination period that framework describes; and pause late fees and collections while this file is reviewed."
      : "While you review this file, pause late fees and collections. This is not a request to apply the IDRP 30-day standstill.";
  const freezeLine = freeze
    ? "Separately, I ask you to consider freezing or suspending interest during the restructure. That is an extra request, not a condition of this file."
    : "I am not asking for an interest freeze or a 0% rate in this request.";

  return [
    "CONFIDENTIAL",
    "",
    "Formal request: financial hardship review",
    `Date: ${date}`,
    "",
    "TO:",
    doorAddressee(door, "en"),
    "",
    "Borrower",
    `Name: ${name}`,
    `HKID: ${hkid}`,
    `Phone: ${phone}`,
    "Accounts:",
    accountRefs(ctx.creditors || [], "en"),
    "",
    "1. Statement of hardship",
    `I, ${name}, prepared this letter myself and will send it myself. This is a first-person request for a financial hardship review of my unsecured credit. No intermediary is contacting you.`,
    reasonLine,
    `Facts: ${what}`,
    `When it started: ${when}`,
    "I am contacting the hardship path you publish, in good faith, before this becomes a 60-day default, a write-off, or bankruptcy. I am not applying for a new consolidation loan.",
    "I refer to paragraph 24.16 of the Code of Banking Practice (endorsed by the HKMA): institutions should be told of repayment difficulty, and should inform customers of debt restructuring services.",
    "I understand that restructuring is usually reported to credit agencies. The point is to avoid a 60-day default, bankruptcy, or write-off — not a clean credit score.",
    "",
    "2. Monthly income and expenditure (self-declared; not audited)",
    "The figures below are self-declared by me. They are not audited and have not been verified by a third party.",
    `Income items: ${incomeItems}`,
    `Monthly income: ${incomeAmount}`,
    `Essential expenses: ${expenseItems}`,
    `Monthly essential expenses: ${expenseAmount}`,
    `Surplus available for repayment: ${surplus}`,
    "",
    "3. Proposed terms",
    `(a) ${pause}`,
    `(b) Restructure the monthly instalment to ${surplus} — my declared surplus — for ${tenor} months.`,
    freezeLine,
    "",
    "4. Attached documents",
    markLine("hardship_proof", "", "Hardship proof (termination, pay-cut letter, or similar)"),
    markLine("bank_statements", "", "Bank statements for the last three months"),
    markLine("identity", "", "HKID copy (optional)"),
    markLine("other", "", "Other (optional)"),
    "",
    "Please route this to the debt workout / hardship team and reply in writing within 14 business days.",
    "",
    "Yours sincerely,",
    name,
    "(Typed name. I am sending this myself. This is not a certified electronic signature.)",
  ].join("\n");
}
