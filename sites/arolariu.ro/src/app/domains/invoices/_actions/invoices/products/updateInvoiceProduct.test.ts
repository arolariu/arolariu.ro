/**
 * @fileoverview Native-boundary tests for deterministic product updates.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ClassificationSystem, type ProductMutation, type ProductUpdateSelector} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {updateInvoiceProduct} from "./updateInvoiceProduct";

const invoiceId = "11111111-1111-4111-8111-111111111111";
const selector: ProductUpdateSelector = {
  originalProductCode: null,
  originalName: "Coffee",
  originalQuantity: 2,
  originalUnitPrice: 15.99,
  originalTotalPrice: 31.98,
  occurrenceOrdinal: 1,
};
const updatedProduct: ProductMutation = {
  name: "Premium Coffee",
  classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"},
  quantity: 2,
  quantityUnit: "kg",
  productCode: "PROD-123",
  price: 15.99,
};

function productResponse(): Response {
  return Response.json(
    {
      ...updatedProduct,
      classification: null,
      totalPrice: 31.98,
      allergenAssessment: null,
      metadata: {isEdited: true, isComplete: true, isSoftDeleted: false, confidence: 0.99},
    },
    {status: 202},
  );
}

describe("updateInvoiceProduct", () => {
  it("sends the exact nested selector and only manual mutation fields", async () => {
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`
        ? productResponse()
        : new Response("Unexpected request", {status: 500}),
    );

    const result = await updateInvoiceProduct({invoiceId, payload: {selector, updatedProduct}});

    expect(result).toMatchObject({success: true, data: {name: "Premium Coffee"}});
    expect(getAnalysisApiRequests()).toContainEqual({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`,
      init: expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          selector,
          name: updatedProduct.name,
          classification: updatedProduct.classification,
          quantity: updatedProduct.quantity,
          quantityUnit: updatedProduct.quantityUnit,
          productCode: updatedProduct.productCode,
          price: updatedProduct.price,
        }),
      }),
    });
  });

  it("rejects invalid input before making a native request", async () => {
    const result = await updateInvoiceProduct(null);

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("returns a safe response error for malformed backend JSON", async () => {
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`
        ? Response.json({invalid: true}, {status: 202})
        : new Response("Unexpected request", {status: 500}),
    );

    const result = await updateInvoiceProduct({invoiceId, payload: {selector, updatedProduct}});

    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });
});
