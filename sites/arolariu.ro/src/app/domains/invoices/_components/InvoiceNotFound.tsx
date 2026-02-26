"use client";

import {useTranslations} from "next-intl";
import styles from "./InvoiceNotFound.module.scss";

/**
 * This component is used to display a message when an invoice is not found.
 * @returns The JSX for the invoice not found view.
 */
export default function InvoiceNotFound({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const t = useTranslations("Invoices.Shared.states.notFound");

  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <h1 className={styles["title"]}>{t("title")}</h1>
        <p className={styles["description"]}>{t("description", {invoiceIdentifier})}</p>
      </article>
    </section>
  );
}
