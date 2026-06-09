"use client";

/**
 * @fileoverview Edit invoice provider wrappers for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/providers/EditInvoiceProviders
 *
 * @remarks
 * Provider wrapper that imports DialogProvider + EditInvoiceContextProvider.
 */

import {DialogProvider} from "../../_contexts/DialogContext";
import {EditInvoiceContextProvider} from "../../edit-invoice/[id]/_context/EditInvoiceContext";
import type {Invoice, Merchant} from "@/types/invoices";
import type {ReactNode} from "react";
import {storyInvoice} from "../fixtures/invoiceFixtures";
import {storyMerchant} from "../fixtures/merchantFixtures";

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
