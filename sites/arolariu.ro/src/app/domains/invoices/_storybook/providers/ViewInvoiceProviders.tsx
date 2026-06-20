"use client";

/**
 * @fileoverview View invoice provider wrappers for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/providers/ViewInvoiceProviders
 *
 * @remarks
 * Provider wrapper that imports DialogProvider + InvoiceContextProvider.
 */

import {DialogProvider} from "../../_contexts/DialogContext";
import {InvoiceContextProvider} from "../../view-invoice/[id]/_context/InvoiceContext";
import type {Invoice, Merchant} from "@/types/invoices";
import type {ReactNode} from "react";
import {storyInvoice} from "../fixtures/invoiceFixtures";
import {storyMerchant} from "../fixtures/merchantFixtures";

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
