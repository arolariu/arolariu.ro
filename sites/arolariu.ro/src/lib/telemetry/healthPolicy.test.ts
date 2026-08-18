import {afterEach, describe, expect, it, vi} from "vitest";
import {SUPPRESSION_ENV_VAR, isSuppressedPath, parseSuppressionFlag, shouldSuppressTelemetry} from "./healthPolicy";

describe("healthPolicy", () => {
  describe("isSuppressedPath", () => {
    it.each(["/health", "/api/health", "/api/ready", "/HEALTH", "/Api/Health", "/health/", "/api/health?x=1"])("suppresses %s", (path) => {
      expect(isSuppressedPath(path)).toBe(true);
    });

    it.each(["/", "/api/user", "/api/healthy", "/healthcheck-admin", "/health/details", "", undefined])("does not suppress %s", (path) => {
      expect(isSuppressedPath(path)).toBe(false);
    });
  });

  describe("parseSuppressionFlag", () => {
    it.each([
      [undefined, true],
      ["", true],
      ["true", true],
      ["TRUE", true],
      ["not-a-bool", true],
      ["undefined", true],
      ["false", false],
      ["False", false],
    ])("parses %s as %s", (raw, expected) => {
      expect(parseSuppressionFlag(raw)).toBe(expected);
    });
  });

  describe("shouldSuppressTelemetry", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("suppresses a health path when the env var is unset", () => {
      delete process.env[SUPPRESSION_ENV_VAR];
      expect(process.env[SUPPRESSION_ENV_VAR]).toBeUndefined();
      expect(shouldSuppressTelemetry("/api/health")).toBe(true);
    });

    it("never suppresses a real route even when the env var is unset", () => {
      delete process.env[SUPPRESSION_ENV_VAR];
      expect(process.env[SUPPRESSION_ENV_VAR]).toBeUndefined();
      expect(shouldSuppressTelemetry("/api/user")).toBe(false);
    });

    it("does not suppress a health path when the env var is 'false'", () => {
      vi.stubEnv(SUPPRESSION_ENV_VAR, "false");
      expect(shouldSuppressTelemetry("/api/health")).toBe(false);
    });

    it("suppresses a health path when the env var is an unparseable value (fail-safe)", () => {
      vi.stubEnv(SUPPRESSION_ENV_VAR, "garbage");
      expect(shouldSuppressTelemetry("/api/health")).toBe(true);
    });
  });
});
