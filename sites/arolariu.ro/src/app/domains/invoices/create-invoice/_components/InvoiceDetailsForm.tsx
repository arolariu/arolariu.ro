"use client";

/**
 * @fileoverview Invoice details form component for step 2 of create wizard.
 * @module app/domains/invoices/create-invoice/_components/InvoiceDetailsForm
 *
 * @remarks
 * Form with fields for:
 * - Invoice name (required)
 * - Category dropdown
 * - Payment type dropdown
 * - Transaction date picker
 * - Description textarea (optional)
 */

import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbCalendar, TbFileTypePdf} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./InvoiceDetailsForm.module.scss";

const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: "long"});

/**
 * Scan thumbnail preview component.
 */
function ScanThumbnail({scan}: Readonly<{scan: {name: string; blobUrl: string; scanType: string}}>): React.JSX.Element {
  const t = useTranslations("IMS--Create.detailsForm");
  const isPdf = scan.scanType === "PDF";

  return (
    <Card className={styles["thumbnailCard"]}>
      <CardContent className={styles["thumbnailContent"]}>
        <div className={styles["thumbnailHeader"]}>
          <h3 className={styles["thumbnailTitle"]}>{t("scanPreview.title")}</h3>
          <span className={styles["scanName"]}>{scan.name}</span>
        </div>
        <div className={styles["thumbnailImageWrapper"]}>
          {isPdf ? (
            <div className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
              <span className={styles["pdfLabel"]}>PDF</span>
            </div>
          ) : (
            <img
              src={scan.blobUrl}
              alt={scan.name}
              className={styles["thumbnailImage"]}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Invoice details form component.
 *
 * @returns JSX element with form UI
 */
export default function InvoiceDetailsForm(): React.JSX.Element {
  const t = useTranslations("IMS--Create.detailsForm");
  const {invoiceDetails, setName, setCategory, setPaymentType, setTransactionDate, setDescription, selectedScans} =
    useCreateInvoiceContext();

  // Get first selected scan for preview
  const firstScan = selectedScans[0];

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t("title")}</h2>
        <p className={styles["subtitle"]}>{t("subtitle")}</p>
      </div>

      <div className={styles["contentWrapper"]}>
        {/* Scan Thumbnail - shown on mobile top, desktop right */}
        {firstScan && (
          <div className={styles["thumbnailColumn"]}>
            <ScanThumbnail scan={firstScan} />
          </div>
        )}

        {/* Form Column */}
        <Card className={styles["formCard"]}>
          <CardContent className={styles["formContent"]}>
            {/* Invoice Name */}
            <div className={styles["formField"]}>
              <Label htmlFor='invoice-name'>{t("fields.name.label")}</Label>
              <Input
                id='invoice-name'
                type='text'
                placeholder={t("fields.name.placeholder")}
                value={invoiceDetails.name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className={styles["fieldHint"]}>{t("fields.name.hint")}</p>
            </div>

            {/* Category */}
            <div className={styles["formField"]}>
              <Label htmlFor='invoice-category'>{t("fields.category.label")}</Label>
              <Select
                value={invoiceDetails.category.toString()}
                onValueChange={(value) => setCategory(Number.parseInt(value) as InvoiceCategory)}>
                <SelectTrigger id='invoice-category'>
                  <SelectValue placeholder={t("fields.category.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={InvoiceCategory.NOT_DEFINED.toString()}>{t("fields.category.options.notDefined")}</SelectItem>
                  <SelectItem value={InvoiceCategory.GROCERY.toString()}>{t("fields.category.options.grocery")}</SelectItem>
                  <SelectItem value={InvoiceCategory.FAST_FOOD.toString()}>{t("fields.category.options.fastFood")}</SelectItem>
                  <SelectItem value={InvoiceCategory.HOME_CLEANING.toString()}>{t("fields.category.options.homeCleaning")}</SelectItem>
                  <SelectItem value={InvoiceCategory.CAR_AUTO.toString()}>{t("fields.category.options.carAuto")}</SelectItem>
                  <SelectItem value={InvoiceCategory.OTHER.toString()}>{t("fields.category.options.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Type */}
            <div className={styles["formField"]}>
              <Label htmlFor='payment-type'>{t("fields.paymentType.label")}</Label>
              <Select
                value={invoiceDetails.paymentType.toString()}
                onValueChange={(value) => setPaymentType(Number.parseInt(value) as PaymentType)}>
                <SelectTrigger id='payment-type'>
                  <SelectValue placeholder={t("fields.paymentType.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.Unknown.toString()}>{t("fields.paymentType.options.unknown")}</SelectItem>
                  <SelectItem value={PaymentType.Cash.toString()}>{t("fields.paymentType.options.cash")}</SelectItem>
                  <SelectItem value={PaymentType.Card.toString()}>{t("fields.paymentType.options.card")}</SelectItem>
                  <SelectItem value={PaymentType.Transfer.toString()}>{t("fields.paymentType.options.transfer")}</SelectItem>
                  <SelectItem value={PaymentType.MobilePayment.toString()}>{t("fields.paymentType.options.mobilePayment")}</SelectItem>
                  <SelectItem value={PaymentType.Voucher.toString()}>{t("fields.paymentType.options.voucher")}</SelectItem>
                  <SelectItem value={PaymentType.Other.toString()}>{t("fields.paymentType.options.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Date */}
            <div className={styles["formField"]}>
              <Label htmlFor='transaction-date'>{t("fields.transactionDate.label")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id='transaction-date'
                    variant='outline'
                    className={styles["dateButton"]}>
                    <TbCalendar className={styles["calendarIcon"]} />
                    {dateFormatter.format(invoiceDetails.transactionDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={styles["calendarPopover"]}
                  align='start'>
                  <Calendar
                    mode='single'
                    selected={invoiceDetails.transactionDate}
                    onSelect={(date) => date && setTransactionDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className={styles["formField"]}>
              <Label htmlFor='invoice-description'>{t("fields.description.label")}</Label>
              <Textarea
                id='invoice-description'
                placeholder={t("fields.description.placeholder")}
                value={invoiceDetails.description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={styles["descriptionTextarea"]}
              />
              <p className={styles["fieldHint"]}>{t("fields.description.hint")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
