import {describe, expect, it} from "vitest";
import {InvoiceCategory, MerchantCategory, ProductCategory} from "@/types/invoices/Category";
import {
  getProductCategory,
  invoiceCategories,
  isFoodProductCategory,
  isInvoiceCategory,
  isMerchantCategory,
  isProductCategory,
  merchantCategories,
  productCategories,
} from "./categoryCatalog";

describe("local invoice domain catalogs", () => {
  it("offers every product, merchant, and invoice enum entry", () => {
    expect(productCategories.map(({id}) => id).toSorted()).toEqual(Object.values(ProductCategory).toSorted());
    expect(merchantCategories.map(({id}) => id).toSorted()).toEqual(Object.values(MerchantCategory).toSorted());
    expect(invoiceCategories.map(({id}) => id).toSorted()).toEqual(Object.values(InvoiceCategory).toSorted());
    expect(getProductCategory(ProductCategory.FreshFruit).key).toBe("freshFruit");
  });

  it("does not accept other domains or coerce an invalid category", () => {
    expect(isProductCategory(1001)).toBe(true);
    expect(isProductCategory(2001)).toBe(false);
    expect(isMerchantCategory(3001)).toBe(false);
    expect(isInvoiceCategory(1001)).toBe(false);
    expect(isProductCategory("1001")).toBe(false);
    expect(isProductCategory(1001.5)).toBe(false);
    expect(isProductCategory(0)).toBe(false);
  });

  it("uses explicit food eligibility, not category assignment alone", () => {
    expect(isFoodProductCategory(ProductCategory.FreshFruit)).toBe(true);
    expect(isFoodProductCategory(ProductCategory.PetFood)).toBe(false);
    expect(isFoodProductCategory(ProductCategory.Other)).toBe(false);
    expect(isFoodProductCategory(null)).toBe(false);
  });
});
