"use client";

import InvoiceFeedbackDialog from "../edit-invoice/[id]/_components/dialogs/FeedbackDialog";
import InvoiceImageDialog from "../edit-invoice/[id]/_components/dialogs/ImageDialog";
import InvoiceItemsDialog from "../edit-invoice/[id]/_components/dialogs/ItemsDialog";
import InvoiceMerchantDialog from "../edit-invoice/[id]/_components/dialogs/MerchantDialog";
import InvoiceMerchantReceiptsDialog from "../edit-invoice/[id]/_components/dialogs/MerchantReceiptsDialog";
import InvoiceMetadataDialog from "../edit-invoice/[id]/_components/dialogs/MetadataDialog";
import InvoiceRecipeDialog from "../edit-invoice/[id]/_components/dialogs/RecipeDialog";
import InvoiceSharingDialog from "../edit-invoice/[id]/_components/dialogs/SharingDialog";
import ShareAnalyticsDialog from "../view-invoice/[id]/_components/dialogs/ShareAnalyticsDialog";
import InvoicesExportDialog from "../view-invoices/_components/dialogs/ExportDialog";
import InvoicesImportDialog from "../view-invoices/_components/dialogs/ImportDialog";
import InvoicesInvoiceShareDialog from "../view-invoices/_components/dialogs/ShareDialog";
import {useDialogs} from "./DialogContext";

/**
 * The DialogContainer component manages the visibility and functionality of various dialogs
 * related to invoices, merchants, recipes, and metadata.
 * @returns The DialogContainer component, CSR'ed.
 */
export default function DialogContainer(): React.JSX.Element {
  const {
    currentDialog: {type},
  } = useDialogs();

  switch (type) {
    // edit-invoice/[id] Dialogs
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
    case "EDIT_INVOICE__RECIPE":
      return <InvoiceRecipeDialog />;
    case "EDIT_INVOICE__SHARE":
      return <InvoiceSharingDialog />;
    // view-invoice/[id] Dialogs
    case "VIEW_INVOICE__SHARE_ANALYTICS":
      return <ShareAnalyticsDialog />;
    // view-invoices Dialogs
    case "VIEW_INVOICES__SHARE":
      return <InvoicesInvoiceShareDialog />;
    case "VIEW_INVOICES__IMPORT":
      return <InvoicesImportDialog />;
    case "VIEW_INVOICES__EXPORT":
      return <InvoicesExportDialog />;
    default:
      return <></>;
  }
}
