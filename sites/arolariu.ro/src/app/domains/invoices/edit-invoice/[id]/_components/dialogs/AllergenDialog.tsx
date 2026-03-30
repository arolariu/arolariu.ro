"use client";

/**
 * @fileoverview Dialog for editing allergens on individual products.
 * @module domains/invoices/edit-invoice/[id]/components/dialogs/AllergenDialog
 *
 * @remarks
 * Provides UI for viewing, adding, and removing allergens from products.
 * Includes quick-add buttons for common allergens to streamline data entry.
 */

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import type {Allergen, Invoice, Product} from "@/types/invoices";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbPlus, TbX} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./AllergenDialog.module.scss";

/**
 * Common allergens for quick-add functionality.
 *
 * @remarks
 * Based on EU Regulation 1169/2011 which mandates declaration of 14 major allergens.
 */
const COMMON_ALLERGENS: ReadonlyArray<string> = [
  "Gluten",
  "Lactose",
  "Nuts",
  "Peanuts",
  "Eggs",
  "Soy",
  "Fish",
  "Shellfish",
  "Celery",
  "Mustard",
  "Sesame",
  "Lupin",
  "Molluscs",
  "Sulfites",
] as const;

/**
 * Payload type for the allergen dialog.
 */
interface AllergenDialogPayload {
  readonly invoice: Invoice;
  readonly product: Product;
  readonly productIndex: number;
}

/**
 * Dialog for editing allergens on a single product.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Why Client Component?**
 * - Interactive form with state management (local allergen list)
 * - Toast notifications for user feedback
 * - Dialog open/close state management
 *
 * **Features**:
 * - **View Current Allergens**: Displays all detected allergens with remove buttons
 * - **Quick Add**: Buttons for common allergens (Gluten, Lactose, etc.)
 * - **Custom Add**: Text input for adding custom allergen names
 * - **Remove**: X button on each allergen badge to remove
 * - **Save**: Persists changes via patchInvoice server action
 *
 * **Data Flow**:
 * 1. User opens dialog from ItemsTable row
 * 2. Dialog receives product and invoice via payload
 * 3. User modifies allergens list
 * 4. On save, calls patchInvoice with updated items array
 * 5. Success → page reload to show fresh data
 *
 * **Validation**:
 * - Duplicate allergen names are prevented
 * - Empty allergen names are rejected
 * - Allergen names are trimmed and case-normalized
 *
 * @returns Client-rendered dialog with allergen editing UI
 *
 * @example
 * ```tsx
 * // Opened via ItemsTable allergen button:
 * const {open} = useDialog("EDIT_INVOICE__ALLERGENS", "edit", {
 *   invoice,
 *   product,
 *   productIndex: 0
 * });
 * <Button onClick={open}>Edit Allergens</Button>
 * ```
 *
 * @see {@link useDialog} - Dialog state management hook
 * @see {@link patchInvoice} - Server action for persisting changes
 * @see {@link Allergen} - Allergen type definition
 */
export default function AllergenDialog(): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.allergenDialog");
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__ALLERGENS");

  const {invoice, product, productIndex} = (payload ?? {}) as Partial<AllergenDialogPayload>;

  const [allergens, setAllergens] = useState<Allergen[]>(product?.detectedAllergens ?? []);
  const [customAllergen, setCustomAllergen] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Adds a new allergen to the list.
   *
   * @param name - The allergen name to add
   */
  const handleAddAllergen = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error(t("errors.emptyName"));
        return;
      }

      // Check for duplicates (case-insensitive)
      const isDuplicate = allergens.some((a) => a.name.toLowerCase() === trimmedName.toLowerCase());
      if (isDuplicate) {
        toast.warning(t("errors.duplicate", {name: trimmedName}));
        return;
      }

      const newAllergen: Allergen = {
        name: trimmedName,
        description: t("defaultDescription", {name: trimmedName}),
        learnMoreAddress: "",
      };

      setAllergens((prev) => [...prev, newAllergen]);
      setCustomAllergen("");
      toast.success(t("success.added", {name: trimmedName}));
    },
    [allergens, t],
  );

  /**
   * Removes an allergen from the list.
   *
   * @param index - The index of the allergen to remove
   */
  const handleRemoveAllergen = useCallback(
    (index: number) => {
      const allergenName = allergens[index]?.name;
      setAllergens((prev) => prev.filter((_, i) => i !== index));
      if (allergenName) {
        toast.success(t("success.removed", {name: allergenName}));
      }
    },
    [allergens, t],
  );

  /**
   * Handles Enter key in custom allergen input.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddAllergen(customAllergen);
      }
    },
    [customAllergen, handleAddAllergen],
  );

  /**
   * Saves allergen changes via patchInvoice.
   */
  const handleSave = useCallback(async () => {
    if (!invoice || !product || productIndex === undefined) {
      toast.error(t("errors.missingData"));
      return;
    }

    setIsSaving(true);

    try {
      // Clone items array and update the specific product
      const updatedItems = [...invoice.items];
      updatedItems[productIndex] = {
        ...product,
        detectedAllergens: allergens,
        metadata: {
          ...product.metadata,
          isEdited: true,
        },
      };

      // Call patchInvoice with updated items
      const result = await patchInvoice({
        invoiceId: invoice.id,
        payload: {
          items: updatedItems,
        },
      });

      if (result.success) {
        toast.success(t("success.saved"));
        close();
        // Trigger page refresh to show updated data
        globalThis.window.location.reload();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Failed to save allergens:", error);
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }, [invoice, product, productIndex, allergens, close, t]);

  if (!product) {
    return <></>;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {productName: product.genericName || product.rawName})}</DialogDescription>
        </DialogHeader>

        <div className={styles["content"]}>
          {/* Current Allergens */}
          <div className={styles["section"]}>
            <Label className={styles["sectionLabel"]}>{t("labels.currentAllergens")}</Label>
            {allergens.length === 0 ? (
              <p className={styles["emptyText"]}>{t("empty.noAllergens")}</p>
            ) : (
              <div className={styles["allergenList"]}>
                {allergens.map((allergen, index) => (
                  <Badge
                    key={`${allergen.name}-${index}`}
                    variant='secondary'
                    className={styles["allergenBadge"]}>
                    <span>{allergen.name}</span>
                    <button
                      type='button'
                      onClick={() => handleRemoveAllergen(index)}
                      className={styles["removeButton"]}
                      aria-label={t("aria.removeAllergen", {name: allergen.name})}>
                      <TbX className={styles["removeIcon"]} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Common Allergens */}
          <div className={styles["section"]}>
            <Label className={styles["sectionLabel"]}>{t("labels.quickAdd")}</Label>
            <div className={styles["quickAddGrid"]}>
              {COMMON_ALLERGENS.map((allergenName) => {
                const isAdded = allergens.some((a) => a.name.toLowerCase() === allergenName.toLowerCase());
                return (
                  <Button
                    key={allergenName}
                    variant='outline'
                    size='sm'
                    disabled={isAdded}
                    onClick={() => handleAddAllergen(allergenName)}
                    className={styles["quickAddButton"]}>
                    {allergenName}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Allergen Input */}
          <div className={styles["section"]}>
            <Label
              htmlFor='custom-allergen'
              className={styles["sectionLabel"]}>
              {t("labels.customAllergen")}
            </Label>
            <div className={styles["inputRow"]}>
              <Input
                id='custom-allergen'
                type='text'
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("placeholders.customAllergen")}
                className={styles["customInput"]}
              />
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleAddAllergen(customAllergen)}
                disabled={!customAllergen.trim()}
                className={styles["addButton"]}>
                <TbPlus className={styles["addIcon"]} />
                {t("buttons.add")}
              </Button>
            </div>
          </div>
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
            disabled={isSaving}>
            {isSaving ? t("buttons.saving") : t("buttons.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
