/**
 * @fileoverview Unit tests for exp-backed server config helpers.
 * @module sites/arolariu.ro/src/lib/config/expServerConfig.server.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// configProxy mock — controls what fetchConfigValue returns
// mockReset: true (vitest.config.ts) resets all implementations between tests.
// We use vi.hoisted + re-apply in beforeEach.
// ─────────────────────────────────────────────────────────────────────────────

const {mockFetchConfigValue} = vi.hoisted(() => ({
  mockFetchConfigValue: vi.fn(),
}));

vi.mock("@/lib/config/configProxy", () => ({
  fetchConfigValue: mockFetchConfigValue,
}));

import {fetchApiJwtSecret, fetchApiUrl, fetchResendApiKey} from "./expServerConfig.server";

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("expServerConfig.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env["API_URL"];
    delete process.env["API_JWT"];
    delete process.env["RESEND_API_KEY"];
  });

  afterEach(() => {
    delete process.env["API_URL"];
    delete process.env["API_JWT"];
    delete process.env["RESEND_API_KEY"];
  });

  // ───────────────────────────────────────────────────────────────────────────
  // fetchApiUrl
  // ───────────────────────────────────────────────────────────────────────────

  describe("fetchApiUrl", () => {
    it("returns the value from exp when available", async () => {
      mockFetchConfigValue.mockResolvedValueOnce("https://api.arolariu.ro");

      const result = await fetchApiUrl();

      expect(result).toBe("https://api.arolariu.ro");
      expect(mockFetchConfigValue).toHaveBeenCalledWith("Service:Api:Url");
    });

    it("falls back to API_URL env var when exp returns an empty string", async () => {
      mockFetchConfigValue.mockResolvedValueOnce("");
      process.env["API_URL"] = "https://api-fallback.example.com";

      const result = await fetchApiUrl();

      expect(result).toBe("https://api-fallback.example.com");
    });

    it("falls back to API_URL env var when exp throws", async () => {
      mockFetchConfigValue.mockRejectedValueOnce(new Error("Exp unavailable"));
      process.env["API_URL"] = "https://api-env.example.com";

      const result = await fetchApiUrl();

      expect(result).toBe("https://api-env.example.com");
    });

    it("returns empty string when both exp and env fallback are absent", async () => {
      mockFetchConfigValue.mockRejectedValueOnce(new Error("Exp unavailable"));

      const result = await fetchApiUrl();

      expect(result).toBe("");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // fetchApiJwtSecret
  // ───────────────────────────────────────────────────────────────────────────

  describe("fetchApiJwtSecret", () => {
    it("returns the value from exp when available", async () => {
      mockFetchConfigValue.mockResolvedValueOnce("super-secret-from-exp");

      const result = await fetchApiJwtSecret();

      expect(result).toBe("super-secret-from-exp");
      expect(mockFetchConfigValue).toHaveBeenCalledWith("Auth:JWT:Secret");
    });

    it("falls back to API_JWT env var when exp returns empty", async () => {
      mockFetchConfigValue.mockResolvedValueOnce("");
      process.env["API_JWT"] = "env-jwt-secret";

      const result = await fetchApiJwtSecret();

      expect(result).toBe("env-jwt-secret");
    });

    it("falls back to API_JWT env var when exp throws", async () => {
      mockFetchConfigValue.mockRejectedValueOnce(new Error("Exp unavailable"));
      process.env["API_JWT"] = "env-jwt-fallback";

      const result = await fetchApiJwtSecret();

      expect(result).toBe("env-jwt-fallback");
    });

    it("returns empty string when both exp and env are absent", async () => {
      mockFetchConfigValue.mockRejectedValueOnce(new Error("Exp unavailable"));

      const result = await fetchApiJwtSecret();

      expect(result).toBe("");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // fetchResendApiKey
  // ───────────────────────────────────────────────────────────────────────────

  describe("fetchResendApiKey", () => {
    it("returns the value from exp when available", async () => {
      mockFetchConfigValue.mockResolvedValueOnce("re_exp_key_value");

      const result = await fetchResendApiKey();

      expect(result).toBe("re_exp_key_value");
      expect(mockFetchConfigValue).toHaveBeenCalledWith("Communication:Email:ApiKey");
    });

    it("falls back to RESEND_API_KEY env var when exp returns empty", async () => {
      mockFetchConfigValue.mockResolvedValueOnce("");
      process.env["RESEND_API_KEY"] = "re_env_fallback";

      const result = await fetchResendApiKey();

      expect(result).toBe("re_env_fallback");
    });

    it("falls back to RESEND_API_KEY env var when exp throws", async () => {
      mockFetchConfigValue.mockRejectedValueOnce(new Error("Optional key absent from catalog"));
      process.env["RESEND_API_KEY"] = "re_env_key";

      const result = await fetchResendApiKey();

      expect(result).toBe("re_env_key");
    });

    it("returns empty string when both exp and env are absent", async () => {
      mockFetchConfigValue.mockRejectedValueOnce(new Error("Exp unavailable"));

      const result = await fetchResendApiKey();

      expect(result).toBe("");
    });
  });
});
