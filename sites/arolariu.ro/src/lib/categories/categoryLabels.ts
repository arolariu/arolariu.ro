import type {SelectorTranslator} from "next-intl-selector";
import type {InvoiceCategory, MerchantCategory, ProductCategory} from "@/types/invoices/Category";
import {getInvoiceCategory, getMerchantCategory, getProductCategory} from "./categoryCatalog";

/** Returns the localized label for a receipt category or the empty state. */
export function invoiceCategoryLabel(t: SelectorTranslator, category: InvoiceCategory | null): string {
  if (category === null) return t((m) => m.categories.ui.unclassified);
  const {key} = getInvoiceCategory(category);
  return t((m) => m.categories.invoices[key]);
}

/** Returns the localized label for a merchant category or the empty state. */
export function merchantCategoryLabel(t: SelectorTranslator, category: MerchantCategory | null): string {
  if (category === null) return t((m) => m.categories.ui.unclassified);
  const {key} = getMerchantCategory(category);
  return t((m) => m.categories.merchants[key]);
}

/** Returns the localized label for a product category or the empty state. */
export function productCategoryLabel(t: SelectorTranslator, category: ProductCategory | null): string {
  if (category === null) return t((m) => m.categories.ui.unclassified);
  const {key} = getProductCategory(category);
  return t((m) => m.categories.products[key]);
}
