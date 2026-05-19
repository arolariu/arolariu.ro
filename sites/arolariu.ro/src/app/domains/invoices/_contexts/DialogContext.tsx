"use client";

import type {Invoice, InvoiceScan, Merchant, Product, Recipe} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
import {createContext, use, useMemo, useState, type ReactNode} from "react";

/**
 * DialogType is a union type representing the different types of dialogs that can be opened.
 * Each string literal corresponds to a specific dialog type.
 * The null value indicates that no dialog is currently open.
 */
export type DialogType = Readonly<
  | "EDIT_INVOICE__ANALYSIS"
  | "EDIT_INVOICE__IMAGE"
  | "EDIT_INVOICE__SCAN"
  | "EDIT_INVOICE__MERCHANT"
  | "EDIT_INVOICE__MERCHANT_INVOICES"
  | "EDIT_INVOICE__RECIPE"
  | "EDIT_INVOICE__METADATA"
  | "EDIT_INVOICE__ITEMS"
  | "EDIT_INVOICE__ALLERGENS"
  | "EDIT_INVOICE__BULK_CATEGORY"
  | "EDIT_INVOICE__FEEDBACK"
  | "VIEW_INVOICE__SHARE_ANALYTICS"
  | "VIEW_INVOICE__EXPORT"
  | "VIEW_INVOICES__IMPORT"
  | "VIEW_INVOICES__EXPORT"
  | "VIEW_SCANS__CREATE_INVOICE"
  | "SHARED__INVOICE_DELETE"
  | "SHARED__INVOICE_SHARE"
> | null;

export type DialogMode = Readonly<"view" | "add" | "edit" | "delete" | "share"> | null;

/**
 * Compile-time registry mapping each DialogType to its expected payload shape.
 *
 * @remarks
 * Drives type narrowing in `useDialog<T>(...)` and `useDialogs().openDialog<T>(...)`.
 *
 * **Soundness contract:** The runtime payload is `unknown`. The narrowing
 * exposed by `useDialog` is sound only while the dialog reads its payload
 * under `isOpen === true` — which is the existing DialogContainer contract
 * (only the active dialog is mounted).
 */
export type DialogPayloads = {
  EDIT_INVOICE__ANALYSIS: {invoice: Invoice};
  EDIT_INVOICE__IMAGE: string;
  EDIT_INVOICE__SCAN: Invoice | {invoice: Invoice; scan: InvoiceScan; scanIndex: number} | null;
  EDIT_INVOICE__MERCHANT: Merchant | null;
  EDIT_INVOICE__MERCHANT_INVOICES: Merchant | null;
  EDIT_INVOICE__RECIPE: Recipe;
  EDIT_INVOICE__METADATA: Record<string, string>;
  EDIT_INVOICE__ITEMS: Invoice;
  EDIT_INVOICE__ALLERGENS: {invoice: Invoice; product: Product; productIndex: number};
  EDIT_INVOICE__BULK_CATEGORY: {invoice: Invoice; selectedProducts: Product[]; selectedIndices: number[]};
  EDIT_INVOICE__FEEDBACK: {invoice: Invoice; merchant: Merchant | null};
  VIEW_INVOICE__SHARE_ANALYTICS: {invoice: Invoice; merchant: Merchant};
  VIEW_INVOICE__EXPORT: undefined;
  VIEW_INVOICES__IMPORT: undefined;
  VIEW_INVOICES__EXPORT: undefined;
  VIEW_SCANS__CREATE_INVOICE: {selectedScans: CachedScan[]};
  SHARED__INVOICE_DELETE: {invoice: Invoice};
  SHARED__INVOICE_SHARE: {invoice: Invoice};
};

type DialogCurrent = {
  type: DialogType;
  mode: DialogMode;
  payload: unknown;
};

const INITIAL_STATE: DialogCurrent = {type: null, mode: null, payload: null};

type DialogActions = {
  openDialog: <T extends Exclude<DialogType, null>>(dialog: T, mode?: Exclude<DialogMode, null>, payload?: DialogPayloads[T]) => void;
  closeDialog: () => void;
};

/** State context — re-renders consumers on every open/close. */
const DialogStateContext = createContext<DialogCurrent | undefined>(undefined);

/** Actions context — value is stable for the lifetime of the provider. */
const DialogActionsContext = createContext<DialogActions | undefined>(undefined);

/**
 * DialogProvider component that manages dialog state for the application.
 *
 * @remarks
 * Internally splits state and actions into separate contexts so cards that only
 * dispatch (via `useDialogs().openDialog` or `useDialog().open`) do not re-render
 * when dialog state changes.
 *
 * Preserves the "no-op if another dialog is already open" guard from the previous
 * implementation; this is enforced inside the functional setState updater.
 *
 * @example
 * ```tsx
 * <DialogProvider>
 *   <YourApp />
 * </DialogProvider>
 * ```
 */
export function DialogProvider({children}: Readonly<{children: ReactNode}>) {
  const [dialogState, setDialogState] = useState<DialogCurrent>(INITIAL_STATE);

  // Empty deps: functional setState reads `prev` synchronously, no closure over state needed.
  const actions = useMemo<DialogActions>(
    () => ({
      openDialog: (dialog, mode = "view", payload) =>
        setDialogState((prev) => (prev.type === null ? {type: dialog, mode, payload: payload ?? null} : prev)),
      closeDialog: () => setDialogState(INITIAL_STATE),
    }),
    [],
  );

  return (
    <DialogActionsContext value={actions}>
      <DialogStateContext value={dialogState}>{children}</DialogStateContext>
    </DialogActionsContext>
  );
}

/**
 * Hook providing the current dialog state plus dispatch actions.
 *
 * @remarks
 * Use this hook when you need to dispatch dialogs with payloads only known at
 * click time (e.g., per-row click handlers). For card-level "I'm bound to one
 * dialog type" usage, prefer `useDialog`.
 *
 * @returns Object with `currentDialog`, `isOpen(type)`, `openDialog<T>(type, mode?, payload?)`, `closeDialog`.
 * @throws If used outside a `DialogProvider`.
 */
export function useDialogs() {
  const state = use(DialogStateContext);
  const actions = use(DialogActionsContext);
  if (state === undefined || actions === undefined) {
    throw new Error("useDialogs must be used within a DialogProvider");
  }
  return {
    currentDialog: state,
    isOpen: (dialog: DialogType) => state.type === dialog,
    openDialog: actions.openDialog,
    closeDialog: actions.closeDialog,
  };
}

/**
 * Hook bound to a single dialog type with optional baked-in mode and payload.
 *
 * @remarks
 * The returned `currentDialog.payload` is typed as `DialogPayloads[T] | null`.
 * This narrowing is sound only when read under `isOpen === true` (the active
 * dialog reads its own payload). Cards that only call `open`/`close` and never
 * read `payload` are unaffected.
 *
 * @param dialogType - The dialog this hook is bound to (compile-time enforced).
 * @param dialogMode - Default mode when `open()` is called (defaults to `"view"`).
 * @param dialogPayload - Default payload when `open()` is called.
 * @returns Object with `currentDialog`, `isOpen` (boolean), `open()`, `close()`.
 * @throws If used outside a `DialogProvider`.
 *
 * @example
 * ```tsx
 * const {isOpen, open, close} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});
 * ```
 */
export function useDialog<T extends Exclude<DialogType, null>>(
  dialogType: T,
  dialogMode: Exclude<DialogMode, null> = "view",
  dialogPayload?: DialogPayloads[T],
) {
  const state = use(DialogStateContext);
  const actions = use(DialogActionsContext);
  if (state === undefined || actions === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return {
    currentDialog: state as {type: DialogType; mode: DialogMode; payload: DialogPayloads[T] | null},
    isOpen: state.type === dialogType,
    open: () => actions.openDialog(dialogType, dialogMode, dialogPayload),
    close: actions.closeDialog,
  } as const;
}
