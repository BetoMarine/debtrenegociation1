import { stageLabel, stageLineHtml } from "./chrome.js";

export const KEYS_USED = [
  "reasonTitle",
  "reasonHint",
  "reasons.job_ended",
  "reasons.hours_cut",
  "reasons.will_miss",
  "reasons.already_missed",
  "creditorsTitle",
  "creditorsHint",
  "noCreditors",
  "remove",
  "nickname",
  "nicknamePh",
  "type",
  "accountRef",
  "accountRefPh",
  "amount",
  "amountPh",
  "addCreditor",
  "needCreditor",
  "situationTitle",
  "situationHint",
  "fullName",
  "fullNamePh",
  "hkid",
  "hkidPh",
  "phone",
  "phonePh",
  "whatChanged",
  "whatChangedPh",
  "when",
  "whenPh",
  "incomeItems",
  "incomeItemsPh",
  "incomeAmount",
  "incomeAmountPh",
  "expenseItems",
  "expenseItemsPh",
  "expenseAmount",
  "expenseAmountPh",
  "surplus",
  "surplusPh",
  "tenor",
  "askInterestFreeze",
  "creditHonesty",
  "letterTitle",
  "regenerate",
  "letterEdited",
  "continue",
  "back",
  "needName",
];

function line(ctx) {
  return stageLineHtml(ctx.host, stageLabel(ctx));
}

export function renderReason(ctx) {
  const { s, el, escapeHtml, pack, shell, nav } = ctx;
  const body = el(
    `<div class="stack">${line(ctx)}<h1>${escapeHtml(s("reasonTitle"))}</h1><p class="hint">${escapeHtml(s("reasonHint"))}</p></div>`,
  );
  for (const reason of ctx.REASONS) {
    const btn = el(
      `<button class="choice${pack?.reason === reason ? " selected" : ""}" type="button">${escapeHtml(s(`reasons.${reason}`))}</button>`,
    );
    btn.addEventListener("click", () => pickReason(ctx, reason));
    body.append(btn);
  }
  body.append(nav("home", pack?.reason ? "creditors" : null));
  shell(body);
}

async function pickReason(ctx, reason) {
  await ctx.ensurePack();
  ctx.pack.reason = reason;
  ctx.pack = await ctx.savePack(ctx.pack);
  ctx.render();
}

export function renderCreditors(ctx) {
  const { s, el, escapeHtml, pack, shell, nav } = ctx;
  const list = pack?.creditors || [];
  const draft = ctx.draftCreditor;
  const body = el(
    `<div class="stack">${line(ctx)}<h1>${escapeHtml(s("creditorsTitle"))}</h1><p class="hint">${escapeHtml(s("creditorsHint"))}</p></div>`,
  );
  if (!list.length) body.append(el(`<p class="tiny">${escapeHtml(s("noCreditors"))}</p>`));
  list.forEach((c, i) => {
    const row = el(`
      <div class="card creditor">
        <div>
          <strong>${escapeHtml(c.nickname)}</strong>
          <div class="tiny">${escapeHtml(s(`types.${c.type}`))}${c.ref ? ` · ${escapeHtml(c.ref)}` : ""}${c.amount ? ` · ${escapeHtml(c.amount)}` : ""}</div>
        </div>
        <button class="btn" type="button" style="width:auto;min-height:40px;padding:8px 12px">${escapeHtml(s("remove"))}</button>
      </div>
    `);
    row.querySelector("button").addEventListener("click", () => removeCreditor(ctx, i));
    body.append(row);
  });
  const form = el(`
    <div class="card stack">
      <label class="field">${escapeHtml(s("nickname"))}
        <input id="nick" maxlength="40" placeholder="${escapeHtml(s("nicknamePh"))}" value="${escapeHtml(draft.nickname)}" />
      </label>
      <label class="field">${escapeHtml(s("type"))}
        <select id="type">${ctx.TYPES.map((type) => `<option value="${type}" ${draft.type === type ? "selected" : ""}>${escapeHtml(s(`types.${type}`))}</option>`).join("")}</select>
      </label>
      <label class="field">${escapeHtml(s("accountRef"))}
        <input id="ref" maxlength="40" placeholder="${escapeHtml(s("accountRefPh"))}" value="${escapeHtml(draft.ref)}" />
      </label>
      <label class="field">${escapeHtml(s("amount"))}
        <input id="amt" maxlength="32" placeholder="${escapeHtml(s("amountPh"))}" value="${escapeHtml(draft.amount)}" />
      </label>
      <button class="btn" data-act="add" type="button">${escapeHtml(s("addCreditor"))}</button>
    </div>
  `);
  body.append(form);
  if (!list.length) body.append(el(`<p class="tiny">${escapeHtml(s("needCreditor"))}</p>`));
  body.append(nav("reason", list.length ? "situation" : null));
  shell(body);
  form.querySelector("#nick").addEventListener("input", (e) => {
    ctx.draftCreditor = { ...ctx.draftCreditor, nickname: e.target.value };
  });
  form.querySelector("#type").addEventListener("change", (e) => {
    ctx.draftCreditor = { ...ctx.draftCreditor, type: e.target.value };
  });
  form.querySelector("#ref").addEventListener("input", (e) => {
    ctx.draftCreditor = { ...ctx.draftCreditor, ref: e.target.value };
  });
  form.querySelector("#amt").addEventListener("input", (e) => {
    ctx.draftCreditor = { ...ctx.draftCreditor, amount: e.target.value };
  });
  form.querySelector("[data-act=add]").addEventListener("click", () => addCreditor(ctx));
}

async function addCreditor(ctx) {
  const nickname = ctx.draftCreditor.nickname.trim();
  if (!nickname) return;
  await ctx.ensurePack();
  ctx.pack.creditors.push({
    id: crypto.randomUUID(),
    nickname,
    type: ctx.draftCreditor.type,
    ref: ctx.draftCreditor.ref.trim(),
    amount: ctx.draftCreditor.amount.trim(),
  });
  ctx.draftCreditor = { nickname: "", type: ctx.draftCreditor.type, ref: "", amount: "" };
  ctx.pack.letterTouched = false;
  ctx.pack = await ctx.savePack(ctx.pack);
  ctx.render();
}

async function removeCreditor(ctx, index) {
  ctx.pack.creditors.splice(index, 1);
  ctx.pack.letterTouched = false;
  ctx.pack = await ctx.savePack(ctx.pack);
  ctx.render();
}

function readSituationForm(form) {
  return {
    fullName: form.querySelector("#fullName").value,
    hkid: form.querySelector("#hkid").value,
    phone: form.querySelector("#phone").value,
    situation: {
      whatChanged: form.querySelector("#what").value,
      when: form.querySelector("#when").value,
      incomeItems: form.querySelector("#incomeItems").value,
      incomeAmount: form.querySelector("#incomeAmount").value,
      expenseItems: form.querySelector("#expenseItems").value,
      expenseAmount: form.querySelector("#expenseAmount").value,
      surplus: form.querySelector("#surplus").value,
      tenorMonths: form.querySelector("#tenor").value,
      askInterestFreeze: form.querySelector("#freeze").checked,
    },
  };
}

export function renderSituation(ctx) {
  const { s, el, escapeHtml, pack, shell } = ctx;
  const sit = pack?.situation || {};
  if (pack && !pack.letter) ctx.syncLetter();
  const body = el(
    `<div class="stack">${line(ctx)}<h1>${escapeHtml(s("situationTitle"))}</h1><p class="hint">${escapeHtml(s("situationHint"))}</p></div>`,
  );
  const tenorOpts = ["3", "6", "9", "12"]
    .map((n) => `<option value="${n}" ${String(sit.tenorMonths || "6") === n ? "selected" : ""}>${escapeHtml(s(`tenorMonths.${n}`))}</option>`)
    .join("");
  const form = el(`
    <div class="stack">
      <label class="field">${escapeHtml(s("fullName"))}
        <input id="fullName" maxlength="80" placeholder="${escapeHtml(s("fullNamePh"))}" value="${escapeHtml(pack?.fullName || "")}" />
      </label>
      <label class="field">${escapeHtml(s("hkid"))}
        <input id="hkid" maxlength="20" placeholder="${escapeHtml(s("hkidPh"))}" value="${escapeHtml(pack?.hkid || "")}" autocomplete="off" />
      </label>
      <label class="field">${escapeHtml(s("phone"))}
        <input id="phone" maxlength="20" placeholder="${escapeHtml(s("phonePh"))}" value="${escapeHtml(pack?.phone || "")}" inputmode="tel" />
      </label>
      <label class="field">${escapeHtml(s("whatChanged"))}
        <textarea id="what" class="short" placeholder="${escapeHtml(s("whatChangedPh"))}">${escapeHtml(sit.whatChanged || "")}</textarea>
      </label>
      <label class="field">${escapeHtml(s("when"))}
        <input id="when" maxlength="40" placeholder="${escapeHtml(s("whenPh"))}" value="${escapeHtml(sit.when || "")}" />
      </label>
      <label class="field">${escapeHtml(s("incomeItems"))}
        <input id="incomeItems" maxlength="120" placeholder="${escapeHtml(s("incomeItemsPh"))}" value="${escapeHtml(sit.incomeItems || "")}" />
      </label>
      <label class="field">${escapeHtml(s("incomeAmount"))}
        <input id="incomeAmount" maxlength="40" placeholder="${escapeHtml(s("incomeAmountPh"))}" value="${escapeHtml(sit.incomeAmount || "")}" />
      </label>
      <label class="field">${escapeHtml(s("expenseItems"))}
        <input id="expenseItems" maxlength="120" placeholder="${escapeHtml(s("expenseItemsPh"))}" value="${escapeHtml(sit.expenseItems || "")}" />
      </label>
      <label class="field">${escapeHtml(s("expenseAmount"))}
        <input id="expenseAmount" maxlength="40" placeholder="${escapeHtml(s("expenseAmountPh"))}" value="${escapeHtml(sit.expenseAmount || "")}" />
      </label>
      <label class="field">${escapeHtml(s("surplus"))}
        <input id="surplus" maxlength="40" placeholder="${escapeHtml(s("surplusPh"))}" value="${escapeHtml(sit.surplus || "")}" />
      </label>
      <label class="field">${escapeHtml(s("tenor"))}
        <select id="tenor">${tenorOpts}</select>
      </label>
      <label class="doc-head">
        <input id="freeze" class="check" type="checkbox" ${sit.askInterestFreeze ? "checked" : ""} />
        <span>${escapeHtml(s("askInterestFreeze"))}</span>
      </label>
      <p class="tiny">${escapeHtml(s("creditHonesty"))}</p>
      <label class="field">${escapeHtml(s("letterTitle"))}
        <textarea id="letter">${escapeHtml(pack?.letter || "")}</textarea>
      </label>
      <button class="btn" data-act="regen" type="button">${escapeHtml(s("regenerate"))}</button>
      ${pack?.letterTouched ? `<p class="tiny">${escapeHtml(s("letterEdited"))}</p>` : ""}
    </div>
  `);
  body.append(form);
  const next = el(`<button class="btn btn-primary" type="button">${escapeHtml(s("continue"))}</button>`);
  const box = el(`<div class="nav"></div>`);
  box.append(next, el(`<button class="btn btn-ghost" data-go="creditors" type="button">${escapeHtml(s("back"))}</button>`));
  body.append(box);
  shell(body);

  const persist = async (forceRebuild) => {
    const nextForm = readSituationForm(form);
    ctx.pack.fullName = nextForm.fullName;
    ctx.pack.hkid = nextForm.hkid;
    ctx.pack.phone = nextForm.phone;
    ctx.pack.situation = { ...nextForm.situation, tenorStored: true };
    if (forceRebuild || !ctx.pack.letterTouched) {
      ctx.syncLetter();
      if (forceRebuild) ctx.pack.letterTouched = false;
      form.querySelector("#letter").value = ctx.pack.letter;
    } else {
      ctx.pack.letter = form.querySelector("#letter").value;
    }
    ctx.pack = await ctx.savePack(ctx.pack);
    await ctx.persistFireHandoff();
  };
  ["fullName", "hkid", "phone", "what", "when", "incomeItems", "incomeAmount", "expenseItems", "expenseAmount", "surplus"].forEach((id) => {
    form.querySelector(`#${id}`).addEventListener("input", () => persist(false));
  });
  form.querySelector("#tenor").addEventListener("change", () => persist(false));
  form.querySelector("#freeze").addEventListener("change", () => persist(false));
  form.querySelector("#letter").addEventListener("input", async (e) => {
    ctx.pack.letterTouched = true;
    ctx.pack.letter = e.target.value;
    ctx.pack = await ctx.savePack(ctx.pack);
  });
  form.querySelector("[data-act=regen]").addEventListener("click", async () => {
    if (ctx.pack.letterTouched && !confirm(ctx.s("letterEdited"))) return;
    await persist(true);
    ctx.render();
  });
  next.addEventListener("click", async () => {
    await persist(false);
    if (!ctx.pack.fullName.trim()) {
      ctx.notice = ctx.s("needName");
      ctx.render();
      return;
    }
    ctx.notice = "";
    if (!ctx.pack.letter.trim()) await persist(true);
    await ctx.finishAssessment();
    ctx.go("door");
  });
}
