import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENRICH } from "./contacts.js";
import { canGeneratePdf, newSundayPack } from "./model.js";
import { briefingRows, buildSundayPdf } from "./pdf.js";
import "./pack-build-view.js";
import {
  PACK_BOOK,
  PACK_BUILD,
  PACK_DOCS,
  PACK_DOCS_SAVED,
  PACK_FORMING,
  PACK_READY,
  bookUnlocked,
  crisisSkipScreen,
  packageAskLine,
  packageFactLine,
  packageIsReady,
  packageMathFromInputs,
  packScreenModel,
  privacyContinueScreen,
  resolveSundayScreen,
} from "./pack-build.js";

const uiSrc = readFileSync(new URL("./ui.js", import.meta.url), "utf8");
const htmlSrc = readFileSync(new URL("../../sunday/index.html", import.meta.url), "utf8");

function readyPack(inputs) {
  const pack = newSundayPack("en");
  pack.privacyAccepted = true;
  pack.packageInputs = inputs;
  pack.packageMath = packageMathFromInputs(inputs);
  pack.packageReady = true;
  pack.docsStepShown = true;
  return pack;
}

describe("pack entry order", () => {
  it("opens on Build your package after privacy Continue", () => {
    expect(privacyContinueScreen(newSundayPack("en"))).toBe(PACK_BUILD);
    const entry = packScreenModel(PACK_BUILD, newSundayPack("en"));
    expect(entry.h1).toBe("Build your package");
    expect(entry.primary).toBe("Start building");
    expect(entry.actions[0]).toBe("Start building");
    expect(entry.actions.join(" ")).not.toMatch(/Book a helper|Request appointment|Open Enrich|Enrich/);
    expect(uiSrc).toContain("privacyContinueScreen(sunday)");
    expect(uiSrc).not.toContain('go("sunday-door")');
    expect(uiSrc).not.toContain('persistSunday("sunday-door")');
  });

  it("sends crisis skip to the build step, not the booking door", () => {
    expect(crisisSkipScreen()).toBe(PACK_BUILD);
    expect(uiSrc).toContain("crisisSkipScreen()");
  });

  it("gates #/sunday-door until the package is ready and the docs step was shown", () => {
    const fresh = newSundayPack("en");
    expect(bookUnlocked(fresh)).toBe(false);
    expect(resolveSundayScreen("sunday-door", fresh)).toBe(PACK_BUILD);
    expect(resolveSundayScreen(PACK_BOOK, fresh)).toBe(PACK_BUILD);
    expect(resolveSundayScreen("sunday-done", fresh)).toBe(PACK_BUILD);
    const readyOnly = readyPack({ pay: "5000", expenses: "3300" });
    readyOnly.docsStepShown = false;
    expect(resolveSundayScreen("sunday-door", readyOnly)).toBe(PACK_BUILD);
    expect(resolveSundayScreen(PACK_DOCS, readyOnly)).toBe(PACK_DOCS);
    const unlocked = readyPack({ pay: "5000", expenses: "3300" });
    expect(bookUnlocked(unlocked)).toBe(true);
    expect(resolveSundayScreen("sunday-door", unlocked)).toBe(PACK_BOOK);
    expect(resolveSundayScreen(PACK_DOCS, { packageReady: false })).toBe(PACK_BUILD);
    expect(resolveSundayScreen(PACK_DOCS_SAVED, { packageReady: false })).toBe(PACK_BUILD);
    expect(resolveSundayScreen(PACK_READY, { packageReady: false })).toBe(PACK_FORMING);
  });
});

describe("package math never invents spend", () => {
  it("leaves every amount empty until she enters numbers", () => {
    const math = packageMathFromInputs({});
    expect(math.fork).toBe("empty");
    expect(math.installment).toBeNull();
    expect(math.save).toBeNull();
    expect(packageAskLine(math)).toBe("");
    expect(packageIsReady(math)).toBe(false);
    expect(JSON.stringify(math)).not.toMatch(/1450|5000|3300|2400|250/);
    const entry = packScreenModel(PACK_FORMING, newSundayPack("en"));
    expect(JSON.stringify(entry.rows)).not.toMatch(/1,450|5,000|3,300/);
  });

  it("computes the tight installment as pay − expenses − 5% of pay", () => {
    const math = packageMathFromInputs({ pay: "5000", expenses: "3300" });
    expect(math.fork).toBe("carry");
    expect(math.save).toBe(250);
    expect(math.installment).toBe(1450);
    expect(math.months).toBe(3);
    expect(packageFactLine(math)).toBe("New installment HK$1,450 a month · from pay − expenses − 5% save");
    expect(packageIsReady(math)).toBe(true);
  });

  it("does not invent an installment when expenses already use the pay", () => {
    const math = packageMathFromInputs({ pay: "1000", expenses: "2000" });
    expect(math.fork).toBe("tight");
    expect(math.installment).toBeNull();
    expect(packageIsReady(math)).toBe(false);
    expect(packageAskLine(math)).toBe("");
  });

  it("uses a positive month as improvement with no amount", () => {
    const math = packageMathFromInputs({ pay: "5000", expenses: "3300", positive: true });
    expect(math.fork).toBe("positive");
    expect(math.installment).toBeNull();
    expect(packageFactLine(math)).toBe("Improve this month · Left toward a cushion · no amount promised");
    expect(packageFactLine(math)).not.toMatch(/HK\$/);
  });

  it("uses only the overdue amount she entered on the short path", () => {
    const math = packageMathFromInputs({ overdue: "2400" });
    expect(math.fork).toBe("short");
    expect(math.installment).toBeNull();
    expect(packageFactLine(math)).toBe("Catch up HK$2,400 · what you can");
  });
});

describe("book stays behind the package and the docs step", () => {
  it("ranks upload and the PDF ahead of any booking control once the package is ready", () => {
    const pack = readyPack({ pay: "5000", expenses: "3300" });
    pack.docsStepShown = false;
    const ready = packScreenModel(PACK_READY, pack);
    expect(ready.primary).toBe("Next · upload docs");
    expect(ready.actions[0]).toBe("Next · upload docs");
    expect(ready.actions).toContain("Generate/share PDF");
    expect(ready.actions.indexOf("Generate/share PDF")).toBeLessThan(ready.actions.length);
    expect(ready.actions.join(" ")).not.toMatch(/Book a helper|Request appointment|Open Enrich/);
    expect(ready.fact).toContain("HK$1,450");
  });

  it("offers booking only after the docs step, with no invented helper", () => {
    const pack = readyPack({ pay: "5000", expenses: "3300" });
    const saved = packScreenModel(PACK_DOCS_SAVED, pack);
    expect(saved.primary).toBe("Book a helper");
    expect(saved.actions).toEqual(["Book a helper", "Done for now"]);
    const book = packScreenModel(PACK_BOOK, pack);
    expect(book.h1).toBe("Book when you are ready");
    expect(book.primary).toBe("Request appointment");
    expect(book.helper).toMatch(/Not named yet/);
    const blob = JSON.stringify(book);
    expect(blob).not.toMatch(/Enrich|WhatsApp|\+852|neoncrm|wa\.me|tel:/i);
    const docs = packScreenModel(PACK_DOCS, pack);
    expect(docs.primary).toBe("Save what I have");
    expect(docs.actions).toContain("Skip for now");
    expect(JSON.stringify(docs)).not.toMatch(/Enrich|WhatsApp|\+852|neoncrm/i);
  });

  it("writes the package onto the PDF and does not add a booking link", async () => {
    const pack = readyPack({ pay: "5000", expenses: "3300" });
    expect(canGeneratePdf(pack)).toBe(true);
    const rows = briefingRows(pack);
    expect(rows.packageFact).toContain("HK$1,450");
    expect(rows.doorLines.join("\n")).not.toContain(ENRICH.booking);
    expect(rows.doorLines.join("\n")).not.toMatch(/\+852/);
    expect(rows.doorTitle).toBe("Helper not named yet");
    const buf = Buffer.from(await buildSundayPdf(pack).arrayBuffer());
    const text = buf.toString("latin1").replace(/\u0000/g, "");
    expect(text).toContain("1,450");
    expect(text).not.toContain("fhd-registration");
    expect(text).toContain("not named yet");
  });
});

describe("preview pack shell", () => {
  it("treats the dig-in preview as Sunday Pack and keeps it off the live database", () => {
    expect(htmlSrc).toContain("preview\\/pack-build");
    expect(htmlSrc).toContain("pyl-preview-pack-build");
    expect(htmlSrc).toContain('data-pyl-app="sunday"');
  });
});
