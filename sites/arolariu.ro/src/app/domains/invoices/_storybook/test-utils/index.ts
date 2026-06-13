import type {Invoice, Merchant} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";

import {storyInvoice, storyInvoices} from "../fixtures/invoiceFixtures";
import {storyMerchant, storyMerchants} from "../fixtures/merchantFixtures";
import {storyCachedImageScan, storyCachedPdfScan} from "../fixtures/scanFixtures";
import {resetInvoiceStoryStores, seedInvoiceStoryStores} from "../stores/invoiceStoryStores";

export {playOpenDialog} from "./dialogPlay";

/**
 * Resets and seeds stores for invoice-list stories.
 *
 * @param options - Optional story data overrides.
 */
export function setupInvoiceListStory(
  options: Readonly<{
    invoices?: ReadonlyArray<Invoice>;
    selectedInvoices?: readonly Invoice[];
    merchants?: ReadonlyArray<Merchant>;
  }> = {},
): void {
  resetInvoiceStoryStores();
  seedInvoiceStoryStores({
    invoices: options.invoices ?? storyInvoices,
    selectedInvoices: [...(options.selectedInvoices ?? [])],
    merchants: options.merchants ?? storyMerchants,
  });
}

/**
 * Resets and seeds stores for single-invoice view stories.
 *
 * @param options - Optional story data overrides.
 */
export function setupViewInvoiceStory(
  options: Readonly<{
    invoice?: Invoice;
    merchant?: Merchant;
  }> = {},
): void {
  const invoice = options.invoice ?? storyInvoice;
  resetInvoiceStoryStores();
  seedInvoiceStoryStores({
    invoices: [invoice],
    selectedInvoices: [invoice],
    merchants: [options.merchant ?? storyMerchant],
  });
}

/**
 * Resets and seeds stores for edit-invoice stories.
 *
 * @param options - Optional story data overrides.
 */
export function setupEditInvoiceStory(
  options: Readonly<{
    invoice?: Invoice;
    merchant?: Merchant;
  }> = {},
): void {
  setupViewInvoiceStory(options);
}

/**
 * Resets and seeds stores for scan-upload stories.
 *
 * @param options - Optional scan overrides.
 */
export function setupScanUploadStory(
  options: Readonly<{
    scans?: ReadonlyArray<CachedScan>;
    selectedScans?: readonly CachedScan[];
  }> = {},
): void {
  resetInvoiceStoryStores();
  seedInvoiceStoryStores({
    scans: options.scans ?? [storyCachedImageScan, storyCachedPdfScan],
    selectedScans: [...(options.selectedScans ?? [])],
  });
}
