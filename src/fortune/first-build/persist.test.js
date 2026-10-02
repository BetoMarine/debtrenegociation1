import { describe, expect, it } from "vitest";
import { createPersistGate } from "./app.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Fortune save gate", () => {
  it("lets erase replace a stressed save that was already in flight", async () => {
    const exclusive = createPersistGate();
    const db = { slice: null };
    const stressed = exclusive(async () => {
      await delay(20);
      db.slice = { entry: "stressed", takeHome: "18400", costs: "24900" };
    });
    const erase = exclusive(async () => {
      db.slice = null;
      db.slice = { entry: null, takeHome: "", costs: "", screen: "w0" };
    });
    await Promise.all([stressed, erase]);
    expect(db.slice).toEqual({ entry: null, takeHome: "", costs: "", screen: "w0" });
  });
});