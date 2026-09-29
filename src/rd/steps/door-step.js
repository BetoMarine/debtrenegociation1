import { stageLabel, stageLineHtml } from "./chrome.js";

export const KEYS_USED = [
  "doorTitle",
  "doorIdrpTitle",
  "doorIdrpBody",
  "doorIdrpSayTitle",
  "doorIdrpSay",
  "doorHsbcTitle",
  "doorHsbcBody",
  "doorHsbcSayTitle",
  "doorHsbcSay",
  "doorHsbcPhone",
  "doorHsbcEmail",
  "doorHsbcMail",
  "doorCitiTitle",
  "doorCitiBody",
  "doorCitiSayTitle",
  "doorCitiSay",
  "doorCitiPhone",
  "doorOtherTitle",
  "doorOtherBody",
  "doorOtherSayTitle",
  "doorOtherSay",
  "doorMoneyNote",
  "sourceHkma",
  "sourceHkmaGuide",
  "sourceHsbc",
  "sourceCiti",
  "continue",
  "back",
];

export function renderDoor(ctx) {
  const { s, el, escapeHtml, pack, shell, nav } = ctx;
  const door = pack?.door || ctx.recommendDoor(pack?.creditors || []);
  const links = ctx.hrefs(ctx.lang);
  const copy = {
    [ctx.DOORS.IDRP]: {
      title: s("doorIdrpTitle"),
      body: s("doorIdrpBody"),
      sayTitle: s("doorIdrpSayTitle"),
      say: s("doorIdrpSay"),
      facts: [],
      sources: [
        [s("sourceHkma"), links.hkma],
        [s("sourceHkmaGuide"), links.hkmaGuide],
      ],
    },
    [ctx.DOORS.HSBC_WORKOUT]: {
      title: s("doorHsbcTitle"),
      body: s("doorHsbcBody"),
      sayTitle: s("doorHsbcSayTitle"),
      say: s("doorHsbcSay"),
      facts: [s("doorHsbcPhone"), s("doorHsbcEmail"), s("doorHsbcMail")],
      sources: [[s("sourceHsbc"), links.hsbc]],
    },
    [ctx.DOORS.CITI]: {
      title: s("doorCitiTitle"),
      body: s("doorCitiBody"),
      sayTitle: s("doorCitiSayTitle"),
      say: s("doorCitiSay"),
      facts: [s("doorCitiPhone")],
      sources: [[s("sourceCiti"), links.citi]],
    },
    [ctx.DOORS.OTHER]: {
      title: s("doorOtherTitle"),
      body: s("doorOtherBody"),
      sayTitle: s("doorOtherSayTitle"),
      say: s("doorOtherSay"),
      facts: [],
      sources: [
        [s("sourceHkma"), links.hkma],
        [s("sourceHkmaGuide"), links.hkmaGuide],
      ],
    },
  }[door];
  const body = el(
    `<div class="stack">${stageLineHtml(ctx.host, stageLabel(ctx))}<h1>${escapeHtml(s("doorTitle"))}</h1><h2>${escapeHtml(copy.title)}</h2><p>${escapeHtml(copy.body)}</p></div>`,
  );
  if (copy.facts.length) {
    const card = el(`<div class="card stack"></div>`);
    copy.facts.forEach((fact) => card.append(el(`<p>${escapeHtml(fact)}</p>`)));
    body.append(card);
  }
  body.append(el(`<p class="tiny">${escapeHtml(copy.sayTitle)}</p>`));
  body.append(el(`<div class="script">${escapeHtml(copy.say)}</div>`));
  if ((pack?.creditors || []).some((c) => c.type === "money_lender") && door !== ctx.DOORS.IDRP) {
    body.append(el(`<p class="tiny">${escapeHtml(s("doorMoneyNote"))}</p>`));
  }
  const sources = el(`<div class="card stack"></div>`);
  copy.sources.forEach(([label, url]) => {
    sources.append(el(`<a class="link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`));
  });
  body.append(sources);
  body.append(nav("situation", "documents"));
  shell(body);
}
