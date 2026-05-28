/**
 * @fileoverview Unit tests for merchant server actions barrel export.
 * @module app/domains/invoices/_actions/merchants/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock all re-exported modules before importing the barrel
vi.mock("./fetchMerchant", () => ({
  fetchMerchant: vi.fn(() => Promise.resolve({success: true, data: {id: "mocked-merchant"}})),
}));

vi.mock("./fetchMerchants", () => ({
  fetchMerchants: vi.fn(() => Promise.resolve({success: true, data: []})),
}));

const merchantActions = await import("./index");

describe("merchant server actions barrel (index)", () => {
  it("exports fetchMerchant", () => {
    expect(merchantActions.fetchMerchant).toBeDefined();
    expect(typeof merchantActions.fetchMerchant).toBe("function");
  });

  it("exports fetchMerchants", () => {
    expect(merchantActions.fetchMerchants).toBeDefined();
    expect(typeof merchantActions.fetchMerchants).toBe("function");
  });

  it("exports exactly two named exports", () => {
    const exports = Object.keys(merchantActions);
    expect(exports).toHaveLength(2);
    expect(exports).toContain("fetchMerchant");
    expect(exports).toContain("fetchMerchants");
  });
});
