/**
 * @fileoverview Unit tests for the server-only feature flag helpers.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mockFetchConfigValue = vi.fn<(key: string) => Promise<string>>();

vi.mock("server-only", () => ({}));
vi.mock("@/instrumentation.server", () => ({
  setSpanAttributes: vi.fn(),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));
vi.mock("@/lib/config/configProxy", () => ({
  fetchConfigValue: mockFetchConfigValue,
  invalidateConfigCache: vi.fn(),
  EXP_BASE_URL: "http://exp",
  EXP_SERVICE_TOKEN_SCOPE: "api://test/.default",
}));

describe("featureFlags.server", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetchConfigValue.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns resolved flags when exp responds", async () => {
    mockFetchConfigValue.mockImplementation(async (key: string) => {
      if (key === "website.commander.enabled") return "true";
      if (key === "website.web-vitals.enabled") return "false";
      return "false";
    });

    const {getWebsiteFeatureFlags} = await import("./featureFlags.server");
    const flags = await getWebsiteFeatureFlags();

    expect(flags.commanderEnabled).toBe(true);
    expect(flags.webVitalsEnabled).toBe(false);
  });

  it("returns defaults when exp is unavailable", async () => {
    mockFetchConfigValue.mockRejectedValue(new Error("exp unavailable"));

    const {getWebsiteFeatureFlags, DEFAULT_FEATURE_FLAGS} = await import("./featureFlags.server");
    const flags = await getWebsiteFeatureFlags();

    expect(flags).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("treats non-true strings as false", async () => {
    mockFetchConfigValue.mockResolvedValue("yes");

    const {getWebsiteFeatureFlags} = await import("./featureFlags.server");
    const flags = await getWebsiteFeatureFlags();

    expect(flags.commanderEnabled).toBe(false);
    expect(flags.webVitalsEnabled).toBe(false);
  });

  it("returns defaults when config fetch throws during parsing", async () => {
    mockFetchConfigValue.mockImplementation(async (key: string) => {
      if (key === "website.commander.enabled") throw new Error("Config parse error");
      return "false";
    });

    const {getWebsiteFeatureFlags, DEFAULT_FEATURE_FLAGS} = await import("./featureFlags.server");
    const flags = await getWebsiteFeatureFlags();

    expect(flags).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("should return default feature flags when config fetch throws in outer catch block", async () => {
    // Arrange - Mock to throw an error that bypasses Promise.all catch handlers
    // This tests line 59: the outer try-catch block
    mockFetchConfigValue.mockImplementation(async () => {
      throw new Error("Unexpected config fetch error");
    });

    // Act
    const {getWebsiteFeatureFlags, DEFAULT_FEATURE_FLAGS} = await import("./featureFlags.server");
    const flags = await getWebsiteFeatureFlags();

    // Assert - Should return default flags without throwing (line 59)
    expect(flags).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(flags.commanderEnabled).toBe(true);
    expect(flags.webVitalsEnabled).toBe(false);
  });
});
