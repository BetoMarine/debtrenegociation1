/**
 * Dated spine for Slice O.
 * Cashflow is three months after the plan anchor.
 * The cushion date is the earliest day the month can reach, shown on arrival.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseAmount(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(/HK\$/gi, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseIso(raw) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso(now = new Date()) {
  return toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function formatDay(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayMonth(date) {
  if (!(date instanceof Date)) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function addMonths(date, count) {
  const next = new Date(date.getFullYear(), date.getMonth(), 1);
  next.setMonth(next.getMonth() + count);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), last));
  return next;
}

export function formatMoney(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  return Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatOut(n) {
  if (!n) return "0";
  return `\u2013${formatMoney(n)}`;
}

export function formatNet(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  const rounded = Math.round(n);
  if (rounded < 0) return `\u2013${formatMoney(rounded)}`;
  if (rounded > 0) return `+${formatMoney(rounded)}`;
  return "0";
}

export function asOfDate(state) {
  return parseIso(state?.asOf) || parseIso(todayIso());
}

export function cashflowDate(state) {
  return addMonths(asOfDate(state), 3);
}

/** Saving starts on the 15th of the cashflow month, or the next 15th if that day has passed. */
export function savingStart(anchor) {
  if (anchor.getDate() <= 15) return new Date(anchor.getFullYear(), anchor.getMonth(), 15);
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 15);
}

export function livingCosts(state) {
  return (parseAmount(state?.bills) || 0) + (parseAmount(state?.personal) || 0);
}

/** Room to save once a debt path has turned the month. The installment is the part the path takes on. */
export function postPathSave(state) {
  const income = parseAmount(state?.income);
  if (income == null) return 0;
  return Math.max(0, income - livingCosts(state));
}

export function cushionDefaults(state) {
  const living = livingCosts(state);
  const post = postPathSave(state);
  const target = living > 0 ? living * 3 : post > 0 ? post * 3 : 0;
  const monthly = post > 0 ? Math.min(post, living > 0 ? living : post) : 0;
  return {
    now: "0",
    target: target > 0 ? String(target) : "",
    save: monthly > 0 ? String(monthly) : "",
  };
}

/**
 * Viable cushion completion.
 * Funded on arrival uses the plan anchor (the day we can already see it is full).
 * Otherwise the date is saving-start plus the whole months the spare money needs.
 * A typed monthly amount cannot outrun what the month can spare.
 */
export function cushionPlan(state) {
  const asOf = asOfDate(state);
  const nowN = parseAmount(state?.cushionNow) || 0;
  const target = parseAmount(state?.cushionTarget);
  const typedSave = parseAmount(state?.cushionSave);
  const capacity = postPathSave(state);
  const funded = target != null && target > 0 && nowN >= target;
  if (funded) {
    const date = parseIso(state?.fundedOn) || asOf;
    return {
      funded: true,
      viable: true,
      date,
      iso: toIso(date),
      months: 0,
      save: 0,
      target,
      now: nowN,
      capacity,
      clamped: false,
    };
  }
  const anchor = state?.debtProblems === true ? cashflowDate(state) : asOf;
  const start = savingStart(anchor);
  const gap = target != null && target > nowN ? target - nowN : 0;
  const usable = capacity > 0 && typedSave != null && typedSave > 0 ? Math.min(typedSave, capacity) : 0;
  if (!(target > 0) || !(gap > 0) || !(usable > 0)) {
    return {
      funded: false,
      viable: false,
      date: null,
      iso: "",
      months: null,
      save: usable,
      target,
      now: nowN,
      capacity,
      start,
      clamped: typedSave != null && capacity > 0 && typedSave > capacity,
    };
  }
  const months = Math.ceil(gap / usable);
  const date = addMonths(start, months);
  return {
    funded: false,
    viable: true,
    date,
    iso: toIso(date),
    months,
    save: usable,
    target,
    now: nowN,
    capacity,
    start,
    clamped: typedSave > capacity,
  };
}

export function youToday(state) {
  const income = parseAmount(state?.income);
  const bills = parseAmount(state?.bills);
  const personal = parseAmount(state?.personal);
  const installment = parseAmount(state?.installment);
  const separate = state?.debtProblems === true && state?.installmentInExpenses === false && installment > 0;
  const parts = [];
  if (bills != null) parts.push(bills);
  if (personal != null) parts.push(personal);
  if (separate) parts.push(installment);
  const expenses = parts.reduce((sum, n) => sum + n, 0);
  const net = income == null ? null : income - expenses;
  return {
    income,
    bills,
    personal,
    installment: separate ? installment : 0,
    installmentIncluded: state?.installmentInExpenses === true,
    expenses,
    net,
  };
}

export function todayRows(state) {
  const today = youToday(state);
  const rows = [
    { label: "Income", value: today.income == null ? "\u2014" : formatMoney(today.income) },
    { label: "Bills", value: today.bills == null ? "\u2014" : formatOut(today.bills), neg: (today.bills || 0) > 0 },
    {
      label: "Personal / self",
      value: today.personal == null ? "\u2014" : formatOut(today.personal),
      neg: (today.personal || 0) > 0,
    },
  ];
  if (today.installment > 0) {
    rows.push({ label: "Loan installment", value: formatOut(today.installment), neg: true });
  }
  rows.push({
    label: "Left this month",
    value: formatNet(today.net),
    tone: today.net > 0 ? "pos" : today.net < 0 ? "neg" : "total",
  });
  return rows;
}

export function cashflowLabel(state) {
  return `~${formatDay(cashflowDate(state))}`;
}

export function pdfRows(state) {
  const plan = cushionPlan(state);
  const when = plan.date ? formatDay(plan.date) : "";
  const after = plan.date ? `after ${formatDayMonth(plan.date)}` : "";
  const rows = [];
  let n = 1;
  if (state?.debtProblems === true) {
    const door = state.debtDoor === "pack" ? "Sunday Pack" : state.debtDoor === "rd" ? "Right Door" : "Right Door or Sunday Pack";
    rows.push({
      label: `${n} \u00b7 Debt fix \u2192 cashflow+`,
      date: cashflowLabel(state),
      note: `Path: ${door}`,
    });
    n += 1;
  }
  rows.push({
    label: `${n} \u00b7 Emergency fund ready`,
    date: when,
    note: plan.funded
      ? "Already at the target on arrival."
      : plan.viable
        ? `HK$ ${formatMoney(plan.save)} a month toward HK$ ${formatMoney(plan.target)}.`
        : "",
  });
  n += 1;
  const goals = (state?.goals || [])
    .filter((goal) => parseIso(goal.date))
    .slice()
    .sort((a, b) => parseIso(a.date) - parseIso(b.date));
  if (!goals.length) {
    rows.push({ label: `${n} \u00b7 Goals (open after EF)`, date: after, note: "Opens with Boost, after the cushion date." });
    n += 1;
  } else {
    for (const goal of goals) {
      rows.push({
        label: `${n} \u00b7 ${goal.name}`,
        date: formatDay(parseIso(goal.date)),
        note: `HK$ ${formatMoney(parseAmount(goal.amount))}`,
      });
      n += 1;
    }
  }
  const mix = state?.boostRef || "balanced";
  rows.push({
    label: `${n} \u00b7 Boost \u00b7 reference mixes`,
    date: after,
    note: `Benchmark only (${mix}). Not a product to buy.`,
  });
  n += 1;
  rows.push({
    label: `${n} \u00b7 Shelf \u00b7 bank offer decode`,
    date: "at Boost",
    note: "Plain words. We do not tell you to buy.",
  });
  return rows;
}

export function timelineCards(state) {
  const plan = cushionPlan(state);
  if (!plan.date) return [];
  const items = [];
  if (state.debtProblems === true) {
    const when = cashflowDate(state);
    items.push({
      id: "debt",
      go: "cashflow",
      at: when.getTime(),
      order: 0,
      tone: "pack",
      tag: "1 \u00b7 Debt fix",
      title: "Cashflow turns+",
      body: "Right Door / Sunday Pack path",
      date: cashflowLabel(state),
    });
  }
  items.push({
    id: "ef",
    go: "cushion",
    at: plan.date.getTime(),
    order: 1,
    tone: "ef",
    tag: state.debtProblems === true ? "2 \u00b7 Emergency fund" : "1 \u00b7 Emergency fund",
    title: "Cushion ready",
    body: "Floor on the future life plan",
    date: formatDay(plan.date),
  });
  const afterAt = plan.date.getTime() + 1;
  const goals = (state.goals || []).filter((goal) => parseIso(goal.date));
  if (!goals.length) {
    items.push({
      id: "after",
      go: "after",
      at: afterAt,
      order: 2,
      tone: "wait",
      tag: state.debtProblems === true ? "3 \u00b7 After dates" : "2 \u00b7 After dates",
      title: "Goals + Boost",
      body: "Unlocks after EF ready date",
      date: `After ${formatDay(plan.date)}`,
    });
  } else {
    goals.forEach((goal, index) => {
      const when = parseIso(goal.date);
      items.push({
        id: goal.id,
        go: "goals",
        at: when.getTime(),
        order: 10 + index,
        tone: "goal",
        tag: "Goal",
        title: goal.name,
        body: `HK$ ${formatMoney(parseAmount(goal.amount))}`,
        date: formatDay(when),
      });
    });
    items.push({
      id: "boost",
      go: "boost",
      at: afterAt,
      order: 50,
      tone: "boost",
      tag: "Boost",
      title: "Reference mixes",
      body: "Benchmark only \u00b7 then your bank",
      date: `After ${formatDay(plan.date)}`,
    });
    items.push({
      id: "shelf",
      go: "shelf",
      at: afterAt,
      order: 51,
      tone: "shelf",
      tag: "Shelf",
      title: "Bank offer decode",
      body: "Unbiased \u00b7 at Boost",
      date: "at Boost",
    });
  }
  items.sort((a, b) => a.at - b.at || a.order - b.order);
  return items;
}
