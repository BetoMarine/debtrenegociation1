import { describe, expect, it } from "vitest";
import { resolveCopy, t } from "../i18n.js";
import { assertBuildStorageNs } from "./storage/ns-policy.js";
import { unexpectedRule17 } from "../../scripts/ci/copy-scan.mjs";
import { transformPreviewHtml } from "../../vite.foundation.mjs";

describe("ftHost overrides", () => {
  it("prefers the fortune host string and leaves standalone on the base string", () => {
    const table = {
      creditorsHint: "A nickname is enough, e.g. HSBC card.",
      ftHost: { creditorsHint: "How many lenders do you owe?" },
    };
    expect(resolveCopy(table, "creditorsHint", { host: "fortune" })).toBe("How many lenders do you owe?");
    expect(resolveCopy(table, "creditorsHint", { host: "standalone" })).toBe("A nickname is enough, e.g. HSBC card.");
    expect(resolveCopy(table, "creditorsHint")).toBe("A nickname is enough, e.g. HSBC card.");
    expect(t("en", "appName", null, { host: "fortune" })).toBe(t("en", "appName"));
  });
});

describe("foundation guards", () => {
  it("refuses a production build without a storage namespace", () => {
    expect(() => assertBuildStorageNs({ command: "build", storageNs: "" })).toThrow(/VITE_STORAGE_NS/);
    expect(() => assertBuildStorageNs({ command: "serve", storageNs: "" })).not.toThrow();
  });

  it("fails rule 17 when a new string is outside the baseline", () => {
    const bad = unexpectedRule17([{ key: "ft.bad", text: "Grow it Door" }], []);
    expect(bad).toHaveLength(1);
  });

  it("strips unscoped cache healing from preview HTML", () => {
    const html = `<html data-pyl-app="rd"><script>
      /* pyl-cache-heal:start */
      return caches.keys().then(function (keys) { return caches.delete(keys[0]); });
      /* pyl-cache-heal:end */
    </script><link rel="manifest" href="/fortune/manifest.webmanifest" /></html>`;
    const next = transformPreviewHtml(html);
    expect(next).not.toContain("caches.keys");
    expect(next).not.toContain("caches.delete");
    expect(next).toContain('href="manifest.webmanifest"');
    expect(next).not.toContain("right-door");
  });
});
