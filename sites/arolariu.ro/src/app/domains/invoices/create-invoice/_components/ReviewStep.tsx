"use client";

import {selectorFromPath, useTranslations} from "next-intl-selector";

/**
 * @fileoverview Review step component for final confirmation before invoice creation.
 * @module app/domains/invoices/create-invoice/_components/ReviewStep
 *
 * @remarks
 * Displays summary of:
 * - Selected scans (thumbnails)
 * - Invoice details (name, classification, payment, date)
 * - Create invoice button with loading state
 * - Partial-failure error card with retry affordance
 */

import {PaymentType} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner} from "@arolariu/components";
import {motion} from "motion/react";
import {useFormatter} from "next-intl";
import {
  TbAlertTriangle,
  TbCalendar,
  TbCategory,
  TbCreditCard,
  TbFileDescription,
  TbFileInvoice,
  TbFileTypePdf,
  TbPhoto,
  TbRefresh,
  TbSparkles,
} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./ReviewStep.module.scss";

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
  const t = useTranslations();
  const {selectedScans, invoiceDetails, classificationSelection, isCreating, partialOutcome, createInvoiceWithScans} =
    useCreateInvoiceContext();
  const format = useFormatter();
  let createButtonContent = (
    <>
      <TbSparkles />
      {t((m) => m.forms.invoices.createInvoice.reviewStep.actions.create)}
    </>
  );

  if (isCreating) {
    createButtonContent = (
      <>
        <Spinner className={styles["spinner"]} />
        {t((m) => m.forms.invoices.createInvoice.reviewStep.actions.creating)}
      </>
    );
  } else if (partialOutcome?.status === "partial") {
    const retryLabel =
      partialOutcome.failedStep === "scans"
        ? t((m) => m.forms.invoices.createInvoice.reviewStep.partialError.retryScans)
        : t((m) => m.forms.invoices.createInvoice.reviewStep.partialError.retry);
    createButtonContent = (
      <>
        <TbRefresh />
        {retryLabel}
      </>
    );
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t((m) => m.forms.invoices.createInvoice.reviewStep.title)}</h2>
        <p className={styles["subtitle"]}>{t((m) => m.forms.invoices.createInvoice.reviewStep.subtitle)}</p>
      </div>

      {/* Partial-failure error card */}
      {partialOutcome?.status === "partial" ? (
        <Card className={styles["section"]}>
          <CardContent className={styles["partialErrorContent"]}>
            <div className={styles["partialErrorHeader"]}>
              <TbAlertTriangle className={styles["partialErrorIcon"]} />
              <strong>{t((m) => m.forms.invoices.createInvoice.reviewStep.partialError.title)}</strong>
            </div>
            <p className={styles["partialErrorMessage"]}>
              {partialOutcome.failedStep === "scans"
                ? t((m) => m.forms.invoices.createInvoice.reviewStep.partialError.scansFailed)
                : t((m) => m.forms.invoices.createInvoice.reviewStep.partialError.patchFailed)}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Selected Scans */}
      <Card className={styles["section"]}>
        <CardHeader>
          <CardTitle className={styles["sectionTitle"]}>
            <TbPhoto />
            {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.scans.title)}
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
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic Azure Blob URL not configured in next.config remotePatterns
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
            {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.title)}
          </CardTitle>
        </CardHeader>
        <CardContent className={styles["detailsContent"]}>
          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbFileDescription />
              {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.name)}
            </div>
            <div className={styles["detailValue"]}>{invoiceDetails.name}</div>
          </div>

          {/* Classification replaces legacy category */}
          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCategory />
              {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.classification)}
            </div>
            <div className={styles["detailValue"]}>
              {classificationSelection !== null ? (
                <Badge variant='outline'>{classificationSelection.code}</Badge>
              ) : (
                <span className={styles["noClassification"]}>
                  {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.noClassification)}
                </span>
              )}
            </div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCreditCard />
              {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.paymentType)}
            </div>
            <div className={styles["detailValue"]}>
              <Badge variant='outline'>
                {t(
                  selectorFromPath(
                    `forms.invoices.createInvoice.reviewStep.paymentTypes.${PAYMENT_TYPE_KEYS[invoiceDetails.paymentType] ?? "unknown"}`,
                  ),
                )}
              </Badge>
            </div>
          </div>

          <div className={styles["detailRow"]}>
            <div className={styles["detailLabel"]}>
              <TbCalendar />
              {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.transactionDate)}
            </div>
            <div className={styles["detailValue"]}>{format.dateTime(invoiceDetails.transactionDate, {dateStyle: "long"})}</div>
          </div>

          {invoiceDetails.description ? (
            <div className={styles["detailRow"]}>
              <div className={styles["detailLabel"]}>
                <TbFileDescription />
                {t((m) => m.forms.invoices.createInvoice.reviewStep.sections.details.description)}
              </div>
              <div className={styles["detailValue"]}>{invoiceDetails.description}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Create / Retry Button */}
      <div className={styles["createSection"]}>
        <Button
          size='lg'
          onClick={createInvoiceWithScans}
          disabled={isCreating}
          className={styles["createButton"]}>
          {createButtonContent}
        </Button>
        <p className={styles["createHint"]}>{t((m) => m.forms.invoices.createInvoice.reviewStep.actions.hint)}</p>
      </div>
    </div>
  );
}
