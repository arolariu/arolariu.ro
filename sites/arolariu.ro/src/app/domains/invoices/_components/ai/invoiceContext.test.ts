import {InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import {describe, expect, it} from "vitest";
import {createLocalInvoiceAssistantContext} from "./invoiceContext";

describe("createLocalInvoiceAssistantContext", () => {
  it("redacts user, sharing, scan, and metadata fields from the assistant context", () => {
    const invoice = new InvoiceBuilder()
      .withId("invoice-redacted")
      .withName("Private grocery receipt")
      .withMerchantReference("merchant-123")
      .withSharedWith(["user-shared-1"])
      .withScans([
        {
          location: "https://cdn.arolariu.ro/private-scan.jpg",
          metadata: {rawOcr: {text: "do not expose"}},
          scanType: 1,
        },
      ])
      .withAdditionalMetadata({rawOcr: "do not expose", internalTrace: "hidden"})
      .withPaymentAmount(42)
      .withPaymentCurrency("RON")
      .build();

    const context = createLocalInvoiceAssistantContext({invoices: [invoice]});

    expect(context.invoices).toHaveLength(1);
    expect(context.invoices[0]).toMatchObject({
      currencyCode: "RON",
      invoiceAlias: "invoice-1",
      merchantAlias: "merchant-1",
      name: "Private grocery receipt",
      totalAmount: 42,
    });
    expect(context.promptContext).not.toContain("invoice-redacted");
    expect(context.promptContext).not.toContain("merchant-123");
    expect(JSON.stringify(context)).not.toContain(invoice.userIdentifier);
    expect(JSON.stringify(context)).not.toContain("user-shared-1");
    expect(JSON.stringify(context)).not.toContain("private-scan.jpg");
    expect(JSON.stringify(context)).not.toContain("do not expose");
  });

  it("limits line items and records how many products were omitted", () => {
    const products = [
      new ProductBuilder().withName("Milk").withPrice(10).withQuantity(1).build(),
      new ProductBuilder().withName("Bread").withPrice(5).withQuantity(2).build(),
      new ProductBuilder().withName("Cheese").withPrice(20).withQuantity(1).build(),
    ];
    const invoice = new InvoiceBuilder().withId("invoice-items").withItems(products).build();

    const context = createLocalInvoiceAssistantContext({
      invoices: [invoice],
      limits: {maxInvoices: 10, maxLineItemsPerInvoice: 2},
    });

    expect(context.invoices[0]?.items.map((item) => item.name)).toEqual(["Milk", "Bread"]);
    expect(context.invoices[0]?.omittedItemCount).toBe(1);
  });

  it("computes deterministic local analytics without relying on generated text", () => {
    const firstInvoice = new InvoiceBuilder()
      .withId("invoice-one")
      .withMerchantReference("merchant-a")
      .withPaymentAmount(30)
      .withPaymentCurrency("RON")
      .build();
    const secondInvoice = new InvoiceBuilder()
      .withId("invoice-two")
      .withMerchantReference("merchant-a")
      .withPaymentAmount(70)
      .withPaymentCurrency("RON")
      .build();

    const context = createLocalInvoiceAssistantContext({
      invoices: [firstInvoice, secondInvoice],
    });

    expect(context.analytics.invoiceCount).toBe(2);
    expect(context.analytics.totalSpendByCurrency).toEqual({RON: 100});
    expect(context.analytics.merchantBreakdown).toEqual({
      "merchant-1": {invoiceCount: 2, totalAmountByCurrency: {RON: 100}},
    });
    expect(context.analytics.largestInvoices.map((invoice) => invoice.invoiceAlias)).toEqual(["invoice-2", "invoice-1"]);
    expect(context.promptContext).not.toContain("invoice-one");
    expect(context.promptContext).not.toContain("invoice-two");
    expect(context.promptContext).not.toContain("merchant-a");
  });

  it("groups totals by currency and never cross-sums currencies", () => {
    const ronInvoice = new InvoiceBuilder().withPaymentAmount(100).withPaymentCurrency("RON").build();
    const usdInvoice = new InvoiceBuilder().withPaymentAmount(50).withPaymentCurrency("USD").build();
    const eurInvoice = new InvoiceBuilder().withPaymentAmount(75).withPaymentCurrency("EUR").build();

    const context = createLocalInvoiceAssistantContext({
      invoices: [ronInvoice, usdInvoice, eurInvoice],
    });

    expect(context.analytics.totalSpendByCurrency).toEqual({
      EUR: 75,
      RON: 100,
      USD: 50,
    });
    expect(context.analytics.invoiceCount).toBe(3);

    // Ensure no aggregated "total" field that crosses currencies
    const stringified = JSON.stringify(context.analytics);
    expect(stringified).not.toContain('"totalAmount":225');
    expect(stringified).not.toContain('"totalAmount":150');
    expect(stringified).not.toContain('"totalAmount":175');
  });

  it("merchant breakdown groups totals by currency", () => {
    const merchantA_RON = new InvoiceBuilder()
      .withMerchantReference("merchant-alpha")
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();
    const merchantA_USD = new InvoiceBuilder()
      .withMerchantReference("merchant-alpha")
      .withPaymentAmount(50)
      .withPaymentCurrency("USD")
      .build();

    const context = createLocalInvoiceAssistantContext({
      invoices: [merchantA_RON, merchantA_USD],
    });

    expect(context.analytics.merchantBreakdown).toEqual({
      "merchant-1": {
        invoiceCount: 2,
        totalAmountByCurrency: {
          RON: 100,
          USD: 50,
        },
      },
    });
  });
});
