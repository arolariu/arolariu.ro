"use client";

/**
 * @fileoverview Dialog for bulk GS1 GPC classification reassignment of products.
 * @module domains/invoices/edit-invoice/[id]/components/dialogs/BulkCategoryDialog
 *
 * @remarks
 * Provides UI for changing the GS1 GPC classification of multiple products at once.
 */

import {
  ClassificationSystem,
  createProductSelector,
  type ClassificationSelection,
  type Product,
  type ProductUpdateSelector,
} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbTag} from "react-icons/tb";
import {updateInvoiceProduct} from "../../../_actions/invoices";
import {useDialog} from "../../../_contexts/DialogContext";
import {ClassificationPicker} from "../../../_components/analysis/ClassificationPicker";
import styles from "./BulkCategoryDialog.module.scss";

/** Builds the deterministic duplicate-safe selector for a persisted product line. */
export function createSelector(invoiceItems: readonly Product[], productIndex: number): ProductUpdateSelector {
  return createProductSelector(invoiceItems, productIndex);
}

/**
 * Dialog for bulk GS1 GPC classification reassignment of products.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Why Client Component?**
 * - Interactive select dropdown with state management
 * - Toast notifications for user feedback
 * - Dialog open/close state management
 *
 * **Features**:
 * - **Classification Selection**: Server-backed GS1 GPC combobox
 * - **Preview**: Shows count of products to be updated
 * - **Progress Tracking**: Shows "Updating X/Y products..." during save
 * - **Batch Update**: Updates all selected products via individual updateProduct calls
 * - **Error Summary**: Collects and reports errors for failed updates
 * - **Save**: Persists changes via updateProduct server action
 *
 * **Data Flow**:
 * 1. User selects multiple products in ItemsTable
 * 2. User clicks "Change Category" button
 * 3. Dialog receives selected products and invoice via payload
 * 4. User selects or clears the new GS1 GPC classification
 * 5. On save, calls updateProduct for each selected product sequentially
 * 6. Progress indicator shows "Updating X/Y products..."
 * 7. Success → page reload to show fresh data
 *
 * **Validation**:
 * - At least one product must be selected
 * - A classification choice (including clear) must be made before saving
 *
 * @returns Client-rendered dialog with category selection UI
 *
 * @example
 * ```tsx
 * // Opened via ItemsTable bulk actions:
 * const {open} = useDialog("EDIT_INVOICE__BULK_CATEGORY", "edit", {
 *   invoice,
 *   selectedProducts: [product1, product2],
 *   selectedIndices: [0, 2]
 * });
 * <Button onClick={open}>Change Category</Button>
 * ```
 *
 * @see {@link useDialog} - Dialog state management hook
 * @see {@link updateProduct} - Server action for persisting changes
 * @see {@link StandardClassification} - Canonical product classification
 */
export default function BulkCategoryDialog(): React.JSX.Element | null {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__BULK_CATEGORY");

  const {invoice, selectedProducts, selectedIndices} = payload;

  const [selectedClassification, setSelectedClassification] = useState<ClassificationSelection | null>(null);
  const [hasClassificationChoice, setHasClassificationChoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{current: number; total: number} | null>(null);

  /**
   * Saves category changes via updateProduct for each selected product.
   */
  const handleSave = useCallback(async () => {
    if (!invoice || !selectedProducts || !selectedIndices || !hasClassificationChoice) {
      toast.error(t((m) => m.dialogs.invoices.bulkCategoryDialog.errors.missingData));
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error(t((m) => m.dialogs.invoices.bulkCategoryDialog.errors.noProducts));
      return;
    }

    setIsSaving(true);
    setUpdateProgress({current: 0, total: selectedProducts.length});

    let successCount = 0;
    let failureCount = 0;

    try {
      const originalIndexes = [...selectedIndices].sort((left, right) => right - left);
      // Mutate later collection rows first so duplicate occurrence ordinals
      // remain valid for each earlier stable selector.
      for (let i = 0; i < originalIndexes.length; i++) {
        const productIndex = originalIndexes[i];
        if (productIndex === undefined) {
          failureCount++;
          continue;
        }

        const product = invoice.items[productIndex];
        if (product) {
          setUpdateProgress({current: i + 1, total: originalIndexes.length});

          try {
            const result = await updateInvoiceProduct({
              invoiceId: invoice.id,
              payload: {
                selector: createSelector(invoice.items, productIndex),
                updatedProduct: {
                  name: product.name,
                  classification: selectedClassification,
                  quantity: product.quantity,
                  quantityUnit: product.quantityUnit,
                  productCode: product.productCode,
                  price: product.price,
                },
              },
            });

            if (result.success) {
              successCount++;
            } else {
              failureCount++;
            }
          } catch {
            failureCount++;
          }
        }
      }

      // Show summary toast
      if (failureCount === 0) {
        toast.success(t((m) => m.dialogs.invoices.bulkCategoryDialog.success.saved, {count: successCount}));
        close();
        router.refresh();
      } else if (successCount > 0) {
        toast.warning(
          t((m) => m.dialogs.invoices.bulkCategoryDialog.success.partialSuccess, {
            success: String(successCount),
            failed: String(failureCount),
          }),
        );
      } else {
        toast.error(t((m) => m.dialogs.invoices.bulkCategoryDialog.errors.allFailed));
      }
    } catch {
      toast.error(t((m) => m.dialogs.invoices.bulkCategoryDialog.errors.saveFailed));
    } finally {
      setIsSaving(false);
      setUpdateProgress(null);
    }
  }, [hasClassificationChoice, invoice, selectedClassification, selectedProducts, selectedIndices, close, router, t]);

  if (!invoice || selectedProducts.length === 0 || selectedIndices.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.bulkCategoryDialog.title)}</DialogTitle>
          <DialogDescription>
            {t((m) => m.dialogs.invoices.bulkCategoryDialog.description, {count: selectedProducts.length})}
          </DialogDescription>
        </DialogHeader>

        <div className={styles["content"]}>
          {/* Selected Products Preview */}
          <div className={styles["section"]}>
            <div className={styles["sectionLabel"]}>{t((m) => m.dialogs.invoices.bulkCategoryDialog.labels.selectedProducts)}</div>
            <div className={styles["productList"]}>
              {selectedProducts.slice(0, 5).map((product) => (
                <div
                  key={product.name}
                  className={styles["productItem"]}>
                  <span className={styles["productName"]}>{product.name}</span>
                </div>
              ))}
              {selectedProducts.length > 5 && (
                <div className={styles["moreText"]}>
                  {t((m) => m.dialogs.invoices.bulkCategoryDialog.labels.andMore, {count: String(selectedProducts.length - 5)})}
                </div>
              )}
            </div>
          </div>

          {/* GS1 GPC classification selection */}
          <div className={styles["section"]}>
            <div className={styles["sectionLabel"]}>
              <TbTag className={styles["labelIcon"]} />
              {t((m) => m.dialogs.invoices.bulkCategoryDialog.labels.newCategory)}
            </div>
            <ClassificationPicker
              system={ClassificationSystem.Gs1Gpc}
              value={selectedClassification}
              onChange={(value) => {
                setSelectedClassification(value);
                setHasClassificationChoice(true);
              }}
              disabled={isSaving}
              allowClear={false}
            />
          </div>

          {/* Progress Indicator */}
          {updateProgress ? (
            <div className={styles["section"]}>
              <div className={styles["sectionLabel"]}>{t((m) => m.dialogs.invoices.bulkCategoryDialog.labels.progress)}</div>
              <p className={styles["progressText"]}>
                {t((m) => m.dialogs.invoices.bulkCategoryDialog.progress.updating, {
                  current: String(updateProgress.current),
                  total: String(updateProgress.total),
                })}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}
            disabled={isSaving}>
            {t((m) => m.dialogs.invoices.bulkCategoryDialog.buttons.cancel)}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasClassificationChoice}>
            {isSaving
              ? t((m) => m.dialogs.invoices.bulkCategoryDialog.buttons.saving)
              : t((m) => m.dialogs.invoices.bulkCategoryDialog.buttons.save)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
