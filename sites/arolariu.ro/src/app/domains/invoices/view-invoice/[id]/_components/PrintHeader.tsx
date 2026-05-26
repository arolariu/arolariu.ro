"use client";

import {formatCurrency} from "@/lib/utils.generic";
import type {Invoice, Merchant} from "@/types/invoices";
import {useFormatter, useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import styles from "./PrintHeader.module.scss";

/**
 * Props for the PrintHeader component.
 */
interface PrintHeaderProps {
  readonly invoice: Invoice;
  readonly merchant: Merchant | null;
}

/**
 * PrintHeader component - only visible when printing.
 * Displays invoice summary information at the top of printed pages.
 *
 * @param props - The component props.
 * @returns The print header component.
 */
export function PrintHeader(props: Readonly<PrintHeaderProps>): React.JSX.Element {
  const {invoice, merchant} = props;
  const t = useTranslations();
  const formatter = useFormatter();
  const locale = useLocale();

  const printDate = formatter.dateTime(new Date(), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const invoiceDate = formatter.dateTime(new Date(invoice.paymentInformation?.transactionDate ?? invoice.createdAt), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTotal = formatCurrency(invoice.paymentInformation?.totalCostAmount ?? 0, {
    currencyCode: invoice.paymentInformation?.currency?.code ?? "RON",
    locale,
  });

  return (
    <header className={styles["printHeader"]}>
      <div className={styles["printHeaderContent"]}>
        {/* Invoice Name */}
        <h1 className={styles["invoiceName"]}>{invoice.name}</h1>

        {/* Invoice Details Grid */}
        <div className={styles["detailsGrid"]}>
          <div className={styles["detailItem"]}>
            <span className={styles["detailLabel"]}>{t((m) => m["IMS--View"].print.labels.date)}:</span>
            <span className={styles["detailValue"]}>{invoiceDate}</span>
          </div>

          <div className={styles["detailItem"]}>
            <span className={styles["detailLabel"]}>{t((m) => m["IMS--View"].print.labels.merchant)}:</span>
            <span className={styles["detailValue"]}>{merchant?.name ?? ""}</span>
          </div>

          <div className={styles["detailItem"]}>
            <span className={styles["detailLabel"]}>{t((m) => m["IMS--View"].print.labels.total)}:</span>
            <span className={styles["detailValue"]}>{formattedTotal}</span>
          </div>

          <div className={styles["detailItem"]}>
            <span className={styles["detailLabel"]}>{t((m) => m["IMS--View"].print.labels.items)}:</span>
            <span className={styles["detailValue"]}>{invoice.items.length}</span>
          </div>
        </div>

        {/* Generated Timestamp */}
        <div className={styles["generatedOn"]}>{t((m) => m["IMS--View"].print.generatedOn, {date: printDate})}</div>
      </div>

      {/* Bottom Border */}
      <div className={styles["headerBorder"]} />
    </header>
  );
}
