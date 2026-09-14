import { describe, expect, it } from "vitest";
import { productHref } from "./paths.js";
import {
  captureFortuneReferral,
  clearFortuneReferral,
  fortuneOutboundHref,
  fortuneReturnBarHtml,
  fortuneReturnCtaHtml,
  fortuneReturnHref,
  withFromFortune,
} from "./refer.js";

function memoryStore(start = {}) {
  const data = { ...start };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
    data,
  };
}

describe("Fortune referral", () => {
  it("appends from=fortune without breaking relative product paths or hashes", () => {
    expect(withFromFortune("../")).toBe("../?from=fortune");
    expect(withFromFortune("../sunday/")).toBe("../sunday/?from=fortune");
    expect(withFromFortune("./sunday/#/sunday-privacy")).toBe("./sunday/?from=fortune#/sunday-privacy");
    expect(withFromFortune("../?from=fortune")).toBe("../?from=fortune");
    expect(withFromFortune("../?lang=zh#/pack")).toBe("../?lang=zh&from=fortune#/pack");
  });

  it("keeps Fortune outbound as a normal href (not a replace)", () => {
    expect(fortuneOutboundHref("right-door")).toBe(`${productHref("right-door")}?from=fortune`.replace("??", "?"));
    expect(fortuneOutboundHref("sunday")).toMatch(/from=fortune/);
    expect(fortuneOutboundHref("sunday")).not.toMatch(/location\.replace/);
  });

  it("survives the other app's start via session after the query is gone", () => {
    const store = memoryStore();
    expect(captureFortuneReferral({ search: "?from=fortune" }, store)).toBe(true);
    expect(store.getItem("pyl.from")).toBe("fortune");
    expect(captureFortuneReferral({ search: "" }, store)).toBe(true);
    expect(captureFortuneReferral({ search: "#/pack" }, store)).toBe(true);
  });

  it("does not force Fortune chrome on a standalone open", () => {
    const store = memoryStore();
    expect(captureFortuneReferral({ search: "" }, store)).toBe(false);
    expect(captureFortuneReferral({ search: "?from=elsewhere" }, store)).toBe(false);
    expect(store.getItem("pyl.from")).toBeNull();
  });

  it("clears a leftover referral so Fortune footer hops are standalone", () => {
    const store = memoryStore({ "pyl.from": "fortune" });
    clearFortuneReferral(store);
    expect(store.getItem("pyl.from")).toBeNull();
    expect(captureFortuneReferral({ search: "" }, store)).toBe(false);
  });

  it("points the return chip at Fortune, not a third chooser", () => {
    expect(fortuneReturnHref()).toBe(productHref("fortune"));
    const bar = fortuneReturnBarHtml((s) => s, "Back to Fortune Teller");
    expect(bar).toContain("data-back-fortune");
    expect(bar).toContain('href="./fortune/"');
    expect(bar).toMatch(/Back to Fortune Teller/);
    expect(fortuneReturnCtaHtml((s) => s, "Back to Fortune Teller")).toContain("btn-primary");
  });
});
