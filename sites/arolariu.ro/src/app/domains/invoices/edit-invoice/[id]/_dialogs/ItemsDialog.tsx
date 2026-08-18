"use client";

/**
 * @fileoverview Deterministic editor for identity-free invoice products.
 * @module domains/invoices/edit-invoice/[id]/dialogs/ItemsDialog
 */

import {ClassificationPicker} from "@/app/domains/invoices/_components/analysis/ClassificationPicker";
import {addInvoiceProduct, updateInvoiceProduct} from "@/app/domains/invoices/_actions/invoices";
import {
  ClassificationSystem,
  toClassificationSelection,
  type ClassificationSelection,
  type Product,
  type ProductMutation,
  type ProductUpdateSelector,
} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useMemo, useState} from "react";
import {TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./ItemsDialog.module.scss";

interface EditableProduct {
  readonly mutation: ProductMutation;
  readonly selector: ProductUpdateSelector | null;
  readonly classificationDirty: boolean;
}

function selectorKey(product: Product): string {
  return `${product.name}\u0000${product.quantity}\u0000${product.price}\u0000${product.totalPrice}`;
}

/**
 * Creates immutable product selectors while preserving duplicate occurrence
 * ordinal in the backend's invoice collection order.
 */
export function createProductSelectors(products: readonly Product[]): readonly ProductUpdateSelector[] {
  const occurrences = new Map<string, number>();
  return products.map((product) => {
    const key = selectorKey(product);
    const occurrenceOrdinal = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrenceOrdinal + 1);
    return {
      originalProductCode: product.productCode.trim() === "" ? null : product.productCode,
      originalName: product.name,
      originalQuantity: product.quantity,
      originalUnitPrice: product.price,
      originalTotalPrice: product.totalPrice,
      occurrenceOrdinal: product.productCode.trim() === "" ? occurrenceOrdinal : null,
    };
  });
}

function toMutation(product: Product): ProductMutation {
  return {
    name: product.name,
    classification: toClassificationSelection(product.classification),
    quantity: product.quantity,
    quantityUnit: product.quantityUnit,
    productCode: product.productCode,
    price: product.price,
  };
}

function isMutationDirty(original: Product, edited: EditableProduct): boolean {
  const originalSelection = toClassificationSelection(original.classification);
  const selected = edited.mutation.classification;
  return (
    original.name !== edited.mutation.name
    || original.quantity !== edited.mutation.quantity
    || original.quantityUnit !== edited.mutation.quantityUnit
    || original.productCode !== edited.mutation.productCode
    || original.price !== edited.mutation.price
    || originalSelection?.system !== selected?.system
    || originalSelection?.code !== selected?.code
  );
}

/**
 * Edits commercial product fields. Unchanged analysis classifications are
 * never sent as manual updates; only picker changes cause a classification
 * selection to be included in a product update.
 */
export default function ItemsDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__ITEMS");
  const invoice = payload;
  const initialItems = useMemo(() => {
    const selectors = createProductSelectors(invoice.items);
    return invoice.items.map((product, index) => ({
      mutation: toMutation(product),
      selector: selectors[index] ?? null,
      classificationDirty: false,
    }));
  }, [invoice.items]);
  const [items, setItems] = useState<readonly EditableProduct[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  const updateItem = useCallback((index: number, mutation: ProductMutation, classificationDirty = false) => {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index ? {...item, mutation, classificationDirty: item.classificationDirty || classificationDirty} : item,
      ),
    );
  }, []);

  const handleValueChange = useCallback(
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const item = items[index];
      if (item === undefined) return;
      const value = event.target.value;
      const mutation =
        event.target.name === "name"
          ? {...item.mutation, name: value}
          : event.target.name === "quantity"
            ? {...item.mutation, quantity: Number(value)}
            : event.target.name === "quantityUnit"
              ? {...item.mutation, quantityUnit: value}
              : event.target.name === "productCode"
                ? {...item.mutation, productCode: value}
                : {...item.mutation, price: Number(value)};
      updateItem(index, mutation);
    },
    [items, updateItem],
  );

  const handleClassification = useCallback(
    (index: number) => (classification: ClassificationSelection | null) => {
      const item = items[index];
      if (item === undefined || classification === null) return;
      updateItem(index, {...item.mutation, classification}, true);
    },
    [items, updateItem],
  );

  const handleAdd = useCallback(() => {
    setItems((previous) => [
      ...previous,
      {
        mutation: {name: "", classification: null, quantity: 1, quantityUnit: "", productCode: "", price: 0},
        selector: null,
        classificationDirty: false,
      },
    ]);
  }, []);

  const handleRemove = useCallback((index: number) => {
    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      for (const [index, item] of items.entries()) {
        if (item.mutation.name.trim() === "" || item.mutation.quantity <= 0) {
          throw new Error("Invalid item");
        }

        if (item.selector === null) {
          const result = await addInvoiceProduct({invoiceId: invoice.id, product: item.mutation});
          if (!result.success) throw new Error("Product creation failed");
          continue;
        }

        const original = invoice.items[index];
        if (original !== undefined && !isMutationDirty(original, item)) continue;
        const result = await updateInvoiceProduct({
          invoiceId: invoice.id,
          payload: {
            selector: item.selector,
            updatedProduct: {
              ...item.mutation,
              classification: item.classificationDirty ? item.mutation.classification : null,
            },
          },
        });
        if (!result.success) throw new Error("Product update failed");
      }

      close();
      router.refresh();
    } catch {
      toast.error(t(selectorFromPath("dialogs.invoices.itemsDialog.errors.saveFailed")));
    } finally {
      setIsSaving(false);
    }
  }, [close, invoice.id, invoice.items, items, router, t]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.itemsDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.itemsDialog.description)}</DialogDescription>
        </DialogHeader>
        <div className={styles["body"]}>
          <Table className={styles["table"]}>
            <TableHeader>
              <TableRow>
                <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.item)}</TableHead>
                <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.classification)}</TableHead>
                <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.quantity)}</TableHead>
                <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.price)}</TableHead>
                <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.actions)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={item.selector === null ? `new-${index}` : `${item.selector.originalName}-${item.selector.occurrenceOrdinal}`}>
                  <TableCell>
                    <Input
                      name='name'
                      value={item.mutation.name}
                      onChange={handleValueChange(index)}
                    />
                  </TableCell>
                  <TableCell>
                    <ClassificationPicker
                      system={ClassificationSystem.Gs1Gpc}
                      value={item.mutation.classification}
                      onChange={handleClassification(index)}
                      disabled={isSaving}
                      allowClear={item.selector === null}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      name='quantity'
                      type='number'
                      value={item.mutation.quantity}
                      onChange={handleValueChange(index)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      name='price'
                      type='number'
                      value={item.mutation.price}
                      onChange={handleValueChange(index)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => handleRemove(index)}
                      aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.deleteItem, {name: item.mutation.name})}>
                      <TbTrash />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button
            type='button'
            variant='outline'
            onClick={handleAdd}>
            <TbPlus />
            {t((m) => m.dialogs.invoices.itemsDialog.buttons.addItem)}
          </Button>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            {t((m) => m.dialogs.invoices.itemsDialog.buttons.cancel)}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}>
            {t((m) => m.dialogs.invoices.itemsDialog.buttons.saveChanges)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
