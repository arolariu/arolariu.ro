/**
 * @fileoverview Unit tests for exp bootstrap and features type guards.
 * @module sites/arolariu.ro/src/lib/config/configBootstrap.types.test
 */

import {describe, expect, it} from "vitest";

import {
  DEFAULT_FEATURE_FLAGS,
  WEBSITE_FEATURE_KEYS,
  deriveFeatureFlags,
  isBootstrapResponse,
} from "./configBootstrap.types";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const validBootstrap = {
  target: "website" as const,
  contractVersion: "1",
  version: "v3",
  config: {
    "Endpoints:Api": "https://api.arolariu.ro",
    "AzureOptions:StorageAccountEndpoint": "https://storage.example.com",
  },
  features: {
    "website.commander.enabled": true,
    "website.web-vitals.enabled": false,
  },
  refreshIntervalSeconds: 300,
  fetchedAt: "2026-01-01T00:00:00Z",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// WEBSITE_FEATURE_KEYS
// ─────────────────────────────────────────────────────────────────────────────

describe("WEBSITE_FEATURE_KEYS", () => {
  it("contains expected feature keys", () => {
    expect(WEBSITE_FEATURE_KEYS).toContain("website.commander.enabled");
    expect(WEBSITE_FEATURE_KEYS).toContain("website.web-vitals.enabled");
    expect(WEBSITE_FEATURE_KEYS).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT_FEATURE_FLAGS
// ─────────────────────────────────────────────────────────────────────────────

describe("DEFAULT_FEATURE_FLAGS", () => {
  it("defaults both commander and webVitals to true (features on by default)", () => {
    expect(DEFAULT_FEATURE_FLAGS.commanderEnabled).toBe(true);
    expect(DEFAULT_FEATURE_FLAGS.webVitalsEnabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isBootstrapResponse
// ─────────────────────────────────────────────────────────────────────────────

describe("isBootstrapResponse", () => {
  it("returns true for a fully valid bootstrap payload", () => {
    expect(isBootstrapResponse(validBootstrap)).toBe(true);
  });

  it("returns true when config and features are empty objects", () => {
    expect(
      isBootstrapResponse({
        ...validBootstrap,
        config: {},
        features: {},
      }),
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isBootstrapResponse(null)).toBe(false);
  });

  it("returns false for a non-object value", () => {
    expect(isBootstrapResponse("string")).toBe(false);
    expect(isBootstrapResponse(42)).toBe(false);
  });

  it("returns false when target is not 'website'", () => {
    expect(isBootstrapResponse({...validBootstrap, target: "api"})).toBe(false);
    expect(isBootstrapResponse({...validBootstrap, target: "unknown"})).toBe(false);
  });

  it("returns false when contractVersion is missing", () => {
    const {contractVersion: _cv, ...rest} = validBootstrap;
    expect(isBootstrapResponse(rest)).toBe(false);
  });

  it("returns false when version is missing", () => {
    const {version: _version, ...rest} = validBootstrap;
    expect(isBootstrapResponse(rest)).toBe(false);
  });

  it("returns false when config contains non-string values", () => {
    expect(
      isBootstrapResponse({
        ...validBootstrap,
        config: {"key": 123},
      }),
    ).toBe(false);
  });

  it("returns false when features contains non-boolean values", () => {
    expect(
      isBootstrapResponse({
        ...validBootstrap,
        features: {"website.commander.enabled": "true"},
      }),
    ).toBe(false);
  });

  it("returns false when config is an array", () => {
    expect(isBootstrapResponse({...validBootstrap, config: ["a", "b"]})).toBe(false);
  });

  it("returns false when refreshIntervalSeconds is not a number", () => {
    expect(isBootstrapResponse({...validBootstrap, refreshIntervalSeconds: "300"})).toBe(false);
  });

  it("returns false when fetchedAt is not a string", () => {
    expect(isBootstrapResponse({...validBootstrap, fetchedAt: 1234567890})).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveFeatureFlags
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveFeatureFlags", () => {
  it("maps commander and webVitals flags correctly when both enabled", () => {
    const flags = deriveFeatureFlags({
      "website.commander.enabled": true,
      "website.web-vitals.enabled": true,
    });
    expect(flags.commanderEnabled).toBe(true);
    expect(flags.webVitalsEnabled).toBe(true);
  });

  it("maps commander and webVitals flags correctly when both disabled", () => {
    const flags = deriveFeatureFlags({
      "website.commander.enabled": false,
      "website.web-vitals.enabled": false,
    });
    expect(flags.commanderEnabled).toBe(false);
    expect(flags.webVitalsEnabled).toBe(false);
  });

  it("uses DEFAULT_FEATURE_FLAGS values when keys are absent", () => {
    const flags = deriveFeatureFlags({});
    expect(flags.commanderEnabled).toBe(DEFAULT_FEATURE_FLAGS.commanderEnabled);
    expect(flags.webVitalsEnabled).toBe(DEFAULT_FEATURE_FLAGS.webVitalsEnabled);
  });

  it("handles partial key presence", () => {
    const flags = deriveFeatureFlags({"website.commander.enabled": false});
    expect(flags.commanderEnabled).toBe(false);
    expect(flags.webVitalsEnabled).toBe(DEFAULT_FEATURE_FLAGS.webVitalsEnabled);
  });

  it("ignores unrecognised feature keys", () => {
    const flags = deriveFeatureFlags({
      "website.commander.enabled": true,
      "website.web-vitals.enabled": false,
      "website.unknown.flag": true,
    });
    expect(flags.commanderEnabled).toBe(true);
    expect(flags.webVitalsEnabled).toBe(false);
  });
});
