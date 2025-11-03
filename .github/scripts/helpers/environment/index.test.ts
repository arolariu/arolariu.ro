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

  describe("getBoolean additional cases", () => {
    it('should return true for "yes" string', () => {
      process.env["BOOL_VAR"] = "yes";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(true);
    });

    it('should return true for "TRUE" uppercase', () => {
      process.env["BOOL_VAR"] = "TRUE";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(true);
    });

    it('should return true for "YES" uppercase', () => {
      process.env["BOOL_VAR"] = "YES";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR")).toBe(true);
    });

    it("should return false for empty string", () => {
      process.env["BOOL_VAR"] = "";
      const env = createEnvironmentHelper();

      expect(env.getBoolean("BOOL_VAR", false)).toBe(false);
    });
  });

  describe("getRequiredBatch", () => {
    it("should return all variables when all are set", () => {
      process.env["VAR1"] = "value1";
      process.env["VAR2"] = "value2";
      process.env["VAR3"] = "value3";
      const env = createEnvironmentHelper();

      const result = env.getRequiredBatch(["VAR1", "VAR2", "VAR3"]);

      expect(result).toEqual({
        VAR1: "value1",
        VAR2: "value2",
        VAR3: "value3",
      });
    });

    it("should throw error when any variable is missing", () => {
      process.env["VAR1"] = "value1";
      const env = createEnvironmentHelper();

      expect(() => env.getRequiredBatch(["VAR1", "VAR2", "VAR3"])).toThrow("Missing required environment variables");
    });

    it("should list all missing variables in error message", () => {
      const env = createEnvironmentHelper();

      expect(() => env.getRequiredBatch(["VAR1", "VAR2", "VAR3"])).toThrow("VAR1, VAR2, VAR3");
    });
  });

  describe("has", () => {
    it("should return true when variable is set", () => {
      process.env["EXISTING_VAR"] = "value";
      const env = createEnvironmentHelper();

      expect(env.has("EXISTING_VAR")).toBe(true);
    });

    it("should return false when variable is not set", () => {
      const env = createEnvironmentHelper();

      expect(env.has("NONEXISTENT_VAR")).toBe(false);
    });

    it("should return false for empty string", () => {
      process.env["EMPTY_VAR"] = "";
      const env = createEnvironmentHelper();

      expect(env.has("EMPTY_VAR")).toBe(false);
    });
  });

  describe("getGitHubContext", () => {
    it("should extract GitHub environment context", () => {
      process.env["GITHUB_SHA"] = "abc123";
      process.env["GITHUB_REF"] = "refs/heads/main";
      process.env["GITHUB_ACTOR"] = "testuser";
      process.env["GITHUB_REPOSITORY"] = "owner/repo";
      const env = createEnvironmentHelper();

      const context = env.getGitHubContext();

      expect(context.sha).toBe("abc123");
      expect(context.ref).toBe("refs/heads/main");
      expect(context.actor).toBe("testuser");
      expect(context.repository).toBe("owner/repo");
    });

    it("should use 'unknown' for missing GitHub vars", () => {
      const env = createEnvironmentHelper();

      const context = env.getGitHubContext();

      expect(context.sha).toBe("unknown");
      expect(context.ref).toBe("unknown");
      expect(context.actor).toBe("unknown");
    });
  });

  describe("getWithValidation", () => {
    it("should return value without validation when validator not provided", () => {
      process.env["VALIDATED_VAR"] = "value";
      const env = createEnvironmentHelper();

      const result = env.getWithValidation({key: "VALIDATED_VAR"});

      expect(result).toBe("value");
    });

    it("should return value when validation passes", () => {
      process.env["VALIDATED_VAR"] = "valid-value";
      const env = createEnvironmentHelper();

      const result = env.getWithValidation({
        key: "VALIDATED_VAR",
        validator: (value) => value.startsWith("valid"),
      });

      expect(result).toBe("valid-value");
    });

    it("should throw error when validation fails", () => {
      process.env["VALIDATED_VAR"] = "invalid";
      const env = createEnvironmentHelper();

      expect(() =>
        env.getWithValidation({
          key: "VALIDATED_VAR",
          validator: (value) => value.startsWith("valid"),
        }),
      ).toThrow("failed validation");
    });

    it("should throw error when required and not set", () => {
      const env = createEnvironmentHelper();

      expect(() =>
        env.getWithValidation({
          key: "MISSING_REQUIRED_VAR",
          required: true,
        }),
      ).toThrow("Required environment variable");
    });

    it("should use default value when not set and not required", () => {
      const env = createEnvironmentHelper();

      const result = env.getWithValidation({
        key: "MISSING_VAR",
        defaultValue: "default-value",
      });

      expect(result).toBe("default-value");
    });

    it("should validate default value", () => {
      const env = createEnvironmentHelper();

      expect(() =>
        env.getWithValidation({
          key: "MISSING_VAR",
          defaultValue: "invalid",
          validator: (value) => value.startsWith("valid"),
        }),
      ).toThrow("failed validation");
    });
  });
});
