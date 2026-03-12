/**
 * @fileoverview Storybook provider decorators for the arolariu.ro website.
 * @module .storybook/providers
 *
 * @remarks
 * This module exports reusable provider decorators that stories can import
 * when they need specific React context providers. This avoids duplicating
 * provider wrappers across individual story files.
 *
 * **Providers available:**
 * - {@link withDialogProvider} — Wraps stories in the invoice DialogProvider context
 * - {@link DialogProvider} — Re-exported for custom composition in stories
 * - {@link InvoiceContextProvider} — Re-exported for stories needing invoice context
 */

import type {Decorator} from "@storybook/react";
import {DialogProvider} from "../src/app/domains/invoices/_contexts/DialogContext";
import {InvoiceContextProvider} from "../src/app/domains/invoices/view-invoice/[id]/_context/InvoiceContext";

/**
 * Wraps a story in the invoice DialogProvider.
 *
 * @remarks
 * Use this decorator for any story whose component calls `useDialog` or `useDialogs`.
 * The dialog starts in a closed state (type = null), matching production behavior.
 *
 * @example
 * ```tsx
 * import {withDialogProvider} from "RELATIVE_PATH_TO/.storybook/providers";
 *
 * const meta = {
 *   decorators: [withDialogProvider],
 * } satisfies Meta;
 * ```
 *
 * @param Story - The story component to render
 * @returns The story wrapped in DialogProvider
 */
export const withDialogProvider: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

// Re-export provider components directly for stories that need custom composition
export {DialogProvider} from "../src/app/domains/invoices/_contexts/DialogContext";
export {InvoiceContextProvider} from "../src/app/domains/invoices/view-invoice/[id]/_context/InvoiceContext";
