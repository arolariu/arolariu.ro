"use client";

/**
 * @fileoverview Dialog-only provider wrappers for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/providers/DialogProviders
 *
 * @remarks
 * Lightweight provider wrapper that only imports DialogProvider.
 * Safe for all stories without transitive server-only dependencies.
 */

import {DialogProvider} from "../../_contexts/DialogContext";
import type {ReactNode} from "react";

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
