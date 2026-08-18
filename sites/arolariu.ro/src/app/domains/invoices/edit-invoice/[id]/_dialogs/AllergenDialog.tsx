"use client";

/**
 * @fileoverview Read-only evidence dialog for structured product allergen assessments.
 * @module domains/invoices/edit-invoice/[id]/dialogs/AllergenDialog
 */

import type {Product} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {AllergenAssessmentDetails} from "../../../_components/analysis/StructuredAnalysisDetails";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./AllergenDialog.module.scss";

interface AllergenDialogPayload {
  readonly product: Product;
}

function hasAllergenDialogPayload(value: unknown): value is AllergenDialogPayload {
  return typeof value === "object" && value !== null && "product" in value;
}

/**
 * Displays the backend assessment exactly as evidence. This intentionally has
 * no mutation controls: allergen assessments are server-owned analysis output.
 */
export default function AllergenDialog(): React.JSX.Element | null {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__ALLERGENS");

  if (!hasAllergenDialogPayload(payload)) {
    return null;
  }

  const assessment = payload.product.allergenAssessment;
  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.allergenDialog.title)}</DialogTitle>
          <DialogDescription>
            {t((m) => m.dialogs.invoices.allergenDialog.description, {productName: payload.product.name})}
          </DialogDescription>
        </DialogHeader>
        <div className={styles["content"]}>
          <AllergenAssessmentDetails assessment={assessment} />
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            {t((m) => m.dialogs.invoices.allergenDialog.buttons.cancel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
