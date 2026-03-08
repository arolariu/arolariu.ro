/**
 * @fileoverview Unit tests for the server-only run-time exp helpers.
 * @module sites/arolariu.ro/src/lib/config/configBootstrap.server.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const validRunTimePayload = {
  target: "website",
  contractVersion: "1",
  version: "v3",
  config: {"Endpoints:Service:Api": "https://api.arolariu.ro"},
  features: {
    "website.commander.enabled": false,
    "website.web-vitals.enabled": true,
  },
  refreshIntervalSeconds: 300,
  fetchedAt: "2026-01-01T00:00:00Z",
} as const;

describe("configBootstrap.server", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env["AZURE_CLIENT_ID"];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env["AZURE_CLIENT_ID"];
  });

  describe("fetchBootstrap", () => {
    it("fetches and returns a valid run-time payload", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(validRunTimePayload)));

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      const result = await fetchBootstrap();

      expect(result.target).toBe("website");
      expect(result.contractVersion).toBe("1");
      expect(result.config["Endpoints:Service:Api"]).toBe("https://api.arolariu.ro");
      expect(result.features["website.web-vitals.enabled"]).toBe(true);
    });

    it("uses cache on second call without an additional network request", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(validRunTimePayload));
      vi.stubGlobal("fetch", fetchMock);

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      await fetchBootstrap();
      await fetchBootstrap();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("throws when exp returns a non-2xx status", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({}, 503)));

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      await expect(fetchBootstrap()).rejects.toThrow("/api/v1/run-time returned 503");
    });

    it("throws when response fails the type guard", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({target: "website"})));

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      await expect(fetchBootstrap()).rejects.toThrow("Run-time response payload failed type guard");
    });

    it("uses http://exp when AZURE_CLIENT_ID is not set", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(validRunTimePayload));
      vi.stubGlobal("fetch", fetchMock);

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      await fetchBootstrap();

      const calledUrl = (fetchMock.mock.calls[0] as [string])[0];
      expect(calledUrl).toContain("http://exp");
      expect(calledUrl).toContain("/api/v1/run-time");
    });

    it("uses https://exp.arolariu.ro when AZURE_CLIENT_ID is set", async () => {
      process.env["AZURE_CLIENT_ID"] = "test-client-id";
      vi.resetModules();

      vi.doMock("@/lib/azure/credentials", () => ({
        getAzureCredential: () => ({
          getToken: vi.fn().mockResolvedValue({token: "mock-azure-bearer-token"}),
        }),
      }));

      const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(validRunTimePayload));
      vi.stubGlobal("fetch", fetchMock);

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      await fetchBootstrap();

      const calledUrl = (fetchMock.mock.calls[0] as [string])[0];
      expect(calledUrl).toContain("https://exp.arolariu.ro");
    });
  });

  describe("getWebsiteFeatureFlags", () => {
    it("derives feature flags from the run-time payload", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(validRunTimePayload)));

      const {getWebsiteFeatureFlags, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      const flags = await getWebsiteFeatureFlags();

      expect(flags.commanderEnabled).toBe(false);
      expect(flags.webVitalsEnabled).toBe(true);
    });

    it("returns default feature flags when the run-time endpoint fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")));

      const {getWebsiteFeatureFlags, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      const flags = await getWebsiteFeatureFlags();

      expect(flags.commanderEnabled).toBe(true);
      expect(flags.webVitalsEnabled).toBe(true);
    });
  });

  describe("invalidateBootstrapCache", () => {
    it("forces a re-fetch after invalidation", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(validRunTimePayload))
        .mockResolvedValueOnce(jsonResponse({...validRunTimePayload, contractVersion: "2"}));

      vi.stubGlobal("fetch", fetchMock);

      const {fetchBootstrap, invalidateBootstrapCache} = await import("./configBootstrap.server");
      invalidateBootstrapCache();

      const first = await fetchBootstrap();
      invalidateBootstrapCache();
      const second = await fetchBootstrap();

      expect(first.contractVersion).toBe("1");
      expect(second.contractVersion).toBe("2");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
