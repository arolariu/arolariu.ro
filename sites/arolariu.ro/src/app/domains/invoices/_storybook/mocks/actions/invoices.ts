/**
 * @fileoverview Storybook-safe invoice server action mocks.
 * @module app/domains/invoices/_storybook/mocks/actions/invoices
 *
 * @remarks
 * Exports all invoice server action symbols with Storybook-safe implementations.
 * These mocks return realistic success results without backend dependencies.
 */

import type {Invoice} from "@/types/invoices";
import {logStoryAction, successfulStoryAction, type StoryActionResult} from "../../utils/storyActions";
import {storyInvoice, storyInvoices, storyProducts} from "../../fixtures/invoiceFixtures";

/** Analyzes an invoice (mock). */
export async function analyzeInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("analyzeInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
	return successfulStoryAction(storyInvoice);
}

/** Patches an invoice (mock). */
export async function patchInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("patchInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Deletes an invoice (mock). */
export async function deleteInvoice(): Promise<StoryActionResult<{invoiceId: string}>> {
	logStoryAction("deleteInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction({invoiceId: storyInvoice.id});
}

/** Fetches a single invoice (mock). */
export async function fetchInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("fetchInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 200));
	return successfulStoryAction(storyInvoice);
}

/** Fetches all invoices (mock). */
export async function fetchInvoices(): Promise<StoryActionResult<Invoice[]>> {
	logStoryAction("fetchInvoices");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoices as Invoice[]);
}

/** Updates an invoice (mock). */
export async function updateInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("updateInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Creates an invoice (mock). */
export async function createInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("createInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
	return successfulStoryAction(storyInvoice);
}

/** Attaches a scan to an invoice (mock). */
export async function attachScanToInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("attachScanToInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Detaches a scan from an invoice (mock). */
export async function detachScanFromInvoice(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("detachScanFromInvoice");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Adds metadata to an invoice (mock). */
export async function addInvoiceMetadata(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("addInvoiceMetadata");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Deletes metadata from an invoice (mock). */
export async function deleteInvoiceMetadata(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("deleteInvoiceMetadata");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Adds a product to an invoice (mock). */
export async function addInvoiceProduct(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("addInvoiceProduct");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
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
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyInvoice);
}

/** Deletes a product from an invoice (mock). */
export async function deleteInvoiceProduct(): Promise<StoryActionResult<Invoice>> {
	logStoryAction("deleteInvoiceProduct");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	const updatedInvoice: Invoice = {
		...storyInvoice,
		items: storyInvoice.items.slice(0, -1),
	};
	return successfulStoryAction(updatedInvoice);
}
