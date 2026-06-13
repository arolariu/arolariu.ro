"use client";

/**
 * @fileoverview Button-triggered dialog harness for Storybook dialog stories.
 * @module app/domains/invoices/_storybook/providers/OpenDialogButton
 *
 * @remarks
 * Renders a persistent button that opens the target dialog on click. The dialog
 * children render only while the dialog is open, so reviewers can close the
 * dialog and re-open it via the button without remounting the story.
 */

import {DialogProvider, useDialogs} from "../../_contexts/DialogContext";
import type {AllDialogTypes, DialogHarnessProps, DialogMode, ObjectDialogPayload} from "./dialogHarnessTypes";
import type {ReactNode} from "react";

/**
 * Internal opener that renders a button and the dialog (only while open).
 *
 * @param props - Harness props.
 * @returns The trigger button plus dialog children when open.
 */
function DialogButton({
	dialog,
	mode = "view",
	payload,
	label = "Open dialog",
	children,
}: {
	readonly dialog: AllDialogTypes;
	readonly mode: DialogMode;
	readonly payload: ObjectDialogPayload | string | undefined;
	readonly label: string;
	readonly children: ReactNode;
}): React.JSX.Element {
	const {openDialog, isOpen} = useDialogs();

	const handleOpen = (): void => {
		if (
			dialog === "EDIT_INVOICE__RECIPE_ADD" ||
			dialog === "VIEW_INVOICE__EXPORT" ||
			dialog === "VIEW_INVOICES__IMPORT" ||
			dialog === "VIEW_INVOICES__EXPORT"
		) {
			openDialog(dialog, mode);
		} else if (dialog === "EDIT_INVOICE__IMAGE") {
			openDialog(dialog, mode, payload as string);
		} else {
			openDialog(dialog, mode, payload as ObjectDialogPayload);
		}
	};

	return (
		<div>
			<button
				type="button"
				onClick={handleOpen}>
				{label}
			</button>
			{isOpen(dialog) ? children : null}
		</div>
	);
}

/**
 * Opens a dialog on button press for Storybook dialog stories.
 *
 * @remarks
 * Wraps children in `DialogProvider` and renders a persistent trigger button.
 * The dialog is closed by default; pressing the button opens it, and after the
 * dialog closes itself the button re-opens it.
 *
 * @param props - Harness props (type-safe per dialog payload requirement).
 * @returns The trigger button wrapped in `DialogProvider`.
 *
 * @example
 * ```tsx
 * <OpenDialogButton dialog="SHARED__INVOICE_DELETE" mode="delete" payload={{invoice: storyInvoice}}>
 *   <DeleteInvoiceDialog />
 * </OpenDialogButton>
 * ```
 */
export function OpenDialogButton(props: Readonly<DialogHarnessProps>): React.JSX.Element {
	const {dialog, mode = "view", payload, label = "Open dialog", children} = props;

	return (
		<DialogProvider>
			<DialogButton dialog={dialog} mode={mode} payload={payload} label={label}>
				{children}
			</DialogButton>
		</DialogProvider>
	);
}
