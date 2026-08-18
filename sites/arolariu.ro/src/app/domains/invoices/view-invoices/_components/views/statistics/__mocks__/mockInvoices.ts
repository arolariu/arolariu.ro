/**
 * @fileoverview Complete, DTO-aligned fixtures for statistics stories.
 * @module app/domains/invoices/view-invoices/components/views/statistics/mocks
 */

import {AllergenAssessmentStatus, AllergenCode, ClassificationSystem, PaymentType, type Invoice, type Product} from "@/types/invoices";
import {
  buildAllergenAssessment,
  buildClassification,
  buildInvoice,
  buildProduct,
} from "../../../../../../../../../tests/helpers/builders/domain";

const foodClassification = buildClassification({
  system: ClassificationSystem.EcoicopV2,
  code: "01.1.1",
  officialLabel: "Food",
  hierarchy: [
    {level: "division", code: "01", officialLabel: "Food and non-alcoholic beverages"},
    {level: "class", code: "01.1.1", officialLabel: "Food"},
  ],
});

const diningClassification = buildClassification({
  system: ClassificationSystem.EcoicopV2,
  code: "11.1.1",
  officialLabel: "Restaurants",
  hierarchy: [
    {level: "division", code: "11", officialLabel: "Restaurants and accommodation services"},
    {level: "class", code: "11.1.1", officialLabel: "Restaurants"},
  ],
});

const milkClassification = buildClassification({
  system: ClassificationSystem.Gs1Gpc,
  code: "10000234",
  officialLabel: "Milk",
  hierarchy: [
    {level: "segment", code: "10000000", officialLabel: "Food/Beverage/Tobacco"},
    {level: "family", code: "10000200", officialLabel: "Dairy products"},
    {level: "brick", code: "10000234", officialLabel: "Milk"},
  ],
});

/** Creates a complete invoice fixture with a deterministic payment record. */
export function createMockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return buildInvoice({
    paymentInformation: {
      transactionDate: new Date("2026-01-15T12:00:00.000Z"),
      paymentType: PaymentType.Card,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      totalCostAmount: 100,
      totalTaxAmount: 19,
      subtotalAmount: 81,
      tipAmount: 0,
    },
    classification: foodClassification,
    ...overrides,
  });
}

/** Creates a complete product fixture with structured GPC and allergen data. */
export function createMockProduct(overrides: Partial<Product> = {}): Product {
  return buildProduct({classification: milkClassification, ...overrides});
}

export const MOCK_MERCHANTS = {
  LIDL: "merchant-lidl-001",
  KAUFLAND: "merchant-kaufland-001",
  MCDONALD: "merchant-mcdonald-001",
} as const;

const detectedMilk = buildAllergenAssessment({
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.Milk,
      evidenceLevel: "explicit",
      confidence: 0.95,
      evidence: [{source: "ingredients", value: "milk"}],
    },
  ],
});

export const mockInvoices: Invoice[] = [
  createMockInvoice({
    id: "invoice-001",
    name: "Weekly groceries",
    merchantReference: MOCK_MERCHANTS.LIDL,
    items: [createMockProduct({name: "Milk", totalPrice: 13, allergenAssessment: detectedMilk})],
  }),
  createMockInvoice({
    id: "invoice-002",
    name: "Restaurant meal",
    merchantReference: MOCK_MERCHANTS.MCDONALD,
    classification: diningClassification,
    paymentInformation: {
      transactionDate: new Date("2026-02-15T12:00:00.000Z"),
      paymentType: PaymentType.Card,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      totalCostAmount: 45,
      totalTaxAmount: 8,
      subtotalAmount: 37,
      tipAmount: 0,
    },
    items: [createMockProduct({name: "Meal", totalPrice: 45, allergenAssessment: null})],
  }),
  createMockInvoice({
    id: "invoice-003",
    name: "Second groceries",
    merchantReference: MOCK_MERCHANTS.KAUFLAND,
    paymentInformation: {
      transactionDate: new Date("2026-03-15T12:00:00.000Z"),
      paymentType: PaymentType.Cash,
      currency: {code: "EUR", symbol: "€", name: "Euro"},
      totalCostAmount: 25,
      totalTaxAmount: 4,
      subtotalAmount: 21,
      tipAmount: 0,
    },
    items: [createMockProduct({name: "Cheese", totalPrice: 25, allergenAssessment: detectedMilk})],
  }),
];

export const emptyInvoices: Invoice[] = [];
export const singleInvoice: Invoice[] = [mockInvoices[0] ?? createMockInvoice()];
export const ronOnlyInvoices: Invoice[] = mockInvoices.filter((invoice) => invoice.paymentInformation.currency.code === "RON");
