import type {Invoice, InvoiceScan, Merchant, Product, Recipe} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
import type {ReactNode} from "react";

/** Dialog types that require no payload (undefined). */
export type DialogsWithUndefinedPayload =
	| "EDIT_INVOICE__RECIPE_ADD"
	| "VIEW_INVOICE__EXPORT"
	| "VIEW_INVOICES__IMPORT"
	| "VIEW_INVOICES__EXPORT";

/** Dialog types that require a string payload. */
export type DialogsWithStringPayload = "EDIT_INVOICE__IMAGE";

/** Dialog types that require an object payload. */
export type DialogsWithObjectPayload =
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
	| "SHARED__SCAN_PREVIEW";

/** All dialog types from the DialogType union (excluding null). */
export type AllDialogTypes = DialogsWithUndefinedPayload | DialogsWithStringPayload | DialogsWithObjectPayload;

/** Dialog modes. */
export type DialogMode = "view" | "add" | "edit" | "delete" | "share";

/** Object payloads accepted by object-payload dialogs. */
export type ObjectDialogPayload =
	| Merchant
	| Invoice
	| Record<string, string>
	| {readonly invoice: Invoice}
	| {readonly invoice: Invoice; readonly scan: InvoiceScan; readonly scanIndex: number}
	| {readonly recipe: Recipe}
	| {readonly invoice: Invoice; readonly product: Product; readonly productIndex: number}
	| {readonly invoice: Invoice; readonly selectedProducts: Product[]; readonly selectedIndices: number[]}
	| {readonly invoice: Invoice; readonly merchant: Merchant | null}
	| {readonly invoice: Invoice; readonly merchant: Merchant}
	| {readonly selectedScans: CachedScan[]}
	| {readonly scan: CachedScan};

interface BaseHarnessProps {
	readonly mode?: DialogMode;
	readonly label?: string;
	readonly children: ReactNode;
}

/** Props for dialogs that require no payload. */
export interface PropsForUndefinedPayload extends BaseHarnessProps {
	readonly dialog: DialogsWithUndefinedPayload;
	readonly payload?: undefined;
}

/** Props for dialogs that require a string payload. */
export interface PropsForStringPayload extends BaseHarnessProps {
	readonly dialog: DialogsWithStringPayload;
	readonly payload: string;
}

/** Props for dialogs that require an object payload. */
export interface PropsForObjectPayload extends BaseHarnessProps {
	readonly dialog: DialogsWithObjectPayload;
	readonly payload: ObjectDialogPayload;
}

/** Discriminated union of all dialog harness props. */
export type DialogHarnessProps = PropsForUndefinedPayload | PropsForStringPayload | PropsForObjectPayload;
