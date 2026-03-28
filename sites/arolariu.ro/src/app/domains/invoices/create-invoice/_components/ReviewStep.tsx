"use client";

/**
 * @fileoverview Review step component for final confirmation before invoice creation.
 * @module app/domains/invoices/create-invoice/_components/ReviewStep
 *
 * @remarks
 * Displays summary of:
 * - Selected scans (thumbnails)
 * - Invoice details (name, category, payment, date)
 * - Create invoice button with loading state
 */

import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbCalendar, TbCategory, TbCreditCard, TbFileDescription, TbFileInvoice, TbPhoto, TbSparkles} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./ReviewStep.module.scss";

const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: "long"});

/**
 * Category label map.
 */
const CATEGORY_LABELS: Record<number, string> = {
  [InvoiceCategory.NOT_DEFINED]: "Uncategorized",
  [InvoiceCategory.GROCERY]: "Grocery",
  [InvoiceCategory.FAST_FOOD]: "Dining",
  [InvoiceCategory.HOME_CLEANING]: "Home & Cleaning",
  [InvoiceCategory.CAR_AUTO]: "Auto & Vehicle",
  [InvoiceCategory.OTHER]: "Other",
};

/**
 * Payment type label map.
 */
const PAYMENT_TYPE_LABELS: Record<number, string> = {
  [PaymentType.Unknown]: "Unknown",
  [PaymentType.Cash]: "Cash",
  [PaymentType.Card]: "Card",
  [PaymentType.Transfer]: "Bank Transfer",
  [PaymentType.MobilePayment]: "Mobile Payment",
  [PaymentType.Voucher]: "Voucher",
  [PaymentType.Other]: "Other",
};

/**
 * Review step component.
 *
 * @returns JSX element with review UI
 */
export default function ReviewStep(): React.JSX.Element {
  const t = useTranslations("Invoices.CreateInvoice.reviewStep");
  const {selectedScans, invoiceDetails, isCreating, createInvoiceWithScans} = useCreateInvoiceContext();

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t("title")}</h2>
        <p className={styles["subtitle"]}>{t("subtitle")}</p>
      </div>

      {/* Selected Scans */}
      <Card className={styles["section"]}>
        <CardHeader>
          <CardTitle className={styles["sectionTitle"]}>
            <TbPhoto />
            {t("sections.scans.title")}
            <Badge variant='secondary'>{selectedScans.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles["scansGrid"]}>
            {selectedScans.map((scan) => (
              <motion.div
                key={scan.id}
                whileHover={{scale: 1.05}}
                className={styles["scanThumbnail"]}>
                <img
                  src={scan.blobUrl}
                  alt={scan.name}
                  className={styles["scanImage"]}
                />
                <div className={styles["scanOverlay"]}>
                  <span className={styles["scanName"]}>{scan.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card className={styles["section"]}>
        <CardHeader>
          <CardTitle className={styles["sectionTitle"]}>
            <TbFileInvoice />
            {t("sections.details.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className={styles["detailsContent"]}>
          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbFileDescription />
              {t("sections.details.name")}
            </div>
            <div className={styles["detailValue"]}>{invoiceDetails.name}</div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCategory />
              {t("sections.details.category")}
            </div>
            <div className={styles["detailValue"]}>
              <Badge variant='outline'>{CATEGORY_LABELS[invoiceDetails.category] ?? "Uncategorized"}</Badge>
            </div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCreditCard />
              {t("sections.details.paymentType")}
            </div>
            <div className={styles["detailValue"]}>
              <Badge variant='outline'>{PAYMENT_TYPE_LABELS[invoiceDetails.paymentType] ?? "Unknown"}</Badge>
            </div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCalendar />
              {t("sections.details.transactionDate")}
            </div>
            <div className={styles["detailValue"]}>{dateFormatter.format(invoiceDetails.transactionDate)}</div>
          </div>

          {invoiceDetails.description && (
            <div className={styles["detailRow"]}>
              <div className={styles["detailLabel"]}>
                <TbFileDescription />
                {t("sections.details.description")}
              </div>
              <div className={styles["detailValue"]}>{invoiceDetails.description}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Button */}
      <div className={styles["createSection"]}>
        <Button
          size='lg'
          onClick={createInvoiceWithScans}
          disabled={isCreating}
          className={styles["createButton"]}>
          {isCreating ? (
            <>
              <Spinner className={styles["spinner"]} />
              {t("actions.creating")}
            </>
          ) : (
            <>
              <TbSparkles />
              {t("actions.create")}
            </>
          )}
        </Button>
        <p className={styles["createHint"]}>{t("actions.hint")}</p>
      </div>
    </div>
  );
}
