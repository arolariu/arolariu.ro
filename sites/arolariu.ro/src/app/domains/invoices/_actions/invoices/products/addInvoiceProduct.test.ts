import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ClassificationSystem, type ProductMutation} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {addInvoiceProduct} from "./addInvoiceProduct";

const invoiceId = "11111111-1111-4111-8111-111111111111";
const product: ProductMutation = {
  name: "Coffee",
  classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"},
  quantity: 2,
  quantityUnit: "pcs",
  productCode: "",
  price: 5,
};

describe("addInvoiceProduct", () => {
  it("validates and posts only client-editable product fields", async () => {
    installAnalysisFetchHandler(() =>
      Response.json(
        {
          ...product,
          classification: null,
          totalPrice: 10,
          allergenAssessment: null,
          metadata: {isEdited: true, isComplete: true, isSoftDeleted: false, confidence: 1},
        },
        {status: 201},
      ),
    );

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result).toMatchObject({success: true, data: {name: "Coffee"}});
    expect(getAnalysisApiRequests()).toContainEqual(
      expect.objectContaining({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/products`,
        init: expect.objectContaining({method: "POST", body: JSON.stringify(product)}),
      }),
    );
  });

  it("rejects server-owned product fields before native fetch", async () => {
    const result = await addInvoiceProduct({
      invoiceId,
      product: {...product, metadata: {isEdited: true}},
    });

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("rejects a negative product response before it can reach client state", async () => {
    installAnalysisFetchHandler(() =>
      Response.json(
        {
          ...product,
          classification: null,
          totalPrice: -10,
          allergenAssessment: null,
          metadata: {isEdited: true, isComplete: true, isSoftDeleted: false, confidence: 1},
        },
        {status: 201},
      ),
    );

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The product response was invalid. Please try again."},
    });
  });
});
