import {ClassificationSystem} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {InvoiceBuilder, generateRandomInvoices} from "./invoice";
import {ProductBuilder} from "./product";

describe("InvoiceBuilder", () => {
  it("builds a complete ECOICOP-aligned invoice DTO", () => {
    const invoice = new InvoiceBuilder().withItems([new ProductBuilder().build()]).withRandomRecipes().build();

    expect(invoice.classification?.system).toBe(ClassificationSystem.EcoicopV2);
    expect(invoice.items).toHaveLength(1);
    expect(invoice.possibleRecipes[0]?.steps).toHaveLength(1);
  });

  it("builds complete independent invoices", () => {
    const invoices = generateRandomInvoices(2);

    expect(invoices).toHaveLength(2);
    expect(invoices).toEqual(generateRandomInvoices(2));
    expect(invoices.map((invoice) => invoice.id)).toEqual(["11111111-1111-7111-8111-000000000001", "11111111-1111-7111-8111-000000000002"]);
  });

  it("keeps fixture payment totals consistent with deterministic products", () => {
    const invoice = new InvoiceBuilder().withRandomItems(3).build();

    expect(invoice.paymentInformation.totalCostAmount).toBe(invoice.items.reduce((total, item) => total + item.totalPrice, 0));
    expect(invoice.paymentInformation.subtotalAmount).toBe(invoice.paymentInformation.totalCostAmount);
  });
});
