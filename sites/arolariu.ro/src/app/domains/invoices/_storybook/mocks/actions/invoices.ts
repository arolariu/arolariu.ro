/**
 * @fileoverview Storybook-safe invoice server action mocks.
 * @module app/domains/invoices/_storybook/mocks/actions/invoices
 *
 * @remarks
 * Exports all invoice server action symbols with Storybook-safe implementations.
 * These mocks return realistic success results without backend dependencies.
 */

import type {Invoice} from "@/types/invoices";
import {
	logStoryAction,
	STORYBOOK_LATENCY,
	successfulStoryAction,
	type StoryActionResult,
	waitForStorybookLatency,
} from "../../utils/storyActions";
import {storyInvoice, storyInvoices, storyProducts} from "../../fixtures/invoiceFixtures";

/** Analyzes an invoice (mock). */
export async function analyzeInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("analyzeInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.long);
	return successfulStoryAction(storyInvoice);
}

/** Patches an invoice (mock). */
export async function patchInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("patchInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Deletes an invoice (mock). */
export async function deleteInvoice(): Promise<StoryActionResult<{invoiceId: string}>> {
	logStoryAction("deleteInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction({invoiceId: storyInvoice.id});
}

/** Fetches a single invoice (mock). */
export async function fetchInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("fetchInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.short);
	return successfulStoryAction(storyInvoice);
}

/** Fetches all invoices (mock). */
export async function fetchInvoices(): Promise<StoryActionResult<Invoice[]>> {
	logStoryAction("fetchInvoices");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoices as Invoice[]);
}

/** Updates an invoice (mock). */
export async function updateInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("updateInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Creates an invoice (mock). */
export async function createInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("createInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.long);
	return successfulStoryAction(storyInvoice);
}

/** Attaches a scan to an invoice (mock). */
export async function attachScanToInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("attachScanToInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Detaches a scan from an invoice (mock). */
export async function detachScanFromInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("detachScanFromInvoice");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Adds metadata to an invoice (mock). */
export async function addInvoiceMetadata(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("addInvoiceMetadata");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Deletes metadata from an invoice (mock). */
export async function deleteInvoiceMetadata(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("deleteInvoiceMetadata");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Adds a product to an invoice (mock). */
export async function addInvoiceProduct(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("addInvoiceProduct");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	const [firstProduct] = storyProducts;
	if (!firstProduct) {
		return successfulStoryAction(storyInvoice);
	}

	const updatedInvoice: Invoice = {
		...storyInvoice,
		items: [...storyInvoice.items, firstProduct],
	};
	return successfulStoryAction(updatedInvoice);
}

/** Updates a product in an invoice (mock). */
export async function updateInvoiceProduct(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("updateInvoiceProduct");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyInvoice);
}

/** Deletes a product from an invoice (mock). */
export async function deleteInvoiceProduct(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("deleteInvoiceProduct");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	const updatedInvoice: Invoice = {
		...storyInvoice,
		items: storyInvoice.items.slice(0, -1),
	};
	return successfulStoryAction(updatedInvoice);
}
