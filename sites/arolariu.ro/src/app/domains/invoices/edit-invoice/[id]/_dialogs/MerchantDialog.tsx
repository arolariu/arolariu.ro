"use client";

import {updateMerchant} from "@/app/domains/invoices/_actions/merchants/updateMerchant";
import CategoryPicker from "@/app/domains/invoices/_components/category/CategoryPicker";
import {merchantCategoryLabel} from "@/app/domains/invoices/_utils/labelUtilities";
import {notify} from "@/lib/notify";
import {EMPTY_GUID} from "@/lib/utils.generic";
import {useMerchantsStore} from "@/stores/merchantsStore";
import type {MerchantCategory} from "@/types/invoices";
import {
  Badge,
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
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useLayoutEffect, useRef, useState} from "react";
import {TbBuilding, TbMapPin, TbPhone} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./MerchantDialog.module.scss";

/** Displays merchant information and edits its category from the invoice edit route. */
export default function MerchantDialog(): React.JSX.Element | null {
  const {currentDialog, isOpen, close} = useDialog("EDIT_INVOICE__MERCHANT");
  const merchant = isOpen ? currentDialog.payload : null;
  const canEdit = Boolean(merchant?.createdBy && merchant.createdBy !== EMPTY_GUID);
  const t = useTranslations();
  const router = useRouter();
  const [edit, setEdit] = useState<{
    dialog: typeof currentDialog;
    saved: MerchantCategory | null;
    draft: MerchantCategory | null | undefined;
    saving: boolean;
  } | null>(null);
  const activeDialogRef = useRef<typeof currentDialog | null>(null);
  const saveInFlightRef = useRef<typeof currentDialog | null>(null);
  const currentEdit = edit?.dialog === currentDialog ? edit : null;
  const saved = currentEdit === null ? (merchant?.category ?? null) : currentEdit.saved;
  const value = currentEdit?.draft === undefined ? saved : currentEdit.draft;
  const saving = currentEdit?.saving === true;

  // The provider creates a new dialog state on each open, even for the same merchant.
  useLayoutEffect(() => {
    activeDialogRef.current = isOpen ? currentDialog : null;
    return () => {
      activeDialogRef.current = null;
    };
  }, [currentDialog, isOpen]);

  const onOpenChange = useCallback(
    (shouldOpen: boolean): void => {
      if (!shouldOpen) {
        activeDialogRef.current = null;
        close();
      }
    },
    [close],
  );
  const onCategoryChange = useCallback(
    (draft: MerchantCategory | null): void => setEdit({dialog: currentDialog, saved, draft, saving: false}),
    [currentDialog, saved],
  );
  const save = useCallback(async (): Promise<void> => {
    if (merchant === null || activeDialogRef.current !== currentDialog || saveInFlightRef.current === currentDialog || value === saved)
      return;
    saveInFlightRef.current = currentDialog;
    setEdit({dialog: currentDialog, saved, draft: value, saving: true});
    try {
      const result = await updateMerchant({merchantId: merchant.id, category: value});
      if (result.success) {
        useMerchantsStore.getState().updateEntity(merchant.id, {category: result.data.category});
        router.refresh();
      }
      if (activeDialogRef.current !== currentDialog) return;
      if (!result.success) {
        notify.error(result.error.status === 409 ? t((m) => m.categories.ui.merchantConflict) : t((m) => m.categories.ui.failed));
        return;
      }
      setEdit({dialog: currentDialog, saved: result.data.category, draft: undefined, saving: false});
      notify.success(t((m) => m.categories.ui.saved));
    } catch {
      if (activeDialogRef.current === currentDialog) notify.error(t((m) => m.categories.ui.failed));
    } finally {
      if (saveInFlightRef.current === currentDialog) saveInFlightRef.current = null;
      if (activeDialogRef.current === currentDialog) {
        setEdit((previous) => (previous?.dialog === currentDialog && previous.saving ? {...previous, saving: false} : previous));
      }
    }
  }, [currentDialog, merchant, router, saved, t, value]);

  if (merchant === null) return null;
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t((m) => m.shared.accessibility.close)}
        className={styles["dialogContent"]}>
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
              <Badge
                variant='outline'
                className={styles["categoryBadge"]}>
                {merchantCategoryLabel(t, saved)}
              </Badge>
            </div>
          </div>

          <Table containerProps={{role: "region", "aria-label": t((m) => m.dialogs.invoices.merchantDialog.title)}}>
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
          {canEdit ? (
            <>
              <CategoryPicker
                domain='merchants'
                label={t((m) => m.categories.ui.merchant)}
                value={value}
                onValueChange={onCategoryChange}
                disabled={saving}
              />
              <Button
                type='button'
                variant='outline'
                onClick={save}
                disabled={saving || value === saved}>
                {t((m) => m.categories.ui.save)}
              </Button>
            </>
          ) : null}
        </div>

        <div className={styles["footer"]}>
          <Button
            type='button'
            className={styles["mapsButton"]}>
            {t((m) => m.dialogs.invoices.merchantDialog.buttons.openInMaps)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
