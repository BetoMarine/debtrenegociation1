import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shelf = readFileSync(new URL("../public/pyl/index.html", import.meta.url), "utf8");
const preview = readFileSync(new URL("../pyl-preview/index.html", import.meta.url), "utf8");

describe("Plan Your Life DRAFT shelf lock", () => {
  it("keeps public/pyl and pyl-preview in sync", () => {
    expect(preview).toBe(shelf);
  });

  it("keeps the DRAFT banner and dark PYL purple/teal brand", () => {
    expect(shelf).toMatch(/>DRAFT</);
    expect(shelf).toMatch(/production planyourlife\.tech not swapped yet/);
    expect(shelf).toMatch(/#7e22ce/);
    expect(shelf).toMatch(/#06b6d4/);
    expect(shelf).toMatch(/#0f172a/);
  });

  it("publishes two live tools with Open links and no Fortune Open CTA", () => {
    expect(shelf).toMatch(/two live tools/);
    expect(shelf).toMatch(/Fortune Teller is testing/);
    expect(shelf).toMatch(/Open Right Door/);
    expect(shelf).toMatch(/Open Sunday Pack/);
    expect(shelf).toContain('href="https://betomarine.github.io/debtrenegociation1/"');
    expect(shelf).toContain('href="https://betomarine.github.io/debtrenegociation1/sunday/"');
    expect(shelf).not.toMatch(/Open Fortune Teller/);
    expect(shelf).not.toContain('href="https://betomarine.github.io/debtrenegociation1/fortune/"');
  });

  it("labels the locked shelf statuses", () => {
    expect(shelf).toMatch(/Right Door · 正確的門/);
    expect(shelf).toMatch(/hardship \/ debt programmes the bank must offer but won’t advertise/);
    expect(shelf).toMatch(/On this phone\. You send it/);
    expect(shelf).toMatch(/Sunday Pack/);
    expect(shelf).toMatch(/stop new loans/);
    expect(shelf).toMatch(/Enrich door/);
    expect(shelf).toMatch(/Not a literacy lecture/);
    expect(shelf).toMatch(/>Testing</);
    expect(shelf).toMatch(/Fortune Teller/);
    expect(shelf).toMatch(/>Research</);
    expect(shelf).toMatch(/Offshore/);
    expect(shelf).toMatch(/>Ideation</);
    expect(shelf).toMatch(/Digital twin/);
    expect(shelf).not.toMatch(/PYL Invest/);
    expect(shelf).not.toMatch(/\bIDRP\b/);
  });

  it("keeps the Fix → Stabilize → Plan → Invest journey", () => {
    expect(shelf).toMatch(/1 · Fix/);
    expect(shelf).toMatch(/2 · Stabilize/);
    expect(shelf).toMatch(/3 · Plan/);
    expect(shelf).toMatch(/4 · Invest/);
    expect(shelf).toMatch(/Only after the floor holds/);
  });
});
