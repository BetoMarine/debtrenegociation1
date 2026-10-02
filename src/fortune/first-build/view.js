import { escapeHtml } from "../../dom.js";
import { present } from "./flow.js";

const ROUTE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`;

const EXIT_ICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const LOCK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;

function exitButton() {
  return `<button class="ft-icon ft-exit" type="button" data-act="exit" aria-label="Quick exit">${EXIT_ICON}<span>Exit</span></button>`;
}

function lifeLink() {
  return `<button class="ft-life-link" type="button" data-act="open-life">Your life</button>`;
}

function topbar(view) {
  const left = view.brand
    ? `<span class="ft-brand">${ROUTE_ICON}<span>Fortune Teller</span></span>`
    : `<button class="ft-icon ft-back" type="button" data-act="back" aria-label="Back"><span aria-hidden="true">‹</span></button>`;
  const link = view.showLifeLink ? lifeLink() : "";
  const chip = view.chip ? `<span class="ft-chip">${escapeHtml(view.chip)}</span>` : link;
  const endLink = view.chip && view.showLifeLink ? link : "";
  return `<header class="ft-top">${left}<div class="ft-chip-slot">${chip}</div><div class="ft-top-end">${endLink}${exitButton()}</div></header>`;
}

function choices(view) {
  return view.choices
    .map((item) => {
      const locked = item.locked ? " is-locked" : "";
      const sub = item.sub ? `<span class="ft-sub">${escapeHtml(item.sub)}</span>` : "";
      const tail = item.locked
        ? `<span class="ft-lock-ico">${LOCK_ICON}</span>`
        : `<b aria-hidden="true">›</b>`;
      const act =
        view.id === "w0"
          ? "pick-entry"
          : view.id === "f0"
            ? "pick-fix"
            : view.id === "s0"
              ? "pick-cushion"
              : view.id === "fd2"
                ? "pick-next"
                : "pick-grow";
      return `<button class="ft-choice${locked}" type="button" data-act="${act}" data-value="${escapeHtml(item.id)}"><span class="ft-choice-label">${escapeHtml(item.label)}${sub}</span>${tail}</button>`;
    })
    .join("");
}

function noteField(field) {
  const label = field.noteLabel || "Note";
  return `<label class="ft-label" for="ft-note">${escapeHtml(label)}</label>
    <div class="ft-input is-optional">
      <input id="ft-note" name="note" data-field="note" data-key="${escapeHtml(field.key)}" autocomplete="off" maxlength="280" placeholder="${field.noteLabel ? "Tap to enter" : "Optional"}" value="${escapeHtml(field.note)}" aria-label="${escapeHtml(label)}" />
    </div>`;
}

function inputBlock(view) {
  const field = view.input;
  const required = view.showRequired
    ? `<p class="ft-required" role="alert">${escapeHtml(view.requiredHint)}</p>`
    : "";
  if (field.mode === "text" || field.mode === "date") {
    const isDate = field.mode === "date";
    const value = isDate ? field.date : field.text;
    const placeholder = isDate ? "Pick a date" : "Tap to enter";
    const dataField = isDate ? "date" : "text";
    const empty = isDate && !value ? " is-empty" : "";
    const type = isDate ? "date" : "text";
    return `<label class="ft-label" for="ft-amount">${escapeHtml(field.label)}</label>
    <div class="ft-input${isDate ? " is-date" : ""}${empty}">
      <input id="ft-amount" name="${dataField}" data-field="${dataField}" data-key="${escapeHtml(field.key)}" type="${type}" autocomplete="off" enterkeyhint="done" maxlength="${isDate ? "10" : "80"}" placeholder="${placeholder}" value="${escapeHtml(value)}" aria-label="${escapeHtml(field.label)}" />
    </div>
    ${required}
    ${noteField(field)}`;
  }
  const money = field.mode === "money";
  const months = field.mode === "months";
  const prefix = money ? `<span class="ft-cur">HK$</span>` : "";
  const amountMode = money ? "decimal" : "numeric";
  const amountName = money ? "amount" : months ? "months" : "days";
  const amountRow = `<label class="ft-label" for="ft-amount">${escapeHtml(field.label)}</label>
    <div class="ft-input">
      ${prefix}<input id="ft-amount" name="${amountName}" data-field="${amountName}" data-key="${escapeHtml(field.key)}" inputmode="${amountMode}" autocomplete="off" enterkeyhint="done" maxlength="${money ? "16" : "5"}" placeholder="Tap to enter" value="${escapeHtml(field.amount)}" aria-label="${escapeHtml(field.label)}" />
    </div>`;
  return field.labelFirst ? `${noteField(field)}${amountRow}${required}` : `${amountRow}${required}${noteField(field)}`;
}

function rowsBlock(view) {
  if (!view.rows?.length) return "";
  return `<div class="ft-net-rows">${view.rows
    .map((row) => {
      const tone = row.tone ? ` is-${row.tone}` : "";
      const valueClass = [row.neg ? "is-neg" : "", row.pos ? "is-pos" : ""].filter(Boolean).join(" ");
      return `<div class="ft-net-row${tone}"><span>${escapeHtml(row.label)}</span><b class="${valueClass}">${escapeHtml(row.value)}</b></div>`;
    })
    .join("")}</div>`;
}

function calloutBlock(view) {
  if (!view.callout) return "";
  const callout = view.callout;
  return `<div class="ft-callout is-${escapeHtml(callout.tone)}">${LOCK_ICON}<div><b>${escapeHtml(callout.title)}</b><span>${escapeHtml(callout.body)}</span></div></div>`;
}

function content(view) {
  const infoBtn = view.info
    ? `<button class="ft-info" type="button" data-act="info" aria-label="Why?" aria-expanded="${view.infoOpen ? "true" : "false"}" aria-controls="ft-why">i</button>`
    : "";
  const why =
    view.info && view.infoOpen
      ? `<p class="ft-why" id="ft-why">${escapeHtml(view.info)}</p>`
      : view.info
        ? `<p class="ft-why" id="ft-why" hidden></p>`
        : "";
  let main = "";
  if (view.kind === "choices") main = `<div class="ft-choices">${choices(view)}</div>`;
  if (view.kind === "input") main = inputBlock(view);
  if (view.kind === "picture") main = rowsBlock(view);
  if (view.kind === "confirm") main = calloutBlock(view);
  if (view.kind === "locked" && view.lockTitle) {
    main = `<div class="ft-lockrow">${LOCK_ICON}<div><b>${escapeHtml(view.lockTitle)}</b><span>${escapeHtml(view.lockBody)}</span></div></div>`;
  }
  return `<div class="ft-content"><h1>${escapeHtml(view.title)}${infoBtn}</h1><p class="ft-body">${escapeHtml(view.body)}</p>${why}${main}</div>`;
}

function rdNote(view) {
  if (!view.rdLater) return "";
  return `<p class="ft-rd-note">Live Right Door handoff comes later.</p>`;
}

function actions(view) {
  const parts = [];
  if (view.rdLater) parts.push(rdNote(view));
  if (view.primary && view.id !== "e1") {
    parts.push(
      `<button class="ft-btn primary" type="button" data-act="continue">${escapeHtml(view.primary)}</button>`,
    );
  }
  if (view.id === "e1" && view.primary) {
    parts.push(
      `<button class="ft-btn primary" type="button" data-act="erase-ok">${escapeHtml(view.primary)}</button>`,
    );
  }
  if (view.quiet && view.id === "w0") {
    parts.push(
      `<button class="ft-btn quiet" type="button" data-act="open-erase">${escapeHtml(view.quiet)}</button>`,
    );
  } else if (view.quiet) {
    parts.push(
      `<button class="ft-btn quiet" type="button" data-act="${escapeHtml(view.quietAct || "back")}">${escapeHtml(view.quiet)}</button>`,
    );
  }
  if (view.showPlan) {
    parts.push(
      `<button class="ft-btn quiet" type="button" data-act="show-plan">Show my current plan</button>`,
    );
  }
  if (!parts.length) return `<div class="ft-actions"></div>`;
  return `<div class="ft-actions">${parts.join("")}</div>`;
}

function sheet(view) {
  return `<div class="ft-scrim" data-act="cancel-erase"></div>
    <div class="ft-sheet" role="dialog" aria-modal="true" aria-labelledby="ft-erase-title">
      <div class="ft-grab"></div>
      <h1 id="ft-erase-title">${escapeHtml(view.title)}</h1>
      <p class="ft-body">${escapeHtml(view.body)}</p>
      <button class="ft-btn danger" type="button" data-act="confirm-erase">${escapeHtml(view.danger)}</button>
      <button class="ft-btn quiet" type="button" data-act="cancel-erase">${escapeHtml(view.quiet)}</button>
    </div>`;
}

function privacyFoot(view) {
  if (!view.privacy) return "";
  const why = view.privacyOpen
    ? `<p class="ft-privacy-why" id="ft-privacy-why">${escapeHtml(view.privacyInfo)}</p>`
    : "";
  return `<footer class="ft-privacy-foot"><p class="ft-privacy">${escapeHtml(view.privacyText)}<button class="ft-info ft-privacy-info" type="button" data-act="privacy-info" aria-label="About erase" aria-expanded="${view.privacyOpen ? "true" : "false"}" aria-controls="ft-privacy-why">i</button></p>${why}</footer>`;
}

function screenHtml(view) {
  return `${topbar(view)}${content(view)}${actions(view)}${privacyFoot(view)}`;
}

function axis() {
  return `<text x="4" y="14" class="ft-glab">Positive</text><text x="4" y="104" class="ft-glab">Negative</text><line x1="8" y1="55" x2="272" y2="55" class="ft-gzero"/><text x="276" y="52" text-anchor="end" class="ft-gzero-lab">0</text>`;
}

function dots(points, color) {
  return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`).join("");
}

function efGraph(ef) {
  const pct = ef?.pct;
  const net = ef?.net;
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const xs = [20, 70, 120, 180, 250];
  const rise = ef?.rising ? 34 : (34 * p) / 100;
  const saveYs = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(55 - t * rise));
  const savePoints = xs.map((x, i) => `${x},${saveYs[i]}`).join(" ");
  const cash =
    net != null && net < 0
      ? [
          [20, 48],
          [70, 58],
          [120, 68],
          [180, 78],
          [250, 88],
        ]
      : net === 0
        ? [
            [20, 55],
            [70, 55],
            [120, 55],
            [180, 55],
            [250, 55],
          ]
        : [
            [20, 48],
            [70, 46],
            [120, 44],
            [180, 42],
            [250, 38],
          ];
  const cashPoints = cash.map(([x, y]) => `${x},${y}`).join(" ");
  return `<polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${cashPoints}"/>${dots(
    cash,
    "#0d9488",
  )}<polyline fill="none" stroke="#5eead4" stroke-width="2.2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" points="${savePoints}"/>${dots(xs.map((x, i) => [x, saveYs[i]]), "#5eead4")}`;
}

function doughnut(pct) {
  const p = Math.max(0, Math.min(100, Math.round(pct ?? 0)));
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const arc = (p / 100) * circ;
  const gap = circ - arc;
  const ring =
    p > 0
      ? `<circle cx="36" cy="36" r="${radius}" fill="none" stroke="#0d9488" stroke-width="8" stroke-dasharray="${arc} ${gap}" stroke-linecap="round" transform="rotate(-90 36 36)"/>`
      : "";
  return `<svg class="ft-doughnut" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="8"/>${ring}<text x="36" y="41" text-anchor="middle" class="ft-dough-pct">${p}%</text></svg>`;
}

function goalsGraph(funding) {
  const real = Boolean(funding);
  const pct = real ? Math.max(0, Math.min(100, funding.pct ?? 0)) : null;
  const circ = 2 * Math.PI * 16;
  const arc = pct == null ? 36 : (pct / 100) * circ;
  const gap = pct == null ? 80 : circ - arc;
  const label = pct == null ? "" : `<text x="248" y="49" text-anchor="middle" class="ft-pct">${pct}%</text>`;
  const arcCircle =
    pct == null || pct > 0
      ? `<circle cx="248" cy="45" r="16" fill="none" stroke="#0d9488" stroke-width="5" stroke-dasharray="${arc} ${gap}" stroke-linecap="round" transform="rotate(-90 248 45)"/>`
      : "";
  return `<svg class="ft-graph${real ? "" : " is-stub"}" viewBox="0 0 280 90" aria-hidden="true"><line x1="8" y1="45" x2="200" y2="45" class="ft-gzero"/><polyline fill="none" stroke="#94a3b8" stroke-width="2" points="20,40 80,42 140,44 200,46"/><polyline fill="none" stroke="#0d9488" stroke-width="2.2" points="20,40 80,48 140,70 200,52"/><circle cx="248" cy="45" r="16" fill="none" stroke="#e2e8f0" stroke-width="5"/>${arcCircle}${label}</svg>`;
}

function impactGraph() {
  const before = [
    [20, 55],
    [70, 55],
  ];
  const after = [
    [120, 55],
    [180, 40],
    [250, 26],
  ];
  return `<polyline fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,55 70,55 120,55"/>${dots(
    before,
    "#94a3b8",
  )}<line class="ft-impact" data-impact="day" x1="120" y1="18" x2="120" y2="96" stroke="#334155" stroke-width="1.5" stroke-dasharray="3 2"/><text x="128" y="30" class="ft-glab">Impact</text><polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="120,55 180,40 250,26"/>${dots(
    after,
    "#0d9488",
  )}<circle cx="120" cy="55" r="5" fill="#fff" stroke="#0f172a" stroke-width="2"/>`;
}

function graph(kind, pct) {
  if (kind === "none") return "";
  if (kind === "invest") {
    return `<svg class="ft-graph is-stub" viewBox="0 0 280 90" aria-hidden="true"><line x1="8" y1="50" x2="272" y2="50" class="ft-gzero"/><polyline fill="none" stroke="#94a3b8" stroke-width="2" points="20,60 90,58 160,56 250,54"/><polyline fill="none" stroke="#0d9488" stroke-width="2.2" points="20,60 90,48 160,36 250,22"/></svg>`;
  }
  if (kind === "goals") return goalsGraph(pct);
  const lines = {
    "down-red": `<polyline fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,52 70,62 120,72 180,84 250,96"/>${dots(
      [
        [20, 52],
        [70, 62],
        [120, 72],
        [180, 84],
        [250, 96],
      ],
      "#dc2626",
    )}`,
    "turn-up": `<polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,55 70,46 120,40 180,34 250,28"/>${dots(
      [
        [20, 55],
        [70, 46],
        [120, 40],
        [180, 34],
        [250, 28],
      ],
      "#0d9488",
    )}`,
    impact: impactGraph(),
    "slate-up": `<polyline fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,48 70,40 120,32 180,24 250,16"/>${dots(
      [
        [20, 48],
        [70, 40],
        [120, 32],
        [180, 24],
        [250, 16],
      ],
      "#64748b",
    )}`,
    rise: `<polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,48 70,38 120,28 180,20 250,12"/>${dots(
      [
        [20, 48],
        [70, 38],
        [120, 28],
        [180, 20],
        [250, 12],
      ],
      "#0d9488",
    )}`,
    "up-teal": `<polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,48 70,46 120,44 180,42 250,38"/>${dots(
      [
        [20, 48],
        [70, 46],
        [120, 44],
        [180, 42],
        [250, 38],
      ],
      "#0d9488",
    )}`,
    cross: `<polyline fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,78 70,68 120,52"/><polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="120,52 180,40 250,28"/>${dots(
      [
        [20, 78],
        [70, 68],
      ],
      "#dc2626",
    )}${dots(
      [
        [120, 52],
        [180, 40],
        [250, 28],
      ],
      "#0d9488",
    )}`,
    wait: `<polyline fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,78 70,76 120,74 180,72 250,70"/>${dots(
      [
        [20, 78],
        [70, 76],
        [120, 74],
        [180, 72],
        [250, 70],
      ],
      "#dc2626",
    )}`,
    flat: `<polyline fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" points="20,55 250,55"/>`,
    "flat-zero": `<polyline fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,55 70,55 120,55 180,55 250,55"/>${dots(
      [
        [20, 55],
        [70, 55],
        [120, 55],
        [180, 55],
        [250, 55],
      ],
      "#64748b",
    )}`,
    ef: efGraph(pct),
  };
  return `<svg class="ft-graph" data-graph="${escapeHtml(kind)}" viewBox="0 0 280 110" aria-hidden="true">${axis()}${lines[kind] || ""}</svg>`;
}

function msRow({ n, tone, stub, testId, button, act, value, body }) {
  const numClass = [
    "ft-ms-num",
    stub ? "is-stub" : "",
    tone === "strain" ? "is-red" : "",
    tone === "steady" ? "is-teal" : "",
    tone === "even" ? "is-slate" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const cardClass = `ft-ms-card${stub ? " is-stub" : ""}`;
  const inner = `${body}<span class="ft-ms-chev" aria-hidden="true">›</span>`;
  const card = button
    ? `<button class="${cardClass}" type="button" data-act="${act}"${value ? ` data-value="${escapeHtml(value)}"` : ""}>${inner}</button>`
    : `<div class="${cardClass}">${inner}</div>`;
  return `<div class="ft-ms-row" data-ms="${escapeHtml(testId)}" data-n="${escapeHtml(String(n))}"><div class="ft-ms-rail"><span class="${numClass}">${n}</span></div>${card}</div>`;
}

function todayBody(today) {
  return `<div class="ft-ms-head"><b>TODAY</b><span class="ft-ms-date">${escapeHtml(today.date)}</span></div>
    <div class="ft-ms-gtitle">Cash flow</div>
    ${graph(today.graph)}
    <div class="ft-ms-foot" data-net="${today.net ?? ""}">
      <span class="ft-muted">${escapeHtml(today.kicker)}</span>
      <b class="ft-net is-${today.netClass}${today.moved ? " is-moved" : ""}">${escapeHtml(today.netText)}</b>
      ${today.delta ? `<span class="ft-delta">${escapeHtml(today.delta)}</span>` : ""}
      <span class="ft-muted is-thin">${escapeHtml(today.meta)}</span>
      ${today.daysText ? `<span class="ft-muted is-thin" data-days="${today.daysLate}">${escapeHtml(today.daysText)}</span>` : ""}
      ${today.daysDelta ? `<span class="ft-delta">${escapeHtml(today.daysDelta)}</span>` : ""}
      ${today.burdenText ? `<span class="ft-muted is-thin">${escapeHtml(today.burdenText)}</span>` : ""}
      ${today.burdenDelta ? `<span class="ft-delta">${escapeHtml(today.burdenDelta)}</span>` : ""}
    </div>`;
}

function rdBody(rd) {
  return `<div class="ft-ms-head"><b>Right Door complete</b><span class="ft-ms-date">${escapeHtml(rd.date)}</span></div>
    <div class="ft-ms-gtitle">Cash flow after renegotiation</div>
    ${graph(rd.graph)}
    <div class="ft-ms-foot" data-joined="${rd.joined ? "yes" : "no"}"><b class="ft-net ${rd.joined ? "is-pos" : "is-muted"}">${escapeHtml(rd.foot)}</b></div>`;
}

function efBody(ef) {
  return `<div class="ft-ms-head"><b>${escapeHtml(ef.title || "Emergency fund")}</b><span class="ft-ms-date">${escapeHtml(ef.date)}</span></div>
    <div class="ft-ms-gtitle">Cash flow + emergency savings</div>
    ${graph("ef", ef)}
    <div class="ft-ms-foot" data-ef-now="${ef.now ?? ""}" data-ef-pct="${ef.pct ?? ""}">
      <span class="ft-legend"><i class="ft-lg"></i> Cash flow <i class="ft-lg is-dash"></i> Emergency savings</span>
      <span class="ft-muted is-thin${ef.moved ? " is-moved" : ""}">${escapeHtml(ef.foot)}</span>
      ${ef.saveText ? `<span class="ft-muted is-thin">${escapeHtml(ef.saveText)}</span>` : ""}
      ${ef.delta ? `<span class="ft-delta">${escapeHtml(ef.delta)}</span>` : ""}
      <span class="ft-tap">Tap for detail ›</span>
    </div>`;
}

function stubBody(stub) {
  const chart = stub.graph === "goals" ? graph("goals", stub.funding) : graph(stub.graph);
  const funding = stub.funding
    ? `<div class="ft-goal-card"><b>${escapeHtml(stub.funding.name)}</b><span>Date by ${escapeHtml(stub.funding.dateText)}</span><span class="ft-goal-fund">Funded ${escapeHtml(stub.funding.fundedText)} of ${escapeHtml(stub.funding.targetText)} · ${stub.funding.pct}%</span></div><span class="ft-muted is-thin">Impact on cash flow shown above</span>`
    : stub.open
      ? `<p class="ft-open-line">${escapeHtml(stub.open)}</p>`
      : `<span class="ft-muted is-thin">${escapeHtml(stub.later)}</span>`;
  return `<div class="ft-ms-head"><b>${escapeHtml(stub.title)}</b><span class="ft-ms-date">${escapeHtml(stub.date)}</span></div>
    ${stub.gtitle ? `<div class="ft-ms-gtitle">${escapeHtml(stub.gtitle)}</div>` : ""}
    ${chart}
    <div class="ft-ms-foot">${funding}${stub.delta ? `<span class="ft-delta">${escapeHtml(stub.delta)}</span>` : ""}</div>`;
}

function goalBody(goal) {
  const fund = goal.funding;
  return `<div class="ft-ms-head"><b>${escapeHtml(goal.title)}</b><span class="ft-ms-date">${escapeHtml(goal.date)}</span></div>
    <div class="ft-ms-gtitle">Cash flow</div>
    ${graph(goal.graph)}
    <div class="ft-goal-row">
      ${doughnut(fund.pct)}
      <div class="ft-goal-card"><b>${escapeHtml(fund.name)}</b><span>Date by ${escapeHtml(fund.dateText)}</span><span class="ft-goal-fund">Could cover ${escapeHtml(fund.coverText)} of ${escapeHtml(fund.targetText)} · ${fund.pct}%</span><span class="ft-muted is-thin">Emergency fund left out</span></div>
    </div>`;
}

function railOrder(life, focus) {
  const order = ["today"];
  if (life.expected?.show || focus === "expect") order.push("expect");
  if (life.rd.joined || focus === "rd") order.push("rd");
  if (life.showEf || focus === "ef") order.push("ef");
  for (const goal of life.goals || []) order.push(goal.id);
  return order;
}

function expectedBody(card) {
  return `<div class="ft-ms-head"><b>Expected result</b><span class="ft-ms-date">${escapeHtml(card.date)}</span></div>
    <div class="ft-ms-gtitle">If you talk to lenders</div>
    ${graph(card.graph)}
    <div class="ft-ms-foot">
      <span class="ft-muted is-thin">Debt ${escapeHtml(card.debt)} · Contract ${escapeHtml(card.contract)}</span>
      <span class="ft-muted is-thin">Premium ${escapeHtml(card.premium)} · ${escapeHtml(card.duration)} months</span>
      <b class="ft-net is-pos">Positive from today</b>
    </div>`;
}

function spine(life) {
  const steps = life.phase?.steps || [];
  if (!steps.length) return "";
  return `<ol class="ft-spine" data-phase="${escapeHtml(life.phase.current)}">${steps
    .map((step) => `<li class="${escapeHtml(step.state)}"><span>${escapeHtml(step.n)}</span> ${escapeHtml(step.label)}</li>`)
    .join("")}</ol>`;
}

function lifeBlock(life, focus) {
  const solo = focus && focus !== "scroll";
  const order = railOrder(life, focus);
  const numberOf = (id) => String(order.indexOf(id) + 1);
  const showRd = focus === "rd" || (!solo && life.rd.joined);
  const showExpected = life.expected?.show && (!solo || focus === "expect");
  const rows = [];
  if (!solo || focus === "today") {
    rows.push(
      msRow({
        n: numberOf("today"),
        tone: life.today.mark,
        testId: "today",
        button: true,
        act: solo ? "open-net" : "open-milestone",
        value: solo ? "" : "today",
        body: todayBody(life.today),
      }),
    );
  }
  if (showExpected) {
    rows.push(
      msRow({
        n: numberOf("expect"),
        tone: "steady",
        testId: "expect",
        button: false,
        body: expectedBody(life.expected),
      }),
    );
  }
  if (showRd) {
    rows.push(
      msRow({
        n: numberOf("rd"),
        testId: "rd",
        button: !solo,
        act: "open-milestone",
        value: "rd",
        body: rdBody(life.rd),
      }),
    );
  }
  if (life.showEf && (!solo || focus === "ef")) {
    rows.push(
      msRow({
        n: numberOf("ef"),
        tone: "steady",
        testId: "ef",
        button: !solo,
        act: "open-milestone",
        value: "ef",
        body: efBody(life.ef),
      }),
    );
  }
  for (const goal of life.goals || []) {
    if (solo && focus !== goal.id) continue;
    rows.push(
      msRow({
        n: numberOf(goal.id),
        tone: "steady",
        testId: goal.id,
        button: !solo,
        act: "open-milestone",
        value: goal.id,
        body: goalBody(goal),
      }),
    );
  }
  const pill = life.pill ? `<span class="ft-jpill is-${life.pill.tone}">${escapeHtml(life.pill.label)}</span>` : "";
  const note = focus === "rd" ? `<p class="ft-life-note">${escapeHtml(life.rd.note)}</p>` : "";
  return `<div class="ft-life" data-tone="${escapeHtml(life.tone)}" data-scope="${escapeHtml(life.scope || "full")}">${`<div class="ft-life-head${solo ? " is-compact" : ""}"><h1>Your life</h1><p class="ft-life-sub">Today → age 70</p><p class="ft-disclaimer">Not advice. Not a guarantee.</p>${spine(life)}${pill}</div>`}<div class="ft-life-timeline${solo ? " is-solo" : ""}">${rows.join("")}</div>${note}</div>`;
}

function inputSheet(view) {
  const infoBtn = view.info
    ? `<button class="ft-info" type="button" data-act="info" aria-label="Why?" aria-expanded="${view.infoOpen ? "true" : "false"}" aria-controls="ft-why">i</button>`
    : "";
  const why =
    view.info && view.infoOpen
      ? `<p class="ft-why" id="ft-why">${escapeHtml(view.info)}</p>`
      : view.info
        ? `<p class="ft-why" id="ft-why" hidden></p>`
        : "";
  return `<div class="ft-sheet is-input" role="dialog" aria-modal="true" aria-labelledby="ft-input-title">
    <div class="ft-grab"></div>
    <h1 id="ft-input-title">${escapeHtml(view.title)}${infoBtn}</h1>
    <p class="ft-body">${escapeHtml(view.body)}</p>
    ${why}
    ${inputBlock(view)}
    <button class="ft-btn primary" type="button" data-act="continue">${escapeHtml(view.primary)}</button>
  </div>`;
}

function efDetail(life) {
  const ef = life.ef;
  return `<div class="ft-ef-detail">
    <h1>Emergency fund</h1>
    <p class="ft-body">Cash flow and savings toward your cushion.</p>
    <p class="ft-disclaimer">Not advice. Not a guarantee.</p>
    ${graph("ef", ef)}
    <div class="ft-ms-foot">
      <span class="ft-legend"><i class="ft-lg"></i> Cash flow <i class="ft-lg is-dash"></i> Emergency savings</span>
    </div>
    <div class="ft-stat-row">
      <div class="ft-stat"><span>Target</span><b>${escapeHtml(ef.targetText)}</b></div>
      <div class="ft-stat"><span>Now</span><b>${escapeHtml(ef.nowText)}</b></div>
      <div class="ft-stat"><span>Funded</span><b>${escapeHtml(ef.pctText)}</b></div>
    </div>
    <div class="ft-net-rows">
      <div class="ft-net-row"><span>Income</span><b>${escapeHtml(ef.incomeText)}</b></div>
      <div class="ft-net-row"><span>Expenses</span><b class="${ef.expensesOut ? "is-neg" : ""}">${escapeHtml(ef.expensesText)}</b></div>
      <div class="ft-net-row is-total is-${escapeHtml(ef.netClass)}"><span>Net this month</span><b class="is-${escapeHtml(ef.netClass)}">${escapeHtml(ef.netText)}</b></div>
    </div>
    <div class="ft-actions"><button class="ft-btn primary" type="button" data-act="back">Got it</button></div>
  </div>`;
}

function netSheet(life) {
  const detail = life.detail;
  return `<div class="ft-scrim" data-act="close-net"></div>
    <div class="ft-sheet" role="dialog" aria-modal="true" aria-labelledby="ft-net-title">
      <div class="ft-grab"></div>
      <h1 id="ft-net-title">${escapeHtml(detail.title)}</h1>
      <p class="ft-body">${escapeHtml(detail.ask)}</p>
      <div class="ft-net-rows">
        <div class="ft-net-row"><span>Income</span><b>${escapeHtml(detail.income)}</b></div>
        <div class="ft-net-row"><span>Expenses</span><b class="${detail.expensesOut ? "is-neg" : ""}">${escapeHtml(detail.expenses)}</b></div>
        <div class="ft-net-row is-total is-${detail.netClass}"><span>Net this month</span><b class="is-${detail.netClass}">${escapeHtml(detail.net)}</b></div>
      </div>
      ${detail.quiet ? `<p class="ft-sheet-quiet">${escapeHtml(detail.quiet)}</p>` : ""}
      <button class="ft-btn primary" type="button" data-act="close-net">Got it</button>
    </div>`;
}

function screenShell(view, inner) {
  return `<div class="ft-app"><div class="ft-screen${view.kind === "life" ? " is-life" : ""}${view.lifeOverlay ? " is-overlay" : ""}" data-screen="${escapeHtml(view.id)}" data-frame="${escapeHtml(view.frame)}">${inner}</div></div>`;
}

export function renderFirstBuild(state) {
  const view = present(state);
  if (state.screen === "e0") {
    const under = present({ ...state, screen: "w0", infoOpen: false });
    return `<div class="ft-app"><div class="ft-screen" data-screen="e0" data-frame="${escapeHtml(view.frame)}">${topbar(view)}<div class="ft-under" inert>${content(under)}</div>${sheet(view)}</div></div>`;
  }
  if (view.lifeOverlay) {
    return screenShell(
      view,
      `${topbar(view)}<div class="ft-life-stage" inert>${lifeBlock(view.life, view.lifeFocus)}</div><div class="ft-scrim"></div>${inputSheet(view)}`,
    );
  }
  if (view.kind === "life" && view.lifeFocus === "ef") {
    return screenShell(view, `${topbar(view)}<div class="ft-life-stage">${efDetail(view.life)}</div>`);
  }
  if (view.kind === "life") {
    const stage = view.lifeDetail
      ? `<div class="ft-life-stage" inert>${lifeBlock(view.life, "scroll")}</div>${netSheet(view.life)}`
      : `<div class="ft-life-stage">${lifeBlock(view.life, view.lifeFocus)}</div>`;
    const planBack = view.fromInput
      ? `<div class="ft-actions"><button class="ft-btn primary" type="button" data-act="back-to-input">Back to input</button></div>`
      : view.projectNext
        ? `<div class="ft-actions"><button class="ft-btn primary" type="button" data-act="project-next">Continue</button></div>`
        : view.addGoal
          ? `<div class="ft-actions"><button class="ft-btn quiet" type="button" data-act="add-goal">Add a goal</button></div>`
          : "";
    return screenShell(view, `${topbar(view)}${stage}${planBack}`);
  }
  return screenShell(view, screenHtml(view));
}
