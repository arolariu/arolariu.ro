"use client";

/**
 * @fileoverview Dialog for bulk category reassignment of products.
 * @module domains/invoices/edit-invoice/[id]/components/dialogs/BulkCategoryDialog
 *
 * @remarks
 * Provides UI for changing the category of multiple products at once.
 */

import updateProduct from "@/lib/actions/invoices/updateProduct";
import type {Invoice, Product, ProductCategory} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useMemo, useState} from "react";
import {TbTag} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./BulkCategoryDialog.module.scss";

/**
 * Payload type for the bulk category dialog.
 */
interface BulkCategoryDialogPayload {
  readonly invoice: Invoice;
  readonly selectedProducts: Product[];
  readonly selectedIndices: number[];
}

/**
 * Dialog for bulk category reassignment of products.
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
 * - **Category Selection**: Dropdown with all ProductCategory enum values
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
 * 4. User selects new category
 * 5. On save, calls updateProduct for each selected product sequentially
 * 6. Progress indicator shows "Updating X/Y products..."
 * 7. Success → page reload to show fresh data
 *
 * **Validation**:
 * - At least one product must be selected
 * - Category must be selected before saving
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
 * @see {@link ProductCategory} - Product category enum
 */
export default function BulkCategoryDialog(): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.bulkCategoryDialog");
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__BULK_CATEGORY");

  const {invoice, selectedProducts, selectedIndices} = (payload ?? {}) as Partial<BulkCategoryDialogPayload>;

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{current: number; total: number} | null>(null);

  /**
   * Gets all ProductCategory enum values for the dropdown.
   */
  const categoryOptions = useMemo(() => {
    // Import ProductCategory dynamically since it's a numeric enum
    const ProductCategory = {
      NOT_DEFINED: 0,
      BAKED_GOODS: 100,
      GROCERIES: 200,
      DAIRY: 300,
      MEAT: 400,
      FISH: 500,
      FRUITS: 600,
      VEGETABLES: 700,
      BEVERAGES: 800,
      ALCOHOLIC_BEVERAGES: 900,
      TOBACCO: 1000,
      CLEANING_SUPPLIES: 1100,
      PERSONAL_CARE: 1200,
      MEDICINE: 1300,
      OTHER: 9999,
    };

    return Object.entries(ProductCategory)
      .filter(([key]) => Number.isNaN(Number(key)))
      .map(([key, value]) => ({
        label: key.replaceAll("_", " "),
        value: value as number,
      }));
  }, []);

  /**
   * Handles category selection change.
   */
  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(Number(value) as ProductCategory);
  }, []);

  /**
   * Saves category changes via updateProduct for each selected product.
   */
  const handleSave = useCallback(async () => {
    if (!invoice || !selectedProducts || !selectedIndices || selectedCategory === null) {
      toast.error(t("errors.missingData"));
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error(t("errors.noProducts"));
      return;
    }

    setIsSaving(true);
    setUpdateProgress({current: 0, total: selectedProducts.length});

    const errors: string[] = [];
    let successCount = 0;

    try {
      // Update each product individually
      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i];
        if (!product) continue;

        setUpdateProgress({current: i + 1, total: selectedProducts.length});

        try {
          const result = await updateProduct({
            invoiceId: invoice.id,
            payload: {
              originalProductName: product.rawName,
              rawName: product.rawName,
              genericName: product.genericName,
              category: selectedCategory,
              quantity: product.quantity,
              quantityUnit: product.quantityUnit,
              productCode: product.productCode,
              price: product.price,
              detectedAllergens: product.detectedAllergens,
            },
          });

          if (result.success) {
            successCount++;
          } else {
            errors.push(`${product.genericName || product.rawName}: ${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          errors.push(`${product.genericName || product.rawName}: ${errorMessage}`);
        }
      }

      // Show summary toast
      if (errors.length === 0) {
        toast.success(t("success.saved", {count: successCount}));
        close();
        router.refresh();
      } else if (successCount > 0) {
        toast.warning(
          t("success.partialSuccess", {
            success: successCount,
            failed: errors.length,
          }),
        );
        console.error("Some products failed to update:", errors);
      } else {
        toast.error(t("errors.allFailed"));
        console.error("All products failed to update:", errors);
      }
    } catch (error) {
      console.error("Failed to update categories:", error);
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsSaving(false);
      setUpdateProgress(null);
    }
  }, [invoice, selectedProducts, selectedIndices, selectedCategory, close, router, t]);

  if (!selectedProducts || selectedProducts.length === 0) {
    return <></>;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {count: selectedProducts.length})}</DialogDescription>
        </DialogHeader>

        <div className={styles["content"]}>
          {/* Selected Products Preview */}
          <div className={styles["section"]}>
            <Label className={styles["sectionLabel"]}>{t("labels.selectedProducts")}</Label>
            <div className={styles["productList"]}>
              {selectedProducts.slice(0, 5).map((product, index) => (
                <div
                  key={`${product.rawName}-${index}`}
                  className={styles["productItem"]}>
                  <span className={styles["productName"]}>{product.genericName || product.rawName}</span>
                </div>
              ))}
              {selectedProducts.length > 5 && (
                <div className={styles["moreText"]}>{t("labels.andMore", {count: selectedProducts.length - 5})}</div>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div className={styles["section"]}>
            <Label
              htmlFor='category-select'
              className={styles["sectionLabel"]}>
              <TbTag className={styles["labelIcon"]} />
              {t("labels.newCategory")}
            </Label>
            <Select
              value={selectedCategory !== null ? String(selectedCategory) : undefined}
              onValueChange={handleCategoryChange}>
              <SelectTrigger
                id='category-select'
                className={styles["categoryTrigger"]}>
                <SelectValue placeholder={t("placeholders.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress Indicator */}
          {updateProgress && (
            <div className={styles["section"]}>
              <Label className={styles["sectionLabel"]}>{t("labels.progress")}</Label>
              <p className={styles["progressText"]}>
                {t("progress.updating", {
                  current: updateProgress.current,
                  total: updateProgress.total,
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}
            disabled={isSaving}>
            {t("buttons.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedCategory === null}>
            {isSaving ? t("buttons.saving") : t("buttons.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
