/**
 * @fileoverview Unit tests for the filter-option deriver helpers.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/filterOptions.test
 */

import {type InvoiceCategory} from "@/types/invoices/Category";
import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import {PaymentType} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {computeAvailableCategories, computeAvailableCurrencies, computeAvailablePaymentTypes} from "./filterOptions";

function makeInvoice(opts: {currency?: string; category?: InvoiceCategory; paymentType?: PaymentType}): Invoice {
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
  if (opts.category !== undefined) {
    invoice.category = opts.category;
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

describe("computeAvailableCategories", () => {
  it("returns an empty list for no invoices", () => {
    expect(computeAvailableCategories([])).toEqual([]);
  });

  it("returns 'unclassified' for invoices with null classification", () => {
    const invoice = new InvoiceBuilder().build(); // category: null by default
    expect(computeAvailableCategories([invoice])).toEqual(["uncategorized"]);
  });

  it("returns a single taxonomy root label for one classified invoice", () => {
    const invoices = [makeInvoice({category: 3001})];
    expect(computeAvailableCategories(invoices)).toEqual([3001]);
  });

  it("dedupes repeated groups", () => {
    const invoices = [makeInvoice({category: 3001}), makeInvoice({category: 3001})];
    expect(computeAvailableCategories(invoices)).toEqual([3001]);
  });

  it("orders by frequency descending", () => {
    const invoices = [
      makeInvoice({category: 3063}),
      makeInvoice({category: 3001}),
      makeInvoice({category: 3001}),
      makeInvoice({category: 3001}),
      makeInvoice({category: 3024}),
      makeInvoice({category: 3024}),
    ];
    expect(computeAvailableCategories(invoices)).toEqual([3001, 3024, 3063]);
  });

  it("breaks ties alphabetically", () => {
    const invoices = [makeInvoice({category: 3063}), makeInvoice({category: 3024}), makeInvoice({category: 3001})];
    expect(computeAvailableCategories(invoices)).toEqual([3001, 3024, 3063]);
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
