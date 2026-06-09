"use client";

/**
 * @fileoverview Scan upload provider wrappers for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/providers/ScanUploadProviders
 *
 * @remarks
 * Provider wrapper that imports ScanUploadProvider.
 * Isolated to avoid bundling server-only dependencies when only dialog provider is needed.
 */

import {ScanUploadProvider} from "../../upload-scans/_context/ScanUploadContext";
import type {ReactNode} from "react";

/**
 * Simple padded container for invoice story layouts.
 *
 * @param props - Component props.
 * @param props.children - Story content to wrap.
 * @returns A padded container with standard spacing.
 */
export function InvoiceStoryFrame({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
	return <div style={{padding: "2rem"}}>{children}</div>;
}

/**
 * Wraps children with ScanUploadProvider and InvoiceStoryFrame.
 *
 * @param props - Component props.
 * @param props.children - Story content to wrap.
 * @returns Children wrapped with scan upload context and frame.
 */
export function WithScanUploadContext({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
	return (
		<ScanUploadProvider>
			<InvoiceStoryFrame>{children}</InvoiceStoryFrame>
		</ScanUploadProvider>
	);
}
