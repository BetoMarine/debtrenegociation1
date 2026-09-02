import { describe, expect, it } from "vitest";
import { missingAttachments, normalizeDocuments } from "./docs.js";

describe("document gate", () => {
  it("requires hardship proof and three bank-statement images", () => {
    expect(missingAttachments([]).map((m) => m.key)).toEqual(["hardship_proof", "bank_statements"]);
    const almost = missingAttachments([
      { key: "hardship_proof", attachmentIds: ["a"] },
      { key: "bank_statements", attachmentIds: ["b", "c"] },
    ]);
    expect(almost).toEqual([{ key: "bank_statements", have: 2, need: 3, remain: 1 }]);
    expect(
      missingAttachments([
        { key: "hardship_proof", attachmentIds: ["a"] },
        { key: "bank_statements", attachmentIds: ["b", "c", "d"] },
      ]),
    ).toEqual([]);
  });

  it("migrates a legacy single attachment into the new keys", () => {
    const next = normalizeDocuments([
      { key: "income_change", attachmentId: "old-1" },
      { key: "bank_statements", attachmentIds: ["s1"] },
    ]);
    expect(next.find((d) => d.key === "hardship_proof").attachmentIds).toEqual(["old-1"]);
    expect(next.find((d) => d.key === "bank_statements").attachmentIds).toEqual(["s1"]);
  });
});
