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

"use client";

import {formatAmount, formatDate} from "@/lib/utils.generic";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {pdf} from "@react-pdf/renderer";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbChevronRight, TbClipboard, TbCode, TbFileSpreadsheet, TbFileTypePdf} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {InvoicePDF} from "../export/InvoicePDF";
import styles from "./ExportDialog.module.scss";

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
  const t = useTranslations("IMS--View.export");
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
      const headers = ["Product Name", "Quantity", "Price", "Total", "Category"];
      const csvRows = [headers.join(",")];

      // CSV Rows - one per product
      for (const item of invoice.items) {
        const row = [
          `"${(item.genericName || item.rawName).replace(/"/g, '""')}"`, // Escape quotes in product name
          item.quantity.toString(),
          formatAmount(item.price),
          formatAmount(item.totalPrice),
          `"${String(item.category).replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("csvSuccess"));
      close();
    } catch (error) {
      console.error("Failed to export CSV:", error);
      toast.error(t("csvError"));
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("jsonSuccess"));
      close();
    } catch (error) {
      console.error("Failed to export JSON:", error);
      toast.error(t("jsonError"));
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
      const paymentDate = formatDate(invoice.paymentInformation.transactionDate, {locale: "en-US"});
      const summary = `
Invoice: ${invoice.name}
Merchant: ${merchant?.name ?? "N/A"}
Date: ${paymentDate}
Total: $${formatAmount(invoice.paymentInformation.totalCostAmount)}
Items: ${invoice.items.length}
      `.trim();

      await navigator.clipboard.writeText(summary);
      toast.success(t("copySuccess"));
      close();
    } catch (error) {
      console.error("Failed to copy summary:", error);
      toast.error(t("copyError"));
    }
  }, [invoice, merchant, close, t]);

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
    const loadingToastId = toast.loading(t("pdfGenerating"));

    try {
      // Generate PDF blob
      const blob = await pdf(
        <InvoicePDF
          invoice={invoice}
          merchant={merchant}
        />,
      ).toBlob();

      // Create filename with invoice name and date
      const transactionDate = new Date(invoice.paymentInformation.transactionDate).toISOString().split("T")[0]; // YYYY-MM-DD
      const safeName = invoice.name.replace(/[^a-z0-9]/gi, "-").toLowerCase(); // Sanitize name
      const filename = `invoice-${safeName}-${transactionDate}.pdf`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToastId);
      toast.success(t("pdfSuccess"));
      close();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.dismiss(loadingToastId);
      toast.error(t("pdfError"));
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [invoice, merchant, close, t]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className={styles["exportOptions"]}>
          {/* PDF Export Card */}
          <button
            className={styles["exportCard"]}
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}>
            <div className={styles["exportCardIcon"]}>
              <TbFileTypePdf />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t("pdf.title")}</h3>
              <p>{t("pdf.description")}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>

          {/* CSV Export Card */}
          <button
            className={styles["exportCard"]}
            onClick={handleExportCSV}>
            <div className={styles["exportCardIcon"]}>
              <TbFileSpreadsheet />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t("csv.title")}</h3>
              <p>{t("csv.description")}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>

          {/* JSON Export Card */}
          <button
            className={styles["exportCard"]}
            onClick={handleExportJSON}>
            <div className={styles["exportCardIcon"]}>
              <TbCode />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t("json.title")}</h3>
              <p>{t("json.description")}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>

          {/* Copy Summary Card */}
          <button
            className={styles["exportCard"]}
            onClick={handleCopySummary}>
            <div className={styles["exportCardIcon"]}>
              <TbClipboard />
            </div>
            <div className={styles["exportCardContent"]}>
              <h3>{t("copySummary.title")}</h3>
              <p>{t("copySummary.description")}</p>
            </div>
            <TbChevronRight className={styles["exportCardArrow"]} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
