"use client";

/**
 * @fileoverview Storybook-safe invoice hook mocks.
 * @module app/domains/invoices/_storybook/mocks/hooks/invoice
 *
 * @remarks
 * Exports Storybook-safe implementations of invoice hooks matching production signatures.
 * These mocks provide realistic loading states and action logging without backend dependencies.
 */

import {useState, useCallback} from "react";
import type {Invoice} from "@/types/invoices";
import {logStoryAction} from "../../utils/storyActions";

/**
 * Bulk delete result.
 */
type BulkDeleteResult = Readonly<{
	successCount: number;
	failureCount: number;
	failedIds: readonly string[];
}>;

/**
 * Storybook-safe invoice delete hook.
 *
 * @returns Hook state with deletion progress and the delete callback.
 */
export function useInvoiceDelete(): Readonly<{
	isDeleting: boolean;
	deleteInvoiceCallback: {
		(invoiceId: string): Promise<void>;
		(invoiceIds: readonly string[]): Promise<BulkDeleteResult>;
	};
}> {
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteInvoiceCallback = useCallback(
		async (invoiceIdOrIds: string | readonly string[]): Promise<void | BulkDeleteResult> => {
			setIsDeleting(true);
			try {
				if (typeof invoiceIdOrIds === "string") {
					// Single deletion
					logStoryAction("deleteInvoiceCallback (single)", {invoiceId: invoiceIdOrIds});
					await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
					return;
				} else {
					// Bulk deletion
					logStoryAction("deleteInvoiceCallback (bulk)", {count: invoiceIdOrIds.length});
					await new Promise((resolve) => globalThis.setTimeout(resolve, 800));
					return {
						successCount: invoiceIdOrIds.length,
						failureCount: 0,
						failedIds: [],
					};
				}
			} finally {
				setIsDeleting(false);
			}
		},
		[],
	) as {
		(invoiceId: string): Promise<void>;
		(invoiceIds: readonly string[]): Promise<BulkDeleteResult>;
	};

	return {isDeleting, deleteInvoiceCallback} as const;
}

/**
 * Bulk share result.
 */
type BulkShareResult = Readonly<{
	successCount: number;
	failureCount: number;
	failedIds: readonly string[];
	updatedInvoices: readonly Invoice[];
}>;

/**
 * Share action discriminated union.
 */
type ShareAction =
	| Readonly<{type: "togglePublic"}>
	| Readonly<{type: "revoke"; userIdToRemove?: string}>
	| Readonly<{type: "sendEmail"; to: string; locale: string; fromUsername?: string; replyTo?: string}>;

/**
 * Storybook-safe invoice share hook.
 *
 * @returns Hook state with sharing progress and the share callback.
 */
export function useInvoiceShare(): Readonly<{
	isSharing: boolean;
	shareInvoiceCallback: {
		(invoiceId: string, action: ShareAction): Promise<Invoice | null>;
		(invoiceIds: readonly string[], action: ShareAction): Promise<BulkShareResult>;
	};
}> {
	const [isSharing, setIsSharing] = useState(false);

	const shareInvoiceCallback = useCallback(
		async (invoiceIdOrIds: string | readonly string[], action: ShareAction): Promise<Invoice | null | BulkShareResult> => {
			setIsSharing(true);
			try {
				if (typeof invoiceIdOrIds === "string") {
					// Single share
					logStoryAction("shareInvoiceCallback (single)", {invoiceId: invoiceIdOrIds, action: action.type});
					await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
					return null;
				} else {
					// Bulk share
					logStoryAction("shareInvoiceCallback (bulk)", {count: invoiceIdOrIds.length, action: action.type});
					await new Promise((resolve) => globalThis.setTimeout(resolve, 800));
					return {
						successCount: invoiceIdOrIds.length,
						failureCount: 0,
						failedIds: [],
						updatedInvoices: [],
					};
				}
			} finally {
				setIsSharing(false);
			}
		},
		[],
	) as {
		(invoiceId: string, action: ShareAction): Promise<Invoice | null>;
		(invoiceIds: readonly string[], action: ShareAction): Promise<BulkShareResult>;
	};

	return {isSharing, shareInvoiceCallback} as const;
}
