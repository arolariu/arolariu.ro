/**
 * @fileoverview Unit tests for fetching configuration values via the config proxy.
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchConfig/tests
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import fetchConfigurationValue from "./fetchConfig";

vi.mock("@/lib/config/configProxy", () => ({
  fetchConfigValue: vi.fn(),
}));

import {fetchConfigValue} from "@/lib/config/configProxy";

describe("fetchConfigurationValue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the configuration value when it exists", async () => {
    vi.mocked(fetchConfigValue).mockResolvedValue("test-value");

    const result = await fetchConfigurationValue("test-key");

    expect(fetchConfigValue).toHaveBeenCalledWith("test-key");
    expect(result).toBe("test-value");
  });

  it("should return an empty string when the proxy returns empty", async () => {
    vi.mocked(fetchConfigValue).mockResolvedValue("");

    const result = await fetchConfigurationValue("test-key");

    expect(result).toBe("");
  });
});
