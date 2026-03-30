/**
 * @fileoverview Export Dialog component for exporting invoice data in various formats.
 * @module domains/invoices/view-invoice/[id]/components/dialogs/ExportDialog
 *
 * @remarks
 * Provides multiple export options for invoice data:
 * - **Print**: Triggers browser print dialog (uses existing print styles)
 * - **CSV**: Exports invoice items as CSV (product name, quantity, price, total, category)
 * - **JSON**: Exports full invoice data as formatted JSON
 * - **Copy Summary**: Copies a text summary to clipboard
 *
 * **Export Formats:**
 * - CSV: Simple comma-separated values for spreadsheet import
 * - JSON: Complete invoice data structure for programmatic use
 * - Text Summary: Human-readable summary for sharing
 *
 * **User Experience:**
 * - Toast notifications for successful exports
 * - Clear visual hierarchy with icons
 * - Responsive layout with grid of export options
 * - Automatic file download for CSV and JSON formats
 *
 * **Performance:**
 * - All export handlers are memoized with `useCallback`
 * - Blob generation happens on-demand, not during render
 */

"use client";

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbClipboard, TbCode, TbFileTypeCsv, TbPrinter} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./ExportDialog.module.scss";

/**
 * Export Dialog component with multiple export format options.
 *
 * @remarks
 * **Export Options:**
 *
 * 1. **Print**: Triggers `window.print()` to use browser print dialog
 *    - Utilizes existing print styles from PrintStyles.module.scss
 *    - Invoice layout is optimized for printing
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
  const t = useTranslations("Invoices.ViewInvoice.export");
  const {invoice, merchant} = useInvoiceContext();
  const {isOpen, close} = useDialog("VIEW_INVOICE__EXPORT");

  /**
   * Handles triggering the browser print dialog.
   *
   * @remarks
   * Uses `window.print()` to trigger the native print dialog.
   * The invoice page has print-specific styles that will be applied.
   */
  const handlePrint = useCallback((): void => {
    try {
      window.print();
      toast.success(t("printSuccess"));
      close();
    } catch (error) {
      console.error("Failed to trigger print:", error);
      toast.error(t("printError"));
    }
  }, [close, t]);

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
          `"${item.name.replace(/"/g, '""')}"`, // Escape quotes in product name
          item.quantity.toString(),
          item.unitPrice.toFixed(2),
          item.totalPrice.toFixed(2),
          `"${item.category}"`,
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
      const paymentDate = new Date(invoice.paymentInformation.paymentDate).toLocaleDateString();
      const summary = `
Invoice: ${invoice.name}
Merchant: ${merchant.name}
Date: ${paymentDate}
Total: $${invoice.paymentInformation.totalCostAmount.toFixed(2)}
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
          {/* Print Option */}
          <motion.div
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.98}}>
            <Button
              variant='outline'
              className={styles["exportButton"]}
              onClick={handlePrint}>
              <TbPrinter className={styles["buttonIcon"]} />
              <div className={styles["buttonContent"]}>
                <span className={styles["buttonTitle"]}>{t("print.title")}</span>
                <span className={styles["buttonDescription"]}>{t("print.description")}</span>
              </div>
            </Button>
          </motion.div>

          {/* CSV Export Option */}
          <motion.div
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.98}}>
            <Button
              variant='outline'
              className={styles["exportButton"]}
              onClick={handleExportCSV}>
              <TbFileTypeCsv className={styles["buttonIcon"]} />
              <div className={styles["buttonContent"]}>
                <span className={styles["buttonTitle"]}>{t("csv.title")}</span>
                <span className={styles["buttonDescription"]}>{t("csv.description")}</span>
              </div>
            </Button>
          </motion.div>

          {/* JSON Export Option */}
          <motion.div
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.98}}>
            <Button
              variant='outline'
              className={styles["exportButton"]}
              onClick={handleExportJSON}>
              <TbCode className={styles["buttonIcon"]} />
              <div className={styles["buttonContent"]}>
                <span className={styles["buttonTitle"]}>{t("json.title")}</span>
                <span className={styles["buttonDescription"]}>{t("json.description")}</span>
              </div>
            </Button>
          </motion.div>

          {/* Copy Summary Option */}
          <motion.div
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.98}}>
            <Button
              variant='outline'
              className={styles["exportButton"]}
              onClick={handleCopySummary}>
              <TbClipboard className={styles["buttonIcon"]} />
              <div className={styles["buttonContent"]}>
                <span className={styles["buttonTitle"]}>{t("copySummary.title")}</span>
                <span className={styles["buttonDescription"]}>{t("copySummary.description")}</span>
              </div>
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
