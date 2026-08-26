"use client";

/**
 * @fileoverview Dialog for editing the EU-14 allergen assessment on individual products.
 * @module domains/invoices/edit-invoice/[id]/components/dialogs/AllergenDialog
 *
 * @remarks
 * Wraps {@link AllergenAssessmentEditor} in a dialog and persists the result via
 * {@link updateInvoiceProduct}. Allergen codes are constrained to the canonical EU-14
 * list — free-text allergen names are no longer accepted.
 */

import {AllergenAssessmentStatus, type AllergenAssessment} from "@/types/invoices/Allergen";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useState} from "react";
import {AllergenAssessmentEditor} from "../../../_components/allergens/AllergenAssessmentEditor";
import {updateInvoiceProduct} from "../../../_actions/invoices";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./AllergenDialog.module.scss";

const DEFAULT_EDITABLE_ASSESSMENT: AllergenAssessment = {
  status: AllergenAssessmentStatus.NoSignals,
  signals: [],
};

/**
 * Dialog for editing the structured allergen assessment of a single product.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Data Flow**:
 * 1. User opens dialog from ItemsTable row.
 * 2. Dialog receives product and invoice via payload.
 * 3. {@link AllergenAssessmentEditor} manages allergen code + evidence level + confidence.
 * 4. On save, calls {@link updateInvoiceProduct} with the updated `allergenAssessment`.
 * 5. Success → page reload to show fresh data.
 *
 * @returns Client-rendered dialog with allergen assessment editor.
 *
 * @see {@link AllergenAssessmentEditor} - Canonical constrained editor
 * @see {@link updateInvoiceProduct} - Server action for persisting changes
 */
export default function AllergenDialog(): React.JSX.Element | null {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__ALLERGENS");

  const invoice = payload?.invoice ?? null;
  const product = payload?.product ?? null;

  const [assessment, setAssessment] = useState<AllergenAssessment>(DEFAULT_EDITABLE_ASSESSMENT);
  const [isAssessmentValid, setIsAssessmentValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAssessment(product?.allergenAssessment ?? DEFAULT_EDITABLE_ASSESSMENT);
  }, [product]);

  const handleSave = useCallback(async () => {
    if (invoice === null || product === null) {
      throw new Error("Cannot save allergens before the dialog payload is available.");
    }

    setIsSaving(true);

    try {
      const result = await updateInvoiceProduct({
        invoiceId: invoice.id,
        payload: {
          originalProductName: product.name,
          updatedProduct: {
            name: product.name,
            quantity: product.quantity,
            quantityUnit: product.quantityUnit,
            productCode: product.productCode,
            price: product.price,
            totalPrice: product.price * product.quantity,
            metadata: product.metadata,
            classification: product.classification,
            allergenAssessment: assessment,
          },
        },
      });

      if (result.success) {
        toast.success(t((m) => m.dialogs.invoices.allergenDialog.success.saved));
        close();
        globalThis.window.location.reload();
      } else {
        console.error("Failed to save allergen assessment:", result.error);
        toast.error(t((m) => m.dialogs.invoices.allergenDialog.errors.saveFailed));
      }
    } catch (error: unknown) {
      console.error("Failed to save allergen assessment:", error);
      toast.error(t((m) => m.dialogs.invoices.allergenDialog.errors.saveFailed));
    } finally {
      setIsSaving(false);
    }
  }, [invoice, product, assessment, close, t]);

  if (invoice === null || product === null) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.allergenDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.allergenDialog.description, {productName: product.name})}</DialogDescription>
        </DialogHeader>

        <div className={styles["content"]}>
          <AllergenAssessmentEditor
            value={assessment}
            onChange={setAssessment}
            onValidityChange={setIsAssessmentValid}
          />
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}
            disabled={isSaving}>
            {t((m) => m.dialogs.invoices.allergenDialog.buttons.cancel)}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isAssessmentValid}>
            {isSaving
              ? t((m) => m.dialogs.invoices.allergenDialog.buttons.saving)
              : t((m) => m.dialogs.invoices.allergenDialog.buttons.save)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
