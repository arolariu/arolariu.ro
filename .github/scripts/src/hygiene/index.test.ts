import {describe, it, expect} from "vitest";
import * as hygiene from "./index.ts";

describe("hygiene barrel exports (v3 surface)", () => {
  it("re-exports domain functions", () => {
    expect(typeof hygiene.severityRank).toBe("function");
    expect(typeof hygiene.evaluateGate).toBe("function");
    expect(typeof hygiene.isLineFinding).toBe("function");
  });

  it("re-exports buildReport factory", () => {
    expect(typeof hygiene.buildReport).toBe("function");
  });

  it("re-exports the provider registry", () => {
    expect(Array.isArray(hygiene.REGISTRY)).toBe(true);
    expect(hygiene.REGISTRY.length).toBeGreaterThan(0);
    expect(typeof hygiene.getProviderById).toBe("function");
    expect(typeof hygiene.providerIds).toBe("function");
  });

  it("re-exports the v3 comment identifier", () => {
    expect(hygiene.HYGIENE_V3_COMMENT_ID).toBe("<!-- arolariu-hygiene-check-v3 -->");
  });
});
