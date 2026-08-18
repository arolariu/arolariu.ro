"use client";

/**
 * @fileoverview Export Dialog component for exporting invoice data in various formats.
 * @module domains/invoices/view-invoice/[id]/components/dialogs/ExportDialog
 *
 * @remarks
 * Provides multiple export options for invoice data:
 * - **CSV**: Exports invoice items as CSV (product name, quantity, price, total, category)
 * - **JSON**: Exports full invoice data as formatted JSON
 * - **PDF**: Generates professional invoice document using @react-pdf/renderer
 * - **Copy Summary**: Copies a text summary to clipboard
 *
 * **Export Formats:**
 * - CSV: Simple comma-separated values for spreadsheet import
 * - JSON: Complete invoice data structure for programmatic use
 * - PDF: Professional multi-page invoice document
 * - Text Summary: Human-readable summary for sharing
 *
 * **User Experience:**
 * - Selection card pattern with rich descriptions
 * - Toast notifications for successful exports
 * - Clear visual hierarchy with icons, titles, and descriptions
 * - Vertical stack layout for better mobile experience
 * - Automatic file download for CSV and JSON formats
 *
 * **Performance:**
 * - All export handlers are memoized with `useCallback`
 * - Blob generation happens on-demand, not during render
 */

import {formatAmount, formatDate} from "@/lib/utils.generic";
import {PaymentType, RecipeDifficulty} from "@/types/invoices";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {pdf} from "@react-pdf/renderer";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbChevronRight, TbClipboard, TbCode, TbFileSpreadsheet, TbFileTypePdf} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {InvoicePDF} from "../_components/export/InvoicePDF";
import {useInvoiceContext} from "../_context/InvoiceContext";
import styles from "./ExportDialog.module.scss";

function assertUnreachable(value: never): never {
  throw new Error(String(value));
}

/**
 * Export Dialog component with multiple export format options.
 *
 * @remarks
 * **Export Options:**
 *
 * 1. **PDF Export**: Generates professional invoice document
 *    - Multi-page PDF with invoice overview and product table
 *    - Professional styling with merchant and payment information
 *    - Automatic download with filename: `invoice-{name}-{date}.pdf`
 *
 * 2. **CSV Export**: Exports invoice items as CSV
 *    - Headers: Product Name, Quantity, Price, Total, Category
 *    - One row per product
 *    - Automatic download with filename: `invoice-{id}.csv`
 *
 * 3. **JSON Export**: Exports complete invoice data
 *    - Formatted with 2-space indentation for readability
 *    - Automatic download with filename: `invoice-{id}.json`
 *
 * 4. **Copy Summary**: Copies text summary to clipboard
 *    - Includes: Merchant name, date, total amount, item count
 *    - Uses Clipboard API with toast feedback
 *
 * **UI Pattern:**
 * - Selection cards with icon, title, description, and arrow
 * - Vertical stack layout for better mobile readability
 * - Loading state for PDF generation
 *
 * **Error Handling:**
 * - Toast notifications for failures
 * - Console errors for debugging
 * - Graceful degradation for unsupported browsers
 *
 * @returns The export dialog component
 *
 * @example
 * ```tsx
 * // Opened via InvoiceHeader "Export" button:
 * const {open} = useDialog("VIEW_INVOICE__EXPORT");
 * <Button onClick={open}>Export</Button>
 * ```
 */
export function ExportDialog(): React.JSX.Element {
  const t = useTranslations();
  const locale = useLocale();
  const {invoice, merchant} = useInvoiceContext();
  const {isOpen, close} = useDialog("VIEW_INVOICE__EXPORT");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  /**
   * Handles exporting invoice items as CSV.
   *
   * @remarks
   * **CSV Format:**
   * ```
   * Product Name,Quantity,Price,Total,Category
   * "Product 1",2,10.50,21.00,"Category A"
   * "Product 2",1,5.99,5.99,"Category B"
   * ```
   *
   * **Implementation:**
   * 1. Builds CSV string with headers and rows
   * 2. Creates Blob with text/csv MIME type
   * 3. Generates object URL and triggers download
   * 4. Cleans up object URL after download
   */
  const handleExportCSV = useCallback((): void => {
    try {
      // CSV Headers
      const headers = [
        t((m) => m.pages.invoices.viewInvoice.export.csv.headers.productName),
        t((m) => m.pages.invoices.viewInvoice.export.csv.headers.quantity),
        t((m) => m.pages.invoices.viewInvoice.export.csv.headers.price),
        t((m) => m.pages.invoices.viewInvoice.export.csv.headers.total),
        t((m) => m.pages.invoices.viewInvoice.export.csv.headers.category),
      ];
      const csvRows = [headers.join(",")];

      // CSV Rows - one per product
      for (const item of invoice.items) {
        const row = [
          `"${item.name.replaceAll('"', '""')}"`, // Escape quotes in product name
          item.quantity.toString(),
          formatAmount(item.price),
          formatAmount(item.totalPrice),
          `"${(item.classification?.officialLabel ?? "").replaceAll('"', '""')}"`,
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.id}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(t((m) => m.pages.invoices.viewInvoice.export.csvSuccess));
      close();
    } catch {
      toast.error(t((m) => m.pages.invoices.viewInvoice.export.csvError));
    }
  }, [invoice, close, t]);

  /**
   * Handles exporting full invoice data as JSON.
   *
   * @remarks
   * **JSON Format:**
   * - Complete invoice object with 2-space indentation
   * - Includes all fields: items, payment info, merchant reference, metadata
   *
   * **Implementation:**
   * 1. Serializes invoice object with `JSON.stringify`
   * 2. Creates Blob with application/json MIME type
   * 3. Generates object URL and triggers download
   * 4. Cleans up object URL after download
   */
  const handleExportJSON = useCallback((): void => {
    try {
      const jsonContent = JSON.stringify(invoice, null, 2);
      const blob = new Blob([jsonContent], {type: "application/json;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.id}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(t((m) => m.pages.invoices.viewInvoice.export.jsonSuccess));
      close();
    } catch {
      toast.error(t((m) => m.pages.invoices.viewInvoice.export.jsonError));
    }
  }, [invoice, close, t]);

  /**
   * Handles copying invoice summary to clipboard.
   *
   * @remarks
   * **Summary Format:**
   * ```
   * Invoice: {name}
   * Merchant: {merchant.name}
   * Date: {payment date}
   * Total: ${total amount}
   * Items: {item count}
   * ```
   *
   * **Implementation:**
   * Uses Clipboard API with fallback error handling.
   */
  const handleCopySummary = useCallback(async (): Promise<void> => {
    try {
      const paymentDate = formatDate(invoice.paymentInformation.transactionDate, {locale});
      const summary = [
        `${t((m) => m.pages.invoices.viewInvoice.export.copySummary.labels.invoice)}: ${invoice.name}`,
        `${t((m) => m.pages.invoices.viewInvoice.export.copySummary.labels.merchant)}: ${
          merchant?.name ?? t((m) => m.pages.invoices.viewInvoice.export.copySummary.notAvailable)
        }`,
        `${t((m) => m.pages.invoices.viewInvoice.export.copySummary.labels.date)}: ${paymentDate}`,
        `${t((m) => m.pages.invoices.viewInvoice.export.copySummary.labels.total)}: ${formatAmount(
          invoice.paymentInformation.totalCostAmount,
        )}`,
        `${t((m) => m.pages.invoices.viewInvoice.export.copySummary.labels.items)}: ${invoice.items.length}`,
      ].join("\n");

      await navigator.clipboard.writeText(summary);
      toast.success(t((m) => m.pages.invoices.viewInvoice.export.copySuccess));
      close();
    } catch {
      toast.error(t((m) => m.pages.invoices.viewInvoice.export.copyError));
    }
  }, [close, invoice, locale, merchant, t]);

  /**
   * Handles exporting invoice as a professional PDF document.
   *
   * @remarks
   * **PDF Generation Process:**
   * 1. Shows loading state with toast notification
   * 2. Renders InvoicePDF component using @react-pdf/renderer
   * 3. Converts PDF document to Blob
   * 4. Creates download link and triggers download
   * 5. Cleans up object URL after download
   *
   * **Filename Format:**
   * `invoice-{name}-{date}.pdf`
   * - Name is sanitized to remove special characters
   * - Date is formatted as YYYY-MM-DD
   *
   * **Error Handling:**
   * - Catches PDF generation errors
   * - Shows error toast with descriptive message
   * - Logs error to console for debugging
   * - Ensures loading state is reset in finally block
   */
  const handleExportPDF = useCallback(async (): Promise<void> => {
    setIsGeneratingPDF(true);
    const loadingToastId = toast.loading(t((m) => m.pages.invoices.viewInvoice.export.pdfGenerating));

    try {
      // Generate PDF blob
      const blob = await pdf(
        <InvoicePDF
          invoice={invoice}
          merchant={merchant}
          locale={locale}
          labels={{
            reportTitle: t((m) => m.pages.invoices.viewInvoice.pdf.reportTitle),
            generatedOn: (date) => t((m) => m.pages.invoices.viewInvoice.pdf.generatedOn, {date}),
            invoiceInformation: t((m) => m.pages.invoices.viewInvoice.pdf.invoiceInformation),
            invoiceName: t((m) => m.pages.invoices.viewInvoice.pdf.invoiceName),
            description: t((m) => m.pages.invoices.viewInvoice.pdf.description),
            classification: t((m) => m.pages.invoices.viewInvoice.pdf.classification),
            invoiceIdentifier: t((m) => m.pages.invoices.viewInvoice.pdf.invoiceIdentifier),
            transactionDate: t((m) => m.pages.invoices.viewInvoice.pdf.transactionDate),
            receiptType: t((m) => m.pages.invoices.viewInvoice.pdf.receiptType),
            merchantInformation: t((m) => m.pages.invoices.viewInvoice.pdf.merchantInformation),
            merchantName: t((m) => m.pages.invoices.viewInvoice.pdf.merchantName),
            unknownMerchant: t((m) => m.pages.invoices.viewInvoice.pdf.unknownMerchant),
            fullName: t((m) => m.pages.invoices.viewInvoice.pdf.fullName),
            address: t((m) => m.pages.invoices.viewInvoice.pdf.address),
            phone: t((m) => m.pages.invoices.viewInvoice.pdf.phone),
            paymentSummary: t((m) => m.pages.invoices.viewInvoice.pdf.paymentSummary),
            subtotal: t((m) => m.pages.invoices.viewInvoice.pdf.subtotal),
            tax: t((m) => m.pages.invoices.viewInvoice.pdf.tax),
            tip: t((m) => m.pages.invoices.viewInvoice.pdf.tip),
            total: t((m) => m.pages.invoices.viewInvoice.pdf.total),
            currency: t((m) => m.pages.invoices.viewInvoice.pdf.currency),
            paymentMethod: t((m) => m.pages.invoices.viewInvoice.pdf.paymentMethod),
            items: t((m) => m.pages.invoices.viewInvoice.pdf.items),
            number: t((m) => m.pages.invoices.viewInvoice.pdf.number),
            product: t((m) => m.pages.invoices.viewInvoice.pdf.product),
            quantity: t((m) => m.pages.invoices.viewInvoice.pdf.quantity),
            unitPrice: t((m) => m.pages.invoices.viewInvoice.pdf.unitPrice),
            allergenAssessment: t((m) => m.pages.invoices.viewInvoice.pdf.allergenAssessment),
            allergenNotAssessed: t((m) => m.cards.invoices.analysisResults.allergens.notAssessed),
            allergenStatus: (status) => t((m) => m.cards.invoices.analysisResults.allergens[status]),
            allergenCode: (code) => t((m) => m.cards.invoices.analysisResults.allergens.codes[code]),
            allergenEvidenceLevel: (evidenceLevel) => t((m) => m.cards.invoices.analysisResults.allergens[evidenceLevel]),
            analysisSummary: t((m) => m.pages.invoices.viewInvoice.pdf.analysisSummary),
            numberOfItems: t((m) => m.pages.invoices.viewInvoice.pdf.numberOfItems),
            numberOfScans: t((m) => m.pages.invoices.viewInvoice.pdf.numberOfScans),
            recipes: t((m) => m.pages.invoices.viewInvoice.pdf.recipes),
            purchasedIngredients: t((m) => m.cards.invoices.analysisResults.recipes.purchasedIngredients),
            pantryStaples: t((m) => m.cards.invoices.analysisResults.recipes.pantryStaples),
            missingOptionalIngredients: t((m) => m.cards.invoices.analysisResults.recipes.missingOptionalIngredients),
            preparationSteps: t((m) => m.cards.invoices.analysisResults.recipes.steps),
            allergenWarnings: t((m) => m.cards.invoices.analysisResults.recipes.warnings),
            servings: (count) => t((m) => m.cards.invoices.analysisResults.recipes.servings, {count: String(count)}),
            preparationMinutes: (minutes) =>
              t((m) => m.cards.invoices.analysisResults.recipes.preparationMinutes, {minutes: String(minutes)}),
            cookingMinutes: (minutes) => t((m) => m.cards.invoices.analysisResults.recipes.cookingMinutes, {minutes: String(minutes)}),
            totalMinutes: (minutes) => t((m) => m.cards.invoices.analysisResults.recipes.totalMinutes, {minutes: String(minutes)}),
            classificationRoot: (label, code) => t((m) => m.cards.invoices.analysisResults.classification.root, {label, code}),
            classificationAnalysisOrigin: t((m) => m.cards.invoices.analysisResults.classification.analysisOrigin),
            classificationManualOrigin: t((m) => m.cards.invoices.analysisResults.classification.manualOrigin),
            classificationConfidence: (confidence) => t((m) => m.cards.invoices.analysisResults.classification.confidence, {confidence}),
            classificationHierarchy: t((m) => m.pages.invoices.viewInvoice.pdf.classificationHierarchy),
            classificationEvidence: t((m) => m.cards.invoices.analysisResults.classification.evidence),
            unclassified: t((m) => m.cards.invoices.analysisResults.unclassified),
            paymentType: (paymentType) => {
              switch (paymentType) {
                case PaymentType.Unknown:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.unknown);
                case PaymentType.Cash:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.cash);
                case PaymentType.Card:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.card);
                case PaymentType.Transfer:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.transfer);
                case PaymentType.MobilePayment:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.mobilePayment);
                case PaymentType.Voucher:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.voucher);
                case PaymentType.Other:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.paymentTypes.other);
                default:
                  return assertUnreachable(paymentType);
              }
            },
            recipeDifficulty: (difficulty) => {
              switch (difficulty) {
                case RecipeDifficulty.Easy:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.recipeDifficulty, {
                    difficulty: t((m) => m.pages.invoices.viewInvoice.pdf.difficulty.easy),
                  });
                case RecipeDifficulty.Medium:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.recipeDifficulty, {
                    difficulty: t((m) => m.pages.invoices.viewInvoice.pdf.difficulty.medium),
                  });
                case RecipeDifficulty.Hard:
                  return t((m) => m.pages.invoices.viewInvoice.pdf.recipeDifficulty, {
                    difficulty: t((m) => m.pages.invoices.viewInvoice.pdf.difficulty.hard),
                  });
                default:
                  return assertUnreachable(difficulty);
              }
            },
            page: (current, total) => t((m) => m.pages.invoices.viewInvoice.pdf.page, {current: String(current), total: String(total)}),
          }}
        />,
      ).toBlob();

      // Create filename with invoice name and date
      const [transactionDate] = new Date(invoice.paymentInformation.transactionDate).toISOString().split("T"); // YYYY-MM-DD
      const safeName = invoice.name.replaceAll(/[^a-z0-9]/gu, "-").toLowerCase(); // Sanitize name
      const filename = `invoice-${safeName}-${transactionDate}.pdf`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToastId);
      toast.success(t((m) => m.pages.invoices.viewInvoice.export.pdfSuccess));
      close();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.dismiss(loadingToastId);
      toast.error(t((m) => m.pages.invoices.viewInvoice.export.pdfError));
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [invoice, merchant, locale, close, t]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.pages.invoices.viewInvoice.export.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.pages.invoices.viewInvoice.export.description)}</DialogDescription>
        </DialogHeader>

        <div className={styles["exportOptions"]}>
          {/* PDF Export Card */}
          <button
            type='button'
            className={styles["exportCard"]}
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}>
            <div className={styles["exportCardIcon"]}>
              <TbFileTypePdf />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t((m) => m.pages.invoices.viewInvoice.export.pdf.title)}</h3>
              <p>{t((m) => m.pages.invoices.viewInvoice.export.pdf.description)}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>

          {/* CSV Export Card */}
          <button
            type='button'
            className={styles["exportCard"]}
            onClick={handleExportCSV}>
            <div className={styles["exportCardIcon"]}>
              <TbFileSpreadsheet />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t((m) => m.pages.invoices.viewInvoice.export.csv.title)}</h3>
              <p>{t((m) => m.pages.invoices.viewInvoice.export.csv.description)}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>

          {/* JSON Export Card */}
          <button
            type='button'
            className={styles["exportCard"]}
            onClick={handleExportJSON}>
            <div className={styles["exportCardIcon"]}>
              <TbCode />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t((m) => m.pages.invoices.viewInvoice.export.json.title)}</h3>
              <p>{t((m) => m.pages.invoices.viewInvoice.export.json.description)}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>

          {/* Copy Summary Card */}
          <button
            type='button'
            className={styles["exportCard"]}
            onClick={handleCopySummary}>
            <div className={styles["exportCardIcon"]}>
              <TbClipboard />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t((m) => m.pages.invoices.viewInvoice.export.copySummary.title)}</h3>
              <p>{t((m) => m.pages.invoices.viewInvoice.export.copySummary.description)}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
