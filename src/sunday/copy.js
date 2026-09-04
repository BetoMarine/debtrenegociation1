function fill(text, vars) {
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

export function st(lang, key, vars) {
  const text = lookup(SUNDAY_STRINGS[lang], key) ?? lookup(SUNDAY_STRINGS.en, key) ?? key;
  return fill(text, vars);
}

const en = {
  brand: "Sunday Pack",
  langToggle: "Language",
  continue: "Continue",
  back: "Back",
  save: "Save on this phone",
  skip: "Skip remaining questions",
  remove: "Remove",
  optional: "Optional",
  localOnly:
    "This pack stays on this phone. No account. Uninstall wipes it. We never email Enrich, NGOs, banks, or lenders for you.",

  privacyTitle: "This stays on this phone until you share it.",
  privacyLead:
    "Sunday Pack is a briefing you prepare for a counsellor. You own every number. You bring the page yourself.",
  privacyBody:
    "Nothing is uploaded. We do not create an account. We do not email Enrich, HELP, the Labour Department, a bank, or a lender. Deep links only open when you tap them.",
  privacyCheck: "I understand: this app does not talk to Enrich, banks, or lenders for me.",
  privacyNeed: "Tick the box to continue. We will not contact anyone on your behalf.",

  languageTitle: "Choose a language",
  languageHint: "You can change this later. English is used if a line is missing.",

  triageTitle: "Red flags — check this first",
  triageHint:
    "Tick anything that is true today. If you are in danger, call 999 yourself. We never message anyone for you.",
  flags: {
    passport: "My passport or contract is being held against my will",
    shark: "A loan shark or collector is threatening me",
    agency: "I was charged an illegal agency placement or training fee",
    none: "None of the above",
  },
  flagsNeed: "Select at least one option.",

  crisisTitle: "Use these doors now",
  crisisLead:
    "Tap to call or open WhatsApp yourself. We do not send a message, email, or booking for you. You can still save a short pack on this phone.",
  crisisPassport:
    "If your passport or contract is held against your will: call 999 if you are in danger, then HELP and your consulate.",
  crisisShark:
    "If a collector or loan shark is threatening you: contact HELP. Call 999 if you are in danger. Enrich can still help with money later — it is not the first door today.",
  crisisAgency:
    "If you were charged an illegal agency placement or training fee: call the Labour Department FDH hotline and your consulate.",
  call999: "Call 999 (emergency)",
  callHelp: "Call HELP {phone}",
  waHelp: "WhatsApp HELP {phone}",
  helpSite: "HELP for Domestic Workers website",
  callLabour: "Call Labour FDH hotline {phone}",
  callConsulatePh: "Call Philippine Consulate {phone}",
  callConsulatePhEmergency: "PCG after-hours hotline {phone}",
  callConsulateId: "Call Indonesian Consulate {phone}",
  consulatePhSite: "Philippine Consulate website",
  consulateIdSite: "Indonesian Consulate website",
  crisisShortPack: "Save a short pack anyway",
  weNeverMessage: "We never WhatsApp, email, or call for you.",

  situationTitle: "Your situation",
  situationHint: "Bands and choices only. This is not a credit report.",
  nationality: "Nationality",
  nationalities: {
    filipino: "Filipino",
    indonesian: "Indonesian",
    other: "Other",
  },
  monthsLeft: "Months left on this contract (optional)",
  monthsLeftPh: "e.g. 8",
  whoKnows: "Who knows about the debt?",
  whoKnowsOpts: {
    friend: "Friend only",
    family: "Family",
    employer: "Employer",
    nobody: "Nobody yet",
    other: "Other",
  },
  meetingGoal: "Goal for this meeting",
  goals: {
    stop_borrowing: "Stop new borrowing",
    payoff_plan: "Make a payoff plan",
    remittance_vs_bills: "Talk about remittance vs bills",
    rights: "Understand my rights",
    other: "Other",
    unspecified: "Not specified",
  },
  needNationality: "Pick a nationality to continue.",
  needWhoKnows: "Say who knows about the debt — or that nobody knows yet.",
  needGoal: "Pick at least one goal for this meeting.",

  debtsTitle: "Debt inventory",
  debtsHint:
    "Nickname is enough. Use bands, not exact amounts. For a counsellor brief, add at least one loan unless this is a crisis-only pack.",
  noLoans: "No loans listed yet.",
  needLoan: "Add at least one loan, or go back if this is a crisis-only pack.",
  nickname: "Lender / nickname",
  nicknamePh: "e.g. Happy Finance, school fees",
  loanType: "Type",
  loanTypes: {
    hk_money_lender: "HK money lender",
    hk_bank: "HK bank / FI",
    loan_agency: "Loan agency",
    ph_id_loan: "Philippines / Indonesia / family",
    friend_family: "Friend or family",
    employer_advance: "Employer advance",
    unknown: "Don’t know",
  },
  balanceBand: "Balance (HKD band)",
  monthlyBand: "Monthly (HKD band)",
  bands: {
    lt_1k: "< 1,000",
    "1_5k": "1,000 – 5,000",
    "6_10k": "6,000 – 10,000",
    "11_20k": "11,000 – 20,000",
    "21_25k": "21,000 – 25,000",
    gt_25k: "> 25,000",
  },
  guarantor: "Guarantor?",
  guarantorOpts: {
    no: "No",
    friend_helper: "Friend helper",
    family: "Family",
    other: "Other",
  },
  stillBorrowing: "Still borrowing?",
  stillOpts: {
    no: "No",
    trying_to_stop: "Trying to stop",
    yes: "Yes",
  },
  addLoan: "Add this loan",
  loansCount: "{n} loans listed",
  hasGuarantor: "Has guarantor",
  noGuarantor: "No guarantor listed",
  bandsOnly: "Bands only — not audited",

  splitTitle: "Remittance split (discussion aid)",
  splitHint:
    "Three parts of the money you send or keep. They must add up to 100%. This is a talking point only. We do not send money.",
  splitBills: "Bills / obligations",
  splitBillsHint: "school, medicine, loans at home",
  splitAllowance: "Allowance to household",
  splitAllowanceHint: "discretionary",
  splitKeep: "Keep in HK",
  splitKeepHint: "loan + savings",
  splitNote: "Note from helper (optional)",
  splitNotePh: "e.g. I want family to only get the allowance amount.",
  splitTotal: "Total: {n}%",
  splitNeed: "The three numbers must add up to 100.",
  splitWeDontSend: "We do not send remittances or pay anyone.",

  doorTitle: "Suggested next door (you choose)",
  doorLead: "A suggestion only. You tap. We do not email Enrich or anyone else for you.",
  doors: {
    passportTitle: "HELP + 999 + consulate",
    passportBody:
      "Passport or contract held against your will is not a money-counselling first door. Call 999 if you are in danger. Then HELP and your consulate. You can still bring a short money pack later.",
    sharkTitle: "HELP for Domestic Workers",
    sharkBody:
      "Collector or loan-shark threats: contact HELP. Call 999 if you are in danger. Enrich financial consultation is secondary after you are safe.",
    agencyTitle: "Labour Department FDH hotline + consulate",
    agencyBody:
      "Illegal agency placement or training fees are a labour / consulate matter. Enrich does not handle agency-fee disputes.",
    enrichTitle: "Enrich — Financial Consultation (recommended)",
    enrichBody:
      "Enrich offers a confidential money session. They do not lend money or call creditors. You book and you bring this page yourself.",
  },
  openEnrich: "Open Enrich booking form",
  weDoNotEmailEnrich: "We do not email Enrich for you. The form opens in Safari. You submit it.",
  enrichWaEn: "WhatsApp Enrich (EN / Tagalog) {phone}",
  enrichWaId: "WhatsApp Enrich (Bahasa) {phone}",
  enrichNoLend: "Enrich does not lend money or call creditors. Helper brings this page herself.",
  alsoAvailable: "Also available if needed:",
  caritas: "Caritas {phone}",
  twgh: "TWGH FDCC {phone}",
  generateSecondary: "Generate / share the PDF briefing",

  reviewTitle: "Review & generate",
  reviewHint: "One page. Self-declared. You share it. Pack ID stays on this phone only.",
  makePdf: "Create 1-page PDF",
  makingPdf: "Creating…",
  share: "Share PDF",
  download: "Download PDF",
  shareFail: "This browser cannot share the file. Downloaded instead.",
  pdfError: "Could not create the PDF. Try again.",
  needLoanOrCrisis: "Add a loan, or this must be a crisis-only pack.",

  doneTitle: "You hold the pack",
  doneLead: "No account. Nothing synced. Bring the page yourself.",
  doneCheck1: "Open the Enrich booking form if that is your door — or call the number you chose.",
  doneCheck2: "Bring the PDF to the appointment. It is not a credit report.",
  doneCheck3: "You can clear this pack from the phone when you are done.",
  clearPack: "Clear this Sunday Pack",
  clearConfirm: "Clear the Sunday Pack on this phone? Right Door data is not touched. This cannot be undone.",
  backChooser: "Back to pack chooser",

  pdf: {
    title: "Counsellor briefing — money pack",
    subtitle:
      "Prepared by the helper on her device · Bring this to your appointment · She owns every number below",
    langPref: "Language preference",
    contractLeft: "Contract left",
    whoKnows: "Who knows about debt",
    redFlags: "Red flags (self-reported)",
    flagOkPassport: "Passport with helper",
    flagOkShark: "No collector threats today",
    flagOkAgency: "No agency fee dispute flagged",
    flagBadPassport: "Passport/contract held against will",
    flagBadShark: "Loan shark / collector threats",
    flagBadAgency: "Illegal agency fee flagged",
    goal: "Goal for this meeting",
    inventory: "Debt inventory",
    colLender: "Lender / nickname",
    colType: "Type",
    colBalance: "Balance (HKD band)",
    colMonthly: "Monthly",
    colGuarantor: "Guarantor",
    colStill: "Still borrowing?",
    noLoans: "No loans listed (crisis-only pack)",
    remittance: "Remittance split (discussion aid)",
    nextDoor: "Suggested next door (helper chooses)",
    book: "Book:",
    footerOrg: "Prepared by the helper on her device · Plan Your Life / Right Door (Sunday Pack) · not affiliated with Enrich",
    footerLegal:
      "This brief is self-declared. It is not a credit report, not legal advice, and not a request for Enrich to contact any lender.",
    generated: "Generated: {date} · Pack ID stays on device only",
    moreLoans: "+ {n} more loans on the helper’s phone (kept off this page)",
    splitUnspecified: "Not filled in",
    notePrefix: "Note from helper:",
  },

  langNames: {
    tl: "Filipino (Tagalog)",
    id: "Bahasa Indonesia",
    en: "English",
  },
  meta: {
    contractUnknown: "Not given",
    contractMonths: "~{n} months",
  },
  nextLang: {
    en: "Tagalog",
    tl: "Bahasa",
    id: "English",
  },
};

const tl = {
  brand: "Sunday Pack",
  langToggle: "Wika",
  continue: "Magpatuloy",
  back: "Bumalik",
  save: "I-save sa teleponong ito",
  skip: "Laktawan ang natitirang tanong",
  remove: "Tanggalin",
  optional: "Opsyonal",
  localOnly:
    "Sa teleponong ito lang ang pack. Walang account. Mawawala kapag in-uninstall. Hindi kami mag-e-email sa Enrich, NGO, bangko, o lender para sa iyo.",

  privacyTitle: "Sa teleponong ito lang ito hanggang ikaw mismo ang magbahagi.",
  privacyLead:
    "Ang Sunday Pack ay briefing para sa counsellor. Iyo ang bawat numero. Ikaw ang magdadala ng pahina.",
  privacyBody:
    "Walang ina-upload. Walang account. Hindi kami mag-e-email sa Enrich, HELP, Labour Department, bangko, o lender. Magbubukas lang ang link kapag pinindot mo.",
  privacyCheck: "Naiintindihan ko: hindi kausap ng app ang Enrich, bangko, o lender para sa akin.",
  privacyNeed: "I-tick ang kahon para magpatuloy. Hindi kami kukuha ng tawag o email para sa iyo.",

  languageTitle: "Pumili ng wika",
  languageHint: "Pwede mo itong palitan mamaya. English ang gagamitin kung kulang ang linya.",

  triageTitle: "Red flags — suriin muna ito",
  triageHint:
    "I-tick kung totoo ngayon. Kung delikado, ikaw mismo tumawag sa 999. Hindi kami magmemensahe para sa iyo.",
  flags: {
    passport: "Kinukuha / hinahawakan ang passport o kontrata laban sa kalooban ko",
    shark: "May loan shark o collector na nagbabanta sa akin",
    agency: "Sinisingil ako ng illegal na agency placement o training fee",
    none: "Wala sa mga ito",
  },
  flagsNeed: "Pumili ng kahit isa.",

  crisisTitle: "Gamitin ang mga pintong ito ngayon",
  crisisLead:
    "Ikaw mismo tumawag o mag-WhatsApp. Hindi kami magpapadala ng mensahe, email, o booking. Pwede ka pa ring mag-save ng maikling pack dito.",
  crisisPassport:
    "Kung hawak ang passport o kontrata laban sa kalooban mo: tumawag sa 999 kung delikado, saka HELP at consulate mo.",
  crisisShark:
    "Kung may banta mula sa collector o loan shark: kontakin ang HELP. Tumawag sa 999 kung delikado. Pwede ang Enrich sa pera mamaya — hindi ito ang unang pinto ngayon.",
  crisisAgency:
    "Kung illegal na agency placement o training fee: tawagan ang Labour Department FDH hotline at consulate mo.",
  call999: "Tawagan ang 999 (emergency)",
  callHelp: "Tawagan ang HELP {phone}",
  waHelp: "WhatsApp HELP {phone}",
  helpSite: "Website ng HELP for Domestic Workers",
  callLabour: "Tawagan ang Labour FDH hotline {phone}",
  callConsulatePh: "Tawagan ang Philippine Consulate {phone}",
  callConsulatePhEmergency: "PCG hotline pagkatapos ng opisina {phone}",
  callConsulateId: "Tawagan ang Indonesian Consulate {phone}",
  consulatePhSite: "Website ng Philippine Consulate",
  consulateIdSite: "Website ng Indonesian Consulate",
  crisisShortPack: "Mag-save pa rin ng maikling pack",
  weNeverMessage: "Hindi kami mag-WhatsApp, mag-email, o tumawag para sa iyo.",

  situationTitle: "Ang sitwasyon mo",
  situationHint: "Mga band at pagpili lang. Hindi ito credit report.",
  nationality: "Nasyonalidad",
  nationalities: {
    filipino: "Filipino",
    indonesian: "Indonesian",
    other: "Iba pa",
  },
  monthsLeft: "Buwan na natitira sa kontrata (opsyonal)",
  monthsLeftPh: "hal. 8",
  whoKnows: "Sino ang nakakaalam ng utang?",
  whoKnowsOpts: {
    friend: "Kaibigan lang",
    family: "Pamilya",
    employer: "Employer",
    nobody: "Wala pa",
    other: "Iba pa",
  },
  meetingGoal: "Layunin sa meeting na ito",
  goals: {
    stop_borrowing: "Tumigil sa panibagong utang",
    payoff_plan: "Gumawa ng plano sa bayad",
    remittance_vs_bills: "Pag-usapan ang padala vs bills",
    rights: "Maintindihan ang karapatan ko",
    other: "Iba pa",
    unspecified: "Hindi tinukoy",
  },
  needNationality: "Pumili ng nasyonalidad.",
  needWhoKnows: "Sino ang nakakaalam — o wala pa.",
  needGoal: "Pumili ng kahit isang layunin.",

  debtsTitle: "Listahan ng utang",
  debtsHint:
    "Sapat na ang palayaw. Band, hindi eksaktong halaga. Magdagdag ng kahit isang utang maliban kung crisis-only ang pack.",
  noLoans: "Wala pang utang sa listahan.",
  needLoan: "Magdagdag ng utang, o bumalik kung crisis-only ito.",
  nickname: "Lender / palayaw",
  nicknamePh: "hal. Happy Finance, baon sa paaralan",
  loanType: "Uri",
  loanTypes: {
    hk_money_lender: "HK money lender",
    hk_bank: "HK bangko / FI",
    loan_agency: "Loan agency",
    ph_id_loan: "Pilipinas / Indonesia / pamilya",
    friend_family: "Kaibigan o pamilya",
    employer_advance: "Advance mula sa employer",
    unknown: "Hindi alam",
  },
  balanceBand: "Balanse (HKD band)",
  monthlyBand: "Buwanan (HKD band)",
  bands: {
    lt_1k: "< 1,000",
    "1_5k": "1,000 – 5,000",
    "6_10k": "6,000 – 10,000",
    "11_20k": "11,000 – 20,000",
    "21_25k": "21,000 – 25,000",
    gt_25k: "> 25,000",
  },
  guarantor: "May guarantor?",
  guarantorOpts: {
    no: "Wala",
    friend_helper: "Kaibigang helper",
    family: "Pamilya",
    other: "Iba pa",
  },
  stillBorrowing: "Nangungutang pa?",
  stillOpts: {
    no: "Hindi",
    trying_to_stop: "Sinusubukang tumigil",
    yes: "Oo",
  },
  addLoan: "Idagdag ang utang na ito",
  loansCount: "{n} utang sa listahan",
  hasGuarantor: "May guarantor",
  noGuarantor: "Walang guarantor",
  bandsOnly: "Band lang — hindi naka-audit",

  splitTitle: "Hati ng padala (pang-usap lamang)",
  splitHint:
    "Tatlong bahagi ng pera. Dapat 100% lahat. Pang-usap lang. Hindi kami nagpapadala ng pera.",
  splitBills: "Bills / obligasyon",
  splitBillsHint: "paaralan, gamot, utang sa bahay",
  splitAllowance: "Allowance sa pamilya",
  splitAllowanceHint: "discretionary",
  splitKeep: "Itabi sa HK",
  splitKeepHint: "utang + ipon",
  splitNote: "Tala mula sa helper (opsyonal)",
  splitNotePh: "hal. Allowance lang ang gusto kong matanggap ng pamilya.",
  splitTotal: "Kabuuan: {n}%",
  splitNeed: "Dapat 100% ang tatlong numero.",
  splitWeDontSend: "Hindi kami nagpapadala ng remittance o magbabayad kaninuman.",

  doorTitle: "Mungkahing pinto (ikaw ang pipili)",
  doorLead: "Mungkahi lang. Ikaw ang pipindot. Hindi kami mag-e-email sa Enrich o kaninuman.",
  doors: {
    passportTitle: "HELP + 999 + consulate",
    passportBody:
      "Ang hawak na passport o kontrata ay hindi unang pinto sa money counselling. Tumawag sa 999 kung delikado. Saka HELP at consulate. Pwede mo pang dalhin ang maikling pack mamaya.",
    sharkTitle: "HELP for Domestic Workers",
    sharkBody:
      "Banta ng collector o loan shark: kontakin ang HELP. 999 kung delikado. Secondary ang Enrich pag ligtas ka na.",
    agencyTitle: "Labour Department FDH hotline + consulate",
    agencyBody:
      "Ang illegal na agency fee ay usapin ng labour / consulate. Hindi ito hinahawakan ng Enrich.",
    enrichTitle: "Enrich — Financial Consultation (mungkahi)",
    enrichBody:
      "May confidential na session ang Enrich tungkol sa pera. Hindi sila nagpapautang at hindi tumatawag sa creditor. Ikaw magbu-book, ikaw magdadala ng pahina.",
  },
  openEnrich: "Buksan ang Enrich booking form",
  weDoNotEmailEnrich: "Hindi namin i-e-email ang Enrich para sa iyo. Sa Safari magbubukas. Ikaw ang mag-submit.",
  enrichWaEn: "WhatsApp Enrich (EN / Tagalog) {phone}",
  enrichWaId: "WhatsApp Enrich (Bahasa) {phone}",
  enrichNoLend: "Hindi nagpapautang o tumatawag sa creditor ang Enrich. Ikaw ang magdadala ng pahina.",
  alsoAvailable: "Pwede ring:",
  caritas: "Caritas {phone}",
  twgh: "TWGH FDCC {phone}",
  generateSecondary: "Gumawa / mag-share ng PDF briefing",

  reviewTitle: "Suriin at gawin ang PDF",
  reviewHint: "Isang pahina. Sariling beys. Ikaw ang magbabahagi. Sa telepono lang ang Pack ID.",
  makePdf: "Gumawa ng 1-page PDF",
  makingPdf: "Ginagawa…",
  share: "I-share ang PDF",
  download: "I-download ang PDF",
  shareFail: "Hindi ma-share ng browser na ito. Na-download na lang.",
  pdfError: "Hindi nagawa ang PDF. Subukan ulit.",
  needLoanOrCrisis: "Magdagdag ng utang, o crisis-only dapat ang pack.",

  doneTitle: "Iyo ang pack",
  doneLead: "Walang account. Walang sync. Ikaw ang magdadala ng pahina.",
  doneCheck1: "Buksan ang Enrich booking kung iyon ang pinto — o tawagan ang napili mong numero.",
  doneCheck2: "Dalhin ang PDF sa appointment. Hindi ito credit report.",
  doneCheck3: "Pwede mong burahin ang pack sa telepono pagtapos.",
  clearPack: "Burahin ang Sunday Pack na ito",
  clearConfirm: "Burahin ang Sunday Pack sa teleponong ito? Hindi maaapektuhan ang Right Door. Hindi na ito mababawi.",
  backChooser: "Bumalik sa pagpili ng pack",

  pdf: en.pdf,
  langNames: en.langNames,
  meta: {
    contractUnknown: "Hindi ibinigay",
    contractMonths: "~{n} buwan",
  },
  nextLang: {
    en: "Tagalog",
    tl: "Bahasa",
    id: "English",
  },
};

const id = {
  brand: "Sunday Pack",
  langToggle: "Bahasa",
  continue: "Lanjut",
  back: "Kembali",
  save: "Simpan di HP ini",
  skip: "Lewati sisa pertanyaan",
  remove: "Hapus",
  optional: "Opsional",
  localOnly:
    "Paket ini hanya di HP ini. Tidak ada akun. Hilang jika di-uninstall. Kami tidak pernah mengirim email ke Enrich, LSM, bank, atau pemberi pinjaman untuk Anda.",

  privacyTitle: "Ini tetap di HP ini sampai Anda sendiri yang membagikan.",
  privacyLead:
    "Sunday Pack adalah briefing untuk konselor. Setiap angka milik Anda. Anda yang membawa halamannya.",
  privacyBody:
    "Tidak ada yang diunggah. Tidak ada akun. Kami tidak mengirim email ke Enrich, HELP, Labour Department, bank, atau pemberi pinjaman. Tautan hanya terbuka jika Anda mengetuknya.",
  privacyCheck: "Saya paham: aplikasi ini tidak menghubungi Enrich, bank, atau pemberi pinjaman untuk saya.",
  privacyNeed: "Centang kotak untuk lanjut. Kami tidak akan menghubungi siapa pun atas nama Anda.",

  languageTitle: "Pilih bahasa",
  languageHint: "Bisa diganti nanti. Inggris dipakai jika ada baris yang belum ada.",

  triageTitle: "Red flags — periksa ini dulu",
  triageHint:
    "Centang yang benar hari ini. Jika bahaya, Anda sendiri yang menelepon 999. Kami tidak pernah mengirim pesan untuk Anda.",
  flags: {
    passport: "Paspor atau kontrak saya ditahan tanpa izin saya",
    shark: "Rentenir atau penagih mengancam saya",
    agency: "Saya dikenai biaya penempatan / pelatihan agen yang ilegal",
    none: "Tidak ada di atas",
  },
  flagsNeed: "Pilih setidaknya satu.",

  crisisTitle: "Gunakan pintu ini sekarang",
  crisisLead:
    "Anda sendiri yang menelepon atau membuka WhatsApp. Kami tidak mengirim pesan, email, atau booking. Anda tetap bisa menyimpan paket singkat di HP ini.",
  crisisPassport:
    "Jika paspor atau kontrak ditahan: telepon 999 jika bahaya, lalu HELP dan konsulat Anda.",
  crisisShark:
    "Jika penagih atau rentenir mengancam: hubungi HELP. Telepon 999 jika bahaya. Enrich bisa membantu soal uang nanti — bukan pintu pertama hari ini.",
  crisisAgency:
    "Jika biaya agen ilegal: telepon hotline FDH Labour Department dan konsulat Anda.",
  call999: "Telepon 999 (darurat)",
  callHelp: "Telepon HELP {phone}",
  waHelp: "WhatsApp HELP {phone}",
  helpSite: "Situs HELP for Domestic Workers",
  callLabour: "Telepon hotline FDH Labour {phone}",
  callConsulatePh: "Telepon Konsulat Filipina {phone}",
  callConsulatePhEmergency: "Hotline PCG di luar jam kantor {phone}",
  callConsulateId: "Telepon Konsulat Indonesia {phone}",
  consulatePhSite: "Situs Konsulat Filipina",
  consulateIdSite: "Situs Konsulat Indonesia",
  crisisShortPack: "Tetap simpan paket singkat",
  weNeverMessage: "Kami tidak WhatsApp, email, atau menelepon untuk Anda.",

  situationTitle: "Situasi Anda",
  situationHint: "Hanya pilihan dan rentang. Ini bukan laporan kredit.",
  nationality: "Kewarganegaraan",
  nationalities: {
    filipino: "Filipina",
    indonesian: "Indonesia",
    other: "Lainnya",
  },
  monthsLeft: "Sisa bulan kontrak (opsional)",
  monthsLeftPh: "mis. 8",
  whoKnows: "Siapa yang tahu soal utang?",
  whoKnowsOpts: {
    friend: "Teman saja",
    family: "Keluarga",
    employer: "Majikan",
    nobody: "Belum ada",
    other: "Lainnya",
  },
  meetingGoal: "Tujuan pertemuan ini",
  goals: {
    stop_borrowing: "Berhenti utang baru",
    payoff_plan: "Buat rencana pelunasan",
    remittance_vs_bills: "Bicara kiriman vs tagihan",
    rights: "Pahami hak saya",
    other: "Lainnya",
    unspecified: "Tidak disebutkan",
  },
  needNationality: "Pilih kewarganegaraan.",
  needWhoKnows: "Siapa yang tahu — atau belum ada.",
  needGoal: "Pilih setidaknya satu tujuan.",

  debtsTitle: "Daftar utang",
  debtsHint:
    "Nama panggilan cukup. Pakai rentang, bukan angka persis. Tambah minimal satu utang kecuali paket krisis saja.",
  noLoans: "Belum ada utang.",
  needLoan: "Tambah utang, atau kembali jika ini paket krisis saja.",
  nickname: "Pemberi pinjaman / nama",
  nicknamePh: "mis. Happy Finance, uang sekolah",
  loanType: "Jenis",
  loanTypes: {
    hk_money_lender: "Pemberi pinjaman HK",
    hk_bank: "Bank / FI HK",
    loan_agency: "Agensi pinjaman",
    ph_id_loan: "Filipina / Indonesia / keluarga",
    friend_family: "Teman atau keluarga",
    employer_advance: "Uang muka majikan",
    unknown: "Tidak tahu",
  },
  balanceBand: "Saldo (rentang HKD)",
  monthlyBand: "Bulanan (rentang HKD)",
  bands: {
    lt_1k: "< 1.000",
    "1_5k": "1.000 – 5.000",
    "6_10k": "6.000 – 10.000",
    "11_20k": "11.000 – 20.000",
    "21_25k": "21.000 – 25.000",
    gt_25k: "> 25.000",
  },
  guarantor: "Ada penjamin?",
  guarantorOpts: {
    no: "Tidak",
    friend_helper: "Teman helper",
    family: "Keluarga",
    other: "Lainnya",
  },
  stillBorrowing: "Masih berutang?",
  stillOpts: {
    no: "Tidak",
    trying_to_stop: "Mencoba berhenti",
    yes: "Ya",
  },
  addLoan: "Tambah utang ini",
  loansCount: "{n} utang terdaftar",
  hasGuarantor: "Ada penjamin",
  noGuarantor: "Tidak ada penjamin",
  bandsOnly: "Rentang saja — tidak diaudit",

  splitTitle: "Pembagian kiriman (bahan diskusi)",
  splitHint:
    "Tiga bagian. Jumlahnya harus 100%. Hanya bahan bicara. Kami tidak mengirim uang.",
  splitBills: "Tagihan / kewajiban",
  splitBillsHint: "sekolah, obat, utang di rumah",
  splitAllowance: "Uang belanja rumah",
  splitAllowanceHint: "discretionary",
  splitKeep: "Simpan di HK",
  splitKeepHint: "utang + tabungan",
  splitNote: "Catatan dari helper (opsional)",
  splitNotePh: "mis. Saya ingin keluarga hanya menerima jumlah allowance.",
  splitTotal: "Total: {n}%",
  splitNeed: "Tiga angka harus berjumlah 100.",
  splitWeDontSend: "Kami tidak mengirim remitansi atau membayar siapa pun.",

  doorTitle: "Pintu berikutnya (Anda yang memilih)",
  doorLead: "Hanya saran. Anda yang mengetuk. Kami tidak mengirim email ke Enrich atau siapa pun.",
  doors: {
    passportTitle: "HELP + 999 + konsulat",
    passportBody:
      "Paspor atau kontrak yang ditahan bukan pintu pertama konseling uang. Telepon 999 jika bahaya. Lalu HELP dan konsulat. Paket singkat masih bisa dibawa nanti.",
    sharkTitle: "HELP for Domestic Workers",
    sharkBody:
      "Ancaman penagih atau rentenir: hubungi HELP. 999 jika bahaya. Enrich sekunder setelah Anda aman.",
    agencyTitle: "Hotline FDH Labour Department + konsulat",
    agencyBody:
      "Biaya agen ilegal adalah urusan labour / konsulat. Enrich tidak menangani sengketa biaya agen.",
    enrichTitle: "Enrich — Konsultasi Keuangan (disarankan)",
    enrichBody:
      "Enrich memberi sesi uang yang rahasia. Mereka tidak meminjamkan uang dan tidak menelepon kreditur. Anda yang booking dan membawa halaman ini.",
  },
  openEnrich: "Buka formulir booking Enrich",
  weDoNotEmailEnrich: "Kami tidak mengirim email ke Enrich untuk Anda. Formulir terbuka di Safari. Anda yang mengirim.",
  enrichWaEn: "WhatsApp Enrich (EN / Tagalog) {phone}",
  enrichWaId: "WhatsApp Enrich (Bahasa) {phone}",
  enrichNoLend: "Enrich tidak meminjamkan uang atau menelepon kreditur. Helper membawa halaman ini sendiri.",
  alsoAvailable: "Jika perlu, juga ada:",
  caritas: "Caritas {phone}",
  twgh: "TWGH FDCC {phone}",
  generateSecondary: "Buat / bagikan PDF briefing",

  reviewTitle: "Tinjau & buat PDF",
  reviewHint: "Satu halaman. Pernyataan sendiri. Anda yang membagikan. Pack ID hanya di HP ini.",
  makePdf: "Buat PDF 1 halaman",
  makingPdf: "Membuat…",
  share: "Bagikan PDF",
  download: "Unduh PDF",
  shareFail: "Browser ini tidak bisa membagikan file. Diunduh sebagai gantinya.",
  pdfError: "PDF gagal dibuat. Coba lagi.",
  needLoanOrCrisis: "Tambah utang, atau ini harus paket krisis saja.",

  doneTitle: "Paket ada di tangan Anda",
  doneLead: "Tidak ada akun. Tidak ada sinkron. Anda yang membawa halaman.",
  doneCheck1: "Buka formulir booking Enrich jika itu pintu Anda — atau telepon nomor yang Anda pilih.",
  doneCheck2: "Bawa PDF ke janji. Ini bukan laporan kredit.",
  doneCheck3: "Anda bisa menghapus paket ini dari HP setelah selesai.",
  clearPack: "Hapus Sunday Pack ini",
  clearConfirm: "Hapus Sunday Pack di HP ini? Data Right Door tidak diubah. Tidak bisa dibatalkan.",
  backChooser: "Kembali ke pemilih paket",

  pdf: en.pdf,
  langNames: en.langNames,
  meta: {
    contractUnknown: "Tidak diisi",
    contractMonths: "~{n} bulan",
  },
  nextLang: {
    en: "Tagalog",
    tl: "Bahasa",
    id: "English",
  },
};

export const SUNDAY_STRINGS = { en, tl, id };

export const PDF_FOOTER_ORG =
  "Prepared by the helper on her device · Plan Your Life / Right Door (Sunday Pack) · not affiliated with Enrich";

export const PDF_FOOTER_LEGAL =
  "This brief is self-declared. It is not a credit report, not legal advice, and not a request for Enrich to contact any lender.";
