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
              : "pick-grow";
      return `<button class="ft-choice${locked}" type="button" data-act="${act}" data-value="${escapeHtml(item.id)}"><span class="ft-choice-label">${escapeHtml(item.label)}${sub}</span>${tail}</button>`;
    })
    .join("");
}

function inputBlock(view) {
  const field = view.input;
  const money = field.mode === "money";
  const prefix = money ? `<span class="ft-cur">HK$</span>` : "";
  const amountMode = money ? "decimal" : "numeric";
  const amountName = money ? "amount" : "days";
  const required = view.showRequired
    ? `<p class="ft-required" role="alert">${escapeHtml(view.requiredHint)}</p>`
    : "";
  return `<label class="ft-label" for="ft-amount">${escapeHtml(field.label)}</label>
    <div class="ft-input">
      ${prefix}<input id="ft-amount" name="${amountName}" data-field="${amountName}" data-key="${escapeHtml(field.key)}" inputmode="${amountMode}" autocomplete="off" enterkeyhint="done" maxlength="${money ? "16" : "5"}" placeholder="Tap to enter" value="${escapeHtml(field.amount)}" aria-label="${escapeHtml(field.label)}" />
    </div>
    ${required}
    <label class="ft-label" for="ft-note">Note</label>
    <div class="ft-input is-optional">
      <input id="ft-note" name="note" data-field="note" data-key="${escapeHtml(field.key)}" autocomplete="off" maxlength="280" placeholder="Optional" value="${escapeHtml(field.note)}" aria-label="Note (optional)" />
    </div>`;
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
      `<button class="ft-btn quiet" type="button" data-act="back">${escapeHtml(view.quiet)}</button>`,
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

function screenHtml(view) {
  return `${topbar(view)}${content(view)}${actions(view)}`;
}

function axis() {
  return `<text x="4" y="14" class="ft-glab">Positive</text><text x="4" y="104" class="ft-glab">Negative</text><line x1="8" y1="55" x2="272" y2="55" class="ft-gzero"/><text x="276" y="52" text-anchor="end" class="ft-gzero-lab">0</text>`;
}

function dots(points, color) {
  return points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`).join("");
}

function efGraph(pct) {
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const ys = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(74 - t * (8 + (36 * p) / 100)));
  const xs = [20, 70, 120, 180, 250];
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  return `<polyline fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="20,42 70,40 120,41 180,39 250,38"/>${dots(
    [
      [20, 42],
      [70, 40],
      [120, 41],
      [180, 39],
      [250, 38],
    ],
    "#0d9488",
  )}<polyline fill="none" stroke="#5eead4" stroke-width="2.2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>`;
}

function graph(kind, pct) {
  if (kind === "none") return "";
  if (kind === "invest") {
    return `<svg class="ft-graph is-stub" viewBox="0 0 280 90" aria-hidden="true"><line x1="8" y1="50" x2="272" y2="50" class="ft-gzero"/><polyline fill="none" stroke="#94a3b8" stroke-width="2" points="20,60 90,58 160,56 250,54"/><polyline fill="none" stroke="#0d9488" stroke-width="2.2" points="20,60 90,48 160,36 250,22"/></svg>`;
  }
  if (kind === "goals") {
    return `<svg class="ft-graph is-stub" viewBox="0 0 280 90" aria-hidden="true"><line x1="8" y1="45" x2="200" y2="45" class="ft-gzero"/><polyline fill="none" stroke="#94a3b8" stroke-width="2" points="20,40 80,42 140,44 200,46"/><polyline fill="none" stroke="#0d9488" stroke-width="2.2" points="20,40 80,48 140,70 200,52"/><circle cx="248" cy="45" r="16" fill="none" stroke="#e2e8f0" stroke-width="5"/><circle cx="248" cy="45" r="16" fill="none" stroke="#0d9488" stroke-width="5" stroke-dasharray="36 80" stroke-linecap="round"/></svg>`;
  }
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
    ef: efGraph(pct),
  };
  return `<svg class="ft-graph" viewBox="0 0 280 110" aria-hidden="true">${axis()}${lines[kind] || ""}</svg>`;
}

function msRow({ n, tone, stub, testId, button, act, value, body }) {
  const numClass = ["ft-ms-num", stub ? "is-stub" : "", tone === "strain" ? "is-red" : "", tone === "steady" ? "is-teal" : ""]
    .filter(Boolean)
    .join(" ");
  const cardClass = `ft-ms-card${stub ? " is-stub" : ""}`;
  const inner = `${body}<span class="ft-ms-chev" aria-hidden="true">›</span>`;
  const card = button
    ? `<button class="${cardClass}" type="button" data-act="${act}"${value ? ` data-value="${escapeHtml(value)}"` : ""}>${inner}</button>`
    : `<div class="${cardClass}">${inner}</div>`;
  return `<div class="ft-ms-row" data-ms="${escapeHtml(testId)}"><div class="ft-ms-rail"><span class="${numClass}">${n}</span></div>${card}</div>`;
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
    </div>`;
}

function rdBody(rd) {
  return `<div class="ft-ms-head"><b>Right Door complete</b><span class="ft-ms-date">${escapeHtml(rd.date)}</span></div>
    <div class="ft-ms-gtitle">Cash flow after renegotiation</div>
    ${graph(rd.graph)}
    <div class="ft-ms-foot" data-joined="${rd.joined ? "yes" : "no"}"><b class="ft-net ${rd.joined ? "is-pos" : "is-muted"}">${escapeHtml(rd.foot)}</b></div>`;
}

function efBody(ef) {
  return `<div class="ft-ms-head"><b>Emergency fund</b><span class="ft-ms-date">${escapeHtml(ef.date)}</span></div>
    <div class="ft-ms-gtitle">Cash flow + emergency savings</div>
    ${graph("ef", ef.pct)}
    <div class="ft-ms-foot" data-ef-now="${ef.now ?? ""}" data-ef-pct="${ef.pct ?? ""}">
      <span class="ft-legend"><i class="ft-lg"></i> Cash flow <i class="ft-lg is-dash"></i> Emergency savings</span>
      <span class="ft-muted is-thin${ef.moved ? " is-moved" : ""}">${escapeHtml(ef.foot)}</span>
      ${ef.delta ? `<span class="ft-delta">${escapeHtml(ef.delta)}</span>` : ""}
    </div>`;
}

function stubBody(stub) {
  return `<div class="ft-ms-head"><b>${escapeHtml(stub.title)}</b><span class="ft-ms-date">${escapeHtml(stub.date)}</span></div>
    ${stub.gtitle ? `<div class="ft-ms-gtitle">${escapeHtml(stub.gtitle)}</div>` : ""}
    ${graph(stub.graph)}
    <div class="ft-ms-foot">${stub.open ? `<p class="ft-open-line">${escapeHtml(stub.open)}</p>` : `<span class="ft-muted is-thin">${escapeHtml(stub.later)}</span>`}</div>`;
}

function lifeBlock(life, focus) {
  const solo = focus && focus !== "scroll";
  const rows = [];
  if (!solo || focus === "today") {
    rows.push(
      msRow({
        n: "1",
        tone: life.today.tone,
        testId: "today",
        button: true,
        act: solo ? "open-net" : "open-milestone",
        value: solo ? "" : "today",
        body: todayBody(life.today),
      }),
    );
  }
  if (!solo || focus === "rd") {
    rows.push(
      msRow({
        n: "2",
        testId: "rd",
        button: !solo,
        act: "open-milestone",
        value: "rd",
        body: rdBody(life.rd),
      }),
    );
  }
  if (!solo || focus === "ef") {
    rows.push(
      msRow({
        n: "3",
        testId: "ef",
        button: !solo,
        act: "open-milestone",
        value: "ef",
        body: efBody(life.ef),
      }),
    );
  }
  for (const stub of life.stubs) {
    if (solo && focus !== stub.id) continue;
    rows.push(
      msRow({
        n: stub.n,
        stub: true,
        testId: stub.id,
        button: !solo,
        act: "open-milestone",
        value: stub.id,
        body: stubBody(stub),
      }),
    );
  }
  const pill = life.pill ? `<span class="ft-jpill is-${life.pill.tone}">${escapeHtml(life.pill.label)}</span>` : "";
  const note = focus === "rd" ? `<p class="ft-life-note">${escapeHtml(life.rd.note)}</p>` : "";
  return `<div class="ft-life" data-tone="${escapeHtml(life.tone)}">${`<div class="ft-life-head${solo ? " is-compact" : ""}"><h1>Your life</h1><p class="ft-life-sub">Today → age 70</p>${pill}</div>`}<div class="ft-life-timeline${solo ? " is-solo" : ""}">${rows.join("")}</div>${note}</div>`;
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
  if (view.kind === "life") {
    const stage = view.lifeDetail
      ? `<div class="ft-life-stage" inert>${lifeBlock(view.life, "scroll")}</div>${netSheet(view.life)}`
      : `<div class="ft-life-stage">${lifeBlock(view.life, view.lifeFocus)}</div>`;
    const planBack = view.fromInput
      ? `<div class="ft-actions"><button class="ft-btn primary" type="button" data-act="back-to-input">Back to input</button></div>`
      : "";
    return screenShell(view, `${topbar(view)}${stage}${planBack}`);
  }
  return screenShell(view, screenHtml(view));
}
