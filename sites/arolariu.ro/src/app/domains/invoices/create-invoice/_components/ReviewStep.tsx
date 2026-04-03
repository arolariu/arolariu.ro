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
import {useFormatter, useTranslations} from "next-intl";
import {TbCalendar, TbCategory, TbCreditCard, TbFileDescription, TbFileInvoice, TbFileTypePdf, TbPhoto, TbSparkles} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./ReviewStep.module.scss";

/** Maps InvoiceCategory enum to i18n key suffix. */
const CATEGORY_KEYS: Record<number, "notDefined" | "grocery" | "fastFood" | "homeCleaning" | "carAuto" | "other"> = {
  [InvoiceCategory.NOT_DEFINED]: "notDefined",
  [InvoiceCategory.GROCERY]: "grocery",
  [InvoiceCategory.FAST_FOOD]: "fastFood",
  [InvoiceCategory.HOME_CLEANING]: "homeCleaning",
  [InvoiceCategory.CAR_AUTO]: "carAuto",
  [InvoiceCategory.OTHER]: "other",
};

/** Maps PaymentType enum to i18n key suffix. */
const PAYMENT_TYPE_KEYS: Record<number, "unknown" | "cash" | "card" | "transfer" | "mobilePayment" | "voucher" | "other"> = {
  [PaymentType.Unknown]: "unknown",
  [PaymentType.Cash]: "cash",
  [PaymentType.Card]: "card",
  [PaymentType.Transfer]: "transfer",
  [PaymentType.MobilePayment]: "mobilePayment",
  [PaymentType.Voucher]: "voucher",
  [PaymentType.Other]: "other",
};

/**
 * Review step component.
 *
 * @returns JSX element with review UI
 */
export default function ReviewStep(): React.JSX.Element {
  const t = useTranslations("Invoices.CreateInvoice.reviewStep");
  const {selectedScans, invoiceDetails, isCreating, createInvoiceWithScans} = useCreateInvoiceContext();
  const format = useFormatter();

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
                {scan.mimeType === "application/pdf" || scan.blobUrl?.endsWith(".pdf") ? (
                  <div className={styles["pdfPlaceholder"]}>
                    <TbFileTypePdf className={styles["pdfIcon"]} />
                  </div>
                ) : (
                  <img
                    src={scan.blobUrl}
                    alt={scan.name}
                    className={styles["scanImage"]}
                  />
                )}
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
              <Badge variant='outline'>{t(`categories.${CATEGORY_KEYS[invoiceDetails.category] ?? "notDefined"}`)}</Badge>
            </div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCreditCard />
              {t("sections.details.paymentType")}
            </div>
            <div className={styles["detailValue"]}>
              <Badge variant='outline'>{t(`paymentTypes.${PAYMENT_TYPE_KEYS[invoiceDetails.paymentType] ?? "unknown"}`)}</Badge>
            </div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCalendar />
              {t("sections.details.transactionDate")}
            </div>
            <div className={styles["detailValue"]}>{format.dateTime(invoiceDetails.transactionDate, {dateStyle: "long"})}</div>
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
