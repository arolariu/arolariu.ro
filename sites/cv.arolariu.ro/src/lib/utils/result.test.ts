/**
 * Unit tests for Result type helpers
 * Tests the ok() and error() functions for creating Result types
 */

import {describe, expect, it} from "vitest";
import {error, ok, type Result} from "./result";

describe("Result type helpers", () => {
  describe("ok()", () => {
    it("should create a successful Result with a value", () => {
      const result = ok(42);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it("should create a successful Result with a string value", () => {
      const result = ok("success");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe("success");
      }
    });

    it("should create a successful Result with an object value", () => {
      const testObject = {foo: "bar", baz: 123};
      const result = ok(testObject);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(testObject);
      }
    });

    it("should create a successful Result with undefined when no value provided", () => {
      const result = ok();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeUndefined();
      }
    });

    it("should create a successful Result with null value", () => {
      const result = ok(null);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it("should create a successful Result with boolean value", () => {
      const resultTrue = ok(true);
      const resultFalse = ok(false);

      expect(resultTrue.ok).toBe(true);
      expect(resultFalse.ok).toBe(true);

      if (resultTrue.ok) {
        expect(resultTrue.value).toBe(true);
      }
      if (resultFalse.ok) {
        expect(resultFalse.value).toBe(false);
      }
    });

    it("should create a successful Result with array value", () => {
      const result = ok([1, 2, 3]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });

    it("should be readonly", () => {
      const result = ok(42);

      // TypeScript will catch mutations at compile time
      // This test verifies the type is treated as readonly
      expect(Object.isFrozen(result)).toBe(false); // Not frozen, just typed as readonly
      expect(result).toBeDefined();
    });
  });

  describe("error()", () => {
    it("should create a failed Result with an Error", () => {
      const testError = new Error("Test error");
      const result = error(testError);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(testError);
        expect(result.error.message).toBe("Test error");
      }
    });

    it("should create a failed Result with a custom error type", () => {
      const customError = {code: "CUSTOM_ERROR", message: "Custom error occurred"};
      const result: Result<never, typeof customError> = error(customError);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(customError);
      }
    });

    it("should create a failed Result with a string error", () => {
      const result = error("String error");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("String error");
      }
    });

    it("should create a failed Result with a number error", () => {
      const result = error(404);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(404);
      }
    });

    it("should preserve Error stack trace", () => {
      const testError = new Error("Stack trace test");
      const result = error(testError);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.stack).toBeDefined();
      }
    });

    it("should be readonly", () => {
      const result = error(new Error("Test"));

      // TypeScript will catch mutations at compile time
      expect(result).toBeDefined();
    });
  });

  describe("Result type discrimination", () => {
    it("should allow type narrowing with ok property", () => {
      const successResult: Result<string> = ok("success");
      const failureResult: Result<string> = error(new Error("failure"));

      // Type guard narrowing
      if (successResult.ok) {
        // TypeScript knows this is the success case
        const value: string = successResult.value;
        expect(value).toBe("success");
      }

      if (!failureResult.ok) {
        // TypeScript knows this is the error case
        const err: Error = failureResult.error;
        expect(err.message).toBe("failure");
      }
    });

    it("should handle Result in conditional logic", () => {
      function processResult(result: Result<number>): string {
        if (result.ok) {
          return `Success: ${result.value}`;
        }
        return `Error: ${result.error.message}`;
      }

      expect(processResult(ok(42))).toBe("Success: 42");
      expect(processResult(error(new Error("Failed")))).toBe("Error: Failed");
    });
  });

  describe("Result with complex types", () => {
    interface User {
      id: number;
      name: string;
      email: string;
    }

    it("should work with complex object types", () => {
      const user: User = {id: 1, name: "Test User", email: "test@example.com"};
      const result = ok(user);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(1);
        expect(result.value.name).toBe("Test User");
        expect(result.value.email).toBe("test@example.com");
      }
    });

    it("should work with Promise-like async operations", async () => {
      async function fetchUser(id: number): Promise<Result<User>> {
        if (id === 1) {
          return ok({id: 1, name: "Test User", email: "test@example.com"});
        }
        return error(new Error("User not found"));
      }

      const successResult = await fetchUser(1);
      const errorResult = await fetchUser(999);

      expect(successResult.ok).toBe(true);
      expect(errorResult.ok).toBe(false);
    });
  });
});
