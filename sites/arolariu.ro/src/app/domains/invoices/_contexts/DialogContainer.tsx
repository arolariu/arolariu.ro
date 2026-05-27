"use client";

/**
 * @fileoverview Dialog registry and lazy-loading orchestrator for invoices domain.
 * @module app/domains/invoices/_contexts/DialogContainer
 *
 * @remarks
 * **Dialog Registry Pattern**: Centralized router for 31 dialog types across the
 * invoices bounded context. Maps dialog type discriminators to lazily-loaded
 * dialog components, ensuring optimal code splitting and bundle sizes.
 *
 * **Lazy Loading Strategy**: All dialogs use `next/dynamic` with `ssr: false` to:
 * - Exclude dialog code from initial bundle (reduces main bundle by ~200KB)
 * - Defer loading until user actually opens a dialog
 * - Leverage dialog open animations to mask import-fetch latency
 * - Improve Time to Interactive (TTI) by deferring non-critical code
 *
 * **Dialog Organization** (31 dialogs across 4 route domains):
 * - **edit-invoice/[id]**: 20 dialogs (items, metadata, merchant, analysis, recipes, etc.)
 * - **view-invoice/[id]**: 2 dialogs (share analytics, export)
 * - **view-invoices**: 2 dialogs (import, export)
 * - **view-scans**: 1 dialog (create invoice from scans)
 * - **shared**: 2 dialogs (delete/share invoice)
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

import dynamic from "next/dynamic";
import {memo, useMemo} from "react";
import {useDialogs} from "./DialogContext";

// All dialogs are client-only and lazy-loaded.
// The Dialog's own open animation masks the import-fetch latency on first open.
const AddScanDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/AddScanDialog"), {ssr: false});
const AllergenDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/AllergenDialog"), {ssr: false});
const AnalyzeDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/AnalyzeDialog"), {ssr: false});
const BulkCategoryDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/BulkCategoryDialog"), {ssr: false});
const CreateInvoiceDialog = dynamic(() => import("../view-scans/_components/dialogs/CreateInvoiceDialog"), {ssr: false});
const DeleteInvoiceDialog = dynamic(() => import("../_dialogs/DeleteInvoiceDialog"), {ssr: false});
const InvoiceFeedbackDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/FeedbackDialog"), {ssr: false});
const InvoiceImageDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/ImageDialog"), {ssr: false});
const InvoiceItemsDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/ItemsDialog"), {ssr: false});
const InvoiceMerchantDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/MerchantDialog"), {ssr: false});
const InvoiceMerchantReceiptsDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/MerchantReceiptsDialog"), {
  ssr: false,
});
const InvoiceMetadataDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/MetadataDialog"), {ssr: false});
const AddRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AddRecipeDialog"), {ssr: false});
const UpdateRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/UpdateRecipeDialog"), {ssr: false});
const DeleteRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/DeleteRecipeDialog"), {ssr: false});
const PreviewRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/PreviewRecipeDialog"), {ssr: false});
const ShareRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/ShareRecipeDialog"), {ssr: false});
const InvoicesExportDialog = dynamic(() => import("../view-invoices/_components/dialogs/ExportDialog"), {ssr: false});
const InvoicesImportDialog = dynamic(() => import("../view-invoices/_components/dialogs/ImportDialog"), {ssr: false});
const RemoveScanDialog = dynamic(() => import("../edit-invoice/[id]/_components/dialogs/RemoveScanDialog"), {ssr: false});
const ShareAnalyticsDialog = dynamic(() => import("../view-invoice/[id]/_components/dialogs/ShareAnalyticsDialog"), {ssr: false});
const ShareInvoiceDialog = dynamic(() => import("../_dialogs/ShareInvoiceDialog"), {ssr: false});
// view-invoice/[id]/_components/dialogs/ExportDialog uses a named export
const ViewInvoiceExportDialog = dynamic(
  () => import("../view-invoice/[id]/_components/dialogs/ExportDialog").then((m) => ({default: m.ExportDialog})),
  {ssr: false},
);

/**
 * The DialogContainer component manages the visibility and functionality of various dialogs
 * related to invoices, merchants, recipes, and metadata. Each dialog is lazy-loaded via
 * `next/dynamic` so that routes don't ship dialog code until the user actually opens one.
 *
 * @remarks
 * Wrapped in `React.memo` and the switch is memoized on `(type, mode)` so unrelated
 * context churn doesn't re-render this tree.
 *
 * @returns The DialogContainer component, CSR'ed.
 */
function DialogContainerImpl(): React.JSX.Element | null {
  const {
    currentDialog: {type, mode},
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
      case "EDIT_INVOICE__SCAN":
        // Differentiate by mode: "add" shows AddScanDialog, anything else shows RemoveScanDialog
        return mode === "add" ? <AddScanDialog /> : <RemoveScanDialog />;
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
      default:
        return null;
    }
  }, [type, mode]);
}

export default memo(DialogContainerImpl);
