import {ClassificationSystem} from "@/types/invoices";
import {buildClassification, buildInvoice, buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {describe, expect, it} from "vitest";
import {getCategoryComparison, getUnitPriceAnalysis} from "./analytics";

describe("invoice analytics", () => {
  it("compares product spending by canonical GPC classification labels", () => {
    const milk = buildClassification({system: ClassificationSystem.Gs1Gpc, code: "10000234", officialLabel: "Milk"});
    const current = buildInvoice({items: [buildProduct({classification: milk, totalPrice: 20})]});
    const historical = buildInvoice({
      id: "44444444-4444-7444-8444-444444444444",
      items: [buildProduct({classification: milk, totalPrice: 10})],
    });

    expect(getCategoryComparison(current, [current, historical])).toEqual([{category: "Milk (10000234)", current: 20, average: 10}]);
  });

  it("calculates product unit prices without inferring a numeric classification", () => {
    expect(getUnitPriceAnalysis([buildProduct({quantity: 2, totalPrice: 8, quantityUnit: "pcs"})])).toEqual([
      expect.objectContaining({unitPrice: 4, unit: "pcs"}),
    ]);
  });
});
