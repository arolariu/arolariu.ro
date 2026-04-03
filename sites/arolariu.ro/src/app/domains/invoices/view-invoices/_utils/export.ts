/**
 * @fileoverview Client-side helpers for exporting invoice collections.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/export
 */

import type {Invoice} from "@/types/invoices/Invoice";
import type {InvoiceExportRequest} from "../_types/InvoiceExport";

/**
 * Exports the given invoices to a JSON file.
 * @param invoices The items to export to JSON format.
 * @param options The options for export such as pretty print.
 * @param filename The custom filename for the export (without extension).
 * @example
 * ```ts
 * exportToJson(invoices, {
 *   includeMerchant: true,
 *   includeMetadata: false,
 *   includeProducts: true,
 *   jsonOptions: {
 *     prettyPrint: true,
 *   },
 * }, "my-invoices-2024");
 * // Exports the invoices to a JSON file named "my-invoices-2024.json".
 * ```
 */
function exportToJson(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest, filename?: string): void {
  const {includeMerchant, includeMetadata, includeProducts, jsonOptions} = options;
  const {prettyPrint} = jsonOptions ?? {};
  const jsonSpaces = prettyPrint ? 2 : 0;

  const jsonValue = invoices.map((invoice) => {
    const copy = structuredClone(invoice);
    if (!includeMerchant) {
      copy.merchantReference = "";
    }
    if (!includeMetadata) {
      copy.additionalMetadata = {};
    }
    if (!includeProducts) {
      copy.items = [];
    }
    return copy;
  });

  const json = JSON.stringify(jsonValue, null, jsonSpaces);
  const blob = new Blob([json], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const defaultFilename = `invoices_${Date.now()}`;
  // Sanitize filename to prevent path traversal or invalid characters
  let safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, "_") : defaultFilename;
  // Handle edge cases after sanitization
  safeName = safeName.trim();
  if (!safeName || safeName === "." || safeName === "..") {
    safeName = defaultFilename;
  }
  link.href = url;
  link.download = `${safeName}.json`;
  link.click();
  // Delay revocation to ensure download completes in Safari
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Exports the given invoices to a CSV file.
 * @param invoices The items to export to CSV format.
 * @param options The options for export such as delimiter symbol, column headers.
 * @param filename The custom filename for the export (without extension).
 */
function exportToCsv(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest, filename?: string): void {
  void invoices;
  void options;
  void filename;
  throw new Error("CSV export is not yet implemented. Please use JSON export.");
}

/**
 * Exports the given invoices to a PDF file.
 * @param invoices The items to export to PDF format.
 * @param options The options for export such as page size, orientation.
 * @param filename The custom filename for the export (without extension).
 */
function exportToPdf(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest, filename?: string): void {
  void invoices;
  void options;
  void filename;
  throw new Error("PDF export is not yet implemented. Please use JSON export.");
}

/**
 * Exports the given invoices to the specified format.
 * @param invoices The items to export.
 * @param options The options for export.
 * @param filename The custom filename for the export (without extension).
 */
export function exportInvoices(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest, filename?: string): void {
  const {format} = options;
  switch (format) {
    case "json":
      exportToJson(invoices, options, filename);
      break;
    case "csv":
      exportToCsv(invoices, options, filename);
      break;
    case "pdf":
      exportToPdf(invoices, options, filename);
      break;
    default:
      throw new Error(`Unsupported export format: ${String(format)}`);
  }
}
