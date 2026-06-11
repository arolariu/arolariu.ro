/**
 * @fileoverview Storybook provider wrapper for CreateInvoiceContext.
 * @module app/domains/invoices/_storybook/providers/CreateInvoiceProviders
 */

import type {ReactNode} from "react";
import {CreateInvoiceProvider} from "../../create-invoice/_context/CreateInvoiceContext";
import {InvoiceStoryFrame} from "./ScanUploadProviders";

/**
 * Wraps children with CreateInvoiceProvider and InvoiceStoryFrame.
 *
 * @remarks
 * InvoiceStoryFrame provides necessary dependencies:
 * - next-intl messages
 * - Clerk authentication mock
 * - Zustand store access
 *
 * @param children - Story content
 * @returns Wrapped component
 */
export function WithCreateInvoiceContext({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
	return (
		<InvoiceStoryFrame>
			<CreateInvoiceProvider>{children}</CreateInvoiceProvider>
		</InvoiceStoryFrame>
	);
}
