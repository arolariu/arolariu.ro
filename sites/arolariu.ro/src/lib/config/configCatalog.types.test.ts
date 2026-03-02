/**
 * @fileoverview Unit tests for config catalog type guards.
 * @module sites/arolariu.ro/src/lib/config/configCatalog.types.test
 */

import {describe, expect, it} from "vitest";

import {isConfigCatalogResponse} from "./configCatalog.types";

describe("isConfigCatalogResponse", () => {
  it("returns true for a valid catalog payload", () => {
    expect(
      isConfigCatalogResponse({
        target: "website",
        version: "v1",
        requiredKeys: ["A"],
        optionalKeys: ["B"],
        allowedPrefixes: [],
        refreshIntervalSeconds: 300,
      }),
    ).toBe(true);
  });

  it("returns false for null and non-object payloads", () => {
    expect(isConfigCatalogResponse(null)).toBe(false);
    expect(isConfigCatalogResponse("invalid")).toBe(false);
  });

  it("returns false for unsupported target values", () => {
    expect(
      isConfigCatalogResponse({
        target: "mobile",
        version: "v1",
        requiredKeys: [],
        optionalKeys: [],
        allowedPrefixes: [],
        refreshIntervalSeconds: 300,
      }),
    ).toBe(false);
  });

  it("returns false when key arrays contain non-string entries", () => {
    expect(
      isConfigCatalogResponse({
        target: "api",
        version: "v1",
        requiredKeys: ["A", 1],
        optionalKeys: [],
        allowedPrefixes: [],
        refreshIntervalSeconds: 300,
      }),
    ).toBe(false);
  });

  it("returns false when refresh interval is not numeric", () => {
    expect(
      isConfigCatalogResponse({
        target: "api",
        version: "v1",
        requiredKeys: [],
        optionalKeys: [],
        allowedPrefixes: [],
        refreshIntervalSeconds: "300",
      }),
    ).toBe(false);
  });
});
