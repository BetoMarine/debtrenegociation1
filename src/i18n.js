import { CITI_CONTACT, HSBC_CONTACT, VERIFIED_URLS } from "./door.js";

const zh = {
  appName: "正確的門",
  appNameEn: "Right Door",
  langToggle: "English",
  continue: "繼續",
  back: "返回",
  save: "儲存在這部手機",
  done: "完成",
  optional: "可選",
  version: "PoC v0.2.0",
  localOnly:
    "我們不收集資料。信件包、照片、身分證號碼和金額只留在這部手機。沒有帳號。卸除就清走。我們不會寄給銀行。",

  promiseKicker: "免費 · 只在這部手機 · 你自己寄出",
  promiseTitle: "你的客戶經理不是正確的門。",
  promiseLead: "在這裏準備信件。由你自己寄出。",
  privacyTitle: "全部留在這部手機。我們不收集資料。",
  privacyBody:
    "信件包、照片、香港身分證號碼、金額，都不會離開這部手機——除非你自己用系統分享或寄出。我們不上傳、不代存、不收集。沒有帳號。卸除網頁或 App，資料就沒有了。",
  promiseBody:
    "銀行公布的門，是困難還款單位，或者銀行公會的綜合債務紓緩計劃（IDRP）。不是分行客戶經理，也不是代你打電話的中介。",
  promiseNever:
    "我們不會聯絡銀行、放債人、警察或任何機構。每一步都由你用自己的名字去做。",
  start: "開始準備",
  resume: "繼續未完成的信件",
  openPack: "打開你的信件包",
  addHome: "加到主畫面",
  addHomeHow:
    "iPhone：用 Safari 打開 → 點分享 →「加到主畫面」。加了之後可離線使用。第一次載入後不需要網絡。",
  notFor:
    "這一版只給未撇帳、在銀行有戶口的香港借款人：失業、減工時，或已知道未來六個月供不起。外傭、護照、只向持牌放債人借貸的情況，這一版不做。",
  creditHonesty:
    "債務重組通常會向信貸資料服務機構申報。這一刻要保住的，是避免六十日逾期、破產或撇帳，不是「乾淨」評分。",
  wipe: "清除這部手機上的全部資料",
  wipeConfirm: "確定清除？卸除一樣會清走。此動作不能還原。",

  chooserKicker: "免費 · 只在這部手機 · 你自己帶走",
  chooserTitle: "揀一條路。資料留在這部手機。",
  chooserLead: "兩個工具都在你的 Safari 裏準備。我們不代你發電郵、WhatsApp 或打電話。",
  chooserPrivacy: "信件包和 Sunday Pack 都只存在這部手機。沒有帳號。卸除就清走。",
  chooserRdTitle: "正確的門 · 銀行困難還款",
  chooserRdBody: "給在銀行有戶口、未撇帳的香港借款人。在手機寫困難還款／綜合債務紓緩計劃信件，由你自己寄出。",
  chooserRdStart: "開始銀行信件包",
  chooserSpTitle: "Sunday Pack · 外傭輔導準備",
  chooserSpBody: "給在港外傭。在手機做分流、債務清單和匯款比例，產生一頁輔導簡報。你自己帶去。我們不會代你通知 Enrich。",
  chooserSpStart: "開始 Sunday Pack",
  chooserSpResume: "繼續 Sunday Pack",
  chooserChangePack: "返回選擇",
  chooserWipeSunday: "只清除 Sunday Pack",

  reasonTitle: "你為甚麼在這裏？",
  reasonHint: "選一項。不用寫故事給我們——資料不會離開這部手機。",
  reasons: {
    job_ended: "工作完了",
    hours_cut: "工時或收入被減",
    will_miss: "我供不起接下來的分期",
    already_missed: "我已經遲了還一期待",
  },

  creditorsTitle: "債權人",
  creditorsHint:
    "加一個暱稱即可，例如「滙豐卡」。金額可留空。全部只存在這部手機。",
  nickname: "暱稱",
  nicknamePh: "例如：滙豐卡、恒生私人貸款",
  accountRef: "戶口編號（可選）",
  accountRefPh: "例如：後四位 1234",
  type: "類型",
  amount: "尚欠（可選）",
  amountPh: "例如：HK$80,000",
  addCreditor: "加入",
  noCreditors: "尚未加入任何戶口。",
  needCreditor: "至少加入一個戶口，才能建議正確的門。",
  remove: "移除",
  types: {
    hsbc: "滙豐 HSBC",
    hang_seng: "恒生 Hang Seng",
    citi: "花旗 Citi",
    boc: "中銀 BOC",
    other: "其他銀行",
    money_lender: "持牌放債人（這一版非主要對象）",
  },

  situationTitle: "現況",
  situationHint: "用下面幾欄。信件是第一人稱、銀行檔語氣。寄出前你可以改每一個字。數字屬自行申報，未經審計。",
  fullName: "你的姓名（寫進信件）",
  fullNamePh: "例如：陳大文",
  hkid: "香港身分證號碼",
  hkidPh: "例如：A123456(7)",
  phone: "電話",
  phonePh: "例如：9123 4567",
  whatChanged: "發生了甚麼事",
  whatChangedPh: "例如：公司裁員，上月底最後工作日。",
  when: "何時開始",
  whenPh: "例如：2026年8月",
  incomeItems: "收入項目（自行申報）",
  incomeItemsPh: "例如：現無薪金；兼職散工",
  incomeAmount: "每月收入",
  incomeAmountPh: "例如：HK$0 或 HK$8,000",
  expenseItems: "必要開支項目（自行申報）",
  expenseItemsPh: "例如：租金、膳食、交通",
  expenseAmount: "每月必要開支",
  expenseAmountPh: "例如：HK$12,000",
  surplus: "可供還款盈餘（每月）",
  surplusPh: "例如：HK$2,000",
  tenor: "建議重組期",
  tenorMonths: {
    "3": "3 個月",
    "6": "6 個月（預設）",
    "9": "9 個月",
    "12": "12 個月",
  },
  askInterestFreeze: "另外請求考慮凍結利息（可選，預設關閉；不是零利率承諾）",
  letterTitle: "信件（可改每一個字）",
  regenerate: "用上面欄位重新產生",
  letterEdited: "你已改過正文。再產生會覆蓋你的修改。",

  doorTitle: "正確的門",
  doorIdrpTitle: "綜合債務紓緩計劃（IDRP）",
  doorIdrpBody:
    "你有多於一位無抵押債權人。公布的做法是直接聯絡其中一位債權人，申請綜合債務紓緩計劃。不要經中介。金管局說明：所有從事個人無抵押信貸的零售銀行（包括數字銀行）及主要持牌放債人已參與此架構。",
  doorIdrpSayTitle: "你可以這樣說",
  doorIdrpSay:
    "「我無法按原定金額還款。我不是要借整合貸款。請幫我轉去處理困難還款或綜合債務紓緩計劃的同事。我已準備好信件和文件清單，可以電郵或郵寄。」",
  doorHsbcTitle: "滙豐公布的債務重組途徑",
  doorHsbcBody:
    "你目前只列出滙豐的無抵押戶口。滙豐在「財務困難」頁公布債務重組部。英文頁把同一地址寫成 Collection Services（催收服務）。這仍是他們公布的、撇帳前的重組途徑，不是分行客戶經理。",
  doorHsbcPhone: `電話 ${HSBC_CONTACT.phone}（${HSBC_CONTACT.hours.zh}）`,
  doorHsbcEmail: `電郵 ${HSBC_CONTACT.email}`,
  doorHsbcMail: `郵寄 ${HSBC_CONTACT.mailZh}`,
  doorHsbcSayTitle: "你可以這樣說",
  doorHsbcSay:
    "「我無法按原定金額還款，想聯絡債務重組部，不是客戶經理，也不是申請新貸款。電話是 2269 2444。我可以電郵 cruu@hsbc.com.hk 或按網頁地址郵寄信件。」",
  doorCitiTitle: "花旗：用 CitiPhone 問重組，不要問整合貸款",
  doorCitiBody:
    "我們沒有找到花旗香港對等的公開困難還款專頁。不要發明一個「花旗重組部」。請打 CitiPhone，明確要求債務重組／困難還款／綜合債務紓緩計劃，不要接受推介整合貸款。",
  doorCitiPhone: `${CITI_CONTACT.label} ${CITI_CONTACT.phone}`,
  doorCitiSayTitle: "你可以這樣說",
  doorCitiSay:
    "「我無法按原定金額還款。請轉接處理債務重組、困難還款或綜合債務紓緩計劃的同事。我不是申請信用卡債務整合貸款。」",
  doorOtherTitle: "打月結單上的電話",
  doorOtherBody:
    "請打月結單或貸款合約上的電話，要求困難還款或綜合債務紓緩計劃。不要找分行客戶經理。不要找代你聯絡銀行的中介。",
  doorOtherSayTitle: "你可以這樣說",
  doorOtherSay:
    "「我無法按原定金額還款。請轉去處理困難還款或綜合債務紓緩計劃的單位，不是分行客戶經理，也不是新的整合貸款。」",
  doorMoneyNote: "這一版主要不是為只向持牌放債人借貸的個案而設。你仍可打合約上的電話，要求困難還款。",
  sourceHkma: "金管局：個人信貸／應對債務問題",
  sourceHkmaGuide: "金管局：綜合債務紓緩計劃消費者指南（PDF）",
  sourceHsbc: "滙豐香港：財務困難",
  sourceCiti: "花旗香港：CitiPhone",

  docsTitle: "文件清單",
  docsHint:
    "必需文件要先加進這部手機，才能產生或分享 PDF。照片只存在本地。本工具不能核對月結單是否三個不同月份，所以近三個月月結單需上傳三張影像。",
  attach: "加照片（只存本地）",
  attached: "已加照片",
  attachMore: "再加一張",
  removePhoto: "移除",
  requiredTag: "必需",
  optionalTag: "可選",
  photoCount: "已加 {have}／需 {need} 張",
  docs: {
    hardship_proof: "困難證明（解僱信、減薪／減工時信或同類文件）",
    bank_statements: "近三個月銀行月結單（請上傳三張；未能核對月份）",
    identity: "香港身分證副本",
    other: "其他",
  },
  missingTitle: "尚未能產生或分享 PDF",
  missingHint: "下列必需附件還未在這部手機齊全。",
  missingHardship: "困難證明：還欠 {remain} 張（至少 1 張）",
  missingStatements: "近三個月銀行月結單：還欠 {remain} 張（需 3 張；未能核對是否三個不同月份）",

  packTitle: "信件包",
  packHint: "畫面預覽與 PDF 同一份正文。PDF 在這部手機產生。附件只留在本地，會作為附頁影像放進 PDF。我們不會代寄。",
  makePdf: "產生 PDF",
  makingPdf: "正在產生…",
  share: "分享 PDF",
  download: "下載 PDF",
  shareFail: "這個瀏覽器不能直接分享檔案。已改為下載。",
  statusTitle: "後來怎麼樣了？",
  statusHint: "你自己點。我們不會向銀行查詢。",
  statuses: {
    draft: "草稿",
    sent: "已寄出",
    waiting: "等待回覆",
    accepted: "已接受",
    rejected: "被拒絕",
    gave_up: "我放棄了",
  },
  reminder:
    "寄出後，七天後回來點一下結果。銀行可能需要一至數週。不要等客戶經理打電話給你。",
  reminderDue: "已過七日。點一下後來怎麼樣了。",
  comeBackOn: "建議回來的日子：",

  countersTitle: "本機計數（無個人資料）",
  countersHint: "只記事件名稱和時間。沒有姓名、身分證、金額、債權人或信件內容。",
  eventLabels: {
    app_open: "打開應用",
    assessment_started: "開始評估",
    assessment_done: "完成評估",
    pack_created: "建立信件包",
    door_chosen: "選定門路",
    share_tapped: "點了分享",
    status_tapped: "點了狀態",
    sunday_started: "開始 Sunday Pack",
    sunday_triage_done: "Sunday Pack 分流完成",
    sunday_pack_created: "建立 Sunday Pack",
    sunday_door_chosen: "Sunday Pack 選定門路",
    sunday_share_tapped: "Sunday Pack 點了分享",
  },

  needName: "請先填你的姓名，信件才用得上。",
  pdfError: "未能產生 PDF。請再試一次。",
};

const en = {
  appName: "Right Door",
  appNameEn: "正確的門",
  langToggle: "中文",
  continue: "Continue",
  back: "Back",
  save: "Save on this phone",
  done: "Done",
  optional: "Optional",
  version: "PoC v0.2.0",
  localOnly:
    "We do not collect your data. Pack, photos, HKID, and amounts stay on this phone. No account. Uninstall wipes it. We do not send this to a bank.",

  promiseKicker: "Free · on this phone only · you send it",
  promiseTitle: "Your account manager is the wrong door.",
  promiseLead: "Prepare the letter here. You send it.",
  privacyTitle: "Everything stays on this phone. We do not collect data.",
  privacyBody:
    "The pack, photos, HKID, and amounts never leave this phone unless you share or send them yourself. We do not upload, store, or collect your data. No account. Uninstalling the site or app wipes it.",
  promiseBody:
    "The published door is the bank’s hardship or workout unit, or the Interbank Debt Relief Plan (IDRP). Not the branch RM. Not someone who calls the bank for you.",
  promiseNever:
    "We never contact a bank, lender, the police, or anyone else. Every step is yours, in your name.",
  start: "Start",
  resume: "Continue your draft",
  openPack: "Open your pack",
  addHome: "Add to Home Screen",
  addHomeHow:
    "iPhone: open in Safari → Share → Add to Home Screen. After the first load it works offline.",
  notFor:
    "This build is for banked Hong Kong borrowers before write-off: job loss, fewer hours, or you already know you cannot pay the next six months. Not FDH, passport, or money-lender-only cases.",
  creditHonesty:
    "Restructuring is usually reported to credit agencies. The win is avoiding a 60-day default, bankruptcy, or write-off — not a clean score.",
  wipe: "Erase everything on this phone",
  wipeConfirm: "Erase all local data? Uninstalling does the same. This cannot be undone.",

  chooserKicker: "Free · on this phone only · you take it",
  chooserTitle: "Pick a path. It stays on this phone.",
  chooserLead: "Both tools are prepared in your Safari. We do not email, WhatsApp, or call anyone for you.",
  chooserPrivacy: "The hardship pack and Sunday Pack live only on this phone. No account. Uninstall wipes it.",
  chooserRdTitle: "Right Door · bank hardship",
  chooserRdBody: "For banked Hong Kong borrowers before write-off. Prepare a hardship / IDRP letter on this phone. You send it.",
  chooserRdStart: "Start the bank pack",
  chooserSpTitle: "Sunday Pack · FDW counsellor prep",
  chooserSpBody: "For foreign domestic workers in Hong Kong. Screen, list debts, and split remittance into a 1-page counsellor brief. You bring it. We never email Enrich for you.",
  chooserSpStart: "Start Sunday Pack",
  chooserSpResume: "Continue Sunday Pack",
  chooserChangePack: "All packs",
  chooserWipeSunday: "Clear Sunday Pack only",

  reasonTitle: "Why are you here?",
  reasonHint: "Pick one. Do not write us a story — nothing leaves this phone.",
  reasons: {
    job_ended: "The job ended",
    hours_cut: "Hours or pay were cut",
    will_miss: "I will miss the next instalments",
    already_missed: "I already missed a payment",
  },

  creditorsTitle: "Creditors",
  creditorsHint: "A nickname is enough, e.g. “HSBC card”. Amounts are optional. Stored here only.",
  nickname: "Nickname",
  nicknamePh: "e.g. HSBC card, Hang Seng loan",
  accountRef: "Account ref (optional)",
  accountRefPh: "e.g. last four 1234",
  type: "Type",
  amount: "Amount owed (optional)",
  amountPh: "e.g. HK$80,000",
  addCreditor: "Add",
  noCreditors: "No accounts yet.",
  needCreditor: "Add at least one account so we can point to the published door.",
  remove: "Remove",
  types: {
    hsbc: "HSBC",
    hang_seng: "Hang Seng",
    citi: "Citi",
    boc: "BOC",
    other: "Other bank",
    money_lender: "Money lender (not the focus of this build)",
  },

  situationTitle: "Your situation",
  situationHint:
    "Structured fields. The letter is first person, in a bank-file tone. You can edit every word before the PDF. Figures are self-declared, not audited.",
  fullName: "Your name (goes in the letter)",
  fullNamePh: "e.g. Chan Tai Man",
  hkid: "HKID number",
  hkidPh: "e.g. A123456(7)",
  phone: "Phone",
  phonePh: "e.g. 9123 4567",
  whatChanged: "What changed",
  whatChangedPh: "e.g. Role made redundant. Last day was end of last month.",
  when: "When it started",
  whenPh: "e.g. August 2026",
  incomeItems: "Income items (self-declared)",
  incomeItemsPh: "e.g. No salary; occasional part-time",
  incomeAmount: "Monthly income",
  incomeAmountPh: "e.g. HK$0 or HK$8,000",
  expenseItems: "Essential expenses (self-declared)",
  expenseItemsPh: "e.g. Rent, food, transport",
  expenseAmount: "Monthly essential expenses",
  expenseAmountPh: "e.g. HK$12,000",
  surplus: "Surplus available for repayment each month",
  surplusPh: "e.g. HK$2,000",
  tenor: "Proposed restructure period",
  tenorMonths: {
    "3": "3 months",
    "6": "6 months (default)",
    "9": "9 months",
    "12": "12 months",
  },
  askInterestFreeze: "Also ask them to consider freezing interest (optional, off by default — not a 0% promise)",
  letterTitle: "Letter (edit every word)",
  regenerate: "Rebuild from the fields above",
  letterEdited: "You edited the letter. Rebuilding will overwrite your edits.",

  doorTitle: "The published door",
  doorIdrpTitle: "Interbank Debt Relief Plan (IDRP)",
  doorIdrpBody:
    "You listed more than one unsecured creditor. The published path is to contact one creditor directly and ask for an IDRP. Not an intermediary. The HKMA says all retail banks (including digital banks) and major money lenders offering consumer credit have joined the framework.",
  doorIdrpSayTitle: "What to say",
  doorIdrpSay:
    "“I cannot keep the current repayments. I do not want a consolidation loan. Please put me through to the team that handles hardship or the Interbank Debt Relief Plan. I have a letter and a document list ready to email or post.”",
  doorHsbcTitle: "HSBC’s published workout path",
  doorHsbcBody:
    "You only listed HSBC unsecured credit. HSBC publishes a Debt Workout Unit on its Money worries page. The English page lists the same address under Collection Services. That is still the pre-write-off workout path they publish — not the branch RM.",
  doorHsbcPhone: `Phone ${HSBC_CONTACT.phone} (${HSBC_CONTACT.hours.en})`,
  doorHsbcEmail: `Email ${HSBC_CONTACT.email}`,
  doorHsbcMail: `Mail ${HSBC_CONTACT.mailEn}`,
  doorHsbcSayTitle: "What to say",
  doorHsbcSay:
    "“I cannot keep the current repayments. I need the Debt Workout Unit, not my account manager, and I am not applying for a new loan. The number is 2269 2444. I can email cruu@hsbc.com.hk or post the letter to the address on the Money worries page.”",
  doorCitiTitle: "Citi: CitiPhone, ask for restructuring — not a consolidation loan",
  doorCitiBody:
    "We found no equivalent public hardship page for Citi Hong Kong. Do not invent a Citi workout unit. Call CitiPhone and ask for debt restructuring / hardship / IDRP. Do not accept a consolidation loan pitch.",
  doorCitiPhone: `${CITI_CONTACT.label} ${CITI_CONTACT.phone}`,
  doorCitiSayTitle: "What to say",
  doorCitiSay:
    "“I cannot keep the current repayments. Please transfer me to whoever handles debt restructuring, hardship, or the Interbank Debt Relief Plan. I am not applying for a card debt consolidation loan.”",
  doorOtherTitle: "Call the number on your statement",
  doorOtherBody:
    "Call the number on your statement or loan contract. Ask for hardship or IDRP. Not the branch RM. Not an intermediary who will call the bank for you.",
  doorOtherSayTitle: "What to say",
  doorOtherSay:
    "“I cannot keep the current repayments. Please put me through to hardship or the Interbank Debt Relief Plan — not the branch relationship manager, and not a new consolidation loan.”",
  doorMoneyNote:
    "This build is not aimed at money-lender-only cases. You can still call the number on the contract and ask for hardship.",
  sourceHkma: "HKMA: Personal credit / addressing debt problems",
  sourceHkmaGuide: "HKMA: IDRP consumer guide (PDF)",
  sourceHsbc: "HSBC HK: Money worries",
  sourceCiti: "Citibank HK: CitiPhone",

  docsTitle: "Document checklist",
  docsHint:
    "Required files must be on this phone before you can create or share a PDF. Photos stay here. This tool cannot check that three statements are three different months, so please upload three images for the last three months.",
  attach: "Add photo (this phone only)",
  attached: "Photo attached",
  attachMore: "Add another",
  removePhoto: "Remove",
  requiredTag: "Required",
  optionalTag: "Optional",
  photoCount: "{have} of {need} photos",
  docs: {
    hardship_proof: "Hardship proof (termination, pay-cut letter, or similar)",
    bank_statements: "Bank statements — last three months (upload three images; months are not verified)",
    identity: "HKID copy",
    other: "Other",
  },
  missingTitle: "PDF and Share are blocked",
  missingHint: "These required attachments are not yet on this phone.",
  missingHardship: "Hardship proof: {remain} more photo(s) needed (at least 1)",
  missingStatements: "Bank statements for the last three months: {remain} more photo(s) needed (3 required; months are not verified)",

  packTitle: "Your pack",
  packHint: "The preview matches the PDF text. The PDF is built on this phone. Attachments stay local and are added as image annexes. We do not send it.",
  makePdf: "Create PDF",
  makingPdf: "Creating…",
  share: "Share PDF",
  download: "Download PDF",
  shareFail: "This browser cannot share the file. Downloaded instead.",
  statusTitle: "What happened?",
  statusHint: "You tap this. We will not ask the bank.",
  statuses: {
    draft: "Draft",
    sent: "Sent",
    waiting: "Waiting",
    accepted: "Accepted",
    rejected: "Rejected",
    gave_up: "I gave up",
  },
  reminder: "After you send it, come back in 7 days and tap what happened. Banks can take a week or more. Do not wait for the RM to call.",
  reminderDue: "Seven days have passed. Tap what happened.",
  comeBackOn: "Come back on:",

  countersTitle: "On-device counters (no personal data)",
  countersHint: "Event names and times only. No names, HKID, amounts, creditors, or letter text.",
  eventLabels: {
    app_open: "App opened",
    assessment_started: "Assessment started",
    assessment_done: "Assessment done",
    pack_created: "Pack created",
    door_chosen: "Door chosen",
    share_tapped: "Share tapped",
    status_tapped: "Status tapped",
    sunday_started: "Sunday Pack started",
    sunday_triage_done: "Sunday Pack triage done",
    sunday_pack_created: "Sunday Pack created",
    sunday_door_chosen: "Sunday Pack door chosen",
    sunday_share_tapped: "Sunday Pack share tapped",
  },

  needName: "Add your name so the letter can be in your name.",
  pdfError: "Could not create the PDF. Try again.",
};

export const STRINGS = { zh, en };

export function t(lang, key, vars) {
  const table = STRINGS[lang] || zh;
  const parts = key.split(".");
  let cur = table;
  for (const part of parts) {
    cur = cur?.[part];
  }
  let text = cur ?? key;
  if (vars && typeof text === "string") {
    text = text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
  }
  return text;
}

export function hrefs(lang) {
  return {
    hkma: lang === "zh" ? VERIFIED_URLS.hkmaCreditZh : VERIFIED_URLS.hkmaCreditEn,
    hkmaGuide: lang === "zh" ? VERIFIED_URLS.hkmaGuideZh : VERIFIED_URLS.hkmaGuideEn,
    hsbc: lang === "zh" ? VERIFIED_URLS.hsbcZh : VERIFIED_URLS.hsbcEn,
    citi: VERIFIED_URLS.citiPhone,
  };
}
