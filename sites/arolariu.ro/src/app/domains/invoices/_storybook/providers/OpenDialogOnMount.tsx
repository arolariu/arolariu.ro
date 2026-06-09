"use client";

/**
 * @fileoverview Dialog mount harness for Storybook dialog stories.
 * @module app/domains/invoices/_storybook/providers/OpenDialogOnMount
 *
 * @remarks
 * Opens a dialog automatically on mount to render dialog content in Storybook isolation.
 * Preserves type safety by constraining payload types to the dialog registry.
 */

import {DialogProvider, useDialogs} from "../../_contexts/DialogContext";
import type {ReactNode} from "react";
import {useEffect} from "react";

/**
 * Dialog types that require no payload (undefined).
 */
type DialogsWithUndefinedPayload =
	| "EDIT_INVOICE__RECIPE_ADD"
	| "VIEW_INVOICE__EXPORT"
	| "VIEW_INVOICES__IMPORT"
	| "VIEW_INVOICES__EXPORT";

/**
 * Dialog types that require a string payload.
 */
type DialogsWithStringPayload = "EDIT_INVOICE__IMAGE";

/**
 * Dialog types that require an object payload.
 */
type DialogsWithObjectPayload = Exclude<
	Exclude<
		Exclude<
			| "EDIT_INVOICE__ANALYSIS"
			| "EDIT_INVOICE__ADD_SCAN"
			| "EDIT_INVOICE__REMOVE_SCAN"
			| "EDIT_INVOICE__MERCHANT"
			| "EDIT_INVOICE__MERCHANT_INVOICES"
			| "EDIT_INVOICE__RECIPE_UPDATE"
			| "EDIT_INVOICE__RECIPE_DELETE"
			| "EDIT_INVOICE__RECIPE_PREVIEW"
			| "EDIT_INVOICE__RECIPE_SHARE"
			| "EDIT_INVOICE__METADATA"
			| "EDIT_INVOICE__ITEMS"
			| "EDIT_INVOICE__ALLERGENS"
			| "EDIT_INVOICE__BULK_CATEGORY"
			| "EDIT_INVOICE__FEEDBACK"
			| "VIEW_INVOICE__SHARE_ANALYTICS"
			| "VIEW_SCANS__CREATE_INVOICE"
			| "SHARED__INVOICE_DELETE"
			| "SHARED__INVOICE_SHARE"
			| "SHARED__SCAN_DELETE"
			| "SHARED__SCAN_PREVIEW",
			DialogsWithUndefinedPayload
		>,
		DialogsWithStringPayload
	>,
	null
>;

/**
 * All dialog types from the DialogType union (excluding null).
 */
type AllDialogTypes = DialogsWithUndefinedPayload | DialogsWithStringPayload | DialogsWithObjectPayload;

/**
 * Dialog modes.
 */
type DialogMode = "view" | "add" | "edit" | "delete" | "share";

/**
 * Props for dialogs that require no payload.
 */
interface PropsForUndefinedPayload {
	readonly dialog: DialogsWithUndefinedPayload;
	readonly mode?: DialogMode;
	readonly payload?: undefined;
	readonly children: ReactNode;
}

/**
 * Props for dialogs that require a string payload.
 */
interface PropsForStringPayload {
	readonly dialog: DialogsWithStringPayload;
	readonly mode?: DialogMode;
	readonly payload: string;
	readonly children: ReactNode;
}

/**
 * Props for dialogs that require an object payload.
 */
interface PropsForObjectPayload {
	readonly dialog: DialogsWithObjectPayload;
	readonly mode?: DialogMode;
	readonly payload: unknown;
	readonly children: ReactNode;
}

/**
 * Discriminated union of all dialog props types.
 */
type OpenDialogOnMountProps = PropsForUndefinedPayload | PropsForStringPayload | PropsForObjectPayload;

/**
 * Internal component that opens the dialog on mount.
 */
function DialogOpener({
	dialog,
	mode = "view",
	payload,
	children,
}: {
	readonly dialog: AllDialogTypes;
	readonly mode: DialogMode;
	readonly payload: unknown;
	readonly children: ReactNode;
}): React.JSX.Element {
	const {openDialog} = useDialogs();

	useEffect(() => {
		// Type-cast to bypass strict payload checking in Storybook context
		// Real type safety is enforced at the component level
		openDialog(dialog as never, mode, payload as never);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return <>{children}</>;
}

/**
 * Opens a dialog automatically on mount for Storybook dialog stories.
 *
 * @remarks
 * Wraps children with DialogProvider and automatically opens the specified dialog.
 * Useful for rendering dialog content in Storybook isolation.
 *
 * **Type Safety:**
 * - Dialogs with `undefined` payloads do not require the `payload` prop.
 * - Dialogs with string payloads require `payload: string`.
 * - Dialogs with object payloads require `payload: unknown` (type-narrowed by the dialog component).
 *
 * @param props - Component props.
 * @returns Children wrapped with DialogProvider and dialog opened.
 *
 * @example
 * ```tsx
 * // Dialog with undefined payload
 * <OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_ADD" mode="add">
 *   <RecipeAddDialog />
 * </OpenDialogOnMount>
 * ```
 *
 * @example
 * ```tsx
 * // Dialog with string payload
 * <OpenDialogOnMount dialog="EDIT_INVOICE__IMAGE" mode="view" payload="https://example.com/image.jpg">
 *   <ImageDialog />
 * </OpenDialogOnMount>
 * ```
 *
 * @example
 * ```tsx
 * // Dialog with object payload
 * <OpenDialogOnMount dialog="SHARED__INVOICE_DELETE" mode="delete" payload={{invoice: storyInvoice}}>
 *   <InvoiceDeleteDialog />
 * </OpenDialogOnMount>
 * ```
 */
export function OpenDialogOnMount(props: Readonly<OpenDialogOnMountProps>): React.JSX.Element {
	const {dialog, mode = "view", payload, children} = props;

	return (
		<DialogProvider>
			<DialogOpener dialog={dialog} mode={mode} payload={payload}>
				{children}
			</DialogOpener>
		</DialogProvider>
	);
}
