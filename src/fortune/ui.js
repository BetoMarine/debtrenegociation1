import { productHref } from "../paths.js";
import { CRUMB_COPY, crumbText } from "./crumbs.js";
import { ft } from "./copy.js";
import {
  coachActions,
  coachBreakLines,
  isEmptyPot,
  shouldShowCoach,
} from "./coach.js";
import {
  DEBT_BANDS,
  INCOME_BANDS,
  SAVINGS_BANDS,
  SPEND_BANDS,
  THEME_IDS,
  THEMES,
  bandById,
  hkd,
  monthYearLabel,
  netNeedNow,
  resolveMoney,
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
  "theme",
  "triage",
  "stabilize",
  "money",
  "board",
  "goal-edit",
  "net-edit",
  "compare",
  "sheet",
  "more",
];

export function renderFortune(screen, host) {
  const view = {
    start: renderStart,
    theme: renderTheme,
    triage: renderTriage,
    stabilize: renderStabilize,
    money: renderMoney,
    board: renderBoard,
    "goal-edit": renderGoalEdit,
    "net-edit": renderNetEdit,
    compare: renderCompare,
    sheet: renderSheet,
    more: renderMore,
  }[screen];
  view(host);
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
  const { forecast, escapeHtml } = host;
  const living = forecast?.livingPct ?? 0;
  const net = forecast?.netPct ?? 0;
  const hard = !!forecast?.hardFail;
  const verdict = forecast?.verdict || "stretched";
  const coaching = shouldShowCoach(forecast);
  const wrap = sticky ? "ft-dials ft-dials-sticky" : "ft-dials";
  const headline = coaching && (verdict === "wrecked" || hard) ? t("coachTitle") : t(`verdicts.${verdict}`);
  const detail = coaching ? t("coachSub") : hard ? t("wreckedDetail") : t("notSet");
  return `
    <section class="${wrap}" aria-label="${escapeHtml(t("dialsKicker"))}">
      <p class="kicker">${escapeHtml(t("dialsKicker"))}</p>
      <div class="ft-dial-row">
        ${dialMarkup("living", t("livingDial"), living, t("livingHint"), hard, escapeHtml)}
        ${dialMarkup("net", t("netDial"), net, t("netHint"), hard, escapeHtml)}
      </div>
      <p class="ft-verdict ${hard ? "wreck" : verdict}">${escapeHtml(headline)}</p>
      <p class="tiny">${escapeHtml(detail)}</p>
    </section>
  `;
}

function dialMarkup(kind, label, pct, hint, hard, escapeHtml) {
  const tone = dialTone(pct, hard);
  const shown = Number.isFinite(pct) ? Math.round(pct) : 0;
  return `
    <div class="ft-dial tone-${tone}" data-kind="${kind}" style="--pct:${shown}">
      <div class="ft-dial-ring" aria-hidden="true"></div>
      <div class="ft-dial-read">
        <strong>${shown}%</strong>
        <span>${escapeHtml(label)}</span>
      </div>
      <p class="tiny">${escapeHtml(hint)}</p>
    </div>
  `;
}

function renderStart(host) {
  const { el, escapeHtml, isStandalone, plan } = host;
  const body = el(`<div class="stack"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("startKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("startTitle"))}</h1>`));
  body.append(el(`<p class="lede">${escapeHtml(t("startLead"))}</p>`));
  body.append(el(`<div class="card ft-tip"><p class="tag">${escapeHtml(t("themeHeroTag"))}</p><p>${escapeHtml(t("startTip"))}</p></div>`));
  body.append(
    el(`<div class="card privacy"><p>${escapeHtml(t("privacyTitle"))}</p><p>${escapeHtml(t("privacyBody"))}</p></div>`),
  );
  body.append(el(`<p>${escapeHtml(t("startBody"))}</p>`));
  body.append(el(`<p class="hint">${escapeHtml(t("startNever"))}</p>`));
  if (!isStandalone) {
    body.append(
      el(
        `<div class="card"><p class="tag">${escapeHtml(t("addHome"))}</p><p class="hint">${escapeHtml(t("addHomeHow"))}</p></div>`,
      ),
    );
  }
  const next = host.startNext();
  const cta = plan?.privacyAccepted && (plan.phase2Unlocked || plan.theme) ? t("resumeCta") : t("startCta");
  body.append(el(`<div class="nav"><button class="btn btn-primary" data-act="accept-start" type="button">${escapeHtml(cta)}</button></div>`));
  host.shellFortune(body);
  host.root.querySelector('[data-act="accept-start"]')?.addEventListener("click", () => host.acceptStart(next));
}

function renderTheme(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(`<div class="stack"><h1>${escapeHtml(t("themeTitle"))}</h1><p class="hint">${escapeHtml(t("themeHint"))}</p></div>`);
  THEME_IDS.forEach((id) => {
    const theme = THEMES[id];
    const hero = !!theme.hero || id === "rebuild";
    const btn = el(
      `<button class="${choiceClass(plan.theme === id)}${hero ? " ft-theme-hero" : ""}" type="button" data-theme="${id}">
        ${hero ? `<span class="tag">${escapeHtml(t("themeHeroTag"))}</span>` : ""}
        <strong>${escapeHtml(t(`themes.${id}.label`))}</strong>
        <span class="hint">${escapeHtml(t(`themes.${id}.blurb`))}</span>
      </button>`,
    );
    btn.addEventListener("click", () => host.pickTheme(id));
    body.append(btn);
  });
  body.append(
    el(
      `<div class="nav"><button class="btn btn-ghost" data-go="start" type="button">${escapeHtml(t("back"))}</button></div>`,
    ),
  );
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
      <p class="tag">${escapeHtml(t("fireTitle"))}</p>
      <h2>${escapeHtml(t("fireTitle"))}</h2>
      <p>${escapeHtml(prefersSunday(heat) ? t("fireLeadFdw") : t("fireLead"))}</p>
      <div class="nav">${links}</div>
      <p class="tiny">${escapeHtml(t("fireHint"))}</p>
      <button class="btn" type="button" data-act="fire-continue">${escapeHtml(t("fireContinue"))}</button>
    </section>
  `;
}

function renderTriage(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(
    `<div class="stack"><h1>${escapeHtml(t("triageTitle"))}</h1><p class="hint">${escapeHtml(t("triageHint"))}</p></div>`,
  );
  DEBT_HEAT_IDS.forEach((id) => {
    const btn = el(
      `<button class="${choiceClass(plan.debtHeat === id)}" type="button" data-heat="${id}">
        <strong>${escapeHtml(t(`debtHeat.${id}.label`))}</strong>
        <span class="hint">${escapeHtml(t(`debtHeat.${id}.blurb`))}</span>
      </button>`,
    );
    btn.addEventListener("click", () => host.pickDebtHeat(id));
    body.append(btn);
  });
  if (needsFireCard(plan.debtHeat)) {
    body.insertAdjacentHTML("beforeend", renderFireCard(plan.debtHeat, escapeHtml));
  }
  body.append(
    el(
      `<div class="nav"><button class="btn btn-ghost" data-go="theme" type="button">${escapeHtml(t("backTheme"))}</button></div>`,
    ),
  );
  host.shellFortune(body);
  host.root.querySelector('[data-act="fire-continue"]')?.addEventListener("click", () => host.continueFromFire());
}

function renderStabilize(host) {
  const { el, escapeHtml, plan } = host;
  const snap = stabilizeSnapshot(plan);
  const body = el(`<div class="stack ft-stabilize"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("stabilizeKicker"))}</p>`));
  body.append(el(`<h1>${escapeHtml(t("stabilizeTitle"))}</h1>`));
  body.append(el(`<p class="lede">${escapeHtml(t("stabilizeLead"))}</p>`));

  const form = el(`<form class="stack" data-form="stabilize"></form>`);
  const monthChoices = [3, 6]
    .map(
      (n) =>
        `<button class="${choiceClass(snap.targetMonths === n)}" type="button" data-months="${n}">${escapeHtml(
          t(n === 3 ? "stabilizeMonths3" : "stabilizeMonths6"),
        )}</button>`,
    )
    .join("");
  form.innerHTML = `
    <p class="tag">${escapeHtml(t("stabilizeMonths"))}</p>
    <div class="nav ft-month-picks">${monthChoices}</div>
    <label class="field">${escapeHtml(t("stabilizeFloor"))}
      <input name="floorHkd" inputmode="numeric" value="${escapeHtml(snap.floorHkd)}" />
    </label>
    ${bandField("incomeBand", t("income"), INCOME_BANDS, plan.money.incomeBand, escapeHtml)}
    ${bandField("spendBand", t("spend"), SPEND_BANDS, plan.money.spendBand, escapeHtml)}
    ${bandField("savingsBand", t("savings"), SAVINGS_BANDS, plan.money.savingsBand, escapeHtml)}
    ${bandField("debtsBand", t("debts"), DEBT_BANDS, plan.money.debtsBand, escapeHtml)}
  `;
  body.append(form);

  const fundedLabel = Number.isFinite(snap.fundedMonths)
    ? snap.fundedMonths > 6
      ? "6+"
      : snap.fundedMonths.toFixed(1)
    : "0";
  const bones = snap.bones
    .map(
      (b) =>
        `<span class="ft-bone-tick${b.hit ? " on" : ""}">${escapeHtml(t("boneMark", { n: String(b.mark) }))}</span>`,
    )
    .join("");
  let reachText = t("reachStuck");
  if (snap.reach.kind === "ready") reachText = t("reachReady");
  else if (snap.reach.kind === "date") {
    reachText = t("reachDate", { n: String(snap.targetMonths), when: snap.reach.label });
  }
  body.append(
    el(`
      <section class="card ft-floor">
        <p class="tag">${escapeHtml(t("boneTitle"))}</p>
        <p><strong>${escapeHtml(hkd(snap.surplus))}</strong> · ${escapeHtml(t("surplusLabel"))}</p>
        <p class="tiny">${escapeHtml(t("surplusHint"))}</p>
        <p>${escapeHtml(reachText)}</p>
        <p class="tiny">${escapeHtml(t("reachNeed", { need: hkd(snap.need), cash: hkd(snap.money.savings) }))}</p>
        <p>${escapeHtml(t("boneNow", { n: fundedLabel }))}</p>
        <div class="ft-bone" aria-hidden="true">${bones}</div>
      </section>
    `),
  );

  const unlockDisabled = snap.ready ? "" : "disabled";
  body.append(
    el(`
      <div class="nav">
        <button class="btn btn-primary" type="button" data-act="unlock-phase2" ${unlockDisabled}>${escapeHtml(t("phase2Cta"))}</button>
        ${snap.ready ? "" : `<p class="hint">${escapeHtml(t("phase2Blocked", { n: String(snap.targetMonths) }))}</p>`}
        <button class="btn" type="button" data-act="thin-warn">${escapeHtml(t("phase2Anyway"))}</button>
      </div>
    `),
  );
  if (plan.thinFloorWarned) {
    body.append(
      el(`
        <div class="card warn">
          <p>${escapeHtml(t("phase2Warn"))}</p>
          <button class="btn btn-accent" type="button" data-act="thin-go">${escapeHtml(t("phase2WarnGo"))}</button>
        </div>
      `),
    );
  }
  body.append(
    el(
      `<div class="nav"><button class="btn btn-ghost" data-go="triage" type="button">${escapeHtml(t("backTriage"))}</button></div>`,
    ),
  );

  host.shellFortune(body);
  form.querySelectorAll("[data-months]").forEach((btn) => {
    btn.addEventListener("click", () => host.patchStabilize({ stabilizeTargetMonths: Number(btn.dataset.months) }));
  });
  const sync = () => {
    const fd = new FormData(form);
    host.patchStabilize({
      money: {
        incomeBand: String(fd.get("incomeBand")),
        spendBand: String(fd.get("spendBand")),
        savingsBand: String(fd.get("savingsBand")),
        debtsBand: String(fd.get("debtsBand")),
      },
      floorHkd: Number(String(fd.get("floorHkd") || "").replace(/[^\d.]/g, "")) || 0,
    });
  };
  form.addEventListener("change", sync);
  form.querySelector('[name="floorHkd"]')?.addEventListener("blur", sync);
  host.root.querySelector('[data-act="unlock-phase2"]')?.addEventListener("click", () => host.unlockPhase2());
  host.root.querySelector('[data-act="thin-warn"]')?.addEventListener("click", () => host.warnThinFloor());
  host.root.querySelector('[data-act="thin-go"]')?.addEventListener("click", () => host.unlockPhase2({ override: true }));
}

function bandField(name, label, list, selected, escapeHtml) {
  const options = list
    .map((b) => `<option value="${b.id}" ${b.id === selected ? "selected" : ""}>${escapeHtml(b.label)}</option>`)
    .join("");
  return `<label class="field">${escapeHtml(label)}<select name="${name}">${options}</select></label>`;
}

function renderMoney(host) {
  const { el, escapeHtml, plan } = host;
  const body = el(`<div class="stack"><h1>${escapeHtml(t("moneyTitle"))}</h1><p class="hint">${escapeHtml(t("moneyHint"))}</p></div>`);
  const form = el(`<form class="stack" data-form="money"></form>`);
  form.innerHTML = [
    bandField("incomeBand", t("income"), INCOME_BANDS, plan.money.incomeBand, escapeHtml),
    bandField("spendBand", t("spend"), SPEND_BANDS, plan.money.spendBand, escapeHtml),
    bandField("savingsBand", t("savings"), SAVINGS_BANDS, plan.money.savingsBand, escapeHtml),
    bandField("debtsBand", t("debts"), DEBT_BANDS, plan.money.debtsBand, escapeHtml),
    `<div class="nav"><button class="btn btn-primary" type="submit">${escapeHtml(t("continue"))}</button>
     <button class="btn btn-ghost" data-go="${plan.phase2Unlocked || plan.phase2Override ? "board" : "theme"}" type="button">${escapeHtml(t("back"))}</button></div>`,
  ].join("");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    host.saveMoney({
      incomeBand: String(fd.get("incomeBand")),
      spendBand: String(fd.get("spendBand")),
      savingsBand: String(fd.get("savingsBand")),
      debtsBand: String(fd.get("debtsBand")),
    });
  });
  body.append(form);
  host.shellFortune(body);
}

function renderTease(host) {
  if (host.ui.loginTeaseDismissed) return "";
  const { escapeHtml } = host;
  return `
    <div class="ft-tease" role="status">
      <p>${escapeHtml(t("teaseText"))}</p>
      <p class="tiny">${escapeHtml(t("teaseHint"))}</p>
      <button class="btn btn-ghost" type="button" data-act="dismiss-tease">${escapeHtml(t("teaseDismiss"))}</button>
    </div>
  `;
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
  const breaks = coachBreakLines(plan, forecast)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  const actions = coachActions(plan, forecast)
    .map((action) => {
      const cls = action.kind === "primary" ? "btn btn-primary" : "btn";
      return `<button class="${cls}" type="button" data-coach="${escapeHtml(action.key)}">${escapeHtml(action.label)}</button>`;
    })
    .join("");
  const emptyNote = empty ? `<p class="hint">${escapeHtml(t("coachEmpty"))}</p>` : "";
  const keep = forecast.hardFail ? `<p class="tiny">${escapeHtml(t("coachKeepGoing"))}</p>` : "";
  return `
    <section class="card ft-coach" data-coach-card>
      <p class="tag">${escapeHtml(t("coachBreaking"))}</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(t("coachSub"))}</p>
      <ul class="ft-coach-breaks">${breaks}</ul>
      ${emptyNote}
      <div class="nav ft-coach-actions">${actions}</div>
      ${keep}
    </section>
  `;
}

function renderBoard(host) {
  const { el, escapeHtml, plan, forecast, busy } = host;
  const money = resolveMoney(plan.money);
  const template = TEMPLATES[plan.templateId] || TEMPLATES.balanced;
  const body = el(`<div class="stack ft-board"></div>`);
  body.append(el(`<p class="kicker">${escapeHtml(t("phaseTag"))}</p>`));
  body.insertAdjacentHTML("beforeend", renderTease(host));
  body.insertAdjacentHTML("beforeend", renderDials(host, { sticky: true }));
  if (busy) body.append(el(`<p class="hint">${escapeHtml(t("running"))}</p>`));
  body.insertAdjacentHTML("beforeend", renderCoach(host));
  body.insertAdjacentHTML("beforeend", renderCrumb(host));

  const horizon = forecast?.horizonMonths || 48;
  body.append(el(`<h2>${escapeHtml(t("timelineTitle"))}</h2>`));
  body.append(el(`<p class="hint">${escapeHtml(t("timelineHint"))}</p>`));
  body.append(el(renderTimeline(plan, horizon, escapeHtml)));

  body.append(el(`<h2>${escapeHtml(t("goalsTitle"))}</h2>`));
  if (!plan.milestones.length) {
    body.append(el(`<p class="hint">${escapeHtml(t("goalsEmpty"))}</p>`));
  }
  plan.milestones.forEach((m, i) => {
    const pct = forecast?.milestonePct?.[i];
    const card = el(`
      <div class="card ft-goal">
        <div class="creditor">
          <div>
            <strong>${escapeHtml(m.name)}</strong>
            <p class="tiny">${escapeHtml(hkd(m.amount))} · ${escapeHtml(monthYearLabel(m.months))}${
              pct != null ? ` · ${Math.round(pct)}%` : ""
            }</p>
          </div>
          <button class="btn btn-ghost" type="button" data-edit-goal="${escapeHtml(m.id)}">${escapeHtml(t("edit"))}</button>
        </div>
      </div>
    `);
    body.append(card);
  });
  body.append(el(`<button class="btn" type="button" data-act="add-goal">${escapeHtml(t("add"))}</button>`));

  const need = netNeedNow(plan);
  body.append(
    el(`
      <div class="card">
        <p class="tag">${escapeHtml(t("netTitle"))}</p>
        <p>${escapeHtml(t("netLead"))}</p>
        <p>${escapeHtml(
          t("netSummary", {
            months: String(plan.net.emergencyMonths),
            floor: hkd(plan.net.floorHkd),
            need: hkd(need),
          }),
        )}</p>
        <button class="btn btn-ghost" type="button" data-go="net-edit">${escapeHtml(t("edit"))}</button>
      </div>
    `),
  );

  body.append(el(`<h2>${escapeHtml(t("templateTitle"))}</h2>`));
  body.append(el(`<p class="hint">${escapeHtml(t("templatesHint"))}</p>`));
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

  const infl = el(`
    <label class="ft-check">
      <input type="checkbox" data-act="inflation" ${plan.inflationOn ? "checked" : ""} />
      <span>${escapeHtml(t("inflationLabel"))}</span>
    </label>
  `);
  body.append(infl);

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
      <div class="card">
        <p class="tiny">${escapeHtml(t("income"))}: ${escapeHtml(bandById(INCOME_BANDS, plan.money.incomeBand).label)}</p>
        <p class="tiny">${escapeHtml(t("spend"))}: ${escapeHtml(bandById(SPEND_BANDS, plan.money.spendBand).label)}</p>
        <p class="tiny">${escapeHtml(t("savings"))}: ${escapeHtml(hkd(money.savings))} · ${escapeHtml(t("debts"))}: ${escapeHtml(hkd(money.debts))}</p>
        <button class="btn btn-ghost" data-go="money" type="button">${escapeHtml(t("edit"))}</button>
      </div>
    `),
  );

  body.append(
    el(`
      <div class="nav">
        <button class="btn btn-primary" data-go="compare" type="button">${escapeHtml(t("compareCta"))}</button>
        <button class="btn" data-go="sheet" type="button">${escapeHtml(t("sheetCta"))}</button>
        <button class="btn btn-ghost" data-go="more" type="button">${escapeHtml(t("moreCta"))}</button>
        <button class="btn btn-ghost" data-go="stabilize" type="button">${escapeHtml(t("backFloor"))}</button>
        <button class="btn btn-ghost" data-act="shuffle" type="button">${escapeHtml(t("shuffle"))}</button>
      </div>
    `),
  );

  host.shellFortune(body);
  bindBoard(host);
}

function renderTimeline(plan, horizon, escapeHtml) {
  const months = Math.max(12, horizon);
  const chips = plan.milestones
    .map((m, i) => {
      const pct = Math.min(96, Math.max(2, ((m.months - 1) / (months - 1)) * 100));
      const row = i % 2 === 0 ? 0 : 34;
      return `<button type="button" class="ft-chip" data-chip="${escapeHtml(m.id)}" style="left:${pct}%;top:${row}px" aria-label="${escapeHtml(m.name)}">
        <span>${escapeHtml(m.name)}</span>
        <em>${escapeHtml(monthYearLabel(m.months))}</em>
      </button>`;
    })
    .join("");
  return `
    <div class="ft-timeline" data-timeline data-horizon="${months}">
      <div class="ft-rail"></div>
      <div class="ft-ticks">
        <span>Now</span>
        <span>${escapeHtml(monthYearLabel(Math.round(months / 2)))}</span>
        <span>${escapeHtml(monthYearLabel(months))}</span>
      </div>
      <div class="ft-chips">${chips}</div>
    </div>
  `;
}

function bindBoard(host) {
  const root = host.root;
  root.querySelector('[data-act="dismiss-tease"]')?.addEventListener("click", () => host.dismissTease());
  root.querySelector('[data-act="dismiss-crumb"]')?.addEventListener("click", () => host.dismissCrumb());
  root.querySelector('[data-act="add-goal"]')?.addEventListener("click", () => host.editGoal(null));
  root.querySelectorAll("[data-edit-goal]").forEach((btn) => {
    btn.addEventListener("click", () => host.editGoal(btn.dataset.editGoal));
  });
  root.querySelectorAll("[data-template]").forEach((btn) => {
    btn.addEventListener("click", () => host.pickTemplate(btn.dataset.template));
  });
  root.querySelector('[data-act="inflation"]')?.addEventListener("change", (e) => {
    host.setInflation(e.target.checked);
  });
  root.querySelector('[data-act="shuffle"]')?.addEventListener("click", () => host.shuffleSeed());
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
      <button class="btn btn-ghost" data-go="board" type="button">${escapeHtml(t("back"))}</button>
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
    el(`<div class="nav"><button class="btn btn-ghost" data-go="board" type="button">${escapeHtml(t("back"))}</button></div>`),
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
        <button class="btn btn-ghost" data-go="board" type="button">${escapeHtml(t("back"))}</button>
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
  body.append(el(`<div class="nav"><button class="btn btn-ghost" data-go="board" type="button">${escapeHtml(t("back"))}</button></div>`));
  host.shellFortune(body);
  host.root.querySelector('[data-act="export"]')?.addEventListener("click", () => host.exportJson());
  host.root.querySelector('[data-act="clear"]')?.addEventListener("click", () => host.clearPlan());
}