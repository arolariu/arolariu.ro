"use client";

import DeleteInvoiceDialog from "../_dialogs/DeleteInvoiceDialog";
import ShareInvoiceDialog from "../_dialogs/ShareInvoiceDialog";
import AddScanDialog from "../edit-invoice/[id]/_components/dialogs/AddScanDialog";
import AnalyzeDialog from "../edit-invoice/[id]/_components/dialogs/AnalyzeDialog";
import InvoiceFeedbackDialog from "../edit-invoice/[id]/_components/dialogs/FeedbackDialog";
import InvoiceImageDialog from "../edit-invoice/[id]/_components/dialogs/ImageDialog";
import InvoiceItemsDialog from "../edit-invoice/[id]/_components/dialogs/ItemsDialog";
import InvoiceMerchantDialog from "../edit-invoice/[id]/_components/dialogs/MerchantDialog";
import InvoiceMerchantReceiptsDialog from "../edit-invoice/[id]/_components/dialogs/MerchantReceiptsDialog";
import InvoiceMetadataDialog from "../edit-invoice/[id]/_components/dialogs/MetadataDialog";
import InvoiceRecipeDialog from "../edit-invoice/[id]/_components/dialogs/RecipeDialog";
import RemoveScanDialog from "../edit-invoice/[id]/_components/dialogs/RemoveScanDialog";
import ShareAnalyticsDialog from "../view-invoice/[id]/_components/dialogs/ShareAnalyticsDialog";
import InvoicesExportDialog from "../view-invoices/_components/dialogs/ExportDialog";
import InvoicesImportDialog from "../view-invoices/_components/dialogs/ImportDialog";
import CreateInvoiceDialog from "../view-scans/_components/dialogs/CreateInvoiceDialog";
import {useDialogs} from "./DialogContext";

/**
 * The DialogContainer component manages the visibility and functionality of various dialogs
 * related to invoices, merchants, recipes, and metadata.
 * @returns The DialogContainer component, CSR'ed.
 */
export default function DialogContainer(): React.JSX.Element | null {
  const {
    currentDialog: {type, mode},
  } = useDialogs();

  switch (type) {
    // edit-invoice/[id] Dialogs
    case "EDIT_INVOICE__ANALYSIS":
      return <AnalyzeDialog />;
    case "EDIT_INVOICE__ITEMS":
      return <InvoiceItemsDialog />;
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
      // Differentiate by mode: "add" shows AddScanDialog, "delete" shows RemoveScanDialog
      return mode === "add" ? <AddScanDialog /> : <RemoveScanDialog />;
    case "EDIT_INVOICE__RECIPE":
      return <InvoiceRecipeDialog />;
    // view-invoice/[id] Dialogs
    case "VIEW_INVOICE__SHARE_ANALYTICS":
      return <ShareAnalyticsDialog />;
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
}
