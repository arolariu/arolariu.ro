"use client";

import {Alert, AlertDescription, AlertTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbInfoCircle} from "react-icons/tb";
import styles from "./InvoiceGuestBanner.module.scss";

export function InvoiceGuestBanner(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.invoiceGuestBanner");
  return (
    <Alert
      variant='default'
      className={styles["alert"]}>
      <TbInfoCircle className={styles["infoIcon"]} />
      <AlertTitle className={styles["alertTitle"]}>{t("title")}</AlertTitle>
      <AlertDescription className={styles["alertDescription"]}>{t("description")}</AlertDescription>
    </Alert>
  );
}
