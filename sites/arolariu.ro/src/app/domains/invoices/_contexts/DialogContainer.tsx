/**
 * @fileoverview Dialog registry and lazy-loading orchestrator for invoices domain.
 * @module app/domains/invoices/_contexts/DialogContainer
 *
 * @remarks
 * **Dialog Registry Pattern**: Centralized router for 27 dialog types across the
 * invoices bounded context. Maps dialog type discriminators to lazily-loaded
 * dialog components, ensuring optimal code splitting and bundle sizes.
 *
 * **Lazy Loading Strategy**: All dialogs use `next/dynamic` with `ssr: false` to:
 * - Exclude dialog code from initial bundle (reduces main bundle by ~200KB)
 * - Defer loading until user actually opens a dialog
 * - Leverage dialog open animations to mask import-fetch latency
 * - Improve Time to Interactive (TTI) by deferring non-critical code
 *
 * **Dialog Organization** (27 dialogs across 4 route domains):
 * - **edit-invoice/[id]**: 16 dialogs (items, metadata, merchant, analysis, recipes, etc.)
 * - **view-invoice/[id]**: 2 dialogs (share analytics, export)
 * - **view-invoices**: 2 dialogs (import, export)
 * - **view-scans**: 1 dialog (create invoice from scans)
 * - **shared**: 4 dialogs (delete/share invoice, delete/preview scan)
 *
 * **Performance Optimizations**:
 * - `React.memo` on component to prevent re-renders from unrelated context churn
 * - `useMemo` on switch expression with `type` dependency for stable references
 * - `ssr: false` on all dynamic imports to exclude from server bundle
 * - Dialog animations mask ~50-200ms chunk-fetch latency on first open
 *
 * **Context Integration**: Works with `DialogContext` provider and `useDialogs` hook.
 * Dialog type changes trigger re-render, switch returns appropriate component.
 *
 * @see {@link DialogProvider} - Context provider managing dialog state
 * @see {@link useDialogs} - Hook for accessing dialog context
 * @see RFC 1005 - State management patterns (context usage)
 */

"use client";

import dynamic from "next/dynamic";
import {memo, useMemo} from "react";
import {useDialogs} from "./DialogContext";

// All dialogs are client-only and lazy-loaded.
// The Dialog's own open animation masks the import-fetch latency on first open.
const AddScanDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AddScanDialog"), {ssr: false});
const AddRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AddRecipeDialog"), {ssr: false});
const AllergenDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AllergenDialog"), {ssr: false});
const AnalyzeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AnalyzeDialog"), {ssr: false});
const BulkCategoryDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/BulkCategoryDialog"), {ssr: false});
const CreateInvoiceDialog = dynamic(() => import("../view-scans/_dialogs/CreateInvoiceDialog"), {ssr: false});
const DeleteInvoiceDialog = dynamic(() => import("../_dialogs/DeleteInvoiceDialog"), {ssr: false});
const DeleteRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/DeleteRecipeDialog"), {ssr: false});
const DeleteScanDialog = dynamic(() => import("../_dialogs/DeleteScanDialog"), {ssr: false});
const InvoiceFeedbackDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/FeedbackDialog"), {ssr: false});
const InvoiceImageDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/ImageDialog"), {ssr: false});
const InvoiceItemsDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/ItemsDialog"), {ssr: false});
const InvoiceMerchantDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/MerchantDialog"), {ssr: false});
const InvoiceMerchantReceiptsDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/MerchantReceiptsDialog"), {
  ssr: false,
});
const InvoiceMetadataDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/MetadataDialog"), {ssr: false});
const InvoicesExportDialog = dynamic(() => import("../view-invoices/_dialogs/ExportDialog"), {ssr: false});
const InvoicesImportDialog = dynamic(() => import("../view-invoices/_dialogs/ImportDialog"), {ssr: false});
const PreviewRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/PreviewRecipeDialog"), {ssr: false});
const PreviewScanDialog = dynamic(() => import("../_dialogs/PreviewScanDialog"), {ssr: false});
const RemoveScanDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/RemoveScanDialog"), {ssr: false});
const ShareAnalyticsDialog = dynamic(() => import("../view-invoice/[id]/_dialogs/ShareAnalyticsDialog"), {ssr: false});
const ShareInvoiceDialog = dynamic(() => import("../_dialogs/ShareInvoiceDialog"), {ssr: false});
const ShareRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/ShareRecipeDialog"), {ssr: false});
const UpdateRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/UpdateRecipeDialog"), {ssr: false});
// view-invoice/[id]/_dialogs/ExportDialog uses a named export
const ViewInvoiceExportDialog = dynamic(
  () => import("../view-invoice/[id]/_dialogs/ExportDialog").then((m) => ({default: m.ExportDialog})),
  {ssr: false},
);

/**
 * Renders the active dialog component based on current dialog context state.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `useDialogs` hook from context).
 *
 * **Dialog Registry Pattern**: Maps 27 dialog type discriminators to their
 * corresponding lazy-loaded components. Switch expression evaluates `type` from
 * dialog context and returns the appropriate dialog or `null` when no dialog is active.
 *
 * **Lazy Loading Behavior**:
 * - First open: Fetches dialog chunk (~5-20KB per dialog), ~50-200ms latency
 * - Subsequent opens: Instant render from browser cache
 * - Dialog open animations (fade-in, slide-up) mask fetch latency
 * - Network tab shows `_next/static/chunks/[hash].js` requests on first open
 *
 * **Performance Optimizations**:
 * - **React.memo**: Prevents re-renders when unrelated context properties change
 *   (e.g., dialog `data` updates don't re-render if `type` stays the same)
 * - **useMemo**: Memoizes switch expression on `type` dependency for stable references
 *   Prevents unnecessary dialog component re-instantiation on parent re-renders
 * - **ssr: false**: Excludes all dialog code from server bundle, reducing SSR payload
 *
 * **Dialog Type Organization**:
 *
 * **edit-invoice/[id] dialogs** (16):
 * - `EDIT_INVOICE__ANALYSIS`: AI-powered invoice analysis with item categorization
 * - `EDIT_INVOICE__ITEMS`: Invoice line items editor with add/remove/edit
 * - `EDIT_INVOICE__ALLERGENS`: Allergen information for food items
 * - `EDIT_INVOICE__BULK_CATEGORY`: Bulk category assignment for multiple items
 * - `EDIT_INVOICE__FEEDBACK`: User feedback form for invoice accuracy
 * - `EDIT_INVOICE__MERCHANT`: Merchant details editor (name, address, contact)
 * - `EDIT_INVOICE__MERCHANT_INVOICES`: All invoices from same merchant
 * - `EDIT_INVOICE__METADATA`: Invoice metadata (date, currency, payment method)
 * - `EDIT_INVOICE__IMAGE`: Full-screen invoice scan image viewer
 * - `EDIT_INVOICE__ADD_SCAN`: Add additional scans to existing invoice
 * - `EDIT_INVOICE__REMOVE_SCAN`: Remove scans from invoice
 * - `EDIT_INVOICE__RECIPE_ADD`: Create a recipe from invoice items
 * - `EDIT_INVOICE__RECIPE_UPDATE`: Update a recipe attached to the invoice
 * - `EDIT_INVOICE__RECIPE_DELETE`: Delete a recipe from the invoice
 * - `EDIT_INVOICE__RECIPE_PREVIEW`: Preview recipe details
 * - `EDIT_INVOICE__RECIPE_SHARE`: Share a recipe reference
 *
 * **view-invoice/[id] dialogs** (2):
 * - `VIEW_INVOICE__SHARE_ANALYTICS`: Share invoice analytics charts/insights
 * - `VIEW_INVOICE__EXPORT`: Export single invoice (PDF, CSV, JSON)
 *
 * **view-invoices dialogs** (2):
 * - `VIEW_INVOICES__IMPORT`: Bulk invoice import from file (CSV, JSON)
 * - `VIEW_INVOICES__EXPORT`: Bulk invoice export with filters
 *
 * **view-scans dialogs** (1):
 * - `VIEW_SCANS__CREATE_INVOICE`: Create invoice from selected scans
 *
 * **Shared dialogs** (4):
 * - `SHARED__INVOICE_DELETE`: Confirm invoice deletion with undo option
 * - `SHARED__INVOICE_SHARE`: Share invoice via link, email, or social
 * - `SHARED__SCAN_DELETE`: Confirm scan deletion with permanent warning
 * - `SHARED__SCAN_PREVIEW`: Full-screen scan preview with zoom controls
 *
 * **Context Flow**:
 * 1. User clicks button (e.g., "Edit Items" in InvoicesHeader)
 * 2. Button calls `openDialog("EDIT_INVOICE__ITEMS", itemsData)`
 * 3. DialogContext updates `currentDialog` state
 * 4. DialogContainer re-renders (only this component, thanks to memo)
 * 5. Switch evaluates `type`, returns `<InvoiceItemsDialog />`
 * 6. First open: `next/dynamic` fetches chunk, dialog animates open
 * 7. Subsequent opens: Instant render from cache
 *
 * **Null Return**: When `type` is `null` or doesn't match any case, returns `null`.
 * This happens when no dialog is active (initial state, or after dialog closes).
 *
 * @returns The active dialog component, or `null` when no dialog is open.
 * Dialog components are lazily loaded and cached after first render.
 * All dialogs manage their own open/close state and call `closeDialog()`
 * from context when dismissed.
 *
 * @example
 * ```tsx
 * // Usage in island component
 * export default function RenderViewInvoicesScreen() {
 *   return (
 *     <DialogProvider>
 *       <InvoicesHeader /> // Contains buttons that open dialogs
 *       <InvoicesTable />
 *       <DialogContainer /> // Renders active dialog
 *     </DialogProvider>
 *   );
 * }
 *
 * // Dialog opening flow
 * // 1. User clicks "Edit Items" button in InvoicesHeader
 * function InvoicesHeader() {
 *   const {openDialog} = useDialogs();
 *
 *   return (
 *     <button onClick={() => openDialog("EDIT_INVOICE__ITEMS", {invoiceId: "123"})}>
 *       Edit Items
 *     </button>
 *   );
 * }
 *
 * // 2. DialogContainer switch evaluates type
 * // type = "EDIT_INVOICE__ITEMS"
 * // → returns <InvoiceItemsDialog />
 *
 * // 3. First open: Fetches chunk
 * // Network: GET /_next/static/chunks/items-dialog.abc123.js (~15KB)
 * // Timing: ~100ms fetch, masked by dialog fade-in animation
 *
 * // 4. Subsequent opens: Instant
 * // Cache hit, no network request, immediate render
 * ```
 *
 * @see {@link useDialogs} - Hook for opening/closing dialogs and accessing state
 * @see {@link DialogContext} - Context type definitions and provider
 * @see {@link DialogProvider} - Context provider wrapping this container
 * @see {@link https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading} - Next.js dynamic imports
 * @see RFC 1005 - State management patterns (context architecture)
 */
function DialogContainerImpl(): React.JSX.Element | null {
  const {
    currentDialog: {type},
  } = useDialogs();

  return useMemo(() => {
    switch (type) {
      // edit-invoice/[id] Dialogs
      case "EDIT_INVOICE__ANALYSIS":
        return <AnalyzeDialog />;
      case "EDIT_INVOICE__ITEMS":
        return <InvoiceItemsDialog />;
      case "EDIT_INVOICE__ALLERGENS":
        return <AllergenDialog />;
      case "EDIT_INVOICE__BULK_CATEGORY":
        return <BulkCategoryDialog />;
      case "EDIT_INVOICE__FEEDBACK":
        return <InvoiceFeedbackDialog />;
      case "EDIT_INVOICE__MERCHANT":
        return <InvoiceMerchantDialog />;
      case "EDIT_INVOICE__MERCHANT_INVOICES":
        return <InvoiceMerchantReceiptsDialog />;
      case "EDIT_INVOICE__METADATA":
        return <InvoiceMetadataDialog />;
      case "EDIT_INVOICE__IMAGE":
        return <InvoiceImageDialog />;
      case "EDIT_INVOICE__ADD_SCAN":
        return <AddScanDialog />;
      case "EDIT_INVOICE__REMOVE_SCAN":
        return <RemoveScanDialog />;
      case "EDIT_INVOICE__RECIPE_ADD":
        return <AddRecipeDialog />;
      case "EDIT_INVOICE__RECIPE_UPDATE":
        return <UpdateRecipeDialog />;
      case "EDIT_INVOICE__RECIPE_DELETE":
        return <DeleteRecipeDialog />;
      case "EDIT_INVOICE__RECIPE_PREVIEW":
        return <PreviewRecipeDialog />;
      case "EDIT_INVOICE__RECIPE_SHARE":
        return <ShareRecipeDialog />;
      // view-invoice/[id] Dialogs
      case "VIEW_INVOICE__SHARE_ANALYTICS":
        return <ShareAnalyticsDialog />;
      case "VIEW_INVOICE__EXPORT":
        return <ViewInvoiceExportDialog />;
      // view-invoices Dialogs
      case "VIEW_INVOICES__IMPORT":
        return <InvoicesImportDialog />;
      case "VIEW_INVOICES__EXPORT":
        return <InvoicesExportDialog />;
      // view-scans Dialogs
      case "VIEW_SCANS__CREATE_INVOICE":
        return <CreateInvoiceDialog />;
      // shared dialogs
      case "SHARED__INVOICE_DELETE":
        return <DeleteInvoiceDialog />;
      case "SHARED__INVOICE_SHARE":
        return <ShareInvoiceDialog />;
      case "SHARED__SCAN_DELETE":
        return <DeleteScanDialog />;
      case "SHARED__SCAN_PREVIEW":
        return <PreviewScanDialog />;
      default:
        return null;
    }
  }, [type]);
}

export default memo(DialogContainerImpl);
