import {AppConfigurationClient} from "@azure/app-configuration";
import {beforeEach, describe, expect, it, vi} from "vitest";
import fetchConfigurationValue from "./fetchConfig";

vi.mock("@azure/app-configuration");
vi.mock("@/lib/utils.server", () => ({
  CONFIG_STORE: "test-connection-string",
}));

describe("fetchConfigurationValue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the configuration value when it exists", async () => {
    const mockGetConfigurationSetting = vi.fn().mockResolvedValue({value: "test-value"});
    (AppConfigurationClient as any).mockImplementation(function () {
      return {
        getConfigurationSetting: mockGetConfigurationSetting,
      };
    });

    const result = await fetchConfigurationValue("test-key");

    expect(AppConfigurationClient).toHaveBeenCalledWith("test-connection-string");
    expect(mockGetConfigurationSetting).toHaveBeenCalledWith({key: "test-key"});
    expect(result).toBe("test-value");
  });

  it("should return an empty string when the value is undefined", async () => {
    const mockGetConfigurationSetting = vi.fn().mockResolvedValue({value: undefined});
    (AppConfigurationClient as any).mockImplementation(function () {
      return {
        getConfigurationSetting: mockGetConfigurationSetting,
      };
    });

    const result = await fetchConfigurationValue("test-key");

    expect(result).toBe("");
  });
});
