import {describe, it, expect} from "vitest";
import {REGISTRY, getProviderById, providerIds} from "./registry.ts";

describe("REGISTRY", () => {
  it("contains all v3 providers in expected order", () => {
    expect(providerIds()).toEqual(["format", "lint", "test-scripts", "test-frontend", "test-api", "test-exp", "stats"]);
  });

  it("getProviderById returns the right provider", () => {
    expect(getProviderById("format")?.name).toBe("Prettier");
    expect(getProviderById("lint")?.name).toBe("ESLint");
    expect(getProviderById("test-scripts")?.name).toBe("Tests · Scripts");
    expect(getProviderById("test-frontend")?.name).toBe("Tests · Frontend");
    expect(getProviderById("test-api")?.name).toBe("Tests · API (.NET)");
    expect(getProviderById("test-exp")?.name).toBe("Tests · Exp (Python)");
    expect(getProviderById("stats")?.name).toBe("Statistics");
  });

  it("getProviderById returns undefined for unknown id", () => {
    expect(getProviderById("nonexistent")).toBeUndefined();
  });

  it("REGISTRY ids are unique", () => {
    const ids = REGISTRY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
