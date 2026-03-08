/**
 * @fileoverview Unit tests for single-key config response guards.
 * @module sites/arolariu.ro/src/lib/config/configCatalog.types.test
 */

import {describe, expect, it} from "vitest";

import {isConfigValueResponse} from "./configCatalog.types";

describe("isConfigValueResponse", () => {
  it("returns true for a valid single-key config payload", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoint:Service:Api",
        value: "https://api.example.test",
        availableForTargets: ["website"],
        availableInDocuments: ["website.build-time", "website.run-time"],
        requiredInDocuments: ["website.build-time", "website.run-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: 300,
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("returns false for null and non-object payloads", () => {
    expect(isConfigValueResponse(null)).toBe(false);
    expect(isConfigValueResponse("invalid")).toBe(false);
  });

  it("returns false when array metadata contains non-string values", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoint:Service:Api",
        value: "https://api.example.test",
        availableForTargets: [42],
        availableInDocuments: ["website.build-time"],
        requiredInDocuments: ["website.build-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: 300,
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false when refresh interval is not numeric", () => {
    expect(
      isConfigValueResponse({
        name: "Endpoint:Service:Api",
        value: "https://api.example.test",
        availableForTargets: ["website"],
        availableInDocuments: ["website.build-time"],
        requiredInDocuments: ["website.build-time"],
        description: "API endpoint.",
        usage: "Server-only.",
        refreshIntervalSeconds: "300",
        fetchedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });
});
