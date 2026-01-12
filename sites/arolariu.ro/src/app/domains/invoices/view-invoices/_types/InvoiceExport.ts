/**
 * @fileoverview Types for exporting invoices from the UI.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_types/InvoiceExport
 */

export type InvoiceExportFormat = "csv" | "pdf" | "json";

export type InvoiceExportRequest = {
  format: InvoiceExportFormat;
  includeMetadata: boolean;
  includeMerchant: boolean;
  includeProducts: boolean;
  csvOptions?: {
    delimiter: string;
    includeHeaders: boolean;
  };
  jsonOptions?: {
    prettyPrint: boolean;
  };
  pdfOptions?: {
    orientation: "portrait" | "landscape";
    pageSize: "A4" | "A5" | "Letter";
  };
};

export type InvoiceExportAsCSV = {
  delimiter: string;
  includeHeaders: boolean;
};

export type InvoiceExportAsPDF = {};

export type InvoiceExportAsJSON = {};

export type InvoiceExportWrapper =
  | {selectedFormat: "csv"; object: InvoiceExportAsCSV}
  | {selectedFormat: "pdf"; object: InvoiceExportAsPDF}
  | {selectedFormat: "json"; object: InvoiceExportAsJSON};
