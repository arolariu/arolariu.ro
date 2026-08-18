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
    expect(generateRandomInvoices(2)).toHaveLength(2);
  });
});
