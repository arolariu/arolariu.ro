/**
 * @fileoverview Unit tests for domain entity builders.
 * @module tests/helpers/builders/domain.test
 */

import {describe, expect, it} from "vitest";

import {InvoiceAnalysisOptions} from "../../../src/types/invoices";
import {
  buildCreateInvoicePayload,
  buildCreateInvoiceScanPayload,
  buildInvoice,
  buildInvoiceAnalysisOptions,
  buildInvoiceScan,
  buildMerchant,
  buildProduct,
  buildRecipe,
  buildScan,
} from "./domain";

describe("domain builders", () => {
  it("builds valid invoice-domain entities with deterministic defaults", () => {
    const product = buildProduct({name: "Milk"});
    const merchant = buildMerchant({id: "merchant-1", name: "Local Shop"});
    const scan = buildInvoiceScan({location: "https://storage.test/scan.jpg"});
    const recipe = buildRecipe({name: "Pancakes", ingredients: ["milk"]});
    const invoice = buildInvoice({
      id: "invoice-1",
      merchantReference: merchant.id,
      items: [product],
      scans: [scan],
      possibleRecipes: [recipe],
    });

    expect(invoice.id).toBe("invoice-1");
    expect(invoice.items).toEqual([product]);
    expect(merchant.name).toBe("Local Shop");
    expect(invoice.merchantReference).toBe("merchant-1");
    expect(invoice.scans).toEqual([scan]);
    expect(invoice.possibleRecipes).toEqual([recipe]);
  });

  it("builds current invoice action DTO payloads", () => {
    const createInvoicePayload = buildCreateInvoicePayload({
      metadata: {
        isImportant: "true",
        requiresAnalysis: "true",
      },
    });
    const createScanPayload = buildCreateInvoiceScanPayload();
    const options = buildInvoiceAnalysisOptions();

    expect(createInvoicePayload.initialScan.location).toBe(
      "https://storage.test/invoice-scan.jpg",
    );
    expect(createScanPayload.location).toBe(
      "https://storage.test/invoice-scan.jpg",
    );
    expect(options).toBe(InvoiceAnalysisOptions.CompleteAnalysis);
  });

  it("builds standalone uploaded scans", () => {
    const scan = buildScan({
      id: "scan-1",
      metadata: {
        customField: "custom-value",
      },
    });

    expect(scan.id).toBe("scan-1");
    expect(scan.metadata["customField"]).toBe("custom-value");
  });
});
