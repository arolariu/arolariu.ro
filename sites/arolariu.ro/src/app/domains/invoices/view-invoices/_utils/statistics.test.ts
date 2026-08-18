import {AllergenAssessmentStatus, AllergenCode, ClassificationOrigin, ClassificationSystem} from "@/types/invoices";
import {
  buildAllergenAssessment,
  buildClassification,
  buildInvoice,
  buildMerchant,
  buildProduct,
} from "../../../../../../tests/helpers/builders/domain";
import {describe, expect, it} from "vitest";
import {
  computeAllergenFrequency,
  computeAllergenStatistics,
  computeCategoryAggregates,
  computeKPIs,
  computeMerchantNaceAggregates,
  computeProductClassificationSpending,
} from "./statistics";

describe("statistics", () => {
  it("groups invoice spending by the canonical ECOICOP root", () => {
    const division = buildClassification({
      system: ClassificationSystem.EcoicopV2,
      code: "01.1.1",
      officialLabel: "Bread",
      hierarchy: [
        {level: "division", code: "01", officialLabel: "Food and non-alcoholic beverages"},
        {level: "class", code: "01.1.1", officialLabel: "Bread"},
      ],
    });
    const invoices = [
      buildInvoice({classification: division, paymentInformation: {...buildInvoice().paymentInformation, totalCostAmount: 10}}),
      buildInvoice({
        id: "44444444-4444-7444-8444-444444444444",
        classification: division,
        paymentInformation: {...buildInvoice().paymentInformation, totalCostAmount: 15},
      }),
    ];

    expect(computeCategoryAggregates(invoices)).toEqual([
      expect.objectContaining({category: "Food and non-alcoholic beverages", categoryKey: "ECOICOP_V2:01", amount: 25, count: 2}),
    ]);
  });

  it("groups product spending by the canonical GPC segment before its family", () => {
    const gpc = buildClassification({
      system: ClassificationSystem.Gs1Gpc,
      code: "10000234",
      officialLabel: "Milk",
      hierarchy: [
        {level: "segment", code: "10000000", officialLabel: "Food/Beverage/Tobacco"},
        {level: "family", code: "10000200", officialLabel: "Dairy products"},
        {level: "brick", code: "10000234", officialLabel: "Milk"},
      ],
    });
    const invoice = buildInvoice({items: [buildProduct({classification: gpc, totalPrice: 10})]});

    expect(computeProductClassificationSpending([invoice])).toEqual([
      expect.objectContaining({category: "Food/Beverage/Tobacco", categoryKey: "GS1_GPC:10000000", totalSpent: 10}),
    ]);
  });

  it("counts only detected allergen signals and never treats no-signals as safe", () => {
    const detected = buildAllergenAssessment({
      status: AllergenAssessmentStatus.Detected,
      signals: [
        {
          code: AllergenCode.Milk,
          evidenceLevel: "explicit",
          confidence: 0.9,
          evidence: [{source: "ingredients", value: "milk"}],
        },
      ],
    });
    const noSignals = buildAllergenAssessment({status: AllergenAssessmentStatus.NoSignals});
    const invoice = buildInvoice({items: [buildProduct({allergenAssessment: detected}), buildProduct({allergenAssessment: noSignals})]});

    expect(computeAllergenFrequency([invoice])).toEqual([{name: AllergenCode.Milk, description: "milk", productCount: 1, percentage: 50}]);
  });

  it("deduplicates allergen codes per product and exposes assessment coverage", () => {
    const detected = buildAllergenAssessment({
      status: AllergenAssessmentStatus.Detected,
      signals: [
        {
          code: AllergenCode.Milk,
          evidenceLevel: "explicit",
          confidence: 0.9,
          evidence: [{source: "ingredients", value: "milk"}],
        },
        {
          code: AllergenCode.Milk,
          evidenceLevel: "inferred",
          confidence: 0.6,
          evidence: [{source: "name", value: "dairy"}],
        },
      ],
    });
    const invoice = buildInvoice({
      items: [
        buildProduct({allergenAssessment: detected}),
        buildProduct({allergenAssessment: buildAllergenAssessment({status: AllergenAssessmentStatus.NoSignals})}),
        buildProduct({allergenAssessment: buildAllergenAssessment({status: AllergenAssessmentStatus.InsufficientData})}),
        buildProduct({allergenAssessment: null}),
      ],
    });

    expect(computeAllergenStatistics([invoice])).toEqual({
      frequencies: [{name: AllergenCode.Milk, description: "milk", productCount: 1, percentage: 50}],
      assessedProductCount: 2,
      insufficientDataProductCount: 1,
      unassessedProductCount: 1,
      totalProductCount: 4,
    });
  });

  it("groups merchant spending by canonical NACE section with stable keys", () => {
    const nace = buildClassification({
      system: ClassificationSystem.Nace21,
      version: "2.1",
      code: "47.11",
      officialLabel: "Non-specialised retail sale of predominately food, beverages or tobacco",
      hierarchy: [
        {level: "section", code: "G", officialLabel: "WHOLESALE AND RETAIL TRADE"},
        {level: "division", code: "47", officialLabel: "Retail trade"},
        {level: "class", code: "47.11", officialLabel: "Non-specialised retail sale of predominately food, beverages or tobacco"},
      ],
      origin: ClassificationOrigin.Manual,
      confidence: null,
    });
    const merchant = buildMerchant({id: "merchant-1", classification: nace});
    const invoices = [
      buildInvoice({
        merchantReference: merchant.id,
        paymentInformation: {...buildInvoice().paymentInformation, totalCostAmount: 12},
      }),
      buildInvoice({
        id: "44444444-4444-7444-8444-444444444444",
        merchantReference: merchant.id,
        paymentInformation: {...buildInvoice().paymentInformation, totalCostAmount: 8},
      }),
    ];

    expect(computeMerchantNaceAggregates(invoices, [merchant])).toEqual([
      {
        naceKey: "NACE_2_1:G",
        sectionCode: "G",
        sectionLabel: "WHOLESALE AND RETAIL TRADE",
        totalSpend: 20,
        invoiceCount: 2,
        merchantCount: 1,
      },
    ]);
  });

  it("keeps empty statistics safe", () => {
    expect(computeKPIs([])).toMatchObject({invoiceCount: 0, totalSpending: 0});
    expect(computeProductClassificationSpending([])).toEqual([]);
  });
});
