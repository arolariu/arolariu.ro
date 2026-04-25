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
      id: "invoice-redacted",
      merchantReference: "merchant-123",
      name: "Private grocery receipt",
      totalAmount: 42,
    });
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
    expect(context.analytics.merchantReferenceBreakdown).toEqual({
      "merchant-a": {invoiceCount: 2, totalAmountByCurrency: {RON: 100}},
    });
    expect(context.analytics.largestInvoices.map((invoice) => invoice.id)).toEqual(["invoice-two", "invoice-one"]);
  });
});
