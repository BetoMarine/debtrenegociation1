import { stageLabel, stageLineHtml } from "./chrome.js";

export const KEYS_USED = [
  "docsTitle",
  "docsHint",
  "requiredTag",
  "optionalTag",
  "photoCount",
  "attachMore",
  "attach",
  "removePhoto",
  "missingHardship",
  "missingStatements",
  "packTitle",
  "packHint",
  "missingTitle",
  "missingHint",
  "makingPdf",
  "makePdf",
  "share",
  "download",
  "backToFortune",
  "statusTitle",
  "statusHint",
  "reminderDue",
  "reminder",
  "comeBackOn",
  "continue",
  "back",
];

function line(ctx) {
  return stageLineHtml(ctx.host, stageLabel(ctx));
}

function attachmentId(ctx) {
  const prefix = ctx.host === "fortune" ? "ft:att:" : "rd:att:";
  return `${prefix}${crypto.randomUUID()}`;
}

export function renderDocuments(ctx) {
  const { s, el, escapeHtml, shell, nav } = ctx;
  ctx.pack.documents = ctx.normalizeDocuments(ctx.pack.documents);
  const body = el(
    `<div class="stack">${line(ctx)}<h1>${escapeHtml(s("docsTitle"))}</h1><p class="hint">${escapeHtml(s("docsHint"))}</p></div>`,
  );
  ctx.pack.documents.forEach((doc, i) => {
    const def = ctx.DOCUMENT_DEFS.find((d) => d.key === doc.key);
    const have = doc.attachmentIds.length;
    const need = def?.minFiles || 0;
    const required = !!def?.required;
    const card = el(`
      <div class="card doc">
        <div>
          <span class="tag">${escapeHtml(required ? s("requiredTag") : s("optionalTag"))}</span>
          <strong>${escapeHtml(s(`docs.${doc.key}`))}</strong>
          ${need ? `<p class="tiny">${escapeHtml(s("photoCount", { have, need }))}</p>` : have ? `<p class="tiny">${have}</p>` : ""}
        </div>
        <input class="hidden-file" type="file" accept="image/*" multiple />
        <button class="btn" type="button">${escapeHtml(have ? s("attachMore") : s("attach"))}</button>
        <div class="thumbs"></div>
      </div>
    `);
    const file = card.querySelector('input[type="file"]');
    card.querySelector(".btn").addEventListener("click", () => file.click());
    file.addEventListener("change", async (e) => {
      const chosen = [...(e.target.files || [])];
      for (const item of chosen) {
        const blob = await ctx.compressImage(item);
        const id = attachmentId(ctx);
        await ctx.putAttachment(id, blob);
        ctx.pack.documents[i].attachmentIds.push(id);
      }
      if (!ctx.pack.letterTouched) ctx.syncLetter();
      ctx.pack = await ctx.savePack(ctx.pack);
      ctx.render();
    });
    const thumbs = card.querySelector(".thumbs");
    doc.attachmentIds.forEach((id, photoIndex) => {
      const row = el(`<div class="thumb-row"><button class="btn btn-ghost" type="button">${escapeHtml(s("removePhoto"))}</button></div>`);
      row.querySelector("button").addEventListener("click", async () => {
        await ctx.deleteAttachment(id);
        ctx.pack.documents[i].attachmentIds.splice(photoIndex, 1);
        if (!ctx.pack.letterTouched) ctx.syncLetter();
        ctx.pack = await ctx.savePack(ctx.pack);
        ctx.render();
      });
      ctx.getAttachment(id).then((blob) => {
        if (!blob) return;
        const img = document.createElement("img");
        img.className = "thumb";
        img.alt = "";
        img.src = URL.createObjectURL(blob);
        row.prepend(img);
      });
      thumbs.append(row);
    });
    body.append(card);
  });
  body.append(nav("door", "pack"));
  shell(body);
}

function missingCopy(ctx, gap) {
  if (gap.key === "hardship_proof") return ctx.s("missingHardship", { remain: gap.remain });
  if (gap.key === "bank_statements") return ctx.s("missingStatements", { remain: gap.remain });
  return ctx.s(`docs.${gap.key}`);
}

export function renderPack(ctx) {
  const { s, el, escapeHtml, shell, nav } = ctx;
  ctx.pack.documents = ctx.normalizeDocuments(ctx.pack.documents);
  if (!ctx.pack.letterTouched) ctx.syncLetter();
  const gaps = ctx.missingAttachments(ctx.pack.documents);
  const blocked = gaps.length > 0;
  const reminder = ctx.reminderState();
  const showReminder = reminder && (ctx.pack.status === "sent" || ctx.pack.status === "waiting");
  const body = el(
    `<div class="stack">${line(ctx)}<h1>${escapeHtml(s("packTitle"))}</h1><p class="hint">${escapeHtml(s("packHint"))}</p></div>`,
  );
  body.append(el(`<article class="letter-file">${escapeHtml(ctx.pack.letter || "")}</article>`));
  if (blocked) {
    const miss = el(`<div class="card warn stack"><strong>${escapeHtml(s("missingTitle"))}</strong><p class="tiny">${escapeHtml(s("missingHint"))}</p></div>`);
    gaps.forEach((gap) => miss.append(el(`<p>${escapeHtml(missingCopy(ctx, gap))}</p>`)));
    body.append(miss);
  }
  const actions = el(`<div class="nav"></div>`);
  const make = el(`<button class="btn btn-accent" type="button">${escapeHtml(ctx.busy ? s("makingPdf") : s("makePdf"))}</button>`);
  const share = el(`<button class="btn btn-primary" type="button">${escapeHtml(s("share"))}</button>`);
  const download = el(`<button class="btn" type="button">${escapeHtml(s("download"))}</button>`);
  make.disabled = ctx.busy || blocked;
  share.disabled = ctx.busy || blocked;
  download.disabled = ctx.busy || blocked;
  actions.append(make, share, download);
  if (ctx.isFortuneReferral()) {
    actions.append(el(ctx.fortuneReturnCtaHtml(escapeHtml, s("backToFortune"))));
  }
  body.append(actions);
  body.append(el(`<h2>${escapeHtml(s("statusTitle"))}</h2>`));
  body.append(el(`<p class="hint">${escapeHtml(s("statusHint"))}</p>`));
  if (showReminder) {
    body.append(
      el(
        `<div class="card"><strong>${escapeHtml(reminder.overdue ? s("reminderDue") : s("reminder"))}</strong><p class="tiny">${escapeHtml(s("comeBackOn"))} ${escapeHtml(reminder.label)}</p></div>`,
      ),
    );
  }
  ctx.STATUSES.forEach((status) => {
    const btn = el(
      `<button class="status${ctx.pack.status === status ? " selected" : ""}" type="button">${escapeHtml(s(`statuses.${status}`))}</button>`,
    );
    btn.addEventListener("click", () => ctx.setStatus(status));
    body.append(btn);
  });
  body.append(nav("documents", null));
  shell(body);
  if (!blocked) {
    make.addEventListener("click", () => ctx.handlePdf("download"));
    share.addEventListener("click", () => ctx.handlePdf("share"));
    download.addEventListener("click", () => ctx.handlePdf("download"));
  }
}
