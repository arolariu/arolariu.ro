/**
 * @fileoverview Native-boundary tests for exact product deletion selectors.
 * @module app/domains/invoices/_actions/invoices/products/deleteInvoiceProduct.test
 */

import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import type {ProductUpdateSelector} from "@/types/invoices";
import {describe, expect, it, vi} from "vitest";
import {deleteInvoiceProduct} from "./deleteInvoiceProduct";

const invoiceId = "11111111-1111-4111-8111-111111111111";
const selector: ProductUpdateSelector = {
  originalProductCode: "  sku-42  ",
  originalName: null,
  originalQuantity: null,
  originalUnitPrice: null,
  originalTotalPrice: null,
  occurrenceOrdinal: 1,
};

function getOnlyRequest(): AnalysisFetchRequest {
  const request = getAnalysisApiRequests().at(-1);
  if (request === undefined) throw new Error("Expected a native API request.");
  return request;
}

describe("deleteInvoiceProduct", () => {
  it("sends the exact nested selector and persists backend deletion", async () => {
    // Arrange
    installAnalysisFetchHandler(() => new Response(null, {status: 204}));

    // Act
    const result = await deleteInvoiceProduct({invoiceId, selector});

    // Assert
    expect(result).toEqual({success: true, data: undefined});
    expect(getOnlyRequest()).toMatchObject({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`,
      init: expect.objectContaining({method: "DELETE", body: JSON.stringify({selector})}),
    });
  });

  it("rejects incomplete selectors before crossing the network boundary", async () => {
    // Act
    const result = await deleteInvoiceProduct({
      invoiceId,
      selector: {
        originalProductCode: null,
        originalName: "Coffee",
        originalQuantity: null,
        originalUnitPrice: null,
        originalTotalPrice: null,
        occurrenceOrdinal: null,
      },
    });

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("does not read, log, or return a rejected backend body", async () => {
    // Arrange
    const sensitiveBody = "provider OCR output and SAS token";
    const response = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(response, "text");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installAnalysisFetchHandler(() => response);

    // Act
    const result = await deleteInvoiceProduct({invoiceId, selector});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
    expect(readBody).not.toHaveBeenCalled();
    expect(JSON.stringify([result, ...consoleError.mock.calls])).not.toContain(sensitiveBody);
  });
});
