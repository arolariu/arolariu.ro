import {describe, expect, it} from "vitest";
import {hasOnlyKeys, isArrayOf, isBoolean, isFiniteNumber, isNonEmptyString, isRecord} from "./guards";

describe("isRecord", () => {
  it("accepts a plain object", () => {
    expect(isRecord({a: 1})).toBe(true);
  });

  it("rejects null, arrays and primitives", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("x")).toBe(false);
  });
});

describe("hasOnlyKeys", () => {
  it("accepts a subset of the allowed keys", () => {
    expect(hasOnlyKeys({a: 1}, ["a", "b"])).toBe(true);
  });

  it("rejects an unexpected key", () => {
    expect(hasOnlyKeys({a: 1, z: 2}, ["a", "b"])).toBe(false);
  });
});

describe("isNonEmptyString", () => {
  it("rejects empty and whitespace-only strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString("ok")).toBe(true);
  });
});

describe("isFiniteNumber", () => {
  it("rejects NaN and Infinity", () => {
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber(0)).toBe(true);
  });
});

describe("isBoolean", () => {
  it("accepts only booleans", () => {
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
  });
});

describe("isArrayOf", () => {
  it("accepts an empty array", () => {
    expect(isArrayOf([], isNonEmptyString)).toBe(true);
  });

  it("rejects an array with one invalid member", () => {
    expect(isArrayOf(["a", 1], isNonEmptyString)).toBe(false);
  });
});
