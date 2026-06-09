"use client";

/**
 * @fileoverview Provider wrappers for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/providers/InvoiceStoryProviders
 *
 * @remarks
 * Provides composable story-safe React Context provider wrappers:
 * - `InvoiceStoryFrame`: Simple padded container for story layout
 * - `WithInvoiceDialogs`: DialogProvider wrapper
 * - `WithEditInvoiceContext`: DialogProvider + EditInvoiceContextProvider
 * - `WithViewInvoiceContext`: DialogProvider + InvoiceContextProvider
 * - `WithScanUploadContext`: ScanUploadProvider wrapper
 */

import {DialogProvider} from "../../_contexts/DialogContext";
import {EditInvoiceContextProvider} from "../../edit-invoice/[id]/_context/EditInvoiceContext";
import {InvoiceContextProvider} from "../../view-invoice/[id]/_context/InvoiceContext";
import {ScanUploadProvider} from "../../upload-scans/_context/ScanUploadContext";
import type {Invoice, Merchant} from "@/types/invoices";
import type {ReactNode} from "react";
import {storyInvoice, storyMerchant} from "../fixtures/invoiceFixtures";

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
 * Wraps children with DialogProvider.
 *
 * @param props - Component props.
 * @param props.children - Story content to wrap.
 * @returns Children wrapped with DialogProvider.
 */
export function WithInvoiceDialogs({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
	return <DialogProvider>{children}</DialogProvider>;
}

/**
 * Wraps children with DialogProvider and EditInvoiceContextProvider.
 *
 * @param props - Component props.
 * @param props.children - Story content to wrap.
 * @param props.invoice - Invoice to provide (defaults to storyInvoice).
 * @param props.merchant - Merchant to provide (defaults to storyMerchant).
 * @returns Children wrapped with edit invoice context.
 */
export function WithEditInvoiceContext({
	children,
	invoice = storyInvoice,
	merchant = storyMerchant,
}: Readonly<{
	children: ReactNode;
	invoice?: Invoice;
	merchant?: Merchant | null;
}>): React.JSX.Element {
	return (
		<DialogProvider>
			<EditInvoiceContextProvider invoice={invoice} merchant={merchant}>
				{children}
			</EditInvoiceContextProvider>
		</DialogProvider>
	);
}

/**
 * Wraps children with DialogProvider and InvoiceContextProvider.
 *
 * @param props - Component props.
 * @param props.children - Story content to wrap.
 * @param props.invoice - Invoice to provide (defaults to storyInvoice).
 * @param props.merchant - Merchant to provide (defaults to storyMerchant).
 * @returns Children wrapped with view invoice context.
 */
export function WithViewInvoiceContext({
	children,
	invoice = storyInvoice,
	merchant = storyMerchant,
}: Readonly<{
	children: ReactNode;
	invoice?: Invoice;
	merchant?: Merchant | null;
}>): React.JSX.Element {
	return (
		<DialogProvider>
			<InvoiceContextProvider invoice={invoice} merchant={merchant}>
				{children}
			</InvoiceContextProvider>
		</DialogProvider>
	);
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
