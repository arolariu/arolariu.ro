"use client";

import InvoiceFeedbackDialog from "../edit-invoice/[id]/_components/dialogs/FeedbackDialog";
import InvoiceImageDialog from "../edit-invoice/[id]/_components/dialogs/ImageDialog";
import InvoiceItemsDialog from "../edit-invoice/[id]/_components/dialogs/ItemsDialog";
import InvoiceMerchantDialog from "../edit-invoice/[id]/_components/dialogs/MerchantDialog";
import InvoiceMerchantReceiptsDialog from "../edit-invoice/[id]/_components/dialogs/MerchantReceiptsDialog";
import InvoiceMetadataDialog from "../edit-invoice/[id]/_components/dialogs/MetadataDialog";
import InvoiceRecipeDialog from "../edit-invoice/[id]/_components/dialogs/RecipeDialog";
import InvoiceSharingDialog from "../edit-invoice/[id]/_components/dialogs/SharingDialog";
import InvoicesExportDialog from "../view-invoices/_components/dialogs/ExportDialog";
import InvoicesImportDialog from "../view-invoices/_components/dialogs/ImportDialog";
import InvoicesInvoiceShareDialog from "../view-invoices/_components/dialogs/ShareDialog";
import {useDialogs} from "./DialogContext";

/**
 * The DialogContainer component manages the visibility and functionality of various dialogs
 * related to invoices, merchants, recipes, and metadata.
 * @returns The DialogContainer component, CSR'ed.
 */
export default function DialogContainer(): React.JSX.Element | null {
  const {
    currentDialog: {type},
  } = useDialogs();

  switch (type) {
    case "INVOICE_ITEMS":
      return <InvoiceItemsDialog />;
    case "INVOICE_FEEDBACK":
      return <InvoiceFeedbackDialog />;
    case "INVOICE_MERCHANT":
      return <InvoiceMerchantDialog />;
    case "INVOICE_MERCHANT_INVOICES":
      return <InvoiceMerchantReceiptsDialog />;
    case "INVOICE_METADATA":
      return <InvoiceMetadataDialog />;
    case "INVOICE_IMAGE":
      return <InvoiceImageDialog />;
    case "INVOICE_RECIPE":
      return <InvoiceRecipeDialog />;
    case "INVOICE_SHARE":
      return <InvoiceSharingDialog />;
    case "INVOICES_SHARE":
      return <InvoicesInvoiceShareDialog />;
    case "INVOICES_IMPORT":
      return <InvoicesImportDialog />;
    case "INVOICES_EXPORT":
      return <InvoicesExportDialog />;
    default:
      return null as never;
  }
}
