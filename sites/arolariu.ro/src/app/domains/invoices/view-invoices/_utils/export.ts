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
 * @example
 * ```ts
 * exportToJson(invoices, {
 *   includeMerchant: true,
 *   includeMetadata: false,
 *   includeProducts: true,
 *   jsonOptions: {
 *     prettyPrint: true,
 *   },
 * });
 * // Exports the invoices to a JSON file.
 * ```
 */
function exportToJson(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest): void {
  console.log(">>> jsonOptions:", options);
  const {includeMerchant, includeMetadata, includeProducts, jsonOptions} = options;
  const {prettyPrint} = jsonOptions ?? {};
  const jsonSpaces = prettyPrint ? 2 : 0;

  let jsonValue = [...invoices];
  if (!includeMerchant) {
    jsonValue = jsonValue.map((invoice) => {
      invoice.merchantReference = "";
      return invoice;
    });
  }

  if (!includeMetadata) {
    jsonValue = jsonValue.map((invoice) => {
      invoice.additionalMetadata = {};
      return invoice;
    });
  }

  if (!includeProducts) {
    jsonValue = jsonValue.map((invoice) => {
      invoice.items = [];
      return invoice;
    });
  }

  const json = JSON.stringify(jsonValue, null, jsonSpaces);
  const blob = new Blob([json], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = Date.now();
  link.href = url;
  link.download = `invoices_${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports the given invoices to a CSV file.
 * @param invoices The items to export to CSV format.
 * @param options The options for export such as delimiter symbol, column headers.
 */
function exportToCsv(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest): void {
  // TODO: impl of feature.
  console.log(">>> Exporting to CSV...", {invoices, options});
}

/**
 * Exports the given invoices to a PDF file.
 * @param invoices The items to export to PDF format.
 * @param options The options for export such as page size, orientation.
 */
function exportToPdf(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest): void {
  // TODO: impl of feature.
  console.log(">>> Exporting to PDF...", {invoices, options});
}

/**
 * Exports the given invoices to the specified format.
 * @param invoices The items to export.
 * @param options The options for export.
 */
export function exportInvoices(invoices: ReadonlyArray<Invoice>, options: InvoiceExportRequest): void {
  const {format} = options;
  switch (format) {
    case "json":
      exportToJson(invoices, options);
      break;
    case "csv":
      exportToCsv(invoices, options);
      break;
    case "pdf":
      exportToPdf(invoices, options);
      break;
    default:
      console.error(`>>> Unsupported export format: ${format}`);
      break;
  }
}
