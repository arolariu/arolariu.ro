import {describe, expect, it} from "vitest";
import {isSuppressedPath, parseSuppressionFlag, shouldSuppressTelemetry} from "./healthPolicy";

describe("healthPolicy", () => {
  describe("isSuppressedPath", () => {
    it.each(["/health", "/api/health", "/api/ready", "/HEALTH", "/Api/Health", "/health/", "/api/health?x=1"])(
      "suppresses %s",
      (path) => {
        expect(isSuppressedPath(path)).toBe(true);
      },
    );

    it.each(["/", "/api/user", "/api/healthy", "/healthcheck-admin", "/health/details", "", undefined])(
      "does not suppress %s",
      (path) => {
        expect(isSuppressedPath(path)).toBe(false);
      },
    );
  });

  describe("parseSuppressionFlag", () => {
    it.each([
      [undefined, true],
      ["", true],
      ["true", true],
      ["TRUE", true],
      ["not-a-bool", true],
      ["false", false],
      ["False", false],
    ])("parses %s as %s", (raw, expected) => {
      expect(parseSuppressionFlag(raw)).toBe(expected);
    });
  });

  describe("shouldSuppressTelemetry", () => {
    it("suppresses a health path when the flag is enabled", () => {
      expect(shouldSuppressTelemetry("/api/health")).toBe(true);
    });

    it("never suppresses a real route", () => {
      expect(shouldSuppressTelemetry("/api/user")).toBe(false);
    });
  });
});
