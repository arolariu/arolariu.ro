/**
 * @fileoverview Unit tests for single-key exp config proxy behavior.
 * @module sites/arolariu.ro/src/lib/config/configProxy.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function createConfigValuePayload(name: string, value: string, refreshIntervalSeconds = 300) {
  return {
    name,
    value,
    availableForTargets: ["website"],
    availableInDocuments: ["website.build-time", "website.run-time"],
    description: `${name} description`,
    fetchedAt: "2026-01-01T00:00:00Z",
    refreshIntervalSeconds,
    requiredInDocuments: ["website.build-time", "website.run-time"],
    usage: `${name} usage`,
  } as const;
}

describe("configProxy", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env["AZURE_CLIENT_ID"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
  });

  it("fetches one config value and returns the resolved value", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Storage:Blob:Endpoint", "https://storage.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Storage:Blob:Endpoint");

    expect(value).toBe("https://storage.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("/api/v1/config?name=Storage%3ABlob%3AEndpoint");
  });

  it("returns cached values without an additional network call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const first = await fetchConfigValue("Auth:JWT:Issuer");
    const second = await fetchConfigValue("Auth:JWT:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://issuer.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when exp rejects an unknown key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse({error: "Unknown"}, 400)));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await expect(fetchConfigValue("Unknown:Key")).rejects.toThrow("Failed to fetch config 'Unknown:Key' (status=400).");
  });

  it("returns an empty string for optional keys with empty values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Communication:Email:ApiKey", ""))));

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const value = await fetchConfigValue("Communication:Email:ApiKey");

    expect(value).toBe("");
  });

  it("fetches multiple values independently and returns them as a record", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Secret", "super-secret")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValues, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const values = await fetchConfigValues(["Auth:JWT:Issuer", "Auth:JWT:Secret"]);

    expect(values["Auth:JWT:Issuer"]).toBe("https://issuer.example.test");
    expect(values["Auth:JWT:Secret"]).toBe("super-secret");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidates cached keys so the next read refetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://issuer.example.test")))
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Auth:JWT:Issuer", "https://updated.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    const first = await fetchConfigValue("Auth:JWT:Issuer");
    invalidateConfigCache("Auth:JWT:Issuer");
    const second = await fetchConfigValue("Auth:JWT:Issuer");

    expect(first).toBe("https://issuer.example.test");
    expect(second).toBe("https://updated.example.test");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses http://exp when AZURE_CLIENT_ID is not set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Service:Api:Url", "https://api.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Service:Api:Url");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("http://exp");
  });

  it("uses https://exp.arolariu.ro when AZURE_CLIENT_ID is set", async () => {
    process.env["AZURE_CLIENT_ID"] = "test-managed-identity-id";
    vi.resetModules();

    vi.doMock("@/lib/azure/credentials", () => ({
      getAzureCredential: () => ({
        getToken: vi.fn().mockResolvedValue({token: "mock-azure-bearer-token"}),
      }),
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse(createConfigValuePayload("Service:Api:Url", "https://api.example.test")));
    vi.stubGlobal("fetch", fetchMock);

    const {fetchConfigValue, invalidateConfigCache} = await import("./configProxy");
    invalidateConfigCache();

    await fetchConfigValue("Service:Api:Url");

    expect((fetchMock.mock.calls[0] as [string])[0]).toContain("https://exp.arolariu.ro");
  });
});
