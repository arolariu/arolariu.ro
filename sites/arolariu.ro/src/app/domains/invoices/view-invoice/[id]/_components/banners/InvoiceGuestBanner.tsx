"use client";

import {Alert, AlertDescription, AlertTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbInfoCircle} from "react-icons/tb";
import styles from "./InvoiceGuestBanner.module.scss";

export function InvoiceGuestBanner(): React.JSX.Element {
  const t = useTranslations();
  return (
    <Alert
      variant='default'
      className={styles["alert"]}>
      <TbInfoCircle className={styles["infoIcon"]} />
      <AlertTitle className={styles["alertTitle"]}>{t((m) => m.pages.invoices.viewInvoice.invoiceGuestBanner.title)}</AlertTitle>
      <AlertDescription className={styles["alertDescription"]}>{t((m) => m.pages.invoices.viewInvoice.invoiceGuestBanner.description)}</AlertDescription>
    </Alert>
  );
}
