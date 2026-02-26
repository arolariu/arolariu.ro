"use client";

import {useTranslations} from "next-intl";
import styles from "./LoadingInvoice.module.scss";

/**
 * This component is used to display a message when the invoice is loading.
 * @returns The JSX for the loading invoice view.
 */
export default function LoadingInvoice({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const t = useTranslations("Invoices.Shared.states.loading");

  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <h1 className={styles["title"]}>{t("title")}</h1>
        <p className={styles["description"]}>{t("description", {invoiceIdentifier})}</p>
      </article>
    </section>
  );
}
