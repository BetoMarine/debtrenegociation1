/**
 * Your life numbers for Slice B.
 * Stressed TODAY stays red. Stable / OK uses “Steady so far”.
 * Right Door contributes a cash-flow effect only after join — no RD UI here.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function amount(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(/HK\$/gi, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function days(raw) {
  const s = String(raw ?? "").trim();
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

function grouped(n) {
  return Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatPlain(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  return grouped(n);
}

export function formatSigned(n) {
  if (n == null || !Number.isFinite(n)) return "\u2014";
  const rounded = Math.round(n);
  if (rounded < 0) return `\u2013${grouped(rounded)}`;
  if (rounded > 0) return `+${grouped(rounded)}`;
  return "0";
}

function formatDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function addMonths(date, count) {
  const next = new Date(date.getTime());
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + count);
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, last));
  return next;
}

/** True once Right Door or a Fix handoff has actually joined. A blank draft pack does not count. */
export function rightDoorJoined(pack, handoff) {
  if (handoff && (handoff.source === "right-door" || handoff.source === "sunday")) return true;
  if (!pack || typeof pack !== "object") return false;
  const situation = pack.situation;
  if (situation?.tenorStored === true) return true;
  if (String(pack.fullName || "").trim()) return true;
  const status = String(pack.status || "");
  return Boolean(status) && status !== "draft";
}

/**
 * Cash flow after renegotiation.
 * Still due stays in the month; overdue is the strain Right Door takes on.
 * When that still leaves a deficit, the missed amount is the positive turn.
 */
export function rightDoorEffectNet({ income, stillDue, overdue }) {
  if (income == null) return null;
  const still = stillDue ?? 0;
  const missed = overdue ?? 0;
  const forward = income - still;
  if (forward > 0) return forward;
  if (missed > 0) return missed;
  return Math.max(1, Math.round(income * 0.05));
}

const MOVE_LABEL = {
  takeHome: "take-home updated",
  stillDue: "still due updated",
  overdue: "overdue updated",
  daysLate: "days late updated",
  cushionNow: "cushion input",
  cushionTarget: "cushion input",
  monthlyCosts: "costs updated",
  monthlySave: "monthly save",
  goalAmount: "goal amount in",
  cover: "cover updated",
};

function moneyInputs(state) {
  const inputs = state?.inputs || {};
  return {
    income: amount(inputs.takeHome?.amount),
    stillDue: amount(inputs.stillDue?.amount),
    overdue: amount(inputs.overdue?.amount),
    daysLate: days(inputs.daysLate?.days),
    now: amount(inputs.cushionNow?.amount),
    target: amount(inputs.cushionTarget?.amount),
    costs: amount(inputs.monthlyCosts?.amount),
    save: amount(inputs.monthlySave?.amount),
    goal: amount(inputs.goalAmount?.amount),
    cover: amount(inputs.cover?.amount),
  };
}

function expensesOf(money) {
  if (money.costs != null) return money.costs;
  if (money.stillDue == null && money.overdue == null) return null;
  return (money.stillDue || 0) + (money.overdue || 0);
}

function burdenOf(money) {
  if (money.stillDue == null && money.overdue == null) return null;
  return (money.stillDue || 0) + (money.overdue || 0);
}

function monthsOf(now, target, save) {
  if (now == null || target == null || save == null || save <= 0) return null;
  const gap = target - now;
  if (gap <= 0) return 0;
  return Math.ceil(gap / save);
}

function netOf(money, expenses) {
  if (money.income == null) return null;
  if (expenses == null) return money.income;
  return money.income - expenses;
}

function pctOf(now, target) {
  if (now == null || target == null || target <= 0) return null;
  return Math.round((now / target) * 100);
}

function toneOf(entry) {
  if (entry === "stressed") return "strain";
  if (entry === "stable" || entry === "ok") return "steady";
  return "open";
}

function pillOf(entry) {
  if (entry === "stressed") return { tone: "warn", label: "Get through this month" };
  if (entry === "stable") return { tone: "ok", label: "Build a cushion" };
  if (entry === "ok") return { tone: "ok", label: "Plan what\u2019s next" };
  return null;
}

function todayCopy(tone, net) {
  if (tone === "strain") {
    return {
      kicker: "If nothing changes",
      netClass: "neg",
      graph: "down-red",
      ask: net != null && net >= 0 ? "Why this month stays under strain." : "Why the cash flow is negative.",
      quiet: "If nothing changes, the trend only worsens.",
    };
  }
  if (tone === "steady") {
    return {
      kicker: "Steady so far",
      netClass: "pos",
      graph: "up-teal",
      ask: "Why this month is steady.",
      quiet: "Steady so far.",
    };
  }
  return {
    kicker: "Add your take-home",
    netClass: "muted",
    graph: "flat",
    ask: "Where this month\u2019s cash flow stands.",
    quiet: "",
  };
}

function deltaLine(move, current, was) {
  if (!move || current === was) return "";
  const label = MOVE_LABEL[move.key] || "input updated";
  return `Was ${formatSigned(was)} \u00b7 ${label}`;
}

export function buildLife(state) {
  const money = moneyInputs(state);
  const expenses = expensesOf(money);
  const burden = burdenOf(money);
  const net = netOf(money, expenses);
  const pct = pctOf(money.now, money.target);
  const months = monthsOf(money.now, money.target, money.save);
  const tone = toneOf(state?.entry);
  const copy = todayCopy(tone, net);
  const move = state?.lifeMove || null;
  const asOf = state?.asOf instanceof Date ? state.asOf : new Date();
  const joined = state?.rightDoorJoined === true;
  const effect = joined
    ? rightDoorEffectNet({
        income: money.income,
        stillDue: money.stillDue,
        overdue: money.overdue,
      })
    : null;

  const netMoved = Boolean(
    move &&
      ["takeHome", "stillDue", "overdue", "monthlyCosts"].includes(move.key) &&
      move.wasNet != null &&
      move.wasNet !== net,
  );
  const burdenMoved = Boolean(
    move &&
      money.costs != null &&
      (move.key === "stillDue" || move.key === "overdue") &&
      move.wasBurden != null &&
      move.wasBurden !== burden,
  );
  const daysMoved = Boolean(move && move.key === "daysLate" && move.wasDays != null && move.wasDays !== money.daysLate);
  const efMoved = Boolean(
    move &&
      (move.key === "cushionNow" || move.key === "cushionTarget") &&
      (move.wasNow != null || move.wasPct != null) &&
      (move.wasNow !== money.now || move.wasPct !== pct),
  );

  let efDelta = "";
  if (efMoved) {
    const wasNow = formatPlain(move.wasNow);
    const wasPct = move.wasPct == null ? "\u2014" : `${move.wasPct}%`;
    efDelta = `Was ${wasNow} \u00b7 ${wasPct} \u00b7 cushion input`;
  }

  const year = asOf.getFullYear();
  return {
    tone,
    pill: pillOf(state?.entry),
    today: {
      date: formatDate(asOf),
      tone,
      kicker: copy.kicker,
      netClass: copy.netClass,
      graph: copy.graph,
      net,
      netText: `Net ${formatSigned(net)}`,
      meta: `Income ${formatPlain(money.income)} \u00b7 Expenses ${formatPlain(expenses)}`,
      delta: netMoved ? deltaLine(move, net, move.wasNet) : "",
      moved: netMoved,
      daysLate: money.daysLate,
      daysText: money.daysLate == null ? "" : `Days late ${money.daysLate}`,
      daysDelta: daysMoved ? `Was ${move.wasDays == null ? "\u2014" : move.wasDays} \u00b7 days late updated` : "",
      daysMoved,
      income: money.income,
      expenses,
      stillDue: money.stillDue,
      overdue: money.overdue,
      burden: money.costs != null ? burden : null,
      burdenText:
        money.costs != null && burden != null ? `Still due / overdue ${formatPlain(burden)}` : "",
      burdenDelta: burdenMoved ? `Was ${formatPlain(move.wasBurden)} \u00b7 ${MOVE_LABEL[move.key]}` : "",
    },
    rd: {
      date: formatDate(addMonths(asOf, 6)),
      joined,
      graph: joined ? "cross" : "wait",
      foot: joined
        ? effect == null
          ? "Trend starts positive"
          : `Trend starts positive \u00b7 Net +${formatPlain(effect)}`
        : "After Right Door completes",
      effect,
      note: "Live Right Door as-is \u2014 this frame shows Your life effect only.",
    },
    ef: {
      date: formatDate(addMonths(asOf, 12)),
      now: money.now,
      target: money.target,
      pct,
      foot: `Target ${formatPlain(money.target)} \u00b7 Now ${formatPlain(money.now)} \u00b7 ${pct == null ? "\u2014" : `${pct}%`}`,
      saveText: money.save == null ? "" : `Save ${formatPlain(money.save)} \u00b7 ${months == null ? "\u2014" : months} months`,
      delta: efDelta,
      moved: efMoved,
    },
    goal: money.goal,
    cover: money.cover,
    save: money.save,
    months,
    stubs: [
      {
        id: "invest",
        n: "4",
        title: "Invest & insurance",
        date: formatDate(addMonths(asOf, 18)),
        gtitle: "Cash only vs with invest",
        later: money.cover == null ? "Later pass \u00b7 Insurance \u00b7 Invest boost" : `Cover ${formatPlain(money.cover)} \u00b7 a month`,
        delta:
          move?.key === "cover" && money.cover !== move.wasCover
            ? move.wasCover == null
              ? "Was unset \u00b7 cover updated"
              : `Was ${formatPlain(move.wasCover)} \u00b7 cover updated`
            : "",
        graph: "invest",
      },
      {
        id: "goals",
        n: "5",
        title: "Goals",
        date: `${year + 2}\u2013${year + 6}`,
        gtitle: money.goal == null ? "Cash flow \u00b7 goal impact" : "Goal funding impact",
        later:
          money.goal == null
            ? "Later pass \u00b7 Per-goal % \u00b7 Overall success"
            : `Goal ${formatPlain(money.goal)} \u00b7 on track`,
        delta:
          move?.key === "goalAmount" && money.goal !== move.wasGoal
            ? move.wasGoal == null
              ? "Was unset \u00b7 goal amount in"
              : `Was ${formatPlain(move.wasGoal)} \u00b7 goal amount in`
            : "",
        graph: "goals",
      },
      {
        id: "age",
        n: "6",
        title: "Age 70",
        date: "open",
        gtitle: "",
        later: "",
        open: "Add milestones as you plan.",
        graph: "none",
      },
    ],
    detail: {
      title: "TODAY \u00b7 Net",
      ask: copy.ask,
      income: formatPlain(money.income),
      expenses: expenses == null ? "\u2014" : expenses > 0 ? `\u2013${formatPlain(expenses)}` : formatPlain(expenses),
      expensesOut: expenses != null && expenses > 0,
      net: formatSigned(net),
      netClass: copy.netClass,
      quiet: copy.quiet,
    },
  };
}
