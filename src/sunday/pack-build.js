/**
 * Sunday Pack entry order (PB00–PB05).
 * Build the package, then papers, then a helper. Booking is never the entry.
 * Amounts come only from numbers she entered. No helper name or phone is invented.
 */

export const PACK_BUILD = "sunday-pack-build";
export const PACK_FORMING = "sunday-pack-forming";
export const PACK_READY = "sunday-pack-ready";
export const PACK_DOCS = "sunday-pack-docs";
export const PACK_DOCS_SAVED = "sunday-pack-docs-saved";
export const PACK_BOOK = "sunday-pack-book";

export const PACK_SCREENS = [
  PACK_BUILD,
  PACK_FORMING,
  PACK_READY,
  PACK_DOCS,
  PACK_DOCS_SAVED,
  PACK_BOOK,
];

export const DOC_SLOTS = [
  { id: "loan", title: "Loan paper", hint: "Agreement or statement" },
  { id: "pay", title: "Pay proof", hint: "Slip or bank" },
  { id: "id", title: "ID", hint: "Only if a helper asks" },
];

const BOOK_HASHES = new Set(["sunday-door", "sunday-done", PACK_BOOK]);

export function emptyPackageInputs() {
  return { pay: "", expenses: "", overdue: "", positive: false };
}

export function parseHkd(value) {
  if (value == null) return null;
  const raw = String(value).replace(/[^\d]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatHkd(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return `HK$${n.toLocaleString("en-HK")}`;
}

export function sanitizeInputs(raw) {
  const base = emptyPackageInputs();
  if (!raw || typeof raw !== "object") return base;
  return {
    pay: String(raw.pay ?? "").replace(/[^\d]/g, "").slice(0, 9),
    expenses: String(raw.expenses ?? "").replace(/[^\d]/g, "").slice(0, 9),
    overdue: String(raw.overdue ?? "").replace(/[^\d]/g, "").slice(0, 9),
    positive: !!raw.positive,
  };
}

/** Recompute from her inputs. Never fills a sample installment. */
export function packageMathFromInputs(raw) {
  const inputs = sanitizeInputs(raw);
  const pay = parseHkd(inputs.pay);
  const expenses = parseHkd(inputs.expenses);
  const overdue = parseHkd(inputs.overdue);
  const save = pay == null ? null : Math.round(pay * 0.05);
  if (inputs.positive) {
    return { fork: "positive", pay, expenses, save, installment: null, overdue, months: null };
  }
  if (pay != null && expenses != null) {
    const installment = pay - expenses - save;
    if (installment > 0) {
      return { fork: "carry", pay, expenses, save, installment, overdue, months: 3 };
    }
    return { fork: "tight", pay, expenses, save, installment: null, overdue, months: null };
  }
  if (overdue != null) {
    return { fork: "short", pay, expenses, save, installment: null, overdue, months: null };
  }
  return { fork: "empty", pay, expenses, save, installment: null, overdue: null, months: null };
}

export function packageIsReady(math) {
  return math?.fork === "carry" || math?.fork === "positive" || math?.fork === "short";
}

export function packageAskLine(math) {
  if (math?.fork === "carry") {
    return `Ask for ${formatHkd(math.installment)} a month · about 3 months to agree`;
  }
  if (math?.fork === "positive") {
    return "Improve this month · Left toward a cushion · no amount promised";
  }
  if (math?.fork === "short") {
    return `Catch up ${formatHkd(math.overdue)} · what you can`;
  }
  return "";
}

export function packageFactLine(math) {
  if (math?.fork === "carry") {
    return `New installment ${formatHkd(math.installment)} a month · from pay − expenses − 5% save`;
  }
  if (math?.fork === "positive") {
    return "Improve this month · Left toward a cushion · no amount promised";
  }
  if (math?.fork === "short") {
    return `Catch up ${formatHkd(math.overdue)} · what you can`;
  }
  return "";
}

export function packageReadyBody(math) {
  if (math?.fork === "carry") return "Ask for this installment. About 3 months to agree. Next: papers.";
  if (math?.fork === "positive") return "Improve this month. No amount promised. Next: papers.";
  if (math?.fork === "short") return "Catch up what you entered. Next: papers.";
  return "Next: papers.";
}

export function docsSavedCount(docs) {
  return DOC_SLOTS.filter((slot) => docs?.[slot.id]?.name).length;
}

export function bookUnlocked(pack) {
  return !!(pack?.packageReady && pack?.docsStepShown && packageIsReady(pack?.packageMath));
}

/** First screen after privacy Continue. Never the booking door. */
export function privacyContinueScreen(pack) {
  if (bookUnlocked(pack)) return PACK_DOCS_SAVED;
  if (pack?.packageReady && packageIsReady(pack?.packageMath)) return PACK_READY;
  if (pack?.packageInputs && (pack.packageInputs.pay || pack.packageInputs.expenses || pack.packageInputs.overdue)) {
    return PACK_FORMING;
  }
  return PACK_BUILD;
}

/** Crisis "skip remaining questions" must build the package, not open booking. */
export function crisisSkipScreen() {
  return PACK_BUILD;
}

/**
 * Deep link #/sunday-door and the book screen stay behind a ready package
 * and a docs step that has been shown (skipping the files is allowed).
 */
/** A deep link never opens booking before privacy, and never before the package gate. */
export function entryForDeepLink(name, pack) {
  if (!pack?.privacyAccepted) return "sunday-privacy";
  return resolveSundayScreen(name, pack);
}

export function resolveSundayScreen(name, pack) {
  if (BOOK_HASHES.has(name)) return bookUnlocked(pack) ? PACK_BOOK : PACK_BUILD;
  if ((name === PACK_DOCS || name === PACK_DOCS_SAVED) && !(pack?.packageReady && packageIsReady(pack?.packageMath))) {
    return PACK_BUILD;
  }
  if (name === PACK_READY && !(pack?.packageReady && packageIsReady(pack?.packageMath))) return PACK_FORMING;
  return name;
}

export function isPackScreen(name) {
  return PACK_SCREENS.includes(name);
}

function hkdOrBlank(n) {
  return typeof n === "number" ? formatHkd(n) : "";
}

/**
 * English copy for one pack screen. Actions are in on-screen order.
 * Primary is actions[0]. Booking never appears before the docs step.
 */
export function packScreenModel(screen, pack) {
  const math = pack?.packageMath || packageMathFromInputs(pack?.packageInputs);
  const ask = packageAskLine(math);
  const fact = packageFactLine(math);
  const papers = docsSavedCount(pack?.docs);
  const paperLine = papers === 0 ? "None yet · add any time" : `${papers} on this phone · add any time`;

  if (screen === PACK_BUILD) {
    return {
      stepper: "Pack",
      back: "sunday-privacy",
      chip: "Sunday Pack",
      h1: "Build your package",
      body: "Start with numbers from your loan. Then papers. Then a helper if you want.",
      hint: "Helper booking comes last — after your package and papers.",
      steps: [
        { n: "1", label: "Build your package", state: "on" },
        { n: "2", label: "Upload docs", state: "later" },
        { n: "3", label: "Book a helper", state: "later" },
      ],
      actions: ["Start building", "Not now"],
      primary: "Start building",
      quiet: "Not now",
    };
  }

  if (screen === PACK_FORMING) {
    return {
      stepper: "Build",
      back: PACK_BUILD,
      chip: "Building package",
      h1: "A payment you can carry",
      body: "From your pay, your expenses, and 5% you keep to save.",
      hint: math.fork === "tight"
        ? "These amounts do not leave a payment you can carry. Adjust the numbers you entered."
        : "",
      ask,
      fact,
      rows: [
        { k: "Pay", v: hkdOrBlank(math.pay) },
        { k: "Send home + bills", v: hkdOrBlank(math.expenses) },
        { k: "Keep 5% to save", v: hkdOrBlank(math.save) },
        {
          k: "New installment",
          v: math.fork === "carry" ? formatHkd(math.installment) : "",
          total: true,
        },
      ],
      actions: ["See what you take", "Adjust numbers"],
      primary: "See what you take",
      quiet: "Adjust numbers",
    };
  }

  if (screen === PACK_READY) {
    return {
      stepper: "Build",
      back: PACK_FORMING,
      chip: "Package ready",
      h1: "What you take with you",
      body: packageReadyBody(math),
      fact: fact || "Your package",
      note: math.fork === "carry"
        ? "About 3 months to negotiate. A clear ask — not a promise they say yes."
        : "A clear ask — not a promise they say yes.",
      nextStep: "Upload docs · then book a helper",
      actions: ["Next · upload docs", "Generate/share PDF", "Save package only"],
      primary: "Next · upload docs",
      quiet: "Save package only",
    };
  }

  if (screen === PACK_DOCS) {
    const n = papers;
    return {
      stepper: "Docs",
      back: PACK_READY,
      chip: "Upload docs",
      h1: "Papers for your package",
      body: "Add what you have. Skip is fine — add later.",
      progress: `${n} of 3 · not a wall`,
      helper: "Not named yet. Booking comes after papers.",
      actions: ["Save what I have", "Skip for now"],
      primary: "Save what I have",
      quiet: "Skip for now",
    };
  }

  if (screen === PACK_DOCS_SAVED) {
    return {
      stepper: "Docs",
      back: PACK_DOCS,
      chip: "Docs on phone",
      h1: "Saved on this phone",
      body: "Package and papers stay here. Add more any time.",
      packageLine: fact || "Package ready",
      paperLine,
      saved: "Saved on this phone. Progress is what you prepared — not money moved.",
      progress: "Build ✓ · Docs ✓ · Book a helper next",
      actions: ["Book a helper", "Done for now"],
      primary: "Book a helper",
      quiet: "Done for now",
    };
  }

  return {
    stepper: "Helper",
    back: PACK_DOCS_SAVED,
    chip: "Book a helper",
    h1: "Book when you are ready",
    body: "Take your package. A helper can sit with you. Name comes later — we do not invent one.",
    bring: fact ? `Package · ${fact} · papers you saved` : "Package · papers you saved",
    helper: "A helper will be named here. Not named yet. Counsel fills this later.",
    note: "You already built the package and saw papers. Booking is the last step.",
    savedIntent: pack?.bookIntent ? "Saved on this phone. A helper is not named yet." : "",
    actions: ["Request appointment", "Back to package"],
    primary: "Request appointment",
    quiet: "Back to package",
  };
}
