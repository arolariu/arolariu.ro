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
import type {Invoice, Recipe} from "@/types/invoices";
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

/**
 * Storybook-safe recipe add hook.
 *
 * @param invoice - The invoice to add the recipe to.
 * @returns Hook state with add progress and the add callback.
 */
export function useRecipeAdd(invoice: Invoice): Readonly<{
	isAdding: boolean;
	addRecipeCallback: (recipe: Recipe) => Promise<Invoice>;
}> {
	const [isAdding, setIsAdding] = useState(false);

	const addRecipeCallback = useCallback(
		async (recipe: Recipe): Promise<Invoice> => {
			setIsAdding(true);
			try {
				logStoryAction("addRecipeCallback", {recipeName: recipe.name});
				await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
				return {
					...invoice,
					possibleRecipes: [...(invoice.possibleRecipes ?? []), recipe],
				};
			} finally {
				setIsAdding(false);
			}
		},
		[invoice],
	);

	return {isAdding, addRecipeCallback} as const;
}

/**
 * Storybook-safe recipe update hook.
 *
 * @param invoice - The invoice to update the recipe on.
 * @returns Hook state with update progress and the update callback.
 */
export function useRecipeUpdate(invoice: Invoice): Readonly<{
	isUpdating: boolean;
	updateRecipeCallback: (recipeName: string, updated: Recipe) => Promise<Invoice>;
}> {
	const [isUpdating, setIsUpdating] = useState(false);

	const updateRecipeCallback = useCallback(
		async (recipeName: string, updated: Recipe): Promise<Invoice> => {
			setIsUpdating(true);
			try {
				logStoryAction("updateRecipeCallback", {recipeName, updatedName: updated.name});
				await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
				const updatedRecipes = (invoice.possibleRecipes ?? []).map((r) => (r.name === recipeName ? updated : r));
				return {
					...invoice,
					possibleRecipes: updatedRecipes,
				};
			} finally {
				setIsUpdating(false);
			}
		},
		[invoice],
	);

	return {isUpdating, updateRecipeCallback} as const;
}

/**
 * Storybook-safe recipe delete hook.
 *
 * @param invoice - The invoice to delete the recipe from.
 * @returns Hook state with delete progress and the delete callback.
 */
export function useRecipeDelete(invoice: Invoice): Readonly<{
	isDeleting: boolean;
	removeRecipeCallback: (recipeName: string) => Promise<Invoice>;
}> {
	const [isDeleting, setIsDeleting] = useState(false);

	const removeRecipeCallback = useCallback(
		async (recipeName: string): Promise<Invoice> => {
			setIsDeleting(true);
			try {
				logStoryAction("removeRecipeCallback", {recipeName});
				await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
				const updatedRecipes = (invoice.possibleRecipes ?? []).filter((r) => r.name !== recipeName);
				return {
					...invoice,
					possibleRecipes: updatedRecipes,
				};
			} finally {
				setIsDeleting(false);
			}
		},
		[invoice],
	);

	return {isDeleting, removeRecipeCallback} as const;
}
