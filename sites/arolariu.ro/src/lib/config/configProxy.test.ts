/**
 * @fileoverview Unit tests for catalog-driven exp config proxy behavior.
 * @module sites/arolariu.ro/src/lib/config/configProxy.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const websiteCatalogPayload = {
  target: "website",
  version: "v1",
  requiredKeys: ["AzureOptions:StorageAccountEndpoint", "Common:Auth:Issuer", "Common:Auth:Audience"],
  optionalKeys: ["Optional:FeatureFlag"],
  allowedPrefixes: [],
  refreshIntervalSeconds: 300,
} as const;

describe("configProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env["INFRA"] = "local";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches website catalog and single config value", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        key: "AzureOptions:StorageAccountEndpoint",
        value: "https://storage.example.test",
        fetchedAt: "2026-01-01T00:00:00Z",
      }));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const value = await fetchConfigValue("AzureOptions:StorageAccountEndpoint");

    expect(value).toBe("https://storage.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns cached single value without extra network call", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        key: "Common:Auth:Issuer",
        value: "https://issuer.example.test",
        fetchedAt: "2026-01-01T00:00:00Z",
      }));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const first = await fetchConfigValue("Common:Auth:Issuer");
    const second = await fetchConfigValue("Common:Auth:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://issuer.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws when required single key cannot be resolved", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({}, 500));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    await expect(fetchConfigValue("Common:Auth:Audience")).rejects.toThrow(
      "Required key 'Common:Auth:Audience' could not be resolved from config proxy.",
    );
  });

  it("throws when fetching a key not declared in website catalog", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    await expect(fetchConfigValues(["Unknown:Key"])).rejects.toThrow(
      "Key 'Unknown:Key' is not declared in the 'website' catalog.",
    );
  });

  it("returns batch values for required and optional keys", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        values: [
          {key: "Common:Auth:Issuer", value: "https://issuer.example.test"},
          {key: "Optional:FeatureFlag", value: "enabled"},
        ],
      }));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const values = await fetchConfigValues(["Common:Auth:Issuer", "Optional:FeatureFlag"]);
    expect(values["Common:Auth:Issuer"]).toBe("https://issuer.example.test");
    expect(values["Optional:FeatureFlag"]).toBe("enabled");
  });

  it("throws when required batch keys are unresolved after proxy failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({}, 500));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    await expect(fetchConfigValues(["Common:Auth:Issuer"])).rejects.toThrow(
      "Required keys could not be resolved from config proxy: Common:Auth:Issuer",
    );
  });

  it("returns fallback for optional batch key when proxy fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({}, 500));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const values = await fetchConfigValues(["Optional:FeatureFlag"]);
    expect(values["Optional:FeatureFlag"]).toBe("");
  });

  it("returns empty for optional single key when proxy returns non-success", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({}, 503));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const value = await fetchConfigValue("Optional:FeatureFlag");
    expect(value).toBe("");
  });

  it("returns empty when catalog payload is invalid for optional key", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(createJsonResponse({target: "website"}));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const value = await fetchConfigValue("Optional:FeatureFlag");
    expect(value).toBe("");
  });

  it("throws when required key is returned empty in a successful batch response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        values: [
          {key: "Common:Auth:Issuer", value: ""},
        ],
      }));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    await expect(fetchConfigValues(["Common:Auth:Issuer"])).rejects.toThrow(
      "Required keys could not be resolved from config proxy: Common:Auth:Issuer",
    );
  });

  it("returns all values from cache when batch keys are already cached", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        key: "Common:Auth:Issuer",
        value: "https://issuer.example.test",
        fetchedAt: "2026-01-01T00:00:00Z",
      }))
      .mockResolvedValueOnce(createJsonResponse({
        key: "Common:Auth:Audience",
        value: "https://audience.example.test",
        fetchedAt: "2026-01-01T00:00:00Z",
      }));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    await fetchConfigValue("Common:Auth:Issuer");
    await fetchConfigValue("Common:Auth:Audience");

    const values = await fetchConfigValues(["Common:Auth:Issuer", "Common:Auth:Audience"]);
    expect(values["Common:Auth:Issuer"]).toBe("https://issuer.example.test");
    expect(values["Common:Auth:Audience"]).toBe("https://audience.example.test");
  });

  it("returns cached optional values when batch request throws", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        key: "Optional:FeatureFlag",
        value: "cached",
        fetchedAt: "2026-01-01T00:00:00Z",
      }))
      .mockRejectedValueOnce(new Error("Network down"));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    await fetchConfigValue("Optional:FeatureFlag");
    const values = await fetchConfigValues(["Optional:FeatureFlag"]);

    expect(values["Optional:FeatureFlag"]).toBe("cached");
  });

  it("returns empty optional values when batch request throws and cache is empty", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockRejectedValueOnce(new Error("Network down"));

    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateCatalogCache, invalidateConfigCache} = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const values = await fetchConfigValues(["Optional:FeatureFlag"]);
    expect(values["Optional:FeatureFlag"]).toBe("");
  });

  it("invalidates single-key cache entries", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createJsonResponse(websiteCatalogPayload))
      .mockResolvedValueOnce(createJsonResponse({
        key: "Optional:FeatureFlag",
        value: "initial",
        fetchedAt: "2026-01-01T00:00:00Z",
      }))
      .mockResolvedValueOnce(createJsonResponse({
        key: "Optional:FeatureFlag",
        value: "updated",
        fetchedAt: "2026-01-01T00:00:00Z",
      }));

    vi.stubGlobal("fetch", fetchMock);

    const {
      fetchConfigValue,
      invalidateCatalogCache,
      invalidateConfigCache,
    } = await import("./configProxy");
    invalidateCatalogCache();
    invalidateConfigCache();

    const first = await fetchConfigValue("Optional:FeatureFlag");
    invalidateConfigCache("Optional:FeatureFlag");
    const second = await fetchConfigValue("Optional:FeatureFlag");

    expect(first).toBe("initial");
    expect(second).toBe("updated");
  });
});
