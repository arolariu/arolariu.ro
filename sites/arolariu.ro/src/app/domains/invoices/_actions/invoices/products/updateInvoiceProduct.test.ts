/**
 * @fileoverview Native-boundary tests for the product update server action.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ClassificationSystem, ProductCategory} from "@/types/invoices";
import {TestDataBuilder} from "../../../../../../../tests/helpers";
import {describe, expect, it} from "vitest";
import {updateInvoiceProduct} from "./updateInvoiceProduct";

const invoiceId = "11111111-1111-4111-8111-111111111111";

describe("updateInvoiceProduct", () => {
  it("persists only the exact manual selection in the flat safe backend DTO", async () => {
    // Arrange
    const baseProduct = TestDataBuilder.build("product", {
      name: "Premium Coffee",
      category: ProductCategory.GROCERIES,
      quantity: 2,
      quantityUnit: "kg",
      productCode: "PROD-123",
      price: 15.99,
      detectedAllergens: [],
    });
    const updatedProduct = {
      ...baseProduct,
      classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"},
    };
    const expectedBody = JSON.stringify({
      originalProductName: "Coffee",
      name: updatedProduct.name,
      classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"},
      quantity: updatedProduct.quantity,
      quantityUnit: updatedProduct.quantityUnit,
      productCode: updatedProduct.productCode,
      price: updatedProduct.price,
    });
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`
        ? TestDataBuilder.jsonResponse(
            {
              name: updatedProduct.name,
              classification: null,
              quantity: updatedProduct.quantity,
              quantityUnit: updatedProduct.quantityUnit,
              productCode: updatedProduct.productCode,
              price: updatedProduct.price,
              totalPrice: updatedProduct.totalPrice,
              metadata: updatedProduct.metadata,
            },
            {status: 202},
          )
        : new Response("Unexpected request", {status: 500}),
    );

    // Act
    const result = await updateInvoiceProduct({
      invoiceId,
      payload: {originalProductName: "Coffee", updatedProduct},
    });

    // Assert
    expect(result).toMatchObject({success: true, data: {name: "Premium Coffee"}});
    expect(getAnalysisApiRequests()).toContainEqual({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`,
      init: expect.objectContaining({method: "PUT", body: expectedBody}),
    });
  });

  it("rejects invalid input before making a native request", async () => {
    // Act
    const result = await updateInvoiceProduct(null);

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("returns a safe response error for malformed backend JSON", async () => {
    // Arrange
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`
        ? TestDataBuilder.jsonResponse({invalid: true}, {status: 202})
        : new Response("Unexpected request", {status: 500}),
    );

    // Act
    const result = await updateInvoiceProduct({
      invoiceId,
      payload: {originalProductName: "Coffee", updatedProduct: TestDataBuilder.build("product")},
    });

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });
});
