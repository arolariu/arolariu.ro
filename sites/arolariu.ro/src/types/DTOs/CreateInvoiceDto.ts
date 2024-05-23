/** @format */

/**
 * Represents the data transfer object for creating an invoice.
 */
export type CreateInvoiceDto = {
  photoLocation: string;
  photoMetadata: Record<string, object>[];
};
