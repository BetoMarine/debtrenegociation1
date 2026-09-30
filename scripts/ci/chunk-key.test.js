import { describe, expect, it } from "vitest";
import { chunkKey } from "./check-preview-bundle.mjs";

describe("chunkKey", () => {
  it("strips an 8-character hash that contains a hyphen", () => {
    expect(chunkKey("assets/sunday-C-nerjkb.js")).toBe("sunday.js");
  });

  it("strips hashes that contain an underscore", () => {
    expect(chunkKey("assets/sunday-H2K_wg5c.js")).toBe("sunday.js");
    expect(chunkKey("assets/register-sw-B2fgKu_1.js")).toBe("register-sw.js");
  });

  it("keeps dotted chunk names and the unhashed service worker", () => {
    expect(chunkKey("assets/jspdf.es.min-CrwiUDTi.js")).toBe("jspdf.es.min.js");
    expect(chunkKey("assets/html2canvas.esm-QH1iLAAe.js")).toBe("html2canvas.esm.js");
    expect(chunkKey("assets/index.es-DVl1UOOC.js")).toBe("index.es.js");
    expect(chunkKey("assets/_pyl-migrate-ns-v1-stub-COmAV1dI.js")).toBe("_pyl-migrate-ns-v1-stub.js");
    expect(chunkKey("sw.js")).toBe("sw.js");
  });
});
