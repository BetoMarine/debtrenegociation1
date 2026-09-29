const M=["fix","stabilize","plan","invest"],g={en:{fix:"Get through this month",stabilize:"Build a cushion",plan:"Plan what's next",invest:"Help it grow"}};function C(e,t){return(g[e]||g.en)[t]||g.en[t]||""}function B(e){const t=document.createElement("div");return t.innerHTML=e.trim(),t.firstElementChild}function P(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function G(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===!0}function j(e){const t=URL.createObjectURL(e),n=document.createElement("a");n.href=t,n.download=e.name,n.click(),setTimeout(()=>URL.revokeObjectURL(t),1e3)}function S(e,t){return e!=="fortune"||!t?"":`<p class="stage-line" data-stage-line>${P(t)}</p>`}function w(e){return e!=null&&e.stageWord?e.stageWord:C("en",(e==null?void 0:e.stageId)||"fix")}function H(e){const{s:t,el:n,escapeHtml:a,pack:s,shell:h,nav:u}=e,l=(s==null?void 0:s.door)||e.recommendDoor((s==null?void 0:s.creditors)||[]),c=e.hrefs(e.lang),o={[e.DOORS.IDRP]:{title:t("doorIdrpTitle"),body:t("doorIdrpBody"),sayTitle:t("doorIdrpSayTitle"),say:t("doorIdrpSay"),facts:[],sources:[[t("sourceHkma"),c.hkma],[t("sourceHkmaGuide"),c.hkmaGuide]]},[e.DOORS.HSBC_WORKOUT]:{title:t("doorHsbcTitle"),body:t("doorHsbcBody"),sayTitle:t("doorHsbcSayTitle"),say:t("doorHsbcSay"),facts:[t("doorHsbcPhone"),t("doorHsbcEmail"),t("doorHsbcMail")],sources:[[t("sourceHsbc"),c.hsbc]]},[e.DOORS.CITI]:{title:t("doorCitiTitle"),body:t("doorCitiBody"),sayTitle:t("doorCitiSayTitle"),say:t("doorCitiSay"),facts:[t("doorCitiPhone")],sources:[[t("sourceCiti"),c.citi]]},[e.DOORS.OTHER]:{title:t("doorOtherTitle"),body:t("doorOtherBody"),sayTitle:t("doorOtherSayTitle"),say:t("doorOtherSay"),facts:[],sources:[[t("sourceHkma"),c.hkma],[t("sourceHkmaGuide"),c.hkmaGuide]]}}[l],r=n(`<div class="stack">${S(e.host,w(e))}<h1>${a(t("doorTitle"))}</h1><h2>${a(o.title)}</h2><p>${a(o.body)}</p></div>`);if(o.facts.length){const p=n('<div class="card stack"></div>');o.facts.forEach(d=>p.append(n(`<p>${a(d)}</p>`))),r.append(p)}r.append(n(`<p class="tiny">${a(o.sayTitle)}</p>`)),r.append(n(`<div class="script">${a(o.say)}</div>`)),((s==null?void 0:s.creditors)||[]).some(p=>p.type==="money_lender")&&l!==e.DOORS.IDRP&&r.append(n(`<p class="tiny">${a(t("doorMoneyNote"))}</p>`));const i=n('<div class="card stack"></div>');o.sources.forEach(([p,d])=>{i.append(n(`<a class="link" href="${a(d)}" target="_blank" rel="noopener">${a(p)}</a>`))}),r.append(i),r.append(u("situation","documents")),h(r)}function E(e){return S(e.host,w(e))}function I(e){return`${e.host==="fortune"?"ft:att:":"rd:att:"}${crypto.randomUUID()}`}function L(e){const{s:t,el:n,escapeHtml:a,shell:s,nav:h}=e;e.pack.documents=e.normalizeDocuments(e.pack.documents);const u=n(`<div class="stack">${E(e)}<h1>${a(t("docsTitle"))}</h1><p class="hint">${a(t("docsHint"))}</p></div>`);e.pack.documents.forEach((l,c)=>{const o=e.DOCUMENT_DEFS.find(f=>f.key===l.key),r=l.attachmentIds.length,i=(o==null?void 0:o.minFiles)||0,p=!!(o!=null&&o.required),d=n(`
      <div class="card doc">
        <div>
          <span class="tag">${a(t(p?"requiredTag":"optionalTag"))}</span>
          <strong>${a(t(`docs.${l.key}`))}</strong>
          ${i?`<p class="tiny">${a(t("photoCount",{have:r,need:i}))}</p>`:r?`<p class="tiny">${r}</p>`:""}
        </div>
        <input class="hidden-file" type="file" accept="image/*" multiple />
        <button class="btn" type="button">${a(t(r?"attachMore":"attach"))}</button>
        <div class="thumbs"></div>
      </div>
    `),m=d.querySelector('input[type="file"]');d.querySelector(".btn").addEventListener("click",()=>m.click()),m.addEventListener("change",async f=>{const k=[...f.target.files||[]];for(const $ of k){const v=await e.compressImage($),y=I(e);await e.putAttachment(y,v),e.pack.documents[c].attachmentIds.push(y)}e.pack.letterTouched||e.syncLetter(),e.pack=await e.savePack(e.pack),e.render()});const b=d.querySelector(".thumbs");l.attachmentIds.forEach((f,k)=>{const $=n(`<div class="thumb-row"><button class="btn btn-ghost" type="button">${a(t("removePhoto"))}</button></div>`);$.querySelector("button").addEventListener("click",async()=>{await e.deleteAttachment(f),e.pack.documents[c].attachmentIds.splice(k,1),e.pack.letterTouched||e.syncLetter(),e.pack=await e.savePack(e.pack),e.render()}),e.getAttachment(f).then(v=>{if(!v)return;const y=document.createElement("img");y.className="thumb",y.alt="",y.src=URL.createObjectURL(v),$.prepend(y)}),b.append($)}),u.append(d)}),u.append(h("door","pack")),s(u)}function q(e,t){return t.key==="hardship_proof"?e.s("missingHardship",{remain:t.remain}):t.key==="bank_statements"?e.s("missingStatements",{remain:t.remain}):e.s(`docs.${t.key}`)}function O(e){const{s:t,el:n,escapeHtml:a,shell:s,nav:h}=e;e.pack.documents=e.normalizeDocuments(e.pack.documents),e.pack.letterTouched||e.syncLetter();const u=e.missingAttachments(e.pack.documents),l=u.length>0,c=e.reminderState(),o=c&&(e.pack.status==="sent"||e.pack.status==="waiting"),r=n(`<div class="stack">${E(e)}<h1>${a(t("packTitle"))}</h1><p class="hint">${a(t("packHint"))}</p></div>`);if(r.append(n(`<article class="letter-file">${a(e.pack.letter||"")}</article>`)),l){const b=n(`<div class="card warn stack"><strong>${a(t("missingTitle"))}</strong><p class="tiny">${a(t("missingHint"))}</p></div>`);u.forEach(f=>b.append(n(`<p>${a(q(e,f))}</p>`))),r.append(b)}const i=n('<div class="nav"></div>'),p=n(`<button class="btn btn-accent" type="button">${a(e.busy?t("makingPdf"):t("makePdf"))}</button>`),d=n(`<button class="btn btn-primary" type="button">${a(t("share"))}</button>`),m=n(`<button class="btn" type="button">${a(t("download"))}</button>`);p.disabled=e.busy||l,d.disabled=e.busy||l,m.disabled=e.busy||l,i.append(p,d,m),e.isFortuneReferral()&&i.append(n(e.fortuneReturnCtaHtml(a,t("backToFortune")))),r.append(i),r.append(n(`<h2>${a(t("statusTitle"))}</h2>`)),r.append(n(`<p class="hint">${a(t("statusHint"))}</p>`)),o&&r.append(n(`<div class="card"><strong>${a(c.overdue?t("reminderDue"):t("reminder"))}</strong><p class="tiny">${a(t("comeBackOn"))} ${a(c.label)}</p></div>`)),e.STATUSES.forEach(b=>{const f=n(`<button class="status${e.pack.status===b?" selected":""}" type="button">${a(t(`statuses.${b}`))}</button>`);f.addEventListener("click",()=>e.setStatus(b)),r.append(f)}),r.append(h("documents",null)),s(r),l||(p.addEventListener("click",()=>e.handlePdf("download")),d.addEventListener("click",()=>e.handlePdf("share")),m.addEventListener("click",()=>e.handlePdf("download")))}function T(e){return S(e.host,w(e))}function R(e){const{s:t,el:n,escapeHtml:a,pack:s,shell:h,nav:u}=e,l=n(`<div class="stack">${T(e)}<h1>${a(t("reasonTitle"))}</h1><p class="hint">${a(t("reasonHint"))}</p></div>`);for(const c of e.REASONS){const o=n(`<button class="choice${(s==null?void 0:s.reason)===c?" selected":""}" type="button">${a(t(`reasons.${c}`))}</button>`);o.addEventListener("click",()=>A(e,c)),l.append(o)}l.append(u("home",s!=null&&s.reason?"creditors":null)),h(l)}async function A(e,t){await e.ensurePack(),e.pack.reason=t,e.pack=await e.savePack(e.pack),e.render()}function D(e){const{s:t,el:n,escapeHtml:a,pack:s,shell:h,nav:u}=e,l=(s==null?void 0:s.creditors)||[],c=e.draftCreditor,o=n(`<div class="stack">${T(e)}<h1>${a(t("creditorsTitle"))}</h1><p class="hint">${a(t("creditorsHint"))}</p></div>`);l.length||o.append(n(`<p class="tiny">${a(t("noCreditors"))}</p>`)),l.forEach((i,p)=>{const d=n(`
      <div class="card creditor">
        <div>
          <strong>${a(i.nickname)}</strong>
          <div class="tiny">${a(t(`types.${i.type}`))}${i.ref?` · ${a(i.ref)}`:""}${i.amount?` · ${a(i.amount)}`:""}</div>
        </div>
        <button class="btn" type="button" style="width:auto;min-height:40px;padding:8px 12px">${a(t("remove"))}</button>
      </div>
    `);d.querySelector("button").addEventListener("click",()=>U(e,p)),o.append(d)});const r=n(`
    <div class="card stack">
      <label class="field">${a(t("nickname"))}
        <input id="nick" maxlength="40" placeholder="${a(t("nicknamePh"))}" value="${a(c.nickname)}" />
      </label>
      <label class="field">${a(t("type"))}
        <select id="type">${e.TYPES.map(i=>`<option value="${i}" ${c.type===i?"selected":""}>${a(t(`types.${i}`))}</option>`).join("")}</select>
      </label>
      <label class="field">${a(t("accountRef"))}
        <input id="ref" maxlength="40" placeholder="${a(t("accountRefPh"))}" value="${a(c.ref)}" />
      </label>
      <label class="field">${a(t("amount"))}
        <input id="amt" maxlength="32" placeholder="${a(t("amountPh"))}" value="${a(c.amount)}" />
      </label>
      <button class="btn" data-act="add" type="button">${a(t("addCreditor"))}</button>
    </div>
  `);o.append(r),l.length||o.append(n(`<p class="tiny">${a(t("needCreditor"))}</p>`)),o.append(u("reason",l.length?"situation":null)),h(o),r.querySelector("#nick").addEventListener("input",i=>{e.draftCreditor={...e.draftCreditor,nickname:i.target.value}}),r.querySelector("#type").addEventListener("change",i=>{e.draftCreditor={...e.draftCreditor,type:i.target.value}}),r.querySelector("#ref").addEventListener("input",i=>{e.draftCreditor={...e.draftCreditor,ref:i.target.value}}),r.querySelector("#amt").addEventListener("input",i=>{e.draftCreditor={...e.draftCreditor,amount:i.target.value}}),r.querySelector("[data-act=add]").addEventListener("click",()=>N(e))}async function N(e){const t=e.draftCreditor.nickname.trim();t&&(await e.ensurePack(),e.pack.creditors.push({id:crypto.randomUUID(),nickname:t,type:e.draftCreditor.type,ref:e.draftCreditor.ref.trim(),amount:e.draftCreditor.amount.trim()}),e.draftCreditor={nickname:"",type:e.draftCreditor.type,ref:"",amount:""},e.pack.letterTouched=!1,e.pack=await e.savePack(e.pack),e.render())}async function U(e,t){e.pack.creditors.splice(t,1),e.pack.letterTouched=!1,e.pack=await e.savePack(e.pack),e.render()}function z(e){return{fullName:e.querySelector("#fullName").value,hkid:e.querySelector("#hkid").value,phone:e.querySelector("#phone").value,situation:{whatChanged:e.querySelector("#what").value,when:e.querySelector("#when").value,incomeItems:e.querySelector("#incomeItems").value,incomeAmount:e.querySelector("#incomeAmount").value,expenseItems:e.querySelector("#expenseItems").value,expenseAmount:e.querySelector("#expenseAmount").value,surplus:e.querySelector("#surplus").value,tenorMonths:e.querySelector("#tenor").value,askInterestFreeze:e.querySelector("#freeze").checked}}}function F(e){const{s:t,el:n,escapeHtml:a,pack:s,shell:h}=e,u=(s==null?void 0:s.situation)||{};s&&!s.letter&&e.syncLetter();const l=n(`<div class="stack">${T(e)}<h1>${a(t("situationTitle"))}</h1><p class="hint">${a(t("situationHint"))}</p></div>`),c=["3","6","9","12"].map(d=>`<option value="${d}" ${String(u.tenorMonths||"6")===d?"selected":""}>${a(t(`tenorMonths.${d}`))}</option>`).join(""),o=n(`
    <div class="stack">
      <label class="field">${a(t("fullName"))}
        <input id="fullName" maxlength="80" placeholder="${a(t("fullNamePh"))}" value="${a((s==null?void 0:s.fullName)||"")}" />
      </label>
      <label class="field">${a(t("hkid"))}
        <input id="hkid" maxlength="20" placeholder="${a(t("hkidPh"))}" value="${a((s==null?void 0:s.hkid)||"")}" autocomplete="off" />
      </label>
      <label class="field">${a(t("phone"))}
        <input id="phone" maxlength="20" placeholder="${a(t("phonePh"))}" value="${a((s==null?void 0:s.phone)||"")}" inputmode="tel" />
      </label>
      <label class="field">${a(t("whatChanged"))}
        <textarea id="what" class="short" placeholder="${a(t("whatChangedPh"))}">${a(u.whatChanged||"")}</textarea>
      </label>
      <label class="field">${a(t("when"))}
        <input id="when" maxlength="40" placeholder="${a(t("whenPh"))}" value="${a(u.when||"")}" />
      </label>
      <label class="field">${a(t("incomeItems"))}
        <input id="incomeItems" maxlength="120" placeholder="${a(t("incomeItemsPh"))}" value="${a(u.incomeItems||"")}" />
      </label>
      <label class="field">${a(t("incomeAmount"))}
        <input id="incomeAmount" maxlength="40" placeholder="${a(t("incomeAmountPh"))}" value="${a(u.incomeAmount||"")}" />
      </label>
      <label class="field">${a(t("expenseItems"))}
        <input id="expenseItems" maxlength="120" placeholder="${a(t("expenseItemsPh"))}" value="${a(u.expenseItems||"")}" />
      </label>
      <label class="field">${a(t("expenseAmount"))}
        <input id="expenseAmount" maxlength="40" placeholder="${a(t("expenseAmountPh"))}" value="${a(u.expenseAmount||"")}" />
      </label>
      <label class="field">${a(t("surplus"))}
        <input id="surplus" maxlength="40" placeholder="${a(t("surplusPh"))}" value="${a(u.surplus||"")}" />
      </label>
      <label class="field">${a(t("tenor"))}
        <select id="tenor">${c}</select>
      </label>
      <label class="doc-head">
        <input id="freeze" class="check" type="checkbox" ${u.askInterestFreeze?"checked":""} />
        <span>${a(t("askInterestFreeze"))}</span>
      </label>
      <p class="tiny">${a(t("creditHonesty"))}</p>
      <label class="field">${a(t("letterTitle"))}
        <textarea id="letter">${a((s==null?void 0:s.letter)||"")}</textarea>
      </label>
      <button class="btn" data-act="regen" type="button">${a(t("regenerate"))}</button>
      ${s!=null&&s.letterTouched?`<p class="tiny">${a(t("letterEdited"))}</p>`:""}
    </div>
  `);l.append(o);const r=n(`<button class="btn btn-primary" type="button">${a(t("continue"))}</button>`),i=n('<div class="nav"></div>');i.append(r,n(`<button class="btn btn-ghost" data-go="creditors" type="button">${a(t("back"))}</button>`)),l.append(i),h(l);const p=async d=>{const m=z(o);e.pack.fullName=m.fullName,e.pack.hkid=m.hkid,e.pack.phone=m.phone,e.pack.situation={...m.situation,tenorStored:!0},d||!e.pack.letterTouched?(e.syncLetter(),d&&(e.pack.letterTouched=!1),o.querySelector("#letter").value=e.pack.letter):e.pack.letter=o.querySelector("#letter").value,e.pack=await e.savePack(e.pack),await e.persistFireHandoff()};["fullName","hkid","phone","what","when","incomeItems","incomeAmount","expenseItems","expenseAmount","surplus"].forEach(d=>{o.querySelector(`#${d}`).addEventListener("input",()=>p(!1))}),o.querySelector("#tenor").addEventListener("change",()=>p(!1)),o.querySelector("#freeze").addEventListener("change",()=>p(!1)),o.querySelector("#letter").addEventListener("input",async d=>{e.pack.letterTouched=!0,e.pack.letter=d.target.value,e.pack=await e.savePack(e.pack)}),o.querySelector("[data-act=regen]").addEventListener("click",async()=>{e.pack.letterTouched&&!confirm(e.s("letterEdited"))||(await p(!0),e.render())}),r.addEventListener("click",async()=>{if(await p(!1),!e.pack.fullName.trim()){e.notice=e.s("needName"),e.render();return}e.notice="",e.pack.letter.trim()||await p(!0),await e.finishAssessment(),e.go("door")})}const _={reason:R,creditors:D,situation:F,door:H,documents:L,pack:O};function W(e,t){const n=_[e];if(!n)throw new Error(`unknown_rd_step:${e}`);return n(t)}export{M as J,P as a,j as d,B as e,G as i,W as r,C as s};
