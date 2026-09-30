import { describe, expect, it } from "vitest";
import { createWriteQueue } from "./write-queue.js";

describe("fortune write queue", () => {
  it("drops a cover save that is still open when erase begins, then wipes", async () => {
    const queue = createWriteQueue();
    let db = { plan: "sticky", ui: { lastByStage: { fix: "s03a" } }, rd: "Ada" };
    let release;
    const seen = queue.epoch;
    const writing = queue.enqueue(async () => {
      if (seen !== queue.epoch) return;
      await new Promise((resolve) => {
        release = resolve;
      });
      if (seen !== queue.epoch) return;
      db = { plan: "sticky", ui: { lastByStage: { fix: "s03a" } }, rd: "Ada" };
    });
    for (let i = 0; i < 10 && !release; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    expect(typeof release).toBe("function");
    queue.bump();
    const wiping = queue.enqueue(async () => {
      db = { erasedAt: "2026-09" };
    });
    release();
    await writing;
    await wiping;
    expect(db).toEqual({ erasedAt: "2026-09" });
  });
});