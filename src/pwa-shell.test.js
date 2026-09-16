import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { htmlShellForPath, productIdForPath } from "./pwa-shell.js";
import { siteRootFromPath } from "./register-sw.js";
import { APP_VERSION, FORTUNE_STRINGS } from "./fortune/copy.js";
import { STRINGS } from "./i18n.js";
import { SUNDAY_STRINGS } from "./sunday/copy.js";

const viteConfig = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");
const swSrc = readFileSync(new URL("./sw.js", import.meta.url), "utf8");
const htmlFiles = {
  "right-door": readFileSync(new URL("../index.html", import.meta.url), "utf8"),
  fortune: readFileSync(new URL("../fortune/index.html", import.meta.url), "utf8"),
  sunday: readFileSync(new URL("../sunday/index.html", import.meta.url), "utf8"),
};

describe("MPA HTML shell routing", () => {
  it("maps each product URL to that product's index.html, never RD's shell for /fortune/", () => {
    expect(htmlShellForPath("/fortune/")).toBe("fortune/index.html");
    expect(htmlShellForPath("/fortune")).toBe("fortune/index.html");
    expect(htmlShellForPath("/debtrenegociation1/fortune/")).toBe("fortune/index.html");
    expect(htmlShellForPath("/debtrenegociation1/fortune/index.html")).toBe("fortune/index.html");
    expect(htmlShellForPath("/sunday/")).toBe("sunday/index.html");
    expect(htmlShellForPath("/debtrenegociation1/sunday")).toBe("sunday/index.html");
    expect(htmlShellForPath("/pyl/")).toBe("pyl/index.html");
    expect(htmlShellForPath("/")).toBe("index.html");
    expect(htmlShellForPath("/index.html")).toBe("index.html");
    expect(htmlShellForPath("/debtrenegociation1/")).toBe("index.html");
    expect(htmlShellForPath("/debtrenegociation1/index.html")).toBe("index.html");
    expect(htmlShellForPath("/fortuneteller/")).toBe("index.html");
  });

  it("does not use SPA navigateFallback to Right Door index.html", () => {
    expect(viteConfig).toMatch(/strategies:\s*"injectManifest"/);
    expect(viteConfig).not.toMatch(/navigateFallback:\s*"index\.html"/);
    expect(swSrc).toMatch(/htmlShellForPath/);
    expect(swSrc).toMatch(/fortune\/index\.html/);
    expect(swSrc).toMatch(/sunday\/index\.html/);
    expect(swSrc).not.toMatch(/createHandlerBoundToURL\("index\.html"\)\s*\)/);
  });
});

describe("PoC version isolation", () => {
  it("keeps Fortune's stamp off Right Door / Sunday Pack copy", () => {
    expect(APP_VERSION).toMatch(/PoC v0\.9\.10/);
    expect(FORTUNE_STRINGS.en.version).toBe(APP_VERSION);
    expect(STRINGS.en.version).toMatch(/PoC v0\.8\.0/);
    expect(STRINGS.zh.version).toMatch(/PoC v0\.8\.0/);
    expect(SUNDAY_STRINGS.en.version).toMatch(/PoC v0\.8\.0/);
    expect(FORTUNE_STRINGS.en.version).not.toBe(STRINGS.en.version);
    expect(FORTUNE_STRINGS.en.version).not.toMatch(/0\.8\.0/);
    expect(STRINGS.en.version).not.toMatch(/0\.9\./);
  });
});

describe("product HTML shell guard", () => {
  it("labels each app document and heals a wrong cached shell", () => {
    expect(productIdForPath("/fortune/")).toBe("fortune");
    expect(productIdForPath("/sunday/")).toBe("sunday");
    expect(productIdForPath("/")).toBe("right-door");
    for (const [app, html] of Object.entries(htmlFiles)) {
      expect(html).toContain(`data-pyl-app="${app}"`);
      expect(html).toContain("pyl-shell-guard");
      expect(html).toMatch(/serviceWorker/);
    }
  });
});

describe("service worker registration", () => {
  it("registers the site-root worker from nested product URLs", () => {
    expect(siteRootFromPath("/fortune/")).toBe("/");
    expect(siteRootFromPath("/debtrenegociation1/fortune/")).toBe("/debtrenegociation1/");
    expect(siteRootFromPath("/debtrenegociation1/sunday")).toBe("/debtrenegociation1/");
    expect(siteRootFromPath("/debtrenegociation1/")).toBe("/debtrenegociation1/");
    expect(siteRootFromPath("/debtrenegociation1/index.html")).toBe("/debtrenegociation1/");
  });
});
