/**
 * @fileoverview Tests for stores barrel export.
 * @module stores/index.test
 */

import {describe, expect, it} from "vitest";
import {useInvoicesStore, useMerchantsStore, useScansStore} from "./index";

describe("stores barrel export", () => {
  it("should export useInvoicesStore", () => {
    expect(useInvoicesStore).toBeDefined();
    expect(typeof useInvoicesStore).toBe("function");
  });

  it("should export useMerchantsStore", () => {
    expect(useMerchantsStore).toBeDefined();
    expect(typeof useMerchantsStore).toBe("function");
  });

  it("should export useScansStore", () => {
    expect(useScansStore).toBeDefined();
    expect(typeof useScansStore).toBe("function");
  });

  it("should have getState method on useInvoicesStore", () => {
    expect(typeof useInvoicesStore.getState).toBe("function");
  });

  it("should have getState method on useMerchantsStore", () => {
    expect(typeof useMerchantsStore.getState).toBe("function");
  });

  it("should have getState method on useScansStore", () => {
    expect(typeof useScansStore.getState).toBe("function");
  });
});
