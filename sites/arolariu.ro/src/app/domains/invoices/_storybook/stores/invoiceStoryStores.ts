/**
 * @fileoverview Store seed helpers for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/stores/invoiceStoryStores
 *
 * @remarks
 * Provides reset and seed utilities for all invoice-domain Zustand stores:
 * - `useInvoicesStore` (entity store)
 * - `useMerchantsStore` (entity store)
 * - `useScansStore` (hand-rolled store with custom actions)
 */

import {useInvoicesStore, useMerchantsStore, useScansStore} from "@/stores";
import type {Invoice, Merchant} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
import {storyInvoice, storyInvoices, storyMerchant, storyMerchants} from "../fixtures/invoiceFixtures";
import {storyCachedImageScan, storyCachedPdfScan} from "../fixtures/scanFixtures";

/**
 * Options for seeding invoice-domain stores.
 */
export interface SeedInvoiceStoryStoresOptions {
	/** Invoices to seed (defaults to storyInvoices) */
	readonly invoices?: ReadonlyArray<Invoice>;
	/** Selected invoice IDs (defaults to first invoice) */
	readonly selectedInvoices?: Invoice[];
	/** Merchants to seed (defaults to storyMerchants) */
	readonly merchants?: ReadonlyArray<Merchant>;
	/** Scans to seed (defaults to [storyCachedImageScan, storyCachedPdfScan]) */
	readonly scans?: ReadonlyArray<CachedScan>;
	/** Selected scans (defaults to empty) */
	readonly selectedScans?: CachedScan[];
}

/**
 * Resets all invoice-domain Zustand stores to empty state.
 *
 * @remarks
 * Clears:
 * - `useInvoicesStore`: entities and selectedEntities
 * - `useMerchantsStore`: entities and selectedEntities
 * - `useScansStore`: scans and selectedScans
 *
 * Call this before each story render to ensure clean state.
 *
 * @example
 * ```tsx
 * import {resetInvoiceStoryStores} from "@/app/domains/invoices/_storybook";
 *
 * export default {
 *   decorators: [
 *     (Story) => {
 *       resetInvoiceStoryStores();
 *       return <Story />;
 *     },
 *   ],
 * };
 * ```
 */
export function resetInvoiceStoryStores(): void {
	useInvoicesStore.getState().clearEntities();
	useMerchantsStore.getState().clearEntities();
	useScansStore.getState().clearScans();
}

/**
 * Seeds invoice-domain Zustand stores with fixture data.
 *
 * @remarks
 * Populates:
 * - `useInvoicesStore` with invoices (default: storyInvoices) and selectedEntities (default: first invoice)
 * - `useMerchantsStore` with merchants (default: storyMerchants)
 * - `useScansStore` with scans (default: [storyCachedImageScan, storyCachedPdfScan]) and selectedScans (default: empty)
 *
 * @param options - Seed configuration (all fields optional).
 *
 * @example
 * ```tsx
 * import {seedInvoiceStoryStores} from "@/app/domains/invoices/_storybook";
 *
 * seedInvoiceStoryStores({
 *   invoices: [storyInvoice],
 *   selectedInvoices: [storyInvoice],
 *   merchants: [storyMerchant],
 * });
 * ```
 */
export function seedInvoiceStoryStores(options: SeedInvoiceStoryStoresOptions = {}): void {
	const {
		invoices = storyInvoices,
		selectedInvoices = [storyInvoice],
		merchants = storyMerchants,
		scans = [storyCachedImageScan, storyCachedPdfScan],
		selectedScans = [],
	} = options;

	useInvoicesStore.getState().setEntities(invoices);
	useInvoicesStore.getState().setSelectedEntities(selectedInvoices);

	useMerchantsStore.getState().setEntities(merchants);

	useScansStore.getState().setScans(scans);
	useScansStore.getState().setSelectedScans(selectedScans);
}
