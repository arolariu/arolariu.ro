/**
 * @fileoverview Unit tests for environment helper.
 * @module github/scripts/helpers/environment/tests
 *
 * @remarks
 * Uses test-controlled `process.env` values to validate retrieval and defaults.
 */

import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {createEnvironmentHelper} from "./index";

describe("EnvironmentHelper", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    originalEnv = {...process.env};
    originalExitCode = process.exitCode;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exitCode = originalExitCode;
  });

  it("required reads do not set the action's global exit status", () => {
    delete process.env["CI_SCRIPTS_TEST_ABSENT"];
    const before = process.exitCode;
    expect(() => createEnvironmentHelper().getRequired("CI_SCRIPTS_TEST_ABSENT")).toThrow(/CI_SCRIPTS_TEST_ABSENT/);
    expect(process.exitCode).toBe(before);
  });

  it("custom validation does not expose the rejected value or fail the action implicitly", () => {
    process.env["CI_SCRIPTS_TEST_VALUE"] = "sensitive-sentinel";
    const before = process.exitCode;
    let caught: unknown;
    try {
      createEnvironmentHelper().getWithValidation({key: "CI_SCRIPTS_TEST_VALUE", validator: () => false});
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught instanceof Error ? caught.message : "").not.toContain("sensitive-sentinel");
    expect(process.exitCode).toBe(before);
  });

  it("rejects an invalid supplied boolean rather than treating it as false", () => {
    process.env["CI_SCRIPTS_TEST_BOOLEAN"] = "maybe";
    expect(() => createEnvironmentHelper().getBoolean("CI_SCRIPTS_TEST_BOOLEAN")).toThrow(/CI_SCRIPTS_TEST_BOOLEAN/);
  });
  it.each(["null", "undefined"])("typed reads reject the supplied sentinel %s while ordinary lookup stays compatible", (value) => {
    const helper = createEnvironmentHelper({VALUE: value});
    expect(helper.get("VALUE", "fallback")).toBe("fallback");
    expect(() => helper.getBoolean("VALUE", true)).toThrow(/VALUE/);
    expect(() => helper.getInt("VALUE", 100)).toThrow(/VALUE/);
  });

  it("rejects partial and unsafe integers instead of truncating or rounding them", () => {
    process.env["CI_SCRIPTS_TEST_INTEGER"] = "12x";
    expect(() => createEnvironmentHelper().getInt("CI_SCRIPTS_TEST_INTEGER", 0)).toThrow(/CI_SCRIPTS_TEST_INTEGER/);
    process.env["CI_SCRIPTS_TEST_INTEGER"] = "9007199254740992";
    expect(() => createEnvironmentHelper().getInt("CI_SCRIPTS_TEST_INTEGER", 0)).toThrow(/CI_SCRIPTS_TEST_INTEGER/);
  });

  it("can parse an injected snapshot without reading later ambient changes", () => {
    const values = {CI_SCRIPTS_TEST_SNAPSHOT: "first"};
    const helper = createEnvironmentHelper(values);
    values.CI_SCRIPTS_TEST_SNAPSHOT = "second";
    process.env["CI_SCRIPTS_TEST_SNAPSHOT"] = "ambient";
    expect(helper.get("CI_SCRIPTS_TEST_SNAPSHOT")).toBe("first");
    expect(helper.snapshot()["CI_SCRIPTS_TEST_SNAPSHOT"]).toBe("first");
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

    it("rejects a supplied non-numeric string instead of using the missing-value default", () => {
      process.env["INT_VAR"] = "not-a-number";
      const env = createEnvironmentHelper();

      expect(() => env.getInt("INT_VAR", 10)).toThrow(/INT_VAR/);
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
      // Explicitly delete any GitHub-runner-provided env vars before asserting
      // the helper falls back to 'unknown'. Without this, the test passes
      // locally (no GITHUB_* in env) but fails in GitHub Actions, where the
      // runner pre-populates GITHUB_SHA / GITHUB_REF / GITHUB_ACTOR / etc.
      for (const key of ["GITHUB_SHA", "GITHUB_REF", "GITHUB_ACTOR", "GITHUB_REPOSITORY"]) {
        delete process.env[key];
      }
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
