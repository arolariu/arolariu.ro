/**
 * @fileoverview Unit tests for the server-only fetchConfigurationValue helper.
 *
 * @remarks
 * Verifies that the helper correctly delegates to the configProxy and does NOT
 * carry a `"use server"` directive (which would make it a browser-callable RPC).
 *
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

  it("should propagate errors thrown by configProxy", async () => {
    vi.mocked(fetchConfigValue).mockRejectedValue(new Error("Required key not found"));

    await expect(fetchConfigurationValue("Required:Key")).rejects.toThrow("Required key not found");
  });
});
