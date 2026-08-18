/**
 * @fileoverview Canonical identity-free product selector construction and validation.
 * @module types/invoices/productSelector
 *
 * @remarks
 * The functions in this module mirror the backend `ProductUpdateSelector`
 * normalization and discriminator precedence. They intentionally preserve no
 * persistent client identity.
 */

import type {Product, ProductUpdateSelector} from "./Product";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isNullableNonNegativeNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isNullableOccurrenceOrdinal(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}

/**
 * Normalizes a product code with the backend's whitespace and ordinal rules.
 *
 * @param productCode - Product code candidate.
 * @returns Empty text for blank candidates; otherwise trimmed invariant-uppercase text.
 */
export function normalizeProductCode(productCode: string | null): string {
  return productCode === null || productCode.trim() === "" ? "" : productCode.trim().toUpperCase();
}

/**
 * Normalizes a product name with the backend's collapsed-whitespace ordinal rules.
 *
 * @param name - Product-name candidate.
 * @returns Empty text for blank candidates; otherwise whitespace-collapsed uppercase text.
 */
export function normalizeProductName(name: string | null): string {
  return name === null ? "" : name.trim().split(/\s+/u).filter(Boolean).join(" ").toUpperCase();
}

function hasProductCode(product: Product): boolean {
  return normalizeProductCode(product.productCode) !== "";
}

function sameSnapshot(left: Product, right: Product): boolean {
  return (
    normalizeProductName(left.name) === normalizeProductName(right.name)
    && left.quantity === right.quantity
    && left.price === right.price
    && left.totalPrice === right.totalPrice
  );
}

/**
 * Builds the exact selector for a product at its immutable collection position.
 *
 * @param products - Persisted invoice products in backend collection order.
 * @param productIndex - Immutable pre-edit collection index.
 * @returns Selector with product-code precedence and a duplicate occurrence when required.
 * @throws Error when the target index does not resolve to a product.
 */
export function createProductSelector(products: readonly Product[], productIndex: number): ProductUpdateSelector {
  const product = products[productIndex];
  if (product === undefined) {
    throw new Error("A product selector requires an existing product.");
  }

  const matchingIndexes = hasProductCode(product)
    ? products
        .map((candidate, index) => ({candidate, index}))
        .filter(({candidate}) => normalizeProductCode(candidate.productCode) === normalizeProductCode(product.productCode))
        .map(({index}) => index)
    : products
        .map((candidate, index) => ({candidate, index}))
        .filter(({candidate}) => sameSnapshot(candidate, product))
        .map(({index}) => index);
  const occurrenceIndex = matchingIndexes.indexOf(productIndex);
  const occurrenceOrdinal = matchingIndexes.length > 1 ? occurrenceIndex : null;

  return hasProductCode(product)
    ? {
        originalProductCode: product.productCode,
        originalName: null,
        originalQuantity: null,
        originalUnitPrice: null,
        originalTotalPrice: null,
        occurrenceOrdinal,
      }
    : {
        originalProductCode: null,
        originalName: product.name,
        originalQuantity: product.quantity,
        originalUnitPrice: product.price,
        originalTotalPrice: product.totalPrice,
        occurrenceOrdinal,
      };
}

/**
 * Builds selectors for every immutable product collection position.
 *
 * @param products - Persisted invoice products in backend collection order.
 * @returns Selector array aligned with the original product collection.
 */
export function createProductSelectors(products: readonly Product[]): readonly ProductUpdateSelector[] {
  return products.map((_product, index) => createProductSelector(products, index));
}

/**
 * Validates the exact two-strategy selector transport accepted by frontend mutations.
 *
 * @param value - Untrusted selector candidate.
 * @returns Whether the candidate uses either a product-code or full snapshot selector.
 */
export function isProductUpdateSelector(value: unknown): value is ProductUpdateSelector {
  if (
    !isRecord(value)
    || !hasExactKeys(value, [
      "originalProductCode",
      "originalName",
      "originalQuantity",
      "originalUnitPrice",
      "originalTotalPrice",
      "occurrenceOrdinal",
    ])
    || (typeof value["originalProductCode"] !== "string" && value["originalProductCode"] !== null)
    || (typeof value["originalName"] !== "string" && value["originalName"] !== null)
    || !isNullableNonNegativeNumber(value["originalQuantity"])
    || !isNullableNonNegativeNumber(value["originalUnitPrice"])
    || !isNullableNonNegativeNumber(value["originalTotalPrice"])
    || !isNullableOccurrenceOrdinal(value["occurrenceOrdinal"])
  ) {
    return false;
  }

  const hasCode = normalizeProductCode(value["originalProductCode"]) !== "";
  const hasSnapshot =
    typeof value["originalName"] === "string"
    && normalizeProductName(value["originalName"]) !== ""
    && value["originalQuantity"] !== null
    && value["originalUnitPrice"] !== null
    && value["originalTotalPrice"] !== null;

  return hasCode
    ? value["originalName"] === null
        && value["originalQuantity"] === null
        && value["originalUnitPrice"] === null
        && value["originalTotalPrice"] === null
    : hasSnapshot;
}
