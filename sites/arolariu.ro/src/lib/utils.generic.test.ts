/**
 * @fileoverview Unit tests for environment and generic utilities.
 * @module sites/arolariu.ro/src/lib/utils.generic/tests
 */

import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, type ScanMetadata} from "@/types/scans";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
  COMMIT_SHA,
  deriveBlobExtension,
  extractFileExtension,
  formatAmount,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatEnum,
  formatRelativeTime,
  generateGuid,
  getCanonicalMimeTypeForExtension,
  isExtensionInSet,
  normalizeMimeType,
  normalizeMimeTypeWithAliases,
  readBlobMetadata,
  SITE_ENV,
  SITE_NAME,
  SITE_URL,
  TIMESTAMP,
  toSafeDate,
  validateStringIsGuidType,
  writeBlobMetadata,
} from "./utils.generic";

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
    const formatted = formatCurrency(123.45, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("$123.45");
  });

  it("should format currency with EUR code", async () => {
    const formatted = formatCurrency(100, {currencyCode: "EUR", locale: "en-US"});
    expect(formatted).toBe("€100");
  });

  it("should format currency with GBP code", async () => {
    const formatted = formatCurrency(50.99, {currencyCode: "GBP", locale: "en-US"});
    expect(formatted).toBe("£50.99");
  });

  it("should format currency with Currency object", async () => {
    const currencyObj = {code: "JPY", name: "Japanese Yen", symbol: "¥"};
    const formatted = formatCurrency(1000, {currencyCode: currencyObj.code, locale: "en-US"});
    expect(formatted).toBe("¥1,000");
  });

  it("should handle zero amount", async () => {
    const formatted = formatCurrency(0, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("$0");
  });

  it("should handle negative amounts", async () => {
    const formatted = formatCurrency(-50, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("-$50");
  });

  it("should handle large amounts", async () => {
    const formatted = formatCurrency(1234567.89, {currencyCode: "USD", locale: "en-US"});
    expect(formatted).toBe("$1,234,567.89");
  });
});

describe("formatDate", () => {
  it("should format string date correctly", async () => {
    const formatted = formatDate("2023-03-15", {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Mar 15, 2023");
  });

  it("should format ISO string date correctly", async () => {
    const formatted = formatDate("2023-01-01T00:00:00Z", {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Jan 1, 2023");
  });

  it("should format Date object correctly", async () => {
    const date = new Date("2023-12-25");
    const formatted = formatDate(date, {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Dec 25, 2023");
  });

  it("should format Date object with instanceof check", async () => {
    // Explicitly create a Date object to hit the instanceof Date branch
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const formatted = formatDate(date, {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Jan 15, 2024");
  });

  it("should handle different months", async () => {
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
    const formatted = formatDate("2024-02-29", {locale: "en-US", dateStyle: "medium"});
    expect(formatted).toBe("Feb 29, 2024");
  });

  it("should use default dateStyle when not specified", async () => {
    const formatted = formatDate("2023-07-04", {locale: "en-US"});
    // Default is "short" style
    expect(formatted).toBe("7/4/23");
  });

  it("should format with full dateStyle", async () => {
    const date = new Date("2023-07-04");
    const formatted = formatDate(date, {locale: "en-US", dateStyle: "full"});
    expect(formatted).toContain("July");
    expect(formatted).toContain("2023");
  });

  it("should format with long dateStyle", async () => {
    const formatted = formatDate("2023-07-04", {locale: "en-US", dateStyle: "long"});
    expect(formatted).toBe("July 4, 2023");
  });

  it("should handle invalid input types gracefully", async () => {
    const formatted = formatDate(null, {locale: "en-US"});
    // null input now returns empty string (safe default)
    expect(formatted).toBe("");
  });

  it("should format with individual year/month/day fields (no dateStyle default)", async () => {
    // Providing `year` triggers the hasIndividualFields branch — dateStyle must not be injected
    const formatted = formatDate("2024-06-15", {locale: "en-US", year: "numeric", month: "long", day: "numeric"});
    expect(formatted).toContain("2024");
    expect(formatted).toContain("June");
  });
});

describe("toSafeDate", () => {
  it("should handle Date objects", () => {
    const date = new Date("2024-01-15");
    expect(toSafeDate(date)).toBe(date);
  });

  it("should handle ISO strings", () => {
    const result = toSafeDate("2024-01-15T10:30:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  it("should return epoch for null", () => {
    expect(toSafeDate(null).getTime()).toBe(0);
  });

  it("should return epoch for undefined", () => {
    expect(toSafeDate(undefined).getTime()).toBe(0);
  });

  it("should return epoch for empty string", () => {
    expect(toSafeDate("").getTime()).toBe(0);
  });

  it("should return epoch for invalid date string", () => {
    expect(toSafeDate("not-a-date").getTime()).toBe(0);
  });
});

describe("formatAmount", () => {
  it("should format with default locale and decimals", () => {
    expect(formatAmount(1234.5)).toBe("1,234.50");
  });

  it("should format with custom locale", () => {
    expect(formatAmount(1234.5, "de-DE")).toBe("1.234,50");
  });

  it("should format with zero decimals", () => {
    expect(formatAmount(1234.5, "en-US", 0)).toBe("1,235");
  });

  it("should handle zero", () => {
    expect(formatAmount(0)).toBe("0.00");
  });

  it("should handle NaN", () => {
    expect(formatAmount(NaN)).toBe("0.00");
  });

  it("should handle Infinity", () => {
    expect(formatAmount(Infinity)).toBe("0.00");
  });

  it("should handle negative numbers", () => {
    expect(formatAmount(-42.1)).toContain("42.10");
  });
});

describe("formatDateTime", () => {
  it("should format a valid date string", () => {
    const result = formatDateTime("2024-01-15T10:30:00Z");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });

  it("should format a Date object", () => {
    const result = formatDateTime(new Date("2024-06-15T14:30:00Z"), "en-US");
    expect(result).toBeTruthy();
  });

  it("should return empty string for null", () => {
    expect(formatDateTime(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(formatDateTime(undefined)).toBe("");
  });

  it("should accept custom options", () => {
    const result = formatDateTime("2024-01-15T10:30:00Z", "en-US", {dateStyle: "long", timeStyle: "short"});
    expect(result).toContain("2024");
  });
});

describe("formatRelativeTime", () => {
  it("should return 'just now' for recent dates", () => {
    expect(formatRelativeTime(new Date())).toBe("just now");
  });

  it("should return minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(fiveMinAgo)).toBe("5 minutes ago");
  });

  it("should return hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    expect(formatRelativeTime(twoHoursAgo)).toBe("2 hours ago");
  });

  it("should return days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400_000);
    expect(formatRelativeTime(threeDaysAgo)).toBe("3 days ago");
  });

  it("should return weeks ago", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400_000);
    expect(formatRelativeTime(twoWeeksAgo)).toBe("2 weeks ago");
  });

  it("should return months ago", () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 86400_000);
    expect(formatRelativeTime(twoMonthsAgo)).toBe("2 months ago");
  });

  it("should handle singular forms", () => {
    const oneMinAgo = new Date(Date.now() - 61_000);
    expect(formatRelativeTime(oneMinAgo)).toBe("1 minute ago");
  });

  it("should handle ISO strings", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5 minutes ago");
  });

  it("should return empty string for null", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(formatRelativeTime(undefined)).toBe("");
  });

  it("should handle future dates", () => {
    const fiveMinFuture = new Date(Date.now() + 5 * 60_000);
    expect(formatRelativeTime(fiveMinFuture)).toContain("from now");
  });

  it("should return 'in less than a minute' for a future date under 60 seconds", () => {
    const thirtySecsFuture = new Date(Date.now() + 30_000);
    expect(formatRelativeTime(thirtySecsFuture)).toBe("in less than a minute");
  });

  it("should return singular hour form for future dates", () => {
    const oneHourFuture = new Date(Date.now() + 1 * 3600_000 + 60_000);
    expect(formatRelativeTime(oneHourFuture)).toBe("1 hour from now");
  });

  it("should return singular day form for future dates", () => {
    const oneDayFuture = new Date(Date.now() + 1 * 86400_000 + 60_000);
    expect(formatRelativeTime(oneDayFuture)).toBe("1 day from now");
  });

  it("should return singular week form for future dates", () => {
    const oneWeekFuture = new Date(Date.now() + 7 * 86400_000 + 60_000);
    expect(formatRelativeTime(oneWeekFuture)).toBe("1 week from now");
  });

  it("should return plural month form for future dates beyond 5 weeks", () => {
    const twoMonthsFuture = new Date(Date.now() + 60 * 86400_000);
    expect(formatRelativeTime(twoMonthsFuture)).toBe("2 months from now");
  });

  it("should return singular month form for a future date about 1 month away", () => {
    const oneMonthFuture = new Date(Date.now() + 35 * 86400_000 + 60_000);
    expect(formatRelativeTime(oneMonthFuture)).toBe("1 month from now");
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
  // Test const object for direct usage
  const Status = {
    Inactive: 0,
    Active: 1,
    Pending: 2,
  } as const;

  // Test const object with non-sequential values
  const Priority = {
    Low: 10,
    Medium: 20,
    High: 30,
    Critical: 100,
  } as const;

  describe("Direct usage (with value parameter)", () => {
    it("should return the string key for a valid enum value", async () => {
      expect(formatEnum(Status, 1)).toBe("Active");
      expect(formatEnum(Status, 0)).toBe("Inactive");
      expect(formatEnum(Status, 2)).toBe("Pending");
    });

    it("should return empty string for invalid enum value", async () => {
      expect(formatEnum(Status, 999)).toBe("");
      expect(formatEnum(Status, -1)).toBe("");
    });

    it("should work with non-sequential enum values", async () => {
      expect(formatEnum(Priority, 10)).toBe("Low");
      expect(formatEnum(Priority, 20)).toBe("Medium");
      expect(formatEnum(Priority, 30)).toBe("High");
      expect(formatEnum(Priority, 100)).toBe("Critical");
    });

    it("should return empty string for value between enum values", async () => {
      expect(formatEnum(Priority, 15)).toBe("");
      expect(formatEnum(Priority, 50)).toBe("");
    });
  });

  describe("Curried usage (factory pattern)", () => {
    it("should return a function when called without value", async () => {
      const formatStatus = formatEnum(Status);
      expect(typeof formatStatus).toBe("function");
    });

    it("should format values correctly using curried function", async () => {
      const formatStatus = formatEnum(Status);

      expect(formatStatus(0)).toBe("Inactive");
      expect(formatStatus(1)).toBe("Active");
      expect(formatStatus(2)).toBe("Pending");
    });

    it("should return empty string for invalid values using curried function", async () => {
      const formatStatus = formatEnum(Status);

      expect(formatStatus(999)).toBe("");
      expect(formatStatus(-1)).toBe("");
    });

    it("should work with non-sequential enums in curried form", async () => {
      const formatPriority = formatEnum(Priority);

      expect(formatPriority(10)).toBe("Low");
      expect(formatPriority(100)).toBe("Critical");
      expect(formatPriority(25)).toBe("");
    });

    it("should handle reusable formatter", async () => {
      const formatter = formatEnum(Status);

      // Use multiple times
      const results = [0, 1, 2, 1, 0].map(formatter);
      expect(results).toEqual(["Inactive", "Active", "Pending", "Active", "Inactive"]);
    });
  });

  describe("Edge cases", () => {
    it("should handle enum with zero value", async () => {
      expect(formatEnum(Status, 0)).toBe("Inactive");
    });

    it("should handle enum with large values", async () => {
      const LargeEnum = {
        Small: 1,
        Large: 1000000,
      } as const;
      expect(formatEnum(LargeEnum, 1000000)).toBe("Large");
    });

    it("should handle single-value enum", async () => {
      const SingleValue = {
        Only: 42,
      } as const;
      expect(formatEnum(SingleValue, 42)).toBe("Only");
      expect(formatEnum(SingleValue, 0)).toBe("");
    });
  });
});

describe("assertValidGuid", () => {
  describe("valid UUID v4 inputs", () => {
    it("should not throw for a valid UUID v4", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-a716-446655440000")).not.toThrow();
    });

    it("should not throw for a valid UUID v4 with uppercase letters", () => {
      expect(() => validateStringIsGuidType("550E8400-E29B-41D4-A716-446655440000")).not.toThrow();
    });

    it("should not throw for UUID v4 with mixed case", () => {
      expect(() => validateStringIsGuidType("550e8400-E29B-41d4-A716-446655440000")).not.toThrow();
    });

    it("should not throw for generated UUIDs", () => {
      const guid = generateGuid();
      expect(() => validateStringIsGuidType(guid)).not.toThrow();
    });

    it("should accept UUID v4 with variant bits 8, 9, a, b", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-8716-446655440000")).not.toThrow();
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-9716-446655440000")).not.toThrow();
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-a716-446655440000")).not.toThrow();
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-b716-446655440000")).not.toThrow();
    });
  });

  describe("valid sentinel GUIDs", () => {
    it("should not throw for EMPTY_GUID", () => {
      expect(() => validateStringIsGuidType("00000000-0000-0000-0000-000000000000")).not.toThrow();
    });

    it("should not throw for LAST_GUID", () => {
      expect(() => validateStringIsGuidType("99999999-9999-9999-9999-999999999999")).not.toThrow();
    });
  });

  describe("invalid inputs - wrong format", () => {
    it("should throw for an empty string", () => {
      expect(() => validateStringIsGuidType("")).toThrow("Invalid identifier: expected a non-empty string");
    });

    it("should throw for a plain string", () => {
      expect(() => validateStringIsGuidType("not-a-guid")).toThrow('Invalid identifier: "not-a-guid" is not a valid GUID');
    });

    it("should throw for UUID without hyphens", () => {
      expect(() => validateStringIsGuidType("550e8400e29b41d4a716446655440000")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID with wrong hyphen positions", () => {
      expect(() => validateStringIsGuidType("550e840-0e29b-41d4-a716-446655440000")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID that is too short", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-a716")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID that is too long", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-a716-446655440000-extra")).toThrow("is not a valid GUID");
    });
  });

  describe("invalid inputs - wrong version", () => {
    it("should throw for UUID v1 (version digit is 1)", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-11d4-a716-446655440000")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID v3 (version digit is 3)", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-31d4-a716-446655440000")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID v5 (version digit is 5)", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-51d4-a716-446655440000")).toThrow("is not a valid GUID");
    });
  });

  describe("invalid inputs - wrong variant", () => {
    it("should throw for UUID with variant digit 0", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-0716-446655440000")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID with variant digit c", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-c716-446655440000")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID with variant digit f", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-f716-446655440000")).toThrow("is not a valid GUID");
    });
  });

  describe("custom parameter name", () => {
    it("should include custom parameter name in error message", () => {
      expect(() => validateStringIsGuidType("invalid", "invoiceId")).toThrow('Invalid invoiceId: "invalid" is not a valid GUID');
    });

    it("should include custom parameter name for empty string error", () => {
      expect(() => validateStringIsGuidType("", "userId")).toThrow("Invalid userId: expected a non-empty string");
    });
  });

  describe("edge cases", () => {
    it("should throw for null coerced to string", () => {
      // @ts-expect-error - Testing runtime behavior with invalid input
      expect(() => validateStringIsGuidType(null)).toThrow("expected a non-empty string");
    });

    it("should throw for undefined coerced to string", () => {
      // @ts-expect-error - Testing runtime behavior with invalid input
      expect(() => validateStringIsGuidType(undefined)).toThrow("expected a non-empty string");
    });

    it("should throw for number input", () => {
      // @ts-expect-error - Testing runtime behavior with invalid input
      expect(() => validateStringIsGuidType(123)).toThrow("expected a non-empty string");
    });

    it("should throw for whitespace-only string", () => {
      expect(() => validateStringIsGuidType("   ")).toThrow("is not a valid GUID");
    });

    it("should throw for UUID with leading/trailing whitespace", () => {
      expect(() => validateStringIsGuidType(" 550e8400-e29b-41d4-a716-446655440000 ")).toThrow("is not a valid GUID");
    });

    it("should throw for special characters in UUID", () => {
      expect(() => validateStringIsGuidType("550e8400-e29b-41d4-a716-44665544000g")).toThrow("is not a valid GUID");
    });
  });
});

describe("scan blob metadata helpers", () => {
  const baseMetadata: ScanMetadata = {
    scanId: "scan-123",
    ownerId: "user-123",
    displayName: "Receipt.jpg",
    documentKind: ScanDocumentKind.RECEIPT,
    documentRole: ScanDocumentRole.PRIMARY,
    status: ScanMetadataStatus.READY,
    uploadedAt: new Date("2026-06-03T20:00:00.000Z"),
    uploadedBy: "user-123",
  };

  it("writes required metadata fields as strings", () => {
    const result = writeBlobMetadata(baseMetadata);

    expect(result).toEqual({
      scanId: "scan-123",
      ownerId: "user-123",
      displayName: "Receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: "2026-06-03T20:00:00.000Z",
      uploadedBy: "user-123",
    });
  });

  it("omits undefined optional metadata fields", () => {
    const {displayName: _displayName, ...metadataWithoutDisplayName} = baseMetadata;

    expect(writeBlobMetadata(metadataWithoutDisplayName)).not.toHaveProperty("displayName");
  });

  it("parses required metadata fields and optional display name", () => {
    const result = readBlobMetadata({
      scanId: "scan-123",
      ownerId: "user-123",
      displayName: "Receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: "2026-06-03T20:00:00.000Z",
      uploadedBy: "user-123",
    });

    expect(result).toEqual(baseMetadata);
  });

  it("does not require displayName when parsing metadata", () => {
    const result = readBlobMetadata({
      scanId: "scan-123",
      ownerId: "user-123",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: "2026-06-03T20:00:00.000Z",
      uploadedBy: "user-123",
    });

    expect(result.displayName).toBeUndefined();
  });

  it("parses all optional lifecycle fields", () => {
    const result = readBlobMetadata({
      scanId: "scan-123",
      ownerId: "user-123",
      documentKind: "receipt",
      documentRole: "primary",
      status: "attached",
      uploadedAt: "2026-06-03T20:00:00.000Z",
      uploadedBy: "user-123",
      lastModifiedAt: "2026-06-03T20:10:00.000Z",
      lastModifiedBy: "user-456",
      attachedAt: "2026-06-03T20:20:00.000Z",
      attachedBy: "user-456",
      attachedTo: "invoice-123",
    });

    expect(result.lastModifiedAt?.toISOString()).toBe("2026-06-03T20:10:00.000Z");
    expect(result.attachedAt?.toISOString()).toBe("2026-06-03T20:20:00.000Z");
    expect(result.attachedTo).toBe("invoice-123");
  });

  it("throws when a required metadata field is missing", () => {
    expect(() =>
      readBlobMetadata({
        ownerId: "user-123",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2026-06-03T20:00:00.000Z",
        uploadedBy: "user-123",
      }),
    ).toThrow("Missing required blob metadata: scanId");
  });

  it("throws when status is invalid", () => {
    expect(() =>
      readBlobMetadata({
        scanId: "scan-123",
        ownerId: "user-123",
        documentKind: "receipt",
        documentRole: "primary",
        status: "processing",
        uploadedAt: "2026-06-03T20:00:00.000Z",
        uploadedBy: "user-123",
      }),
    ).toThrow("Invalid blob metadata status");
  });

  it("throws when a date is invalid", () => {
    expect(() =>
      readBlobMetadata({
        scanId: "scan-123",
        ownerId: "user-123",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "not-a-date",
        uploadedBy: "user-123",
      }),
    ).toThrow("Invalid blob metadata date: uploadedAt");
  });

  it("writes only the lifecycle fields present on the supplied metadata", () => {
    const result = writeBlobMetadata({
      ...baseMetadata,
      status: ScanMetadataStatus.ATTACHED,
      attachedAt: new Date("2026-06-03T23:00:00.000Z"),
      attachedBy: "user-123",
      attachedTo: "invoice-current",
    });

    expect(result["status"]).toBe("attached");
    expect(result["attachedTo"]).toBe("invoice-current");
    expect(result["detachedFrom"]).toBeUndefined();
    expect(result["archivedAt"]).toBeUndefined();
  });
});

describe("MIME and file extension helpers", () => {
  describe("normalizeMimeType", () => {
    it("should normalize MIME type with leading/trailing whitespace", () => {
      expect(normalizeMimeType(" IMAGE/JPEG ")).toBe("image/jpeg");
    });

    it("should return null for whitespace-only string", () => {
      expect(normalizeMimeType("   ")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(normalizeMimeType("")).toBeNull();
    });

    it("should lowercase MIME type", () => {
      expect(normalizeMimeType("IMAGE/PNG")).toBe("image/png");
    });

    it("should handle already normalized MIME type", () => {
      expect(normalizeMimeType("application/pdf")).toBe("application/pdf");
    });
  });

  describe("normalizeMimeTypeWithAliases", () => {
    it("should apply alias and validate against supported types (array)", () => {
      expect(normalizeMimeTypeWithAliases(" image/JPG ", {"image/jpg": "image/jpeg"}, ["image/jpeg"])).toBe("image/jpeg");
    });

    it("should return null for unsupported MIME type (array)", () => {
      expect(normalizeMimeTypeWithAliases("image/gif", {}, ["image/jpeg"])).toBeNull();
    });

    it("should return null for whitespace-only input", () => {
      expect(normalizeMimeTypeWithAliases("   ", {}, ["image/jpeg"])).toBeNull();
    });

    it("should work with Set for supported types", () => {
      expect(normalizeMimeTypeWithAliases("image/png", {}, new Set(["image/png"]))).toBe("image/png");
    });

    it("should validate against Set of supported types", () => {
      expect(normalizeMimeTypeWithAliases("image/gif", {}, new Set(["image/jpeg", "image/png"]))).toBeNull();
    });

    it("should apply alias and validate against Set", () => {
      expect(normalizeMimeTypeWithAliases("image/jpg", {"image/jpg": "image/jpeg"}, new Set(["image/jpeg"]))).toBe("image/jpeg");
    });

    it("should return canonical type without alias if supported", () => {
      expect(normalizeMimeTypeWithAliases("image/jpeg", {}, ["image/jpeg", "image/png"])).toBe("image/jpeg");
    });
  });

  describe("extractFileExtension", () => {
    it("should extract extension from multi-dot filename", () => {
      expect(extractFileExtension("receipt.final.JPG")).toBe("jpg");
    });

    it("should return null for filename without extension", () => {
      expect(extractFileExtension("receipt")).toBeNull();
    });

    it("should return null for filename with trailing dot", () => {
      expect(extractFileExtension("receipt.")).toBeNull();
    });

    it("should lowercase extension", () => {
      expect(extractFileExtension("document.PDF")).toBe("pdf");
    });

    it("should handle single-dot filename", () => {
      expect(extractFileExtension("file.txt")).toBe("txt");
    });
  });

  describe("deriveBlobExtension", () => {
    it("should return 'bin' for filename without extension", () => {
      expect(deriveBlobExtension("receipt")).toBe("bin");
    });

    it("should return extracted extension", () => {
      expect(deriveBlobExtension("scan.TIFF")).toBe("tiff");
    });

    it("should return 'bin' for trailing dot", () => {
      expect(deriveBlobExtension("file.")).toBe("bin");
    });

    it("should return extracted extension for multi-dot filename", () => {
      expect(deriveBlobExtension("archive.tar.gz")).toBe("gz");
    });
  });

  describe("getCanonicalMimeTypeForExtension", () => {
    it("should get MIME type for extension with leading dot", () => {
      expect(getCanonicalMimeTypeForExtension(".JPG", {jpg: "image/jpeg"})).toBe("image/jpeg");
    });

    it("should return null for unsupported extension", () => {
      expect(getCanonicalMimeTypeForExtension("txt", {jpg: "image/jpeg"})).toBeNull();
    });

    it("should get MIME type for extension without leading dot", () => {
      expect(getCanonicalMimeTypeForExtension("pdf", {pdf: "application/pdf"})).toBe("application/pdf");
    });

    it("should normalize extension case", () => {
      expect(getCanonicalMimeTypeForExtension("PNG", {png: "image/png"})).toBe("image/png");
    });

    it("should return null for empty mapping", () => {
      expect(getCanonicalMimeTypeForExtension("jpg", {})).toBeNull();
    });
  });

  describe("isExtensionInSet", () => {
    it("should return true for extension in array (with leading dot)", () => {
      expect(isExtensionInSet(".PDF", ["pdf"])).toBe(true);
    });

    it("should return false for extension not in array", () => {
      expect(isExtensionInSet("gif", ["pdf"])).toBe(false);
    });

    it("should work with Set", () => {
      expect(isExtensionInSet("png", new Set(["png"]))).toBe(true);
    });

    it("should return false for extension not in Set", () => {
      expect(isExtensionInSet("jpg", new Set(["pdf", "png"]))).toBe(false);
    });

    it("should normalize extension case", () => {
      expect(isExtensionInSet("PDF", ["pdf"])).toBe(true);
    });

    it("should handle extension without leading dot in array", () => {
      expect(isExtensionInSet("pdf", ["pdf", "jpg"])).toBe(true);
    });
  });
});

