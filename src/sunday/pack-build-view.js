import { escapeHtml } from "../dom.js";
import {
  DOC_SLOTS,
  PACK_BOOK,
  PACK_BUILD,
  PACK_DOCS,
  PACK_DOCS_SAVED,
  PACK_FORMING,
  PACK_READY,
  docsSavedCount,
  formatHkd,
  packageAskLine,
  packageIsReady,
  packageMathFromInputs,
  packScreenModel,
  resolveSundayScreen,
} from "./pack-build.js";

const BACK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`;
const EXIT_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.6 9.6 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.6 3.4"/><path d="M6.5 6.6C3.9 8.3 2.5 12 2.5 12s3.5 7 9.5 7a9 9 0 0 0 4.9-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

function readInputs(form, sunday) {
  const current = sunday.packageInputs || {};
  return {
    pay: form.querySelector("#pack-pay")?.value ?? current.pay ?? "",
    expenses: form.querySelector("#pack-expenses")?.value ?? current.expenses ?? "",
    overdue: form.querySelector("#pack-overdue")?.value ?? current.overdue ?? "",
    positive: !!current.positive,
  };
}

export function renderPackScreen(screen, host) {
  const resolved = resolveSundayScreen(screen, host.sunday);
  if (resolved !== screen) {
    host.go(resolved);
    return;
  }
  const model = packScreenModel(screen, host.sunday);
  const ex = escapeHtml;
  const root = document.getElementById("app");
  root.innerHTML = "";
  const shell = host.el(`<div class="pack-shell" data-screen="${ex(screen)}"></div>`);
  shell.append(host.el(`
    <div class="top">
      <button class="iconbtn" type="button" data-go="${ex(model.back)}" aria-label="Back">${BACK_SVG}</button>
      <div class="stepper">${ex(model.stepper)}</div>
      <button class="iconbtn exit" type="button" data-act="exit" aria-label="Quick exit">${EXIT_SVG}<span>Exit</span></button>
    </div>
  `));
  const content = host.el(`<div class="content"></div>`);
  if (host.notice) {
    content.append(host.el(`<p class="note">${ex(host.notice)}</p>`));
  }
  content.append(
    host.el(`<span class="followchip">${ex(model.chip)}</span>`),
    host.el(`<h1>${ex(model.h1)}</h1>`),
    host.el(`<p class="body">${ex(model.body)}</p>`),
  );
  content.append(screenBody(screen, model, host));
  shell.append(content);
  shell.append(actions(screen, model, host));
  root.append(shell);
  bind(screen, shell, host);
  document.documentElement.lang = "en";
  window.scrollTo(0, 0);
}

function screenBody(screen, model, host) {
  const { el, sunday } = host;
  const ex = escapeHtml;
  const wrap = el(`<div class="pack-body"></div>`);
  if (screen === PACK_BUILD) {
    const steps = el(`<div class="steps3"></div>`);
    for (const step of model.steps) {
      steps.append(el(`<div class="srow ${ex(step.state)}"><span class="n">${ex(step.n)}</span><span>${ex(step.label)}</span></div>`));
    }
    wrap.append(steps, el(`<p class="hint">${ex(model.hint)}</p>`));
    return wrap;
  }
  if (screen === PACK_FORMING) {
    const inputs = sunday.packageInputs || {};
    wrap.append(el(`
      <div class="pack-fields">
        <label class="field">Pay
          <span class="cur">HK$</span>
          <input id="pack-pay" inputmode="numeric" maxlength="9" autocomplete="off" value="${ex(inputs.pay || "")}" />
        </label>
        <label class="field">Send home + bills
          <span class="cur">HK$</span>
          <input id="pack-expenses" inputmode="numeric" maxlength="9" autocomplete="off" value="${ex(inputs.expenses || "")}" />
        </label>
        <label class="field field-quiet">Overdue, if you have no month numbers
          <span class="cur">HK$</span>
          <input id="pack-overdue" inputmode="numeric" maxlength="9" autocomplete="off" value="${ex(inputs.overdue || "")}" />
        </label>
      </div>
    `));
    const rows = el(`<div class="rows"></div>`);
    for (const row of model.rows) {
      const shown = row.v || "—";
      rows.append(el(`<div class="row${row.total ? " total" : ""}"><span class="k">${ex(row.k)}</span><span class="v">${ex(shown)}</span></div>`));
    }
    wrap.append(rows);
    if (model.ask) {
      wrap.append(el(`<div class="actionpick"><b>Your package</b>${ex(model.ask)}</div>`));
    }
    const positive = !!inputs.positive;
    const fork = el(`<button class="btn quiet fork" type="button" data-act="fork">${positive ? "Money is tight — show a payment I can carry" : "This month can improve"}</button>`);
    wrap.append(fork);
    if (model.hint) wrap.append(el(`<p class="hint">${ex(model.hint)}</p>`));
    return wrap;
  }
  if (screen === PACK_READY) {
    wrap.append(
      el(`<div class="fact"><b>Your package</b>${ex(model.fact)}</div>`),
      el(`<div class="note"><b>Timeline</b>${ex(model.note)}</div>`),
      el(`<div class="progresswarm"><b>Next step</b>${ex(model.nextStep)}</div>`),
    );
    return wrap;
  }
  if (screen === PACK_DOCS) {
    wrap.append(el(`<div class="progresswarm"><b>Optional</b>${ex(model.progress)}</div>`));
    const list = el(`<div class="doclist"></div>`);
    for (const slot of DOC_SLOTS) {
      const saved = sunday.docs?.[slot.id];
      const mark = saved?.name ? "✓" : "+";
      const sub = saved?.name ? "On this phone" : slot.hint;
      const row = el(`
        <label class="docrow${saved?.name ? " filled" : ""}">
          <input class="file" type="file" accept="image/*,application/pdf" data-slot="${ex(slot.id)}" />
          <span class="mark">${mark}</span>
          <span><span class="t">${ex(slot.title)}</span><span class="s">${ex(sub)}</span></span>
        </label>
      `);
      list.append(row);
    }
    wrap.append(
      list,
      el(`<div class="helperslot"><b>Someone who can help</b>${ex(model.helper)}</div>`),
    );
    return wrap;
  }
  if (screen === PACK_DOCS_SAVED) {
    wrap.append(el(`
      <div class="doclist">
        <div class="docrow filled"><span class="mark">✓</span><span><span class="t">Package</span><span class="s">${ex(model.packageLine)}</span></span></div>
        <div class="docrow"><span class="mark">${docsSavedCount(sunday.docs) ? "✓" : "·"}</span><span><span class="t">Papers</span><span class="s">${ex(model.paperLine)}</span></span></div>
      </div>
    `));
    wrap.append(
      el(`<div class="saved"><span>${ex(model.saved)}</span></div>`),
      el(`<div class="progresswarm"><b>Ready</b>${ex(model.progress)}</div>`),
    );
    return wrap;
  }
  wrap.append(
    el(`<div class="fact"><b>You bring</b>${ex(model.bring)}</div>`),
    el(`<div class="helperslot"><b>Someone who can help</b>${ex(model.helper)}</div>`),
    el(`<div class="note"><b>Not first</b>${ex(model.note)}</div>`),
  );
  if (model.savedIntent) wrap.append(el(`<p class="hint">${ex(model.savedIntent)}</p>`));
  return wrap;
}

function actions(screen, model, host) {
  const { el } = host;
  const ex = escapeHtml;
  const box = el(`<div class="actions"></div>`);
  model.actions.forEach((label, index) => {
    const kind = index === 0 ? "primary" : label === model.quiet ? "quiet" : "secondary";
    const act = actionName(screen, label);
    box.append(el(`<button class="btn ${kind}" type="button" data-act="${ex(act)}">${ex(label)}</button>`));
  });
  return box;
}

function actionName(screen, label) {
  if (screen === PACK_BUILD && label === "Start building") return "start";
  if (screen === PACK_BUILD) return "leave";
  if (screen === PACK_FORMING && label === "See what you take") return "ready";
  if (screen === PACK_FORMING) return "adjust";
  if (screen === PACK_READY && label === "Next · upload docs") return "docs";
  if (screen === PACK_READY && label === "Generate/share PDF") return "pdf";
  if (screen === PACK_READY) return "save-only";
  if (screen === PACK_DOCS && label === "Save what I have") return "save-docs";
  if (screen === PACK_DOCS) return "skip-docs";
  if (screen === PACK_DOCS_SAVED && label === "Book a helper") return "book";
  if (screen === PACK_DOCS_SAVED) return "done";
  if (screen === PACK_BOOK && label === "Request appointment") return "intent";
  return "back-package";
}

function bind(screen, shell, host) {
  const sunday = host.sunday;
  shell.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      captureInputs(shell, sunday);
      await host.persistSunday(screen);
      host.go(btn.dataset.go);
    });
  });
  shell.querySelector('[data-act="exit"]')?.addEventListener("click", async () => {
    captureInputs(shell, sunday);
    await host.persistSunday(screen);
    host.go("sunday-privacy");
  });
  shell.querySelector('[data-act="leave"]')?.addEventListener("click", () => host.go("sunday-privacy"));
  shell.querySelector('[data-act="start"]')?.addEventListener("click", async () => {
    await host.persistSunday(PACK_FORMING);
    host.go(PACK_FORMING);
  });
  shell.querySelector('[data-act="fork"]')?.addEventListener("click", async () => {
    const form = shell;
    const inputs = readInputs(form, sunday);
    inputs.positive = !sunday.packageInputs?.positive;
    sunday.packageInputs = inputs;
    sunday.packageMath = packageMathFromInputs(inputs);
    await host.persistSunday(PACK_FORMING);
    host.render();
  });
  shell.querySelector('[data-act="adjust"]')?.addEventListener("click", () => {
    shell.querySelector("#pack-pay")?.focus();
  });
  shell.querySelector('[data-act="ready"]')?.addEventListener("click", async () => {
    const inputs = readInputs(shell, sunday);
    inputs.positive = !!sunday.packageInputs?.positive;
    const math = packageMathFromInputs(inputs);
    sunday.packageInputs = inputs;
    sunday.packageMath = math;
    if (!packageIsReady(math)) {
      host.setNotice(
        math.fork === "tight"
          ? "These amounts do not leave a payment you can carry. Adjust the numbers you entered."
          : "Enter your pay and send-home plus bills, or an overdue amount. Nothing is filled in for you.",
      );
      await host.persistSunday(PACK_FORMING);
      host.render();
      return;
    }
    host.setNotice("");
    sunday.packageReady = true;
    await host.persistSunday(PACK_READY);
    host.go(PACK_READY);
  });
  shell.querySelector('[data-act="docs"]')?.addEventListener("click", async () => {
    host.setNotice("");
    await host.persistSunday(PACK_DOCS);
    host.go(PACK_DOCS);
  });
  shell.querySelector('[data-act="pdf"]')?.addEventListener("click", () => host.handleSundayPdf("share"));
  shell.querySelector('[data-act="save-only"]')?.addEventListener("click", async () => {
    sunday.packageReady = true;
    host.setNotice("Saved on this phone.");
    await host.persistSunday(PACK_READY);
    host.render();
  });
  shell.querySelectorAll("input.file").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file || !host.saveSundayDoc) return;
      await host.saveSundayDoc(input.dataset.slot, file);
    });
  });
  shell.querySelector('[data-act="save-docs"]')?.addEventListener("click", () => finishDocs(host));
  shell.querySelector('[data-act="skip-docs"]')?.addEventListener("click", () => finishDocs(host));
  shell.querySelector('[data-act="book"]')?.addEventListener("click", async () => {
    if (!sunday.docsStepShown || !sunday.packageReady) {
      host.go(PACK_BUILD);
      return;
    }
    host.setNotice("");
    await host.persistSunday(PACK_BOOK);
    host.go(PACK_BOOK);
  });
  shell.querySelector('[data-act="done"]')?.addEventListener("click", async () => {
    host.setNotice("Saved on this phone. You can come back.");
    await host.persistSunday(PACK_DOCS_SAVED);
    host.go("sunday-privacy");
  });
  shell.querySelector('[data-act="intent"]')?.addEventListener("click", async () => {
    if (!sunday.docsStepShown || !sunday.packageReady) {
      host.go(PACK_BUILD);
      return;
    }
    sunday.bookIntent = true;
    host.setNotice("");
    await host.persistSunday(PACK_BOOK);
    host.render();
  });
  shell.querySelector('[data-act="back-package"]')?.addEventListener("click", () => host.go(PACK_READY));
  ["#pack-pay", "#pack-expenses", "#pack-overdue"].forEach((sel) => {
    shell.querySelector(sel)?.addEventListener("input", async (e) => {
      const inputs = readInputs(shell, sunday);
      inputs.positive = !!sunday.packageInputs?.positive;
      const key = sel === "#pack-pay" ? "pay" : sel === "#pack-expenses" ? "expenses" : "overdue";
      const next = e.target.value.replace(/[^\d]/g, "").slice(0, 9);
      if (e.target.value !== next) e.target.value = next;
      inputs[key] = next;
      sunday.packageInputs = inputs;
      sunday.packageMath = packageMathFromInputs(inputs);
      sunday.packageReady = false;
      paintMath(shell, sunday.packageMath);
    });
  });
}

function captureInputs(shell, sunday) {
  if (!shell.querySelector("#pack-pay")) return;
  const inputs = readInputs(shell, sunday);
  inputs.positive = !!sunday.packageInputs?.positive;
  sunday.packageInputs = inputs;
  sunday.packageMath = packageMathFromInputs(inputs);
}

function paintMath(shell, math) {
  const values = [
    typeof math.pay === "number" ? formatHkd(math.pay) : "",
    typeof math.expenses === "number" ? formatHkd(math.expenses) : "",
    typeof math.save === "number" ? formatHkd(math.save) : "",
    math.fork === "carry" ? formatHkd(math.installment) : "",
  ];
  shell.querySelectorAll(".rows .row .v").forEach((node, i) => {
    node.textContent = values[i] || "—";
  });
  const ask = packageAskLine(math);
  let pick = shell.querySelector(".actionpick");
  if (!ask) {
    pick?.remove();
    return;
  }
  if (!pick) {
    pick = document.createElement("div");
    pick.className = "actionpick";
    shell.querySelector(".rows")?.after(pick);
  }
  pick.innerHTML = `<b>Your package</b>${escapeHtml(ask)}`;
}

async function finishDocs(host) {
  host.sunday.docsStepShown = true;
  host.setNotice("");
  await host.persistSunday(PACK_DOCS_SAVED);
  host.go(PACK_DOCS_SAVED);
}
