/**
 * @fileoverview Unit tests for the server-only feature flag helpers.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mockFetchConfigValue = vi.fn<(key: string) => Promise<string>>();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/config/configProxy", () => ({
  fetchConfigValue: mockFetchConfigValue,
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
});
