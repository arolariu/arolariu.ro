"use client";

/**
 * @fileoverview Storybook-safe scan hook mocks.
 * @module app/domains/invoices/_storybook/mocks/hooks/scan
 *
 * @remarks
 * Exports Storybook-safe implementations of scan hooks matching production signatures.
 * These mocks provide realistic loading states and action logging without backend dependencies.
 */

import {useState, useCallback} from "react";
import type {CachedScan} from "@/types/scans";
import type {InvoiceScanType} from "@/types/invoices";
import {logStoryAction} from "../../utils/storyActions";

/**
 * Scan add arguments.
 */
type ScanAddArgs = Readonly<{
	file: Blob;
	fileName: string;
	userIdentifier: string;
	type: InvoiceScanType;
}>;

/**
 * Storybook-safe scan add hook.
 *
 * @param invoiceId - The invoice identifier that receives the scan.
 * @returns Hook state with add progress and the scan add callback.
 */
export function useScanAdd(invoiceId: string): Readonly<{
	isAdding: boolean;
	addScanCallback: (args: ScanAddArgs) => Promise<void>;
}> {
	const [isAdding, setIsAdding] = useState(false);

	const addScanCallback = useCallback(
		async (args: ScanAddArgs): Promise<void> => {
			setIsAdding(true);
			try {
				logStoryAction("addScanCallback", {invoiceId, fileName: args.fileName});
				await new Promise((resolve) => globalThis.setTimeout(resolve, 800));
			} finally {
				setIsAdding(false);
			}
		},
		[invoiceId],
	);

	return {isAdding, addScanCallback} as const;
}

/**
 * Storybook-safe scan delete hook.
 *
 * @param scan - The standalone scan to delete.
 * @returns Hook state with deletion progress and the delete callback.
 */
export function useScanDelete(scan: CachedScan): Readonly<{
	isDeleting: boolean;
	deleteScanCallback: () => Promise<void>;
}> {
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteScanCallback = useCallback(async (): Promise<void> => {
		setIsDeleting(true);
		try {
			logStoryAction("deleteScanCallback", {scanId: scan.id});
			await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
		} finally {
			setIsDeleting(false);
		}
	}, [scan.id]);

	return {isDeleting, deleteScanCallback} as const;
}

/**
 * Storybook-safe scan rename hook (stub).
 *
 * @remarks
 * Provides a no-op implementation for stories that import this hook.
 * Update with realistic implementation if production barrel exports it.
 */
export function useScanRename(): Readonly<{
	isRenaming: boolean;
	renameScanCallback: (newName: string) => Promise<void>;
}> {
	const [isRenaming, setIsRenaming] = useState(false);

	const renameScanCallback = useCallback(async (newName: string): Promise<void> => {
		setIsRenaming(true);
		try {
			logStoryAction("renameScanCallback", {newName});
			await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
		} finally {
			setIsRenaming(false);
		}
	}, []);

	return {isRenaming, renameScanCallback} as const;
}

/**
 * Storybook-safe scan rotation hook (stub).
 *
 * @remarks
 * Provides a no-op implementation for stories that import this hook.
 * Update with realistic implementation if production barrel exports it.
 */
export function useScanRotation(): Readonly<{
	isRotating: boolean;
	rotateScanCallback: (direction: "cw" | "ccw") => Promise<void>;
}> {
	const [isRotating, setIsRotating] = useState(false);

	const rotateScanCallback = useCallback(async (direction: "cw" | "ccw"): Promise<void> => {
		setIsRotating(true);
		try {
			logStoryAction("rotateScanCallback", {direction});
			await new Promise((resolve) => globalThis.setTimeout(resolve, 400));
		} finally {
			setIsRotating(false);
		}
	}, []);

	return {isRotating, rotateScanCallback} as const;
}
