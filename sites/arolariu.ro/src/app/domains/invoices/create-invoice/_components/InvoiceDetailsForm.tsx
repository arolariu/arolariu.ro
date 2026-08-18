"use client";

/**
 * @fileoverview Invoice details form component for step 2 of create wizard.
 * @module app/domains/invoices/create-invoice/_components/InvoiceDetailsForm
 *
 * @remarks
 * Form with fields for:
 * - Invoice name (required)
 * - Manual ECOICOP v2 classification search
 * - Payment type dropdown
 * - Transaction date picker
 * - Description textarea (optional)
 */

import {ClassificationSystem, PaymentType} from "@/types/invoices";
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
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbCalendar, TbFileTypePdf} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import {ClassificationPicker} from "../../_components/analysis/ClassificationPicker";
import styles from "./InvoiceDetailsForm.module.scss";

const dateFormatter = new Intl.DateTimeFormat(undefined, {dateStyle: "long"});

/**
 * Scan thumbnail preview component.
 */
function ScanThumbnail({scan}: Readonly<{scan: {name: string; blobUrl: string; scanType: string}}>): React.JSX.Element {
  const t = useTranslations();
  const isPdf = scan.scanType === "PDF";

  return (
    <Card className={styles["thumbnailCard"]}>
      <CardContent className={styles["thumbnailContent"]}>
        <div className={styles["thumbnailHeader"]}>
          <h3 className={styles["thumbnailTitle"]}>{t((m) => m.forms.invoices.createInvoice.detailsForm.scanPreview.title)}</h3>
          <span className={styles["scanName"]}>{scan.name}</span>
        </div>
        <div className={styles["thumbnailImageWrapper"]}>
          {isPdf ? (
            <div className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
              <span className={styles["pdfLabel"]}>PDF</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- scan thumbnails are dynamic Azure Blob URLs not configured in next.config remotePatterns; <Image unoptimized> adds no value
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
  const t = useTranslations();
  const {invoiceDetails, setName, setClassification, setPaymentType, setTransactionDate, setDescription, selectedScans} =
    useCreateInvoiceContext();

  /** Updates the invoice name as the user types. */
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    [setName],
  );

  /** Updates the payment type selection. */
  const handlePaymentTypeChange = useCallback(
    (value: string) => {
      setPaymentType(Number.parseInt(value, 10) as PaymentType);
    },
    [setPaymentType],
  );

  /** Updates the transaction date from the calendar picker. */
  const handleTransactionDateChange = useCallback(
    (date: Date | undefined) => {
      if (date) setTransactionDate(date);
    },
    [setTransactionDate],
  );

  /** Updates the invoice description as the user types. */
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
    },
    [setDescription],
  );

  // Get first selected scan for preview
  const [firstScan] = selectedScans;

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t((m) => m.forms.invoices.createInvoice.detailsForm.title)}</h2>
        <p className={styles["subtitle"]}>{t((m) => m.forms.invoices.createInvoice.detailsForm.subtitle)}</p>
      </div>

      <div className={styles["contentWrapper"]}>
        {/* Scan Thumbnail - shown on mobile top, desktop right */}
        {firstScan ? (
          <div className={styles["thumbnailColumn"]}>
            <ScanThumbnail scan={firstScan} />
          </div>
        ) : null}

        {/* Form Column */}
        <Card className={styles["formCard"]}>
          <CardContent className={styles["formContent"]}>
            {/* Invoice Name */}
            <div className={styles["formField"]}>
              <Label htmlFor='invoice-name'>{t((m) => m.forms.invoices.createInvoice.detailsForm.fields.name.label)}</Label>
              <Input
                id='invoice-name'
                type='text'
                placeholder={t((m) => m.forms.invoices.createInvoice.detailsForm.fields.name.placeholder)}
                value={invoiceDetails.name}
                onChange={handleNameChange}
                required
              />
              <p className={styles["fieldHint"]}>{t((m) => m.forms.invoices.createInvoice.detailsForm.fields.name.hint)}</p>
            </div>

            {/* ECOICOP v2 classification */}
            <div className={styles["formField"]}>
              <ClassificationPicker
                system={ClassificationSystem.EcoicopV2}
                value={invoiceDetails.classification}
                onChange={setClassification}
                allowClear
              />
            </div>

            {/* Payment Type */}
            <div className={styles["formField"]}>
              <Label htmlFor='payment-type'>{t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.label)}</Label>
              <Select
                value={invoiceDetails.paymentType.toString()}
                onValueChange={handlePaymentTypeChange}>
                <SelectTrigger id='payment-type'>
                  <SelectValue placeholder={t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.placeholder)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.Unknown.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.unknown)}
                  </SelectItem>
                  <SelectItem value={PaymentType.Cash.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.cash)}
                  </SelectItem>
                  <SelectItem value={PaymentType.Card.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.card)}
                  </SelectItem>
                  <SelectItem value={PaymentType.Transfer.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.transfer)}
                  </SelectItem>
                  <SelectItem value={PaymentType.MobilePayment.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.mobilePayment)}
                  </SelectItem>
                  <SelectItem value={PaymentType.Voucher.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.voucher)}
                  </SelectItem>
                  <SelectItem value={PaymentType.Other.toString()}>
                    {t((m) => m.forms.invoices.createInvoice.detailsForm.fields.paymentType.options.other)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Date */}
            <div className={styles["formField"]}>
              <Label htmlFor='transaction-date'>{t((m) => m.forms.invoices.createInvoice.detailsForm.fields.transactionDate.label)}</Label>
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
                    onSelect={handleTransactionDateChange}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Description */}
            <div className={styles["formField"]}>
              <Label htmlFor='invoice-description'>{t((m) => m.forms.invoices.createInvoice.detailsForm.fields.description.label)}</Label>
              <Textarea
                id='invoice-description'
                placeholder={t((m) => m.forms.invoices.createInvoice.detailsForm.fields.description.placeholder)}
                value={invoiceDetails.description}
                onChange={handleDescriptionChange}
                rows={4}
                className={styles["descriptionTextarea"]}
              />
              <p className={styles["fieldHint"]}>{t((m) => m.forms.invoices.createInvoice.detailsForm.fields.description.hint)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
