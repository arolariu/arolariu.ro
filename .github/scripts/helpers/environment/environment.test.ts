/**
 * @fileoverview Unit tests for environment helper
 */

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {createEnvironmentHelper} from "./index";

describe("EnvironmentHelper", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = {...process.env};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("get", () => {
    it("should return environment variable value", () => {
      process.env["TEST_VAR"] = "test-value";
      const env = createEnvironmentHelper();

      expect(env.get("TEST_VAR")).toBe("test-value");
    });

    it("should return default value when variable is not set", () => {
      const env = createEnvironmentHelper();

      expect(env.get("NONEXISTENT_VAR", "default")).toBe("default");
    });

    it("should return undefined when variable is not set and no default", () => {
      const env = createEnvironmentHelper();

      expect(env.get("NONEXISTENT_VAR")).toBeUndefined();
    });
  });

  describe("getRequired", () => {
    it("should return value when variable is set", () => {
      process.env["REQUIRED_VAR"] = "required-value";
      const env = createEnvironmentHelper();

      expect(env.getRequired("REQUIRED_VAR")).toBe("required-value");
    });

    it("should throw error when variable is not set", () => {
      const env = createEnvironmentHelper();

      expect(() => env.getRequired("MISSING_VAR")).toThrow("Required environment variable");
    });
  });

  describe("getBoolean", () => {
    it('should return true for "true" string', () => {
      process.env["BOOL_VAR"] = "true";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(true);
    });

    it('should return true for "1" string', () => {
      process.env["BOOL_VAR"] = "1";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(true);
    });

    it('should return false for "false" string', () => {
      process.env["BOOL_VAR"] = "false";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(false);
    });

    it('should return false for "0" string', () => {
      process.env["BOOL_VAR"] = "0";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(false);
    });

    it("should return default value when variable is not set", () => {
      const env = createEnvironmentHelper();

      expect(env.getBoolean("NONEXISTENT_VAR", true)).toBe(true);
      expect(env.getBoolean("NONEXISTENT_VAR", false)).toBe(false);
    });
  });

  describe("getInt", () => {
    it("should parse integer values", () => {
      process.env["INT_VAR"] = "42";
      const env = createEnvironmentHelper();

      expect(env.getInt("INT_VAR", 0)).toBe(42);
    });

    it("should return default value for non-numeric strings", () => {
      process.env["INT_VAR"] = "not-a-number";
      const env = createEnvironmentHelper();

      expect(env.getInt("INT_VAR", 10)).toBe(10);
    });

    it("should return default value when variable is not set", () => {
      const env = createEnvironmentHelper();

      expect(env.getInt("NONEXISTENT_VAR", 100)).toBe(100);
    });
  });
});
