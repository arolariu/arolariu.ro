"use client";

import {useTranslations} from "next-intl-selector";
import styles from "./InvoiceNotFound.module.scss";

/**
 * This component is used to display a message when an invoice is not found.
 * @returns The JSX for the invoice not found view.
 */
export default function InvoiceNotFound({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const t = useTranslations();

  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <h1 className={styles["title"]}>{t((m) => m.shared.invoices.statesNotFound.title)}</h1>
        <p className={styles["description"]}>{t((m) => m.shared.invoices.statesNotFound.description, {invoiceIdentifier})}</p>
      </article>
    </section>
  );
}
