"use client";

/**
 * @fileoverview Storybook-safe scan hook mocks.
 * @module app/domains/invoices/_storybook/mocks/hooks/scan
 *
 * @remarks
 * Exports Storybook-safe implementations of scan hooks matching production signatures.
 * These mocks provide realistic loading states and action logging without backend dependencies.
 */

import {useState, useCallback, useRef} from "react";
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
 * Storybook-safe scan rename hook.
 *
 * @param scan - The scan to rename.
 * @returns Hook state with rename controls matching production ScansGrid expectations.
 *
 * @remarks
 * Provides full rename editing state: value, isEditing, isCommitting, justRenamed,
 * inputRef, start, cancel, change, commit.
 */
export function useScanRename(scan: CachedScan): Readonly<{
	value: string;
	isEditing: boolean;
	isCommitting: boolean;
	justRenamed: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	start: () => void;
	cancel: () => void;
	change: (newValue: string) => void;
	commit: () => Promise<void>;
}> {
	const [value, setValue] = useState(scan.name);
	const [isEditing, setIsEditing] = useState(false);
	const [justRenamed, setJustRenamed] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const start = useCallback((): void => {
		setValue(scan.name);
		setIsEditing(true);
		logStoryAction("startScanRename", {scanId: scan.id});
	}, [scan.id, scan.name]);

	const cancel = useCallback((): void => {
		setValue(scan.name);
		setIsEditing(false);
		logStoryAction("cancelScanRename", {scanId: scan.id});
	}, [scan.id, scan.name]);

	const change = useCallback((newValue: string): void => {
		setValue(newValue);
		logStoryAction("changeScanRename", {scanId: scan.id, newValue});
	}, [scan.id]);

	const commit = useCallback(async (): Promise<void> => {
		setIsEditing(false);
		setJustRenamed(true);
		logStoryAction("commitScanRename", {scanId: scan.id, value});
		globalThis.setTimeout(() => setJustRenamed(false), 300);
	}, [scan.id, value]);

	return {
		value,
		isEditing,
		isCommitting: false,
		justRenamed,
		inputRef,
		start,
		cancel,
		change,
		commit,
	} as const;
}

/**
 * Storybook-safe scan rotation hook.
 *
 * @param scan - The scan to rotate.
 * @returns Hook state with rotation progress and the rotate callback.
 *
 * @remarks
 * Provides rotation state matching production expectations with scan-specific logging.
 */
export function useScanRotation(scan: CachedScan): Readonly<{
	isRotating: boolean;
	rotateScanCallback: (direction: "cw" | "ccw") => Promise<void>;
}> {
	const [isRotating, setIsRotating] = useState(false);

	const rotateScanCallback = useCallback(async (direction: "cw" | "ccw"): Promise<void> => {
		setIsRotating(true);
		try {
			logStoryAction("rotateScanCallback", {scanId: scan.id, direction});
			await new Promise((resolve) => globalThis.setTimeout(resolve, 400));
		} finally {
			setIsRotating(false);
		}
	}, [scan.id]);

	return {isRotating, rotateScanCallback} as const;
}
