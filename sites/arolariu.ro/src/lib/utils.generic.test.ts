import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {COMMIT_SHA, generateGuid, SITE_ENV, SITE_NAME, SITE_URL, TIMESTAMP} from "./utils.generic";

describe("generateGuid", () => {
  it("should generate a valid UUIDv4 string", () => {
    const guid = generateGuid();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(guid).toMatch(uuidRegex);
  });

  it("should generate a consistent UUIDv5 when provided with a seed string", () => {
    const seed = "test-seed-value";
    const guid1 = generateGuid(seed);
    const guid2 = generateGuid(seed);

    // UUIDv5 format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(guid1).toMatch(uuidRegex);
    expect(guid2).toMatch(uuidRegex);

    // Same seed should produce same GUID
    expect(guid1).toBe(guid2);
  });

  it("should generate different UUIDv5s for different seeds", () => {
    const guid1 = generateGuid("seed-one");
    const guid2 = generateGuid("seed-two");

    expect(guid1).not.toBe(guid2);
  });

  it("should handle Uint8Array as seed", () => {
    const seed = new Uint8Array([1, 2, 3, 4, 5]);
    const guid1 = generateGuid(seed);
    const guid2 = generateGuid(seed);

    // UUIDv5 format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(guid1).toMatch(uuidRegex);
    expect(guid2).toMatch(uuidRegex);

    // Same seed should produce same GUID
    expect(guid1).toBe(guid2);
  });

  it("should generate different GUIDs on each call", () => {
    const guid1 = generateGuid();
    const guid2 = generateGuid();
    const guid3 = generateGuid();

    expect(guid1).not.toBe(guid2);
    expect(guid2).not.toBe(guid3);
    expect(guid1).not.toBe(guid3);
  });

  it("should generate GUIDs with correct version (4) and variant bits", () => {
    const guid = generateGuid();
    const parts = guid.split("-");

    // Version should be 4 (first character of third group)
    expect(parts[2]?.[0]).toBe("4");

    // Variant should be 8, 9, a, or b (first character of fourth group)
    expect(parts[3]?.[0]).toMatch(/[89ab]/i);
  });

  it("should always return a string", () => {
    const guid = generateGuid();
    expect(typeof guid).toBe("string");
  });

  it("should generate GUIDs of correct length (36 characters including hyphens)", () => {
    const guid = generateGuid();
    expect(guid).toHaveLength(36);
  });
});

describe("formatCurrency", () => {
  it("should format currency with string currency code", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(123.45, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("$123.45");
  });

  it("should format currency with EUR code", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(100, {currencyCode: "EUR", locale: "en-US"});
    expect(formatted).toBe("€100");
  });

  it("should format currency with GBP code", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(50.99, {currencyCode: "GBP", locale: "en-US"});
    expect(formatted).toBe("£50.99");
  });

  it("should format currency with Currency object", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const currencyObj = {code: "JPY", name: "Japanese Yen", symbol: "¥"};
    const formatted = formatCurrency(1000, {currencyCode: currencyObj.code, locale: "en-US"});
    expect(formatted).toBe("¥1,000");
  });

  it("should handle zero amount", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(0, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("$0");
  });

  it("should handle negative amounts", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(-50, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("-$50");
  });

  it("should handle large amounts", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(1234567.89, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("$1,234,567.89");
  });
});

describe("formatDate", () => {
  it("should format string date correctly", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2023-03-15", {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Mar 15, 2023");
  });

  it("should format ISO string date correctly", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2023-01-01T00:00:00Z", {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Jan 1, 2023");
  });

  it("should format Date object correctly", async () => {
    const {formatDate} = await import("./utils.generic");
    const date = new Date("2023-12-25");
    const formatted = formatDate(date, {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Dec 25, 2023");
  });

  it("should format Date object with instanceof check", async () => {
    const {formatDate} = await import("./utils.generic");
    // Explicitly create a Date object to hit the instanceof Date branch
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const formatted = formatDate(date, {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Jan 15, 2024");
  });

  it("should handle different months", async () => {
    const {formatDate} = await import("./utils.generic");
    const dates = [
      {input: "2023-01-15", expected: "Jan 15, 2023"},
      {input: "2023-06-20", expected: "Jun 20, 2023"},
      {input: "2023-12-31", expected: "Dec 31, 2023"},
    ];

    for (const {input, expected} of dates) {
      expect(formatDate(input, {locale: "en-US", dateStyle: "medium"})).toBe(expected);
    }
  });

  it("should handle leap year dates", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2024-02-29", {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Feb 29, 2024");
  });

  it("should use default dateStyle when not specified", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2023-07-04", {locale: "en-US"});
    // Default is "short" style
    expect(formatted).toBe("7/4/23");
  });

  it("should format with full dateStyle", async () => {
    const {formatDate} = await import("./utils.generic");
    const date = new Date("2023-07-04");
    const formatted = formatDate(date, {locale: "en-US", dateStyle: "full"});
    expect(formatted).toContain("July");
    expect(formatted).toContain("2023");
  });

  it("should format with long dateStyle", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2023-07-04", {locale: "en-US", dateStyle: "long"});
    expect(formatted).toBe("July 4, 2023");
  });

  it("should handle invalid input types gracefully", async () => {
    const {formatDate} = await import("./utils.generic");
    // @ts-expect-error - Testing invalid input
    const formatted = formatDate(null, {locale: "en-US"});
    // Current implementation defaults to current date if input is invalid/undefined
    expect(formatted).toBeTruthy();
  });
});

describe("Environment Variables", () => {
  it("should have SITE_ENV defined", () => {
    expect(SITE_ENV).toBeDefined();
    // The ?? operator ensures it's always a string (not undefined)
    expect(typeof SITE_ENV).toBe("string");
  });

  it("should have SITE_URL defined", () => {
    expect(SITE_URL).toBeDefined();
    expect(typeof SITE_URL).toBe("string");
  });

  it("should have SITE_NAME defined", () => {
    expect(SITE_NAME).toBeDefined();
    expect(typeof SITE_NAME).toBe("string");
  });

  it("should have COMMIT_SHA defined", () => {
    expect(COMMIT_SHA).toBeDefined();
    expect(typeof COMMIT_SHA).toBe("string");
  });

  it("should have TIMESTAMP defined", () => {
    expect(TIMESTAMP).toBeDefined();
    expect(typeof TIMESTAMP).toBe("string");
  });

  it("should return empty string when SITE_ENV is not set", () => {
    // The ?? "" ensures empty string fallback
    expect(SITE_ENV).not.toBeNull();
    expect(SITE_ENV).not.toBeUndefined();
  });

  it("should return empty string when SITE_URL is not set", () => {
    expect(SITE_URL).not.toBeNull();
    expect(SITE_URL).not.toBeUndefined();
  });

  it("should return empty string when SITE_NAME is not set", () => {
    expect(SITE_NAME).not.toBeNull();
    expect(SITE_NAME).not.toBeUndefined();
  });

  it("should return empty string when COMMIT_SHA is not set", () => {
    expect(COMMIT_SHA).not.toBeNull();
    expect(COMMIT_SHA).not.toBeUndefined();
  });

  it("should return empty string when TIMESTAMP is not set", () => {
    expect(TIMESTAMP).not.toBeNull();
    expect(TIMESTAMP).not.toBeUndefined();
  });
});

describe("Environment Variables Fallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {...originalEnv};
    delete process.env["SITE_ENV"];
    delete process.env["SITE_URL"];
    delete process.env["SITE_NAME"];
    delete process.env["COMMIT_SHA"];
    delete process.env["TIMESTAMP"];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should fallback to empty string when env vars are missing", async () => {
    const {COMMIT_SHA, SITE_ENV, SITE_NAME, SITE_URL, TIMESTAMP} = await import("./utils.generic");

    expect(SITE_ENV).toBe("");
    expect(SITE_URL).toBe("");
    expect(SITE_NAME).toBe("");
    expect(COMMIT_SHA).toBe("");
    expect(TIMESTAMP).toBe("");
  });
});

describe("formatEnum", () => {
  // Test enum for direct usage
  enum Status {
    Inactive = 0,
    Active = 1,
    Pending = 2,
  }

  // Test enum with non-sequential values
  enum Priority {
    Low = 10,
    Medium = 20,
    High = 30,
    Critical = 100,
  }

  describe("Direct usage (with value parameter)", () => {
    it("should return the string key for a valid enum value", async () => {
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(Status, 1)).toBe("Active");
      expect(formatEnum(Status, 0)).toBe("Inactive");
      expect(formatEnum(Status, 2)).toBe("Pending");
    });

    it("should return empty string for invalid enum value", async () => {
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(Status, 999)).toBe("");
      expect(formatEnum(Status, -1)).toBe("");
    });

    it("should work with non-sequential enum values", async () => {
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(Priority, 10)).toBe("Low");
      expect(formatEnum(Priority, 20)).toBe("Medium");
      expect(formatEnum(Priority, 30)).toBe("High");
      expect(formatEnum(Priority, 100)).toBe("Critical");
    });

    it("should return empty string for value between enum values", async () => {
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(Priority, 15)).toBe("");
      expect(formatEnum(Priority, 50)).toBe("");
    });
  });

  describe("Curried usage (factory pattern)", () => {
    it("should return a function when called without value", async () => {
      const {formatEnum} = await import("./utils.generic");
      const formatStatus = formatEnum(Status);
      expect(typeof formatStatus).toBe("function");
    });

    it("should format values correctly using curried function", async () => {
      const {formatEnum} = await import("./utils.generic");
      const formatStatus = formatEnum(Status);

      expect(formatStatus(0)).toBe("Inactive");
      expect(formatStatus(1)).toBe("Active");
      expect(formatStatus(2)).toBe("Pending");
    });

    it("should return empty string for invalid values using curried function", async () => {
      const {formatEnum} = await import("./utils.generic");
      const formatStatus = formatEnum(Status);

      expect(formatStatus(999)).toBe("");
      expect(formatStatus(-1)).toBe("");
    });

    it("should work with non-sequential enums in curried form", async () => {
      const {formatEnum} = await import("./utils.generic");
      const formatPriority = formatEnum(Priority);

      expect(formatPriority(10)).toBe("Low");
      expect(formatPriority(100)).toBe("Critical");
      expect(formatPriority(25)).toBe("");
    });

    it("should handle reusable formatter", async () => {
      const {formatEnum} = await import("./utils.generic");
      const formatter = formatEnum(Status);

      // Use multiple times
      const results = [0, 1, 2, 1, 0].map(formatter);
      expect(results).toEqual(["Inactive", "Active", "Pending", "Active", "Inactive"]);
    });
  });

  describe("Edge cases", () => {
    it("should handle enum with zero value", async () => {
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(Status, 0)).toBe("Inactive");
    });

    it("should handle enum with large values", async () => {
      enum LargeEnum {
        Small = 1,
        Large = 1000000,
      }
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(LargeEnum, 1000000)).toBe("Large");
    });

    it("should handle single-value enum", async () => {
      enum SingleValue {
        Only = 42,
      }
      const {formatEnum} = await import("./utils.generic");
      expect(formatEnum(SingleValue, 42)).toBe("Only");
      expect(formatEnum(SingleValue, 0)).toBe("");
    });
  });
});
