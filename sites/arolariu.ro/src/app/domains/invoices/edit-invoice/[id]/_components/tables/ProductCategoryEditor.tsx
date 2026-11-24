"use client";

import {updateInvoiceProduct} from "@/app/domains/invoices/_actions/invoices/products";
import CategoryPicker from "@/app/domains/invoices/_components/category/CategoryPicker";
import {productCategoryLabel} from "@/app/domains/invoices/_utils/labelUtilities";
import {notify} from "@/lib/notify";
import type {Product, ProductCategory} from "@/types/invoices";
import {Button} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useRef, useState} from "react";

/** The current row and its eligibility to edit a persisted category. */
export type ProductCategoryEditorProps = Readonly<{
  invoiceId: string;
  product: Product;
  ambiguous: boolean;
  editable: boolean;
  onSaved: (product: Product, category: ProductCategory | null) => void;
}>;

/** Edits the category of an unambiguously named persisted item. */
export default function ProductCategoryEditor({
  invoiceId,
  product,
  ambiguous,
  editable,
  onSaved,
}: ProductCategoryEditorProps): React.JSX.Element {
  const t = useTranslations();
  const [draft, setDraft] = useState<ProductCategory | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  const value = draft === undefined ? product.category : draft;
  const canEdit = editable && !ambiguous && !product.metadata.isSoftDeleted;

  const startEditing = useCallback(() => setEditing(true), []);
  const finishSaving = useCallback(() => {
    saveInFlightRef.current = false;
    setSaving(false);
  }, []);
  const save = useCallback(async (): Promise<void> => {
    if (saveInFlightRef.current || !canEdit || value === product.category) return;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const result = await updateInvoiceProduct({
        invoiceId,
        payload: {originalProductName: product.name, updatedProduct: {category: value}},
      });
      if (!result.success) {
        notify.error(result.error.status === 409 ? t((m) => m.categories.ui.conflict) : t((m) => m.categories.ui.failed));
        return;
      }
      onSaved(product, result.data.category);
      setDraft(undefined);
      setEditing(false);
      notify.success(t((m) => m.categories.ui.saved));
    } catch {
      notify.error(t((m) => m.categories.ui.failed));
    } finally {
      finishSaving();
    }
  }, [canEdit, finishSaving, invoiceId, onSaved, product, t, value]);

  if (!canEdit) {
    return (
      <>
        <span>{productCategoryLabel(t, product.category)}</span>
        {ambiguous ? <small>{t((m) => m.categories.ui.duplicate)}</small> : null}
      </>
    );
  }
  if (!editing) {
    return (
      <Button
        type='button'
        variant='ghost'
        onClick={startEditing}
        aria-label={`${t((m) => m.categories.ui.product)}: ${product.name}`}>
        {productCategoryLabel(t, product.category)}
      </Button>
    );
  }
  return (
    <>
      <CategoryPicker
        domain='products'
        label={`${t((m) => m.categories.ui.product)}: ${product.name}`}
        value={value}
        onValueChange={setDraft}
        disabled={saving}
      />
      <Button
        type='button'
        variant='outline'
        disabled={saving || value === product.category}
        onClick={save}>
        {t((m) => m.categories.ui.save)}
      </Button>
    </>
  );
}
