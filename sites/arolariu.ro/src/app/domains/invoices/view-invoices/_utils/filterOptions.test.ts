/**
 * @fileoverview Unit tests for the filter-option deriver helpers.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/filterOptions.test
 */

import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import {ClassificationOrigin, ClassificationSystem} from "@/types/invoices";
import {PaymentType} from "@/types/invoices";
import type {StandardClassification} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {computeAvailableClassificationGroups, computeAvailableCurrencies, computeAvailablePaymentTypes} from "./filterOptions";

/** Builds a minimal StandardClassification for test use. */
function makeClassification(rootLabel: string, code = "01"): StandardClassification {
  return {
    system: ClassificationSystem.EcoicopV2,
    version: "2024",
    code,
    officialLabel: `${rootLabel} sub-item`,
    hierarchy: [{level: "division", code, officialLabel: rootLabel}],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

function makeInvoice(opts: {currency?: string; classificationGroup?: string; paymentType?: PaymentType}): Invoice {
  const b = new InvoiceBuilder();
  if (opts.currency !== undefined) {
    b.withPaymentInformation({
      totalCostAmount: 100,
      currency: {code: opts.currency, name: opts.currency, symbol: opts.currency},
      transactionDate: new Date("2024-01-15"),
      paymentType: opts.paymentType ?? PaymentType.Cash,
      totalTaxAmount: 0,
      subtotalAmount: 0,
      tipAmount: 0,
    });
  } else if (opts.paymentType !== undefined) {
    b.withPaymentInformation({
      totalCostAmount: 100,
      currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
      transactionDate: new Date("2024-01-15"),
      paymentType: opts.paymentType,
      totalTaxAmount: 0,
      subtotalAmount: 0,
      tipAmount: 0,
    });
  }
  const invoice = b.build();
  if (opts.classificationGroup !== undefined) {
    invoice.classification = makeClassification(opts.classificationGroup);
  }
  return invoice;
}

describe("computeAvailableCurrencies", () => {
  it("returns an empty list for no invoices", () => {
    expect(computeAvailableCurrencies([])).toEqual([]);
  });

  it("returns a single-item list for one invoice", () => {
    const invoices = [makeInvoice({currency: "EUR"})];
    expect(computeAvailableCurrencies(invoices)).toEqual(["EUR"]);
  });

  it("dedupes repeated currencies", () => {
    const invoices = [makeInvoice({currency: "EUR"}), makeInvoice({currency: "EUR"})];
    expect(computeAvailableCurrencies(invoices)).toEqual(["EUR"]);
  });

  it("orders by frequency descending", () => {
    const invoices = [
      makeInvoice({currency: "USD"}),
      makeInvoice({currency: "RON"}),
      makeInvoice({currency: "RON"}),
      makeInvoice({currency: "RON"}),
      makeInvoice({currency: "EUR"}),
      makeInvoice({currency: "EUR"}),
    ];
    expect(computeAvailableCurrencies(invoices)).toEqual(["RON", "EUR", "USD"]);
  });

  it("breaks ties alphabetically", () => {
    const invoices = [makeInvoice({currency: "USD"}), makeInvoice({currency: "EUR"}), makeInvoice({currency: "GBP"})];
    expect(computeAvailableCurrencies(invoices)).toEqual(["EUR", "GBP", "USD"]);
  });

  it("falls back to RON when currency.code is missing", () => {
    const invoice = makeInvoice({currency: "EUR"});
    const invoiceMissing: Invoice = {
      ...invoice,
      paymentInformation: {...invoice.paymentInformation, currency: {code: "", name: "", symbol: ""}},
    };
    expect(computeAvailableCurrencies([invoiceMissing])).toEqual(["RON"]);
  });
});

describe("computeAvailableClassificationGroups", () => {
  it("returns an empty list for no invoices", () => {
    expect(computeAvailableClassificationGroups([])).toEqual([]);
  });

  it("returns 'unclassified' for invoices with null classification", () => {
    const invoice = new InvoiceBuilder().build(); // classification: null by default
    expect(computeAvailableClassificationGroups([invoice])).toEqual(["unclassified"]);
  });

  it("returns a single taxonomy root label for one classified invoice", () => {
    const invoices = [makeInvoice({classificationGroup: "Food and non-alcoholic beverages"})];
    expect(computeAvailableClassificationGroups(invoices)).toEqual(["Food and non-alcoholic beverages"]);
  });

  it("dedupes repeated groups", () => {
    const invoices = [
      makeInvoice({classificationGroup: "Food and non-alcoholic beverages"}),
      makeInvoice({classificationGroup: "Food and non-alcoholic beverages"}),
    ];
    expect(computeAvailableClassificationGroups(invoices)).toEqual(["Food and non-alcoholic beverages"]);
  });

  it("orders by frequency descending", () => {
    const invoices = [
      makeInvoice({classificationGroup: "Transport"}),
      makeInvoice({classificationGroup: "Food and non-alcoholic beverages"}),
      makeInvoice({classificationGroup: "Food and non-alcoholic beverages"}),
      makeInvoice({classificationGroup: "Food and non-alcoholic beverages"}),
      makeInvoice({classificationGroup: "Housing"}),
      makeInvoice({classificationGroup: "Housing"}),
    ];
    expect(computeAvailableClassificationGroups(invoices)).toEqual(["Food and non-alcoholic beverages", "Housing", "Transport"]);
  });

  it("breaks ties alphabetically", () => {
    const invoices = [
      makeInvoice({classificationGroup: "Transport"}),
      makeInvoice({classificationGroup: "Housing"}),
      makeInvoice({classificationGroup: "Food and non-alcoholic beverages"}),
    ];
    expect(computeAvailableClassificationGroups(invoices)).toEqual(["Food and non-alcoholic beverages", "Housing", "Transport"]);
  });
});

describe("computeAvailablePaymentTypes", () => {
  it("returns an empty list for no invoices", () => {
    expect(computeAvailablePaymentTypes([])).toEqual([]);
  });

  it("dedupes and orders by frequency then ordinal", () => {
    const invoices = [
      makeInvoice({paymentType: PaymentType.Card}),
      makeInvoice({paymentType: PaymentType.Card}),
      makeInvoice({paymentType: PaymentType.Cash}),
      makeInvoice({paymentType: PaymentType.Transfer}),
    ];
    expect(computeAvailablePaymentTypes(invoices)).toEqual([PaymentType.Card, PaymentType.Cash, PaymentType.Transfer]);
  });
});
