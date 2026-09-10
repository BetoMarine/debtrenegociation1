import { productHref } from "../paths.js";
import { CRUMB_COPY, crumbText } from "./crumbs.js";
import { ft } from "./copy.js";
import { boardCoachActions, isEmptyPot, shouldShowCoach } from "./coach.js";
import { currentStage, journeyItems, layoutJourneyPins } from "./journey.js";
import {
  DEBT_BANDS,
  INCOME_BANDS,
  LEFTOVER_BANDS,
  SAVINGS_BANDS,
  THEME_IDS,
  THEMES,
  hkd,
  monthYearLabel,
} from "./model.js";
import {
  DEBT_HEAT_IDS,
  fireLinkOrder,
  needsFireCard,
  prefersSunday,
  stabilizeSnapshot,
} from "./stabilize.js";
import { TEMPLATE_DISCLAIMER, TEMPLATE_IDS, TEMPLATES, formatMuSigma } from "./templates.js";

export const FORTUNE_SCREENS = [
  "start",
  "where",
  "next",
  "board",
  "goal-edit",
  "net-edit",
  "compare",
  "sheet",
  "more",
  "adjust",
  "money",
  "theme",
  "triage",
  "stabilize",
];

export function renderFortune(screen, host) {
  const view = {
    start: renderStart,
    where: renderWhere,
    theme: renderWhere,
    next: renderNext,
    triage: renderNext,
    stabilize: renderNext,
    money: renderMoney,
    board: renderBoard,
    "goal-edit": renderGoalEdit,
    "net-edit": renderNetEdit,
    compare: renderCompare,
    sheet: renderSheet,
    more: renderMore,
    adjust: renderAdjust,
  }[screen];
  (view || renderWhere)(host);
}

function t(key, vars) {
  return ft(key, vars);
}

function choiceClass(on) {
  return on ? "choice selected" : "choice";
}

export function dialTone(pct, hardFail) {
  if (hardFail || pct < 20) return "wreck";
  if (pct < 40) return "low";
  if (pct < 70) return "mid";
  return "ok";
}

function renderDials(host, { sticky } = {}) {
  const { forecast, escapeHtml, busy } = host;
  const living = forecast?.livingPct;
  const net = forecast?.netPct;
  const hard = !!forecast?.hardFail;
  const verdict = forecast?.verdict;
  const coaching = shouldShowCoach(forecast);
  const wrap = sticky ? "ft-dials ft-dials-sticky" : "ft-dials";
  let headline = t("pathPending");
  if (forecast) {
    headline = coaching && (verdict === "wrecked" || hard) ? t("coachTitle") : t(`verdicts.${verdict}`);
  } else if (busy) {
    headline = t("pathPending");
  }
  return `
    <section class="${wrap}" aria-label="${escapeHtml(t("dialsKicker"))}">
      <div class="ft-dial-row">
        ${dialMarkup("living", t("livingDial"), living, t("livingHint"), hard, escapeHtml)}
        ${dialMarkup("net", t("netDial"), net, t("netHint"), hard, escapeHtml)}
      </div>
      <p class="ft-verdict ${hard ? "wreck" : forecast ? verdict : "wait"}">${escapeHtml(headline)}</p>
    </section>
  `;
}

function dialMarkup(kind, label, pct, hint, hard, escapeHtml) {
  const ready = pct != null && Number.isFinite(Number(pct));
  const tone = !ready ? "wait" : dialTone(pct, hard);
  const shown = ready ? Math.round(pct) : "";
  const text = ready ? `${Math.round(pct)}%` : "…";
  const pctStyle = ready ? `--pct:${shown}` : "";
  return `
    <div class="ft-dial tone-${tone}${ready ? "" : " is-pending"}" data-kind="${kind}" style="${pctStyle}">
      <div class="ft-dial-ring" aria-hidden="true"></div>
      <div class="ft-dial-read">
        <strong>${text}</strong>
        <span>${escapeHtml(label)}</span>
      </div>
      <p class="tiny">${escapeHtml(hint)}</p>
    </div>
  `;
}

function renderStart(host) {
  const { el, escapeHtml, isStandalone } = host;
  const body = el(`<div class="stack"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("startKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("startTitle"))}</h1>`));
  body.append(el(`<p class="lede">${escapeHtml(t("startLead"))}</p>`));
  const bullets = t("startBullets") || [];
  const list = el(`<div class="card privacy"><ul class="ft-bullets"></ul></div>`);
  bullets.forEach((line) => {
    list.querySelector("ul").append(el(`<li>${escapeHtml(line)}</li>`));
  });
  body.append(list);
  if (!isStandalone) {
    body.append(el(`<p class="tiny">${escapeHtml(t("addHome"))}: ${escapeHtml(t("addHomeHow"))}</p>`));
  }
  body.append(el(`<div class="nav"><button class="btn btn-primary" data-act="accept-start" type="button">${escapeHtml(t("startCta"))}</button></div>`));
  host.shellFortune(body);
  host.root.querySelector('[data-act="accept-start"]')?.addEventListener("click", () => host.acceptStart());
}

const THEME_ICONS = {
  rebuild: `<svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="36" cy="28" r="11"/><path d="M18 58c3-14 10-20 18-20s15 6 18 20"/><path d="M44 20l10-8M54 16v10h-10"/></svg>`,
  steady: `<svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 34L36 14l24 20"/><path d="M20 32v24h32V32"/><path d="M30 56V40h12v16"/></svg>`,
  grow: `<svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 54V34h12v20"/><path d="M32 54V22h12v32"/><path d="M48 54V12h12v42"/><path d="M12 58h48"/></svg>`,
};

function renderWhere(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(
    `<div class="stack"><p class="kicker">${escapeHtml(t("whereKicker"))}</p><h1>${escapeHtml(t("whereTitle"))}</h1><p class="lede">${escapeHtml(t("whereLead"))}</p></div>`,
  );
  if (host.canOpenPlan) {
    const resume = el(
      `<div class="nav ft-looks-right"><button class="btn btn-primary" type="button" data-act="open-plan">${escapeHtml(t("looksRightCta"))}</button></div>`,
    );
    resume.querySelector('[data-act="open-plan"]').addEventListener("click", () => host.openPlan());
    body.append(resume);
    body.append(el(`<p class="tiny">${escapeHtml(t("whereOrChange"))}</p>`));
  }
  const grid = el(`<div class="ft-life-grid"></div>`);
  THEME_IDS.forEach((id) => {
    const theme = THEMES[id];
    const hero = !!theme.hero || id === "rebuild";
    const chips = (theme.chips || [])
      .map((c) => `<span class="ft-life-goal">${escapeHtml(c)}</span>`)
      .join("");
    const btn = el(
      `<button class="ft-life-card${plan.theme === id ? " selected" : ""}${hero ? " ft-theme-hero" : ""}" type="button" data-theme="${id}">
        ${hero ? `<span class="tag">${escapeHtml(t("themeHeroTag"))}</span>` : ""}
        <span class="ft-life-icon" aria-hidden="true">${THEME_ICONS[id] || ""}</span>
        <strong>${escapeHtml(t(`themes.${id}.label`))}</strong>
        <span class="hint">${escapeHtml(t(`themes.${id}.blurb`))}</span>
        <span class="ft-life-goals">${chips}</span>
      </button>`,
    );
    btn.addEventListener("click", () => host.pickTheme(id));
    grid.append(btn);
  });
  body.append(grid);
  host.shellFortune(body);
}

function renderFireCard(heat, escapeHtml) {
  const order = fireLinkOrder(heat);
  const labels = { "right-door": t("fireRightDoor"), sunday: t("fireSunday") };
  const links = order
    .map((which, i) => {
      const cls = i === 0 ? "btn btn-primary ext" : "btn ext";
      return `<a class="${cls}" href="${escapeHtml(productHref(which))}">${escapeHtml(labels[which])}</a>`;
    })
    .join("");
  return `
    <section class="card ft-fire" data-fire>
      <p class="tag">${escapeHtml(t("stageFix"))}</p>
      <h2>${escapeHtml(t("fireTitle"))}</h2>
      <p>${escapeHtml(prefersSunday(heat) ? t("fireLeadFdw") : t("fireLead"))}</p>
      <div class="nav">${links}</div>
      <p class="tiny">${escapeHtml(t("fireHint"))}</p>
    </section>
  `;
}

function moneyFields(plan, escapeHtml) {
  return [
    bandField("incomeBand", t("income"), INCOME_BANDS, plan.money.incomeBand, escapeHtml),
    bandField("savingsBand", t("savings"), SAVINGS_BANDS, plan.money.savingsBand, escapeHtml),
    bandField("debtsBand", t("debts"), DEBT_BANDS, plan.money.debtsBand, escapeHtml),
    bandField("leftoverBand", t("leftover"), LEFTOVER_BANDS, plan.money.leftoverBand || "5_10", escapeHtml),
  ].join("");
}

function renderNext(host) {
  const theme = host.plan?.theme;
  if (theme === "grow") return renderNextGrow(host);
  if (theme === "steady") return renderNextSteady(host);
  return renderNextRebuild(host);
}

function renderNextRebuild(host) {
  const { el, escapeHtml, plan } = host;
  const snap = stabilizeSnapshot(plan);
  const body = el(`<div class="stack ft-next"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("nextKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("nextRebuildTitle"))}</h1>`));
  body.append(el(`<p class="lede">${escapeHtml(t("nextRebuildLead"))}</p>`));

  DEBT_HEAT_IDS.forEach((id) => {
    const btn = el(
      `<button class="${choiceClass(plan.debtHeat === id)}" type="button" data-heat="${id}">
        <strong>${escapeHtml(t(`debtHeat.${id}.label`))}</strong>
      </button>`,
    );
    btn.addEventListener("click", () => host.pickDebtHeat(id));
    body.append(btn);
  });
  if (needsFireCard(plan.debtHeat)) {
    body.insertAdjacentHTML("beforeend", renderFireCard(plan.debtHeat, escapeHtml));
  }

  const monthChoices = [3, 6]
    .map(
      (n) =>
        `<button class="${choiceClass(snap.targetMonths === n)}" type="button" data-months="${n}">${escapeHtml(
          t(n === 3 ? "stabilizeMonths3" : "stabilizeMonths6"),
        )}</button>`,
    )
    .join("");
  const form = el(`<form class="stack" data-form="next-money"></form>`);
  form.innerHTML = `
    <p class="tag">${escapeHtml(t("stageStabilize"))} · ${escapeHtml(t("floorLabel"))}</p>
    <div class="nav ft-month-picks">${monthChoices}</div>
    <p class="tag">${escapeHtml(t("moneyTitle"))}</p>
    ${moneyFields(plan, escapeHtml)}
  `;
  body.append(form);
  const ctaClass = needsFireCard(plan.debtHeat) ? "btn" : "btn btn-primary";
  body.append(
    el(
      `<div class="nav"><button class="${ctaClass}" type="button" data-act="finish-step2">${escapeHtml(t("nextSeeLife"))}</button>
      <button class="btn btn-ghost" data-go="where" type="button">${escapeHtml(t("backWhere"))}</button></div>`,
    ),
  );
  host.shellFortune(body);
  bindNextMoney(host, form);
  host.root.querySelector('[data-act="finish-step2"]')?.addEventListener("click", () => {
    syncNextMoney(host, form);
    host.finishStep2();
  });
}

function renderNextSteady(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(`<div class="stack ft-next"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("nextKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("nextSteadyTitle"))}</h1>`));
  body.append(el(`<p class="lede">${escapeHtml(t("nextSteadyLead"))}</p>`));
  const form = el(`<form class="stack" data-form="next-money">${moneyFields(plan, escapeHtml)}</form>`);
  body.append(form);
  body.append(
    el(`<div class="nav">
      <button class="btn btn-primary" type="button" data-act="finish-step2">${escapeHtml(t("nextSeeLife"))}</button>
      <button class="btn btn-ghost" type="button" data-act="skip-step2">${escapeHtml(t("nextSkipBoard"))}</button>
    </div>`),
  );
  host.shellFortune(body);
  bindNextMoney(host, form);
  host.root.querySelector('[data-act="finish-step2"]')?.addEventListener("click", () => {
    syncNextMoney(host, form);
    host.finishStep2();
  });
  host.root.querySelector('[data-act="skip-step2"]')?.addEventListener("click", () => host.skipStep2());
}

function renderNextGrow(host) {
  const { el, escapeHtml, draftGoal } = host;
  const body = el(`<div class="stack ft-next"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("nextKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("nextGrowTitle"))}</h1>`));
  body.append(el(`<p class="lede">${escapeHtml(t("nextGrowLead"))}</p>`));
  const form = el(`<form class="stack" data-form="grow-goal"></form>`);
  form.innerHTML = goalFields(draftGoal, escapeHtml, t("nextSeeLife"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    host.saveGoal({
      name: String(fd.get("name") || ""),
      amount: String(fd.get("amount") || ""),
      months: Number(fd.get("months")),
    });
  });
  body.append(form);
  body.append(
    el(
      `<div class="nav"><button class="btn btn-ghost" type="button" data-act="skip-step2">${escapeHtml(t("nextSkipBoard"))}</button></div>`,
    ),
  );
  host.shellFortune(body);
  host.root.querySelector('[data-act="skip-step2"]')?.addEventListener("click", () => host.skipStep2());
}

function bindNextMoney(host, form) {
  form.querySelectorAll("[data-months]").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncNextMoney(host, form);
      host.patchStabilize({ stabilizeTargetMonths: Number(btn.dataset.months) });
    });
  });
}

function syncNextMoney(host, form) {
  const fd = new FormData(form);
  host.patchStabilize({
    money: {
      incomeBand: String(fd.get("incomeBand") || host.plan.money.incomeBand),
      savingsBand: String(fd.get("savingsBand") || host.plan.money.savingsBand),
      debtsBand: String(fd.get("debtsBand") || host.plan.money.debtsBand),
      leftoverBand: String(fd.get("leftoverBand") || host.plan.money.leftoverBand || "5_10"),
    },
  });
}

function bandField(name, label, list, selected, escapeHtml) {
  const options = list
    .map((b) => `<option value="${b.id}" ${b.id === selected ? "selected" : ""}>${escapeHtml(b.label)}</option>`)
    .join("");
  return `<label class="field">${escapeHtml(label)}<select name="${name}">${options}</select></label>`;
}

function renderMoney(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(`<div class="stack"><h1>${escapeHtml(t("moneyTitle"))}</h1></div>`);
  const form = el(`<form class="stack" data-form="money"></form>`);
  form.innerHTML = `${moneyFields(plan, escapeHtml)}
    <div class="nav"><button class="btn btn-primary" type="submit">${escapeHtml(t("continue"))}</button>
     <button class="btn btn-ghost" data-go="board" type="button">${escapeHtml(t("back"))}</button></div>`;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    host.saveMoney({
      incomeBand: String(fd.get("incomeBand")),
      savingsBand: String(fd.get("savingsBand")),
      debtsBand: String(fd.get("debtsBand")),
      leftoverBand: String(fd.get("leftoverBand")),
    });
  });
  body.append(form);
  host.shellFortune(body);
}

function renderCrumb(host) {
  if (!host.crumb) return "";
  const text = CRUMB_COPY[host.crumb] ? crumbText(host.crumb) : host.crumb;
  return `
    <div class="ft-crumb" role="status">
      <p>${host.escapeHtml(text)}</p>
      <button class="btn btn-ghost" type="button" data-act="dismiss-crumb">${host.escapeHtml(t("crumbClose"))}</button>
    </div>
  `;
}

function renderCoach(host) {
  const { plan, forecast, escapeHtml } = host;
  if (!shouldShowCoach(forecast)) return "";
  const empty = isEmptyPot(plan);
  const title = forecast.hardFail || forecast.verdict === "wrecked" ? t("coachTitle") : t("coachTitleStretched");
  const line = empty ? t("coachEmpty") : t("coachSub");
  const actions = boardCoachActions(plan, forecast)
    .map((action) => {
      const cls = action.kind === "primary" ? "ft-chip-btn primary" : "ft-chip-btn";
      return `<button class="${cls}" type="button" data-coach="${escapeHtml(action.key)}">${escapeHtml(action.label)}</button>`;
    })
    .join("");
  return `
    <section class="card ft-coach" data-coach-card>
      <p class="ft-coach-line"><strong>${escapeHtml(title)}</strong> ${escapeHtml(line)}</p>
      <div class="ft-coach-actions">${actions}</div>
    </section>
  `;
}

function stageCopy(stage) {
  const key = `stage${String(stage || "plan")[0].toUpperCase()}${String(stage || "plan").slice(1)}`;
  return t(key);
}

function renderBoard(host) {
  const { el, escapeHtml, plan, forecast, busy } = host;
  const body = el(`<div class="stack ft-board"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("boardKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("boardTitle"))}</h1>`));
  body.insertAdjacentHTML("beforeend", renderDials(host, { sticky: true }));
  if (busy && forecast) body.append(el(`<p class="hint">${escapeHtml(t("running"))}</p>`));
  body.insertAdjacentHTML("beforeend", renderCoach(host));
  body.insertAdjacentHTML("beforeend", renderCrumb(host));

  const horizon = forecast?.horizonMonths || 48;
  const here = currentStage(plan, forecast);
  const youAreIn = t("youAreIn", { stage: stageCopy(here) });
  body.append(el(`<p class="ft-path-kicker">${escapeHtml(t("timelineTitle"))}</p>`));
  body.append(el(`<p class="ft-path-status" data-stage-status>${escapeHtml(youAreIn)}</p>`));
  body.append(el(`<p class="tiny">${escapeHtml(t("timelineHint"))}</p>`));
  body.append(el(renderTimeline(plan, forecast, horizon, escapeHtml)));

  const addCls = shouldShowCoach(forecast) ? "btn" : "btn btn-primary";
  body.append(el(`<button class="${addCls}" type="button" data-act="add-goal">${escapeHtml(t("addGoalCta"))}</button>`));
  body.append(el(`<button class="btn btn-ghost" data-go="adjust" type="button">${escapeHtml(t("adjustCta"))}</button>`));

  host.shellFortune(body);
  bindBoard(host);
}

function renderTimeline(plan, forecast, horizon, escapeHtml) {
  const months = Math.max(12, horizon);
  const items = layoutJourneyPins(journeyItems(plan, forecast));
  const beats = items
    .map((item) => {
      const pending = (item.kind === "goal" || item.kind === "floor") && item.pct == null;
      const shown =
        item.kind === "today"
          ? t("pathNow")
          : item.kind === "action" && item.pct == null
            ? "→"
            : pending
              ? "…"
              : `${item.pct}%`;
      const tone = pending
        ? "wait"
        : item.kind === "today"
          ? "today"
          : item.kind === "action" && item.pct == null
            ? "fix"
            : dialTone(item.pct, !!forecast?.hardFail);
      const stage = stageCopy(item.stage);
      const when = item.months === 0 ? t("today") : monthYearLabel(item.months);
      const drag = item.draggable ? `data-chip="${escapeHtml(item.id)}"` : `data-static="${escapeHtml(item.id)}"`;
      return `<button type="button" class="ft-beat tone-${tone} stage-${item.stage}${item.draggable ? " is-drag" : ""}${pending ? " is-pending" : ""}" ${drag} data-months="${item.months}" aria-label="${escapeHtml(stage)} · ${escapeHtml(item.name)} ${shown}">
        <span class="ft-beat-dot ft-pin-pct">${shown}</span>
        <span class="ft-beat-stage">${escapeHtml(stage)}</span>
        <span class="ft-beat-name">${escapeHtml(item.shortName || item.name)}</span>
        <span class="ft-beat-when">${escapeHtml(when)}</span>
      </button>`;
    })
    .join("");
  const cols = Math.max(items.length, 1);
  return `
    <div class="ft-timeline" data-timeline data-horizon="${months}" style="--ft-beats:${cols}">
      <svg class="ft-path" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
        <path d="M6 22 C 28 10, 72 32, 94 16" fill="none" stroke="url(#ft-path-stroke)" stroke-width="2.2" stroke-linecap="round"/>
        <defs>
          <linearGradient id="ft-path-stroke" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#7e22ce"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
      </svg>
      <div class="ft-beats">${beats}</div>
    </div>
  `;
}

function bindBoard(host) {
  const root = host.root;
  root.querySelector('[data-act="dismiss-crumb"]')?.addEventListener("click", () => host.dismissCrumb());
  root.querySelector('[data-act="add-goal"]')?.addEventListener("click", () => host.editGoal(null));
  root.querySelectorAll("[data-edit-goal]").forEach((btn) => {
    btn.addEventListener("click", () => host.editGoal(btn.dataset.editGoal));
  });
  root.querySelectorAll("[data-coach]").forEach((btn) => {
    btn.addEventListener("click", () => host.applyCoach(btn.dataset.coach));
  });
  host.bindTimeline(root.querySelector("[data-timeline]"));
}

function monthOptions(selectedMonths, escapeHtml) {
  const now = new Date();
  const opts = [];
  for (let i = 1; i <= 180; i += 1) {
    const label = monthYearLabel(i, now);
    opts.push(`<option value="${i}" ${Number(selectedMonths) === i ? "selected" : ""}>${escapeHtml(label)}</option>`);
  }
  return opts.join("");
}

function goalFields(draftGoal, escapeHtml, submitLabel) {
  return `
    <label class="field">${escapeHtml(t("goalName"))}
      <input name="name" maxlength="80" required placeholder="${escapeHtml(t("goalNamePh"))}" value="${escapeHtml(draftGoal.name)}" data-select-on-focus="1" />
    </label>
    <label class="field">${escapeHtml(t("goalAmount"))}
      <input name="amount" inputmode="numeric" required placeholder="80000" value="${escapeHtml(draftGoal.amount)}" />
    </label>
    <label class="field">${escapeHtml(t("goalWhen"))}
      <select name="months">${monthOptions(draftGoal.months || 12, escapeHtml)}</select>
    </label>
    <div class="nav">
      <button class="btn btn-primary" type="submit">${escapeHtml(submitLabel)}</button>
    </div>
  `;
}

function renderGoalEdit(host) {
  const { el, escapeHtml, draftGoal, editingGoalId } = host;
  const title = editingGoalId ? t("editGoal") : t("addGoalTitle");
  const body = el(`<div class="stack"><h1>${escapeHtml(title)}</h1></div>`);
  const form = el(`<form class="stack" data-form="goal"></form>`);
  form.innerHTML = `
    <label class="field">${escapeHtml(t("goalName"))}
      <input name="name" maxlength="80" required placeholder="${escapeHtml(t("goalNamePh"))}" value="${escapeHtml(draftGoal.name)}" data-select-on-focus="1" />
    </label>
    <label class="field">${escapeHtml(t("goalAmount"))}
      <input name="amount" inputmode="numeric" required placeholder="80000" value="${escapeHtml(draftGoal.amount)}" />
    </label>
    <label class="field">${escapeHtml(t("goalWhen"))}
      <select name="months">${monthOptions(draftGoal.months || 12, escapeHtml)}</select>
    </label>
    <div class="nav">
      <button class="btn btn-primary" type="submit">${escapeHtml(t("saveGoal"))}</button>
      ${editingGoalId ? `<button class="btn btn-accent" data-act="delete-goal" type="button">${escapeHtml(t("remove"))}</button>` : ""}
      <button class="btn btn-ghost" data-go="board" type="button">${escapeHtml(t("cancel"))}</button>
    </div>
  `;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    host.saveGoal({
      name: String(fd.get("name") || ""),
      amount: String(fd.get("amount") || ""),
      months: Number(fd.get("months")),
    });
  });
  body.append(form);
  host.shellFortune(body);
  host.root.querySelector('[data-act="delete-goal"]')?.addEventListener("click", () => host.deleteGoal());
  host.root.querySelector("[data-select-on-focus]")?.addEventListener("focus", (e) => e.target.select());
}

function renderNetEdit(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(
    `<div class="stack"><h1>${escapeHtml(t("netEditTitle"))}</h1><p class="hint">${escapeHtml(t("netHintEdit"))}</p></div>`,
  );
  const form = el(`<form class="stack"></form>`);
  form.innerHTML = `
    <label class="field">${escapeHtml(t("netMonths"))}
      <input name="emergencyMonths" type="number" min="0" max="36" value="${escapeHtml(plan.net.emergencyMonths)}" />
    </label>
    <label class="field">${escapeHtml(t("netFloor"))}
      <input name="floorHkd" inputmode="numeric" value="${escapeHtml(plan.net.floorHkd)}" />
    </label>
    <div class="nav">
      <button class="btn btn-primary" type="submit">${escapeHtml(t("saveNet"))}</button>
      <button class="btn btn-ghost" data-go="adjust" type="button">${escapeHtml(t("back"))}</button>
    </div>
  `;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    host.saveNet({
      emergencyMonths: Number(fd.get("emergencyMonths")),
      floorHkd: Number(fd.get("floorHkd")),
    });
  });
  body.append(form);
  host.shellFortune(body);
}

function renderCompare(host) {
  const { el, escapeHtml, plan, compare } = host;
  const body = el(`<div class="stack"><h1>${escapeHtml(t("compareTitle"))}</h1><p class="hint">${escapeHtml(t("compareHint"))}</p></div>`);
  body.insertAdjacentHTML("beforeend", renderDials(host));
  body.insertAdjacentHTML("beforeend", renderCrumb(host));
  if (!plan.milestones.length) {
    body.append(el(`<p class="hint">${escapeHtml(t("goalsEmpty"))}</p>`));
  } else {
    const sel = el(`<label class="field">${escapeHtml(t("comparePick"))}<select data-act="compare-pick"></select></label>`);
    const select = sel.querySelector("select");
    plan.milestones.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} · ${hkd(m.amount)}`;
      if (m.id === plan.compareMilestoneId) opt.selected = true;
      select.append(opt);
    });
    select.addEventListener("change", () => host.setCompareMilestone(select.value));
    body.append(sel);
  }
  if (compare) {
    body.append(
      el(`
        <div class="ft-compare">
          <div class="card">
            <p class="tag">${escapeHtml(t("compareSave"))}</p>
            <p>${escapeHtml(t("compareLiving"))}: <strong>${Math.round(compare.livingSave)}%</strong></p>
            <p>${escapeHtml(t("compareNet"))}: <strong>${Math.round(compare.netSave)}%</strong></p>
            <p class="tiny">${escapeHtml(t("compareGap"))}: ${escapeHtml(hkd(compare.typicalGap))}</p>
          </div>
          <div class="card">
            <p class="tag">${escapeHtml(t("compareBorrow"))}</p>
            <p>${escapeHtml(t("compareLiving"))}: <strong>${Math.round(compare.livingBorrow)}%</strong></p>
            <p>${escapeHtml(t("compareNet"))}: <strong>${Math.round(compare.netBorrow)}%</strong></p>
            <p class="tiny">${escapeHtml(t("compareInterest"))}: ${escapeHtml(hkd(compare.extraInterest))}</p>
          </div>
        </div>
      `),
    );
    body.append(el(`<p class="tiny">${escapeHtml(t("borrowAprNote"))}</p>`));
  }
  body.append(
    el(`<div class="nav"><button class="btn btn-ghost" data-go="adjust" type="button">${escapeHtml(t("back"))}</button></div>`),
  );
  host.shellFortune(body);
  host.root.querySelector('[data-act="dismiss-crumb"]')?.addEventListener("click", () => host.dismissCrumb());
}

function renderSheet(host) {
  const { el, escapeHtml, busy } = host;
  const body = el(`<div class="stack"><h1>${escapeHtml(t("sheetTitle"))}</h1><p>${escapeHtml(t("sheetLead"))}</p></div>`);
  body.insertAdjacentHTML("beforeend", renderDials(host));
  body.append(el(`<p class="hint">${escapeHtml(t("compliance"))}</p>`));
  body.append(
    el(`
      <div class="nav">
        <button class="btn btn-primary" data-act="pdf-share" type="button" ${busy ? "disabled" : ""}>${escapeHtml(t("sheetShare"))}</button>
        <button class="btn" data-act="pdf-dl" type="button" ${busy ? "disabled" : ""}>${escapeHtml(t("sheetDownload"))}</button>
        <button class="btn btn-ghost" data-go="adjust" type="button">${escapeHtml(t("back"))}</button>
      </div>
    `),
  );
  host.shellFortune(body);
  host.root.querySelector('[data-act="pdf-share"]')?.addEventListener("click", () => host.handlePdf("share"));
  host.root.querySelector('[data-act="pdf-dl"]')?.addEventListener("click", () => host.handlePdf("download"));
}

function renderMore(host) {
  const { el, escapeHtml } = host;
  const body = el(`<div class="stack"><h1>${escapeHtml(t("moreTitle"))}</h1><p class="hint">${escapeHtml(t("exportHint"))}</p></div>`);
  body.append(el(`<button class="btn btn-primary" data-act="export" type="button">${escapeHtml(t("exportJson"))}</button>`));
  body.append(el(`<button class="btn btn-accent" data-act="clear" type="button">${escapeHtml(t("clear"))}</button>`));
  body.append(el(`<p class="hint">${escapeHtml(t("compliance"))}</p>`));
  body.append(el(`<div class="nav"><button class="btn btn-ghost" data-go="adjust" type="button">${escapeHtml(t("back"))}</button></div>`));
  host.shellFortune(body);
  host.root.querySelector('[data-act="export"]')?.addEventListener("click", () => host.exportJson());
  host.root.querySelector('[data-act="clear"]')?.addEventListener("click", () => host.clearPlan());
}

function renderAdjust(host) {
  const { el, escapeHtml, plan, forecast } = host;
  const body = el(
    `<div class="stack ft-adjust"><p class="kicker">${escapeHtml(t("adjustCta"))}</p><h1>${escapeHtml(t("adjustTitle"))}</h1><p class="lede">${escapeHtml(t("adjustLead"))}</p></div>`,
  );
  body.append(el(`<p class="tag">${escapeHtml(t("templateTitle"))}</p>`));
  body.append(el(`<p class="tiny">${escapeHtml(t("templatesHint"))}</p>`));
  TEMPLATE_IDS.forEach((id) => {
    const tmpl = TEMPLATES[id];
    const btn = el(`
      <button class="${choiceClass(plan.templateId === id)} ft-template" type="button" data-template="${id}">
        <strong>${escapeHtml(tmpl.label)}</strong>
        <span class="hint">${escapeHtml(formatMuSigma(tmpl))}</span>
        <span class="hint">${escapeHtml(tmpl.mix)}</span>
        <span class="tiny">${escapeHtml(TEMPLATE_DISCLAIMER)}</span>
      </button>
    `);
    body.append(btn);
  });
  body.append(
    el(`
    <label class="ft-check">
      <input type="checkbox" data-act="inflation" ${plan.inflationOn ? "checked" : ""} />
      <span>${escapeHtml(t("inflationLabel"))}</span>
    </label>
  `),
  );
  if (forecast) {
    body.append(
      el(
        `<p class="tiny">${escapeHtml(t("medianPot"))}: ${escapeHtml(hkd(forecast.medianWealth))}<br/>${escapeHtml(
          t("pathsLine", { n: String(forecast.paths), seed: String(forecast.seed) }),
        )}</p>`,
      ),
    );
  }
  body.append(
    el(`
      <div class="nav">
        <button class="btn" data-go="money" type="button">${escapeHtml(t("moneyTitle"))}</button>
        <button class="btn" data-go="net-edit" type="button">${escapeHtml(t("netTitle"))}</button>
        <button class="btn" data-go="compare" type="button">${escapeHtml(t("compareCta"))}</button>
        <button class="btn" data-go="sheet" type="button">${escapeHtml(t("sheetCta"))}</button>
        <button class="btn" data-go="more" type="button">${escapeHtml(t("moreCta"))}</button>
        <button class="btn btn-ghost" data-act="shuffle" type="button">${escapeHtml(t("shuffle"))}</button>
        <button class="btn btn-primary" data-go="board" type="button">${escapeHtml(t("done"))}</button>
      </div>
    `),
  );
  host.shellFortune(body);
  body.querySelectorAll("[data-template]").forEach((btn) => {
    btn.addEventListener("click", () => host.pickTemplate(btn.dataset.template));
  });
  body.querySelector('[data-act="inflation"]')?.addEventListener("change", (e) => {
    host.setInflation(e.target.checked);
  });
  body.querySelector('[data-act="shuffle"]')?.addEventListener("click", () => host.shuffleSeed());
}
