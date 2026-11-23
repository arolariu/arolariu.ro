/**
 * @fileoverview Unit tests for invoice domain label utilities.
 * @module app/domains/invoices/_utils/labelUtilities/tests
 */

import {
  getProductCategory,
  invoiceCategories,
  isInvoiceCategory,
  isMerchantCategory,
  isProductCategory,
  merchantCategories,
  productCategories,
} from "@/lib/categories/categoryCatalog";
import {InvoiceCategory, MerchantCategory, ProductCategory} from "@/types/invoices/Category";
import {PaymentType} from "@/types/invoices/Payment";
import {createTranslator} from "next-intl-selector";
import {describe, expect, it} from "vitest";
import english from "../../../../../messages/en.json";
import french from "../../../../../messages/fr.json";
import romanian from "../../../../../messages/ro.json";
import {getPaymentTypeLabel, invoiceCategoryLabel, merchantCategoryLabel, productCategoryLabel} from "./labelUtilities";

describe("invoice label utilities", () => {
  describe("getPaymentTypeLabel", () => {
    it("returns payment type labels", () => {
      expect(getPaymentTypeLabel(PaymentType.Unknown)).toBe("Unknown");
      expect(getPaymentTypeLabel(PaymentType.Cash)).toBe("Cash");
      expect(getPaymentTypeLabel(PaymentType.Card)).toBe("Card");
      expect(getPaymentTypeLabel(PaymentType.Transfer)).toBe("Transfer");
      expect(getPaymentTypeLabel(PaymentType.MobilePayment)).toBe("Mobile Payment");
      expect(getPaymentTypeLabel(PaymentType.Voucher)).toBe("Voucher");
      expect(getPaymentTypeLabel(PaymentType.Other)).toBe("Other");
    });

    it("returns Unknown for unsupported payment types", () => {
      expect(getPaymentTypeLabel(42)).toBe("Unknown");
    });
  });

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

    it("retains each product's declared recipe eligibility", () => {
      expect(getProductCategory(ProductCategory.FreshFruit).isFood).toBe(true);
      expect(getProductCategory(ProductCategory.PetFood).isFood).toBe(false);
      expect(getProductCategory(ProductCategory.Other).isFood).toBe(false);
    });
  });

  describe("category labels", () => {
    it.each([undefined, 9999, "3001"])("renders cached category value %s as uncategorized", (category) => {
      const t = createTranslator({locale: "en", messages: {categories: english.categories}});
      const uncategorized = english.categories.ui.unclassified;
      expect(invoiceCategoryLabel(t, category)).toBe(uncategorized);
      expect(merchantCategoryLabel(t, category)).toBe(uncategorized);
      expect(productCategoryLabel(t, category)).toBe(uncategorized);
      expect(invoiceCategoryLabel(t, MerchantCategory.Supermarket)).toBe(uncategorized);
    });

    it.each([
      ["en", english],
      ["ro", romanian],
      ["fr", french],
    ] as const)("contains a translated label for every selectable category in %s", (locale, dictionary) => {
      const {categories} = dictionary;
      for (const [labels, entries] of [
        [categories.products, productCategories],
        [categories.merchants, merchantCategories],
        [categories.invoices, invoiceCategories],
      ] as const) {
        expect(Object.keys(labels).toSorted()).toEqual(entries.map(({key}) => key).toSorted());
        expect(Object.values(labels).every((label) => label.trim() !== "")).toBe(true);
      }

      const t = createTranslator({locale, messages: {categories}});
      expect(invoiceCategoryLabel(t, InvoiceCategory.RailTravel)).toBe(categories.invoices.railTravel);
      expect(merchantCategoryLabel(t, MerchantCategory.Supermarket)).toBe(categories.merchants.supermarket);
      expect(productCategoryLabel(t, ProductCategory.Milk)).toBe(categories.products.milk);
    });
  });
});
