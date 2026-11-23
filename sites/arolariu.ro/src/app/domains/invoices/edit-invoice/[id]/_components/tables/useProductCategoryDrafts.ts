"use client";

import {useInvoicesStore} from "@/stores/invoicesStore";
import type {Invoice, Product, ProductCategory} from "@/types/invoices";
import {useRouter} from "next/navigation";
import {type Dispatch, type SetStateAction, useCallback, useMemo, useState} from "react";
import type {ProductCategoryEditorProps} from "./ProductCategoryEditor";

// Local name edits must not turn one row into the write selector for a different persisted row.
const sourceName = Symbol("persistedProductName");
type DraftProduct = Product & Readonly<{[sourceName]?: string}>;

type CategoryDrafts = Readonly<{
  localItems: DraftProduct[];
  setLocalItems: Dispatch<SetStateAction<DraftProduct[]>>;
  categoryEditorProps: (item: DraftProduct) => ProductCategoryEditorProps;
}>;

function countNames(items: readonly Product[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const {name} of items) {
    const key = name.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function reconcileCategories(drafts: DraftProduct[], persisted: readonly Product[]): DraftProduct[] {
  const byName = new Map<string, ProductCategory | null>();
  for (const item of persisted) byName.set(item.name, byName.has(item.name) ? null : item.category);
  const counts = countNames(persisted);
  return drafts.map((item) => {
    const original = item[sourceName];
    if (original === undefined || counts.get(original.toUpperCase()) !== 1) return item;
    const category = byName.get(original);
    return category === undefined || category === item.category ? item : {...item, category};
  });
}

/** Owns the table drafts and applies committed categories without discarding local edits. */
export function useProductCategoryDrafts(invoice: Invoice): CategoryDrafts {
  const router = useRouter();
  const [localItems, setLocalItems] = useState<DraftProduct[]>(() => invoice.items.map((item) => ({...item, [sourceName]: item.name})));
  const [observedItems, setObservedItems] = useState(invoice.items);
  if (observedItems !== invoice.items) {
    setObservedItems(invoice.items);
    setLocalItems((drafts) => reconcileCategories(drafts, invoice.items));
  }
  const persistedNames = useMemo(() => countNames(invoice.items), [invoice.items]);
  const localNames = useMemo(() => countNames(localItems), [localItems]);

  const applySavedCategory = useCallback(
    (product: Product, category: ProductCategory | null): void => {
      const applyCategory = <T extends Product>(item: T): T => ({...item, category, metadata: {...item.metadata, isEdited: true}});
      setLocalItems((items) => items.map((item) => (item[sourceName] === product.name ? applyCategory(item) : item)));
      const store = useInvoicesStore.getState();
      const cached = store.getEntityById(invoice.id);
      if (cached !== undefined && countNames(cached.items).get(product.name.toUpperCase()) === 1) {
        store.updateEntity(invoice.id, {
          items: cached.items.map((item) => (item.name === product.name ? applyCategory(item) : item)),
        });
      }
      router.refresh();
    },
    [invoice.id, router],
  );

  const categoryEditorProps = (item: DraftProduct): ProductCategoryEditorProps => {
    const key = item.name.toUpperCase();
    return {
      invoiceId: invoice.id,
      product: item,
      ambiguous: (persistedNames.get(key) ?? 0) > 1 || (localNames.get(key) ?? 0) > 1,
      editable: item[sourceName] === item.name && invoice.items.some(({name}) => name === item.name),
      onSaved: applySavedCategory,
    };
  };
  return {localItems, setLocalItems, categoryEditorProps};
}
