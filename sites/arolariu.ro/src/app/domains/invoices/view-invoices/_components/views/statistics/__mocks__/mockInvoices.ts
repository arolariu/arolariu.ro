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

const detectedCerealsContainingGluten = buildAllergenAssessment({
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.CerealsContainingGluten,
      evidenceLevel: "explicit",
      confidence: 0.94,
      evidence: [{source: "ingredients", value: "wheat"}],
    },
  ],
});

export const mockInvoices: Invoice[] = [
  createMockInvoice({
    id: "11111111-1111-7111-8111-111111111111",
    name: "Weekly groceries",
    merchantReference: "aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa",
    paymentInformation: {
      transactionDate: new Date("2026-01-15T12:00:00.000Z"),
      paymentType: PaymentType.Card,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      totalCostAmount: 13,
      totalTaxAmount: 2,
      subtotalAmount: 11,
      tipAmount: 0,
    },
    items: [createMockProduct({name: "Milk", quantity: 1, price: 13, totalPrice: 13, allergenAssessment: detectedMilk})],
  }),
  createMockInvoice({
    id: "22222222-2222-7222-8222-222222222222",
    name: "Restaurant meal",
    merchantReference: "bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb",
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
    items: [
      createMockProduct({
        name: "Wholemeal meal",
        quantity: 1,
        price: 45,
        totalPrice: 45,
        allergenAssessment: detectedCerealsContainingGluten,
      }),
    ],
  }),
  createMockInvoice({
    id: "33333333-3333-7333-8333-333333333333",
    name: "Second groceries",
    merchantReference: "cccccccc-cccc-7ccc-8ccc-cccccccccccc",
    paymentInformation: {
      transactionDate: new Date("2026-03-15T12:00:00.000Z"),
      paymentType: PaymentType.Cash,
      currency: {code: "EUR", symbol: "€", name: "Euro"},
      totalCostAmount: 25,
      totalTaxAmount: 4,
      subtotalAmount: 21,
      tipAmount: 0,
    },
    items: [
      createMockProduct({
        name: "Cheese",
        quantity: 1,
        price: 25,
        totalPrice: 25,
        allergenAssessment: buildAllergenAssessment({status: AllergenAssessmentStatus.NoSignals}),
      }),
    ],
  }),
];

export const unassessedInvoices: Invoice[] = [
  createMockInvoice({
    id: "44444444-4444-7444-8444-444444444444",
    name: "Unassessed groceries",
    paymentInformation: {
      transactionDate: new Date("2026-04-15T12:00:00.000Z"),
      paymentType: PaymentType.Card,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
      totalCostAmount: 20,
      totalTaxAmount: 0,
      subtotalAmount: 20,
      tipAmount: 0,
    },
    items: [
      createMockProduct({name: "Unknown item", quantity: 1, price: 10, totalPrice: 10, allergenAssessment: null}),
      createMockProduct({
        name: "Incomplete item",
        quantity: 1,
        price: 10,
        totalPrice: 10,
        allergenAssessment: buildAllergenAssessment({status: AllergenAssessmentStatus.InsufficientData}),
      }),
    ],
  }),
];

export const emptyInvoices: Invoice[] = [];
export const singleInvoice: Invoice[] = [mockInvoices[0] ?? createMockInvoice()];
export const ronOnlyInvoices: Invoice[] = mockInvoices.filter((invoice) => invoice.paymentInformation.currency.code === "RON");
