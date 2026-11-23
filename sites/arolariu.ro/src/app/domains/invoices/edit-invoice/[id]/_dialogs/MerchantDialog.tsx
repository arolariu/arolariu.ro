"use client";

import {updateMerchant} from "@/app/domains/invoices/_actions/merchants/updateMerchant";
import CategoryPicker from "@/app/domains/invoices/_components/category/CategoryPicker";
import {merchantCategoryLabel} from "@/lib/categories/categoryLabels";
import {notify} from "@/lib/notify";
import {useMerchantsStore} from "@/stores/merchantsStore";
import type {Merchant, MerchantCategory} from "@/types/invoices";
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
import {useCallback, useRef, useState} from "react";
import {TbBuilding, TbMapPin, TbPhone} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./MerchantDialog.module.scss";

function MerchantDetails({merchant, isOpen, close}: Readonly<{merchant: Merchant; isOpen: boolean; close: () => void}>): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const [saved, setSaved] = useState(merchant.category);
  const [draft, setDraft] = useState<MerchantCategory | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  const value = draft === undefined ? saved : draft;

  const finishSaving = useCallback(() => {
    saveInFlightRef.current = false;
    setSaving(false);
  }, []);
  const save = useCallback(async (): Promise<void> => {
    if (saveInFlightRef.current || value === saved) return;
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const result = await updateMerchant({merchantId: merchant.id, category: value});
      if (!result.success) {
        notify.error(t((m) => m.categories.ui.failed));
        return;
      }
      const store = useMerchantsStore.getState();
      store.updateEntity(merchant.id, {category: result.data.category});
      setSaved(result.data.category);
      setDraft(undefined);
      notify.success(t((m) => m.categories.ui.saved));
      router.refresh();
    } catch {
      notify.error(t((m) => m.categories.ui.failed));
    } finally {
      finishSaving();
    }
  }, [finishSaving, merchant.id, router, saved, t, value]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
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
          <CategoryPicker
            domain='merchants'
            label={t((m) => m.categories.ui.merchant)}
            value={value}
            onValueChange={setDraft}
            disabled={saving}
          />
          <Button
            type='button'
            variant='outline'
            onClick={save}
            disabled={saving || value === saved}>
            {t((m) => m.categories.ui.save)}
          </Button>
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

/** Displays merchant information and edits its category from the invoice edit route. */
export default function MerchantDialog(): React.JSX.Element | null {
  const {
    currentDialog: {payload = null},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__MERCHANT");

  return payload === null ? null : (
    <MerchantDetails
      key={payload.id}
      merchant={payload}
      isOpen={isOpen}
      close={close}
    />
  );
}
