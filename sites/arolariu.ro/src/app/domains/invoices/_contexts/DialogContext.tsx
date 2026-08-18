"use client";

/**
 * @fileoverview Type-safe dialog context system with split state/actions pattern.
 * @module app/domains/invoices/_contexts/DialogContext
 *
 * @remarks
 * **Architecture Pattern**: Split-context design separating state (re-renders consumers)
 * from actions (stable for provider lifetime) to enable selective subscription in the future.
 *
 * **Type-Safe Payload Narrowing**: Compile-time registry (`DialogPayloads`) maps each
 * dialog type to its expected payload shape. The `useDialog<T>` hook leverages TypeScript's
 * type narrowing to provide fully-typed access to `currentDialog.payload` when reading
 * under `isOpen === true`.
 *
 * **Soundness Contract**: Runtime payload is `unknown`. Narrowing is sound only when
 * the active dialog reads its own payload — enforced by DialogContainer mounting only
 * the active dialog. Callers must guard trigger buttons to prevent dispatching dialogs
 * without required payloads.
 *
 * **27 Dialog Types** across 4 route domains:
 * - **edit-invoice/[id]**: 16 dialogs (analysis, items, merchant, metadata, recipes, etc.)
 * - **view-invoice/[id]**: 2 dialogs (share analytics, export)
 * - **view-invoices**: 2 dialogs (import, export)
 * - **view-scans**: 1 dialog (create invoice from scans)
 * - **shared**: 4 dialogs (delete/share invoice, delete/preview scan)
 *
 * **Performance**: Actions context value is stable (empty deps array), preventing
 * unnecessary re-renders for components that only need dispatch capabilities.
 * State context re-renders all subscribers on every open/close.
 *
 * **No-Op Guard**: Opening a dialog while another is already open is a no-op,
 * enforced in the functional setState updater.
 *
 * @see {@link DialogContainer} - Dialog registry and lazy-loading orchestrator
 * @see {@link useDialogs} - Hook for dynamic dialog dispatching
 * @see {@link useDialog} - Hook bound to a single dialog type
 * @see RFC 1005 - State management patterns (context architecture)
 */

import type {Invoice, InvoiceScan, Merchant, Product, RecipeSuggestion} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";
import {createContext, use, useMemo, useState, type ReactNode} from "react";

/**
 * Union type representing all 27 dialog types across the invoices domain.
 *
 * @remarks
 * **Discriminator Union**: Each string literal corresponds to a specific dialog type.
 * The `null` value indicates no dialog is currently open.
 *
 * **Type Organization**:
 * - Prefixed by route domain (`EDIT_INVOICE`, `VIEW_INVOICE`, `VIEW_INVOICES`, `VIEW_SCANS`)
 * - `SHARED` prefix for cross-route dialogs (delete, share, preview)
 *
 * **Type-to-Component Mapping**: Consumed by `DialogContainer` switch expression
 * to map discriminator to lazy-loaded dialog component.
 *
 * **Type-to-Payload Mapping**: Drives compile-time payload narrowing via `DialogPayloads`.
 *
 * @see {@link DialogPayloads} - Compile-time payload registry
 * @see {@link DialogContainer} - Switch expression mapping types to components
 */
type DialogType = Readonly<
  | "EDIT_INVOICE__ANALYSIS"
  | "EDIT_INVOICE__IMAGE"
  | "EDIT_INVOICE__ADD_SCAN"
  | "EDIT_INVOICE__REMOVE_SCAN"
  | "EDIT_INVOICE__MERCHANT"
  | "EDIT_INVOICE__MERCHANT_INVOICES"
  | "EDIT_INVOICE__RECIPE_ADD"
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
  | "VIEW_INVOICE__EXPORT"
  | "VIEW_INVOICES__IMPORT"
  | "VIEW_INVOICES__EXPORT"
  | "VIEW_SCANS__CREATE_INVOICE"
  | "SHARED__INVOICE_DELETE"
  | "SHARED__INVOICE_SHARE"
  | "SHARED__SCAN_DELETE"
  | "SHARED__SCAN_PREVIEW"
> | null;

/**
 * Dialog mode indicating the intended user action within a dialog.
 *
 * @remarks
 * **Purpose**: Provides semantic context for dialogs that support multiple modes
 * (e.g., "view" vs "edit" merchant details, "add" vs "edit" invoice items).
 *
 * **Modes**:
 * - `"view"`: Read-only display of data
 * - `"add"`: Creating new entities
 * - `"edit"`: Modifying existing entities
 * - `"delete"`: Confirming deletion with potential undo
 * - `"share"`: Sharing via link, email, or social media
 * - `null`: No dialog open or mode not applicable
 *
 * **Usage**: Passed to `openDialog<T>(type, mode, payload)` and accessible via
 * `currentDialog.mode`. Dialogs can adapt UI based on mode (e.g., disable
 * form fields in "view" mode, show undo button in "delete" mode).
 *
 * **Default**: The `useDialog` hook defaults to `"view"` mode when not specified.
 */
type DialogMode = Readonly<"view" | "add" | "edit" | "delete" | "share"> | null;

/**
 * Compile-time registry mapping each DialogType to its expected payload shape.
 *
 * @remarks
 * **Type Narrowing**: Drives type narrowing in `useDialog<T>(...)` and
 * `useDialogs().openDialog<T>(...)`. When a dialog reads `currentDialog.payload`
 * under `isOpen === true`, TypeScript narrows `payload` to `DialogPayloads[T]`.
 *
 * **Soundness Contract**: The runtime payload is `unknown`. Narrowing is sound
 * only when the active dialog reads its own payload — enforced by DialogContainer
 * mounting only the active dialog. Callers must guard trigger buttons to prevent
 * dispatching dialogs without required payloads.
 *
 * **Payload Types**:
 * - **Complex objects**: `{invoice: Invoice}`, `{merchant: Merchant}`, etc.
 * - **Primitives**: `string` for image URLs
 * - **undefined**: Dialogs with no required data (import/export)
 *
 * **Type Safety**: Compile-time enforcement prevents calling
 * `openDialog("EDIT_INVOICE__ITEMS", "edit")` without an `Invoice` payload.
 *
 * **Example**:
 * ```typescript
 * // ✅ Type-safe - payload matches DialogPayloads["EDIT_INVOICE__ITEMS"]
 * openDialog("EDIT_INVOICE__ITEMS", "edit", {invoice});
 *
 * // ❌ Compile error - missing required payload
 * openDialog("EDIT_INVOICE__ITEMS", "edit");
 *
 * // ❌ Compile error - wrong payload shape
 * openDialog("EDIT_INVOICE__ITEMS", "edit", {merchant});
 * ```
 */
type DialogPayloads = {
  EDIT_INVOICE__ANALYSIS: {invoice: Invoice};
  EDIT_INVOICE__IMAGE: string;
  EDIT_INVOICE__ADD_SCAN: {invoice: Invoice};
  EDIT_INVOICE__REMOVE_SCAN: {invoice: Invoice; scan: InvoiceScan; scanIndex: number};
  EDIT_INVOICE__MERCHANT: Merchant;
  EDIT_INVOICE__MERCHANT_INVOICES: Merchant;
  EDIT_INVOICE__RECIPE_ADD: undefined;
  EDIT_INVOICE__RECIPE_UPDATE: {recipe: RecipeSuggestion};
  EDIT_INVOICE__RECIPE_DELETE: {recipe: RecipeSuggestion};
  EDIT_INVOICE__RECIPE_PREVIEW: {recipe: RecipeSuggestion};
  EDIT_INVOICE__RECIPE_SHARE: {recipe: RecipeSuggestion};
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
  SHARED__SCAN_DELETE: {scan: CachedScan};
  SHARED__SCAN_PREVIEW: {scan: CachedScan};
};

type DialogCurrent = {
  type: DialogType;
  mode: DialogMode;
  payload: unknown;
};

const INITIAL_STATE: DialogCurrent = {type: null, mode: null, payload: null};

type DialogActions = {
  openDialog: <T extends Exclude<DialogType, null>>(dialog: T, mode: Exclude<DialogMode, null>, payload?: DialogPayloads[T]) => void;
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
 * Internally splits state and actions into two separate contexts (`DialogStateContext`
 * and `DialogActionsContext`). The actions context value is stable for the lifetime
 * of the provider; the state context value changes on every open/close.
 *
 * Both `useDialog` and `useDialogs` subscribe to BOTH contexts and therefore
 * re-render on every dialog state change. The split exists for future flexibility
 * (a hypothetical actions-only hook could subscribe to actions alone and avoid
 * state-driven re-renders); today's public hooks do not exploit it.
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
export function DialogProvider({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
  const [dialogState, setDialogState] = useState<DialogCurrent>(INITIAL_STATE);

  // Empty deps: functional setState reads `prev` synchronously, no closure over state needed.
  const actions = useMemo<DialogActions>(
    () => ({
      openDialog: (dialog, mode, payload) =>
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
 * Subscribes to both state and actions contexts; the consumer re-renders on
 * every dialog state change.
 *
 * @returns Object with `currentDialog`, `isOpen(type)`, `openDialog<T>(type, mode?, payload?)`, `closeDialog`.
 * @throws If used outside a `DialogProvider`.
 */
export function useDialogs(): {
  currentDialog: DialogCurrent;
  isOpen: (dialog: DialogType) => boolean;
  openDialog: DialogActions["openDialog"];
  closeDialog: DialogActions["closeDialog"];
} {
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
 * The returned `currentDialog.payload` is typed as `DialogPayloads[T]`.
 * This narrowing is sound only when read under `isOpen === true` (the active
 * dialog reads its own payload). Cards that only call `open`/`close` and never
 * read `payload` are unaffected. Callers MUST ensure they never dispatch a
 * dialog without its required payload — guard your trigger buttons.
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
    currentDialog: state as {type: DialogType; mode: DialogMode; payload: DialogPayloads[T]},
    isOpen: state.type === dialogType,
    open: () => actions.openDialog(dialogType, dialogMode, dialogPayload),
    close: actions.closeDialog,
  } as const;
}
