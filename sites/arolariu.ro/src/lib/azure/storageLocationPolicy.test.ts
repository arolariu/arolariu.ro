/**
 * @fileoverview Tests for the shared frontend invoice-scan storage-location policy.
 * @module lib/azure/storageLocationPolicy.test
 */

import {describe, expect, it} from "vitest";
import {isApprovedInvoiceScanLocation} from "./storageLocationPolicy";

const productionServiceRoot = "https://account.blob.core.windows.net";
const azuriteServiceRoot = "http://localhost:10000/devstoreaccount1";

describe("isApprovedInvoiceScanLocation", () => {
  it("accepts an HTTPS blob in the configured invoices container", () => {
    expect(
      isApprovedInvoiceScanLocation({
        location: "https://account.blob.core.windows.net/invoices/scans/user-1/receipt.heif?sig=opaque",
        storageServiceRoot: productionServiceRoot,
        storageAccountName: "account",
      }),
    ).toBe(true);
  });

  it("accepts only a configured loopback Azurite account and invoices container", () => {
    expect(
      isApprovedInvoiceScanLocation({
        location: "http://localhost:10000/devstoreaccount1/invoices/scans/user-1/receipt.jpg",
        storageServiceRoot: azuriteServiceRoot,
        storageAccountName: "devstoreaccount1",
      }),
    ).toBe(true);
  });

  it.each(["http://localhost:10000/devstoreaccount1", "http://127.0.0.1:10000/devstoreaccount1", "http://[::1]:10000/devstoreaccount1"])(
    "accepts the configured loopback Azurite service root %s",
    (storageServiceRoot) => {
      expect(
        isApprovedInvoiceScanLocation({
          location: `${storageServiceRoot}/invoices/scans/user-1/receipt.jpg`,
          storageServiceRoot,
          storageAccountName: "devstoreaccount1",
        }),
      ).toBe(true);
    },
  );

  it.each([
    "http://storage.example.test/devstoreaccount1/invoices/scans/user-1/receipt.jpg",
    "http://localhost:10001/devstoreaccount1/invoices/scans/user-1/receipt.jpg",
    "http://localhost:10000/otheraccount/invoices/scans/user-1/receipt.jpg",
    "http://localhost:10000/devstoreaccount1/not-invoices/scans/user-1/receipt.jpg",
    "http://localhost:10000/devstoreaccount1/invoices/scans/user-1/%2fescape.jpg",
    "http://localhost:10000/devstoreaccount1/invoices/scans/user-1/../escape.jpg",
    "http://localhost.evil.test:10000/devstoreaccount1/invoices/scans/user-1/receipt.jpg",
  ])("rejects a deceptive or non-approved Azurite location: %s", (location) => {
    expect(
      isApprovedInvoiceScanLocation({
        location,
        storageServiceRoot: azuriteServiceRoot,
        storageAccountName: "devstoreaccount1",
      }),
    ).toBe(false);
  });
});
