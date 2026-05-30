import {describe, it, expect} from "vitest";
import {REGISTRY, getProviderById, providerIds} from "./registry.ts";

describe("REGISTRY", () => {
  it("contains all v3 providers in expected order", () => {
    expect(providerIds()).toEqual(["format", "lint", "test-typescript", "test-dotnet", "test-python", "stats"]);
  });

  it("getProviderById returns the right provider", () => {
    expect(getProviderById("format")?.name).toBe("Prettier");
    expect(getProviderById("lint")?.name).toBe("ESLint");
    expect(getProviderById("test-typescript")?.name).toBe("TypeScript Unit Tests");
    expect(getProviderById("test-dotnet")?.name).toBe("DotNet Unit Tests");
    expect(getProviderById("test-python")?.name).toBe("Python Unit Tests");
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
