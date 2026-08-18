"use client";

import {ClassificationSystem, toClassificationSelection, type ClassificationSelection} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableRow,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {TbBuilding, TbMapPin, TbPhone} from "react-icons/tb";
import {updateMerchant} from "../../../_actions/merchants";
import {useDialog} from "../../../_contexts/DialogContext";
import {ClassificationPicker} from "../../../_components/analysis/ClassificationPicker";
import styles from "./MerchantDialog.module.scss";

/**
 * Dialog displaying detailed merchant information for the current invoice.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `useDialog` hook).
 *
 * **Merchant Details Displayed**:
 * - **Name**: Business name
 * - **Classification**: Manual NACE 2.1 code selection and save state
 * - **Address**: Physical location with map pin icon
 * - **Phone**: Contact number with phone icon
 *
 * **Actions**:
 * - **Open in Maps**: Placeholder for map integration (not yet implemented)
 *
 * **Visual Design**:
 * - Profile-style header with merchant icon in primary-tinted circle
 * - Table layout for structured detail presentation
 * - Server-backed taxonomy picker preserving a full merchant PUT payload
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_MERCHANT` type.
 * Payload contains the full `Merchant` object.
 *
 * **Domain Context**: Provides merchant context for invoice editing,
 * helping users verify merchant details and navigate to related data.
 *
 * @returns Client-rendered dialog with merchant details table
 *
 * @example
 * ```tsx
 * // Opened via MerchantCard "View Merchant Details" button:
 * const {open} = useDialog("INVOICE_MERCHANT", "view", merchant);
 * <Button onClick={open}>View Merchant Details</Button>
 * ```
 *
 * @see {@link MerchantCard} - Parent component that opens this dialog
 * @see {@link Merchant} - Merchant type definition
 */
export default function MerchantDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__MERCHANT");

  const merchant = payload;
  const [classification, setClassification] = useState<ClassificationSelection | null>(() =>
    toClassificationSelection(merchant.classification),
  );
  const [hasClassificationChange, setHasClassificationChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const hasCompleteMerchantPayload = merchant.additionalMetadata !== undefined;

  useEffect(() => {
    setClassification(toClassificationSelection(merchant.classification));
    setHasClassificationChange(false);
    setSaveError(false);
  }, [merchant]);

  const handleSaveClassification = useCallback(async (): Promise<void> => {
    const additionalMetadata = merchant.additionalMetadata;
    if (additionalMetadata === undefined) {
      setSaveError(true);
      return;
    }

    setIsSaving(true);
    setSaveError(false);
    const parentCompanyId = merchant.parentCompanyId.trim().length === 0 ? null : merchant.parentCompanyId;
    try {
      const result = await updateMerchant({
        merchantId: merchant.id,
        payload: {
          name: merchant.name,
          description: merchant.description,
          classification,
          address: merchant.address,
          parentCompanyId,
          additionalMetadata,
        },
      });

      if (!result.success) {
        setSaveError(true);
        toast.error(t((messages) => messages.dialogs.invoices.merchantDialog.errors.saveFailed));
        return;
      }

      toast.success(t((messages) => messages.dialogs.invoices.merchantDialog.success.classificationSaved));
      setHasClassificationChange(false);
      router.refresh();
    } catch {
      setSaveError(true);
      toast.error(t((messages) => messages.dialogs.invoices.merchantDialog.errors.saveFailed));
    } finally {
      setIsSaving(false);
    }
  }, [classification, merchant, router, t]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader className={styles["dialogHeader"]}>
          <DialogTitle>{t((m) => m.dialogs.invoices.merchantDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.merchantDialog.description, {merchantName: merchant.name})}</DialogDescription>
        </DialogHeader>
        <div className={styles["body"]}>
          <div className={styles["merchantProfile"]}>
            <div className={styles["merchantAvatar"]}>
              <TbBuilding className={styles["buildingIcon"]} />
            </div>
            <div>
              <h3 className={styles["merchantName"]}>{merchant.name}</h3>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbMapPin className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t((m) => m.dialogs.invoices.merchantDialog.fields.address)}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.address.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbPhone className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t((m) => m.dialogs.invoices.merchantDialog.fields.phone)}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.address.phoneNumber}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className={styles["classificationSection"]}>
            <ClassificationPicker
              system={ClassificationSystem.Nace21}
              value={classification}
              onChange={(value) => {
                setClassification(value);
                setHasClassificationChange(true);
              }}
              disabled={isSaving || !hasCompleteMerchantPayload}
              allowClear={false}
            />
            {saveError || !hasCompleteMerchantPayload ? (
              <p
                className={styles["saveError"]}
                role='alert'>
                {t((messages) =>
                  !hasCompleteMerchantPayload
                    ? messages.dialogs.invoices.merchantDialog.errors.missingUpdateData
                    : messages.dialogs.invoices.merchantDialog.errors.saveFailed,
                )}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles["footer"]}>
          <Button
            type='button'
            className={styles["mapsButton"]}>
            {t((m) => m.dialogs.invoices.merchantDialog.buttons.openInMaps)}
          </Button>
          <Button
            type='button'
            disabled={isSaving || !hasClassificationChange || !hasCompleteMerchantPayload}
            className={styles["mapsButton"]}
            onClick={handleSaveClassification}>
            {isSaving
              ? t((messages) => messages.dialogs.invoices.merchantDialog.buttons.savingClassification)
              : t((messages) => messages.dialogs.invoices.merchantDialog.buttons.saveClassification)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
