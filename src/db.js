import { acceptRdExport } from "./rd/export.js";
import { ATT, KV } from "./shared/storage/keys.js";
import { noteMeaningfulSave } from "./shared/storage/persist.js";
import { eraseFortune, eraseRightDoor, eraseSunday } from "./shared/storage/erase.js";
import { addSharedEvent, listEventsRaw, openScope } from "./shared/storage/store.js";

function rd() {
  return openScope("rd.app");
}

function ft() {
  return openScope("ft.app");
}

function sun() {
  return openScope("sun.app");
}

function attScope(id) {
  return String(id).startsWith(ATT.ft) ? openScope("ft.rdSteps") : openScope("rd.app");
}

export async function getPack() {
  return rd().get(KV.rdPack);
}

export async function savePack(pack) {
  const next = { ...pack, updatedAt: Date.now() };
  await rd().put(KV.rdPack, next);
  noteMeaningfulSave();
  return next;
}

export async function getRdExport() {
  return rd().get(KV.rdExport);
}

/** Persist a minimal export. Rejects extra fields and a mismatched end month. */
export async function saveRdExport(record) {
  const accepted = acceptRdExport(record);
  if (!accepted) return null;
  await rd().put(KV.rdExport, accepted);
  noteMeaningfulSave();
  return accepted;
}

export async function getLang() {
  return (await rd().get(KV.rdLang)) || "zh";
}

export async function setLang(lang) {
  await rd().put(KV.rdLang, lang);
  noteMeaningfulSave();
}

export async function getSundayPack() {
  return sun().get(KV.sunPack);
}

export async function saveSundayPack(pack) {
  const next = { ...pack, updatedAt: Date.now() };
  await sun().put(KV.sunPack, next);
  noteMeaningfulSave();
  return next;
}

export async function getSundayLang() {
  return (await sun().get(KV.sunLang)) || "en";
}

export async function setSundayLang(lang) {
  await sun().put(KV.sunLang, lang);
  noteMeaningfulSave();
}

export async function wipeSundayPack() {
  await eraseSunday();
}

export async function getFortunePlan() {
  return ft().get(KV.ftPlan);
}

export async function saveFortunePlan(plan) {
  const next = { ...plan, updatedAt: Date.now() };
  await ft().put(KV.ftPlan, next);
  noteMeaningfulSave();
  return next;
}

export async function getFortuneForecast() {
  return ft().get(KV.ftForecast);
}

export async function saveFortuneForecast(forecast) {
  await ft().put(KV.ftForecast, forecast);
  noteMeaningfulSave();
  return forecast;
}

export async function getFortuneHandoff() {
  return ft().get(KV.ftHandoff);
}

export async function saveFortuneHandoff(value) {
  await ft().put(KV.ftHandoff, value);
  noteMeaningfulSave();
  return value;
}

export async function getFortuneUi() {
  return ft().get(KV.ftUi);
}

export async function saveFortuneUi(state) {
  await ft().put(KV.ftUi, state);
  noteMeaningfulSave();
  return state;
}

/** Clears Fortune Teller only. Right Door and Sunday Pack stay put. */
export async function wipeFortune() {
  await eraseFortune();
}

/** Clears the Right Door vault only. Sunday Pack and Fortune stay put. */
export async function wipeRightDoor() {
  await eraseRightDoor();
}

export async function addEvent(event) {
  const type = String(event?.type || "");
  if (type.startsWith("fortune_")) return openScope("ft.app").addEvent(event);
  if (type.startsWith("sunday_")) return openScope("sun.app").addEvent(event);
  if (type === "app_open") return addSharedEvent(event);
  return openScope("rd.app").addEvent(event);
}

export async function listEvents() {
  return listEventsRaw();
}

export async function putAttachment(id, blob) {
  await attScope(id).putAtt(id, blob);
}

export async function getAttachment(id) {
  return attScope(id).getAtt(id);
}

export async function deleteAttachment(id) {
  await attScope(id).removeAtt(id);
}

export function newPack(lang) {
  return {
    id: "local",
    lang,
    reason: null,
    fullName: "",
    hkid: "",
    phone: "",
    creditors: [],
    situation: {
      whatChanged: "",
      when: "",
      incomeItems: "",
      incomeAmount: "",
      expenseItems: "",
      expenseAmount: "",
      surplus: "",
      tenorMonths: "6",
      askInterestFreeze: false,
    },
    letter: "",
    letterTouched: false,
    door: null,
    documents: [],
    status: "draft",
    sentAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
