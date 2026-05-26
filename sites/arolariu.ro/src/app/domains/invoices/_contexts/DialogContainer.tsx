"use client";

import dynamic from "next/dynamic";
import {memo, useMemo} from "react";
import {useDialogs} from "./DialogContext";

// All dialogs are client-only and lazy-loaded.
// The Dialog's own open animation masks the import-fetch latency on first open.
const AddScanDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AddScanDialog"), {ssr: false});
const AllergenDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AllergenDialog"), {ssr: false});
const AnalyzeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/AnalyzeDialog"), {ssr: false});
const BulkCategoryDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/BulkCategoryDialog"), {ssr: false});
const CreateInvoiceDialog = dynamic(() => import("../view-scans/_dialogs/CreateInvoiceDialog"), {ssr: false});
const DeleteInvoiceDialog = dynamic(() => import("../_dialogs/DeleteInvoiceDialog"), {ssr: false});
const DeleteScanDialog = dynamic(() => import("../_dialogs/DeleteScanDialog"), {ssr: false});
const InvoiceFeedbackDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/FeedbackDialog"), {ssr: false});
const InvoiceImageDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/ImageDialog"), {ssr: false});
const InvoiceItemsDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/ItemsDialog"), {ssr: false});
const InvoiceMerchantDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/MerchantDialog"), {ssr: false});
const InvoiceMerchantReceiptsDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/MerchantReceiptsDialog"), {
  ssr: false,
});
const InvoiceMetadataDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/MetadataDialog"), {ssr: false});
const InvoiceRecipeDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/RecipeDialog"), {ssr: false});
const InvoicesExportDialog = dynamic(() => import("../view-invoices/_dialogs/ExportDialog"), {ssr: false});
const InvoicesImportDialog = dynamic(() => import("../view-invoices/_dialogs/ImportDialog"), {ssr: false});
const PreviewScanDialog = dynamic(() => import("../_dialogs/PreviewScanDialog"), {ssr: false});
const RemoveScanDialog = dynamic(() => import("../edit-invoice/[id]/_dialogs/RemoveScanDialog"), {ssr: false});
const ShareAnalyticsDialog = dynamic(() => import("../view-invoice/[id]/_dialogs/ShareAnalyticsDialog"), {ssr: false});
const ShareInvoiceDialog = dynamic(() => import("../_dialogs/ShareInvoiceDialog"), {ssr: false});
// view-invoice/[id]/_dialogs/ExportDialog uses a named export
const ViewInvoiceExportDialog = dynamic(
  () => import("../view-invoice/[id]/_dialogs/ExportDialog").then((m) => ({default: m.ExportDialog})),
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
      case "EDIT_INVOICE__RECIPE":
        return <InvoiceRecipeDialog />;
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
