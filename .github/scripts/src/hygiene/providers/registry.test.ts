import {describe, it, expect} from "vitest";
import {REGISTRY, getProviderById, providerIds} from "./registry.ts";

describe("REGISTRY", () => {
  it("contains all 4 v3 providers", () => {
    expect(providerIds()).toEqual(["format", "lint", "test", "stats"]);
  });

  it("getProviderById returns the right provider", () => {
    expect(getProviderById("format")?.name).toBe("Prettier");
    expect(getProviderById("lint")?.name).toBe("ESLint");
    expect(getProviderById("test")?.name).toBe("Vitest");
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
