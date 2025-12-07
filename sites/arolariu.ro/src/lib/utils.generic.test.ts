import {describe, expect, it} from "vitest";
import {COMMIT_SHA, CONFIG_STORE, generateGuid, SITE_ENV, SITE_NAME, SITE_URL, TIMESTAMP} from "./utils.generic";

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
    const formatted = formatCurrency(123.45, "USD");
    expect(formatted).toBe("$123.45");
  });

  it("should format currency with EUR code", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(100, "EUR");
    expect(formatted).toBe("€100.00");
  });

  it("should format currency with GBP code", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(50.99, "GBP");
    expect(formatted).toBe("£50.99");
  });

  it("should format currency with Currency object", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const currencyObj = {code: "JPY", name: "Japanese Yen", symbol: "¥"};
    const formatted = formatCurrency(1000, currencyObj.code);
    expect(formatted).toBe("¥1,000");
  });

  it("should handle zero amount", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(0, "USD");
    expect(formatted).toBe("$0.00");
  });

  it("should handle negative amounts", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(-50, "USD");
    expect(formatted).toBe("-$50.00");
  });

  it("should handle large amounts", async () => {
    const {formatCurrency} = await import("./utils.generic");
    const formatted = formatCurrency(1234567.89, "USD");
    expect(formatted).toBe("$1,234,567.89");
  });
});

describe("formatDate", () => {
  it("should format string date correctly", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2023-03-15");
    expect(formatted).toBe("Mar 15, 2023");
  });

  it("should format ISO string date correctly", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2023-01-01T00:00:00Z");
    expect(formatted).toBe("Jan 01, 2023");
  });

  it("should format Date object correctly", async () => {
    const {formatDate} = await import("./utils.generic");
    const date = new Date("2023-12-25");
    const formatted = formatDate(date);
    expect(formatted).toBe("Dec 25, 2023");
  });

  it("should return empty string when no date is provided", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate();
    expect(formatted).toBe("");
  });

  it("should return empty string for undefined", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate(undefined);
    expect(formatted).toBe("");
  });

  it("should handle different months", async () => {
    const {formatDate} = await import("./utils.generic");
    const dates = [
      {input: "2023-01-15", expected: "Jan 15, 2023"},
      {input: "2023-06-20", expected: "Jun 20, 2023"},
      {input: "2023-12-31", expected: "Dec 31, 2023"},
    ];

    dates.forEach(({input, expected}) => {
      expect(formatDate(input)).toBe(expected);
    });
  });

  it("should handle leap year dates", async () => {
    const {formatDate} = await import("./utils.generic");
    const formatted = formatDate("2024-02-29");
    expect(formatted).toBe("Feb 29, 2024");
  });
});

describe("Environment Variables", () => {
  it("should have SITE_ENV defined", () => {
    expect(SITE_ENV).toBeDefined();
  });

  it("should have SITE_URL defined", () => {
    expect(SITE_URL).toBeDefined();
  });

  it("should have SITE_NAME defined", () => {
    expect(SITE_NAME).toBeDefined();
  });

  it("should have COMMIT_SHA defined", () => {
    expect(COMMIT_SHA).toBeDefined();
  });

  it("should have TIMESTAMP defined", () => {
    expect(TIMESTAMP).toBeDefined();
  });

  it("should have CONFIG_STORE defined", () => {
    expect(CONFIG_STORE).toBeDefined();
  });
});
