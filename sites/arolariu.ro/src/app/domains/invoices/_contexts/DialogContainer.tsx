/** @format */

"use client";

import FeedbackDialog from "../view-invoice/[id]/_components/dialogs/FeedbackDialog";
import ImageDialog from "../view-invoice/[id]/_components/dialogs/ImageDialog";
import ItemsDialog from "../view-invoice/[id]/_components/dialogs/ItemsDialog";
import MerchantDialog from "../view-invoice/[id]/_components/dialogs/MerchantDialog";
import MerchantReceiptsDialog from "../view-invoice/[id]/_components/dialogs/MerchantReceiptsDialog";
import MetadataDialog from "../view-invoice/[id]/_components/dialogs/MetadataDialog";
import RecipeDialog from "../view-invoice/[id]/_components/dialogs/RecipeDialog";
import ShareAnalyticsDialog from "../view-invoice/[id]/_components/dialogs/ShareAnalytics";
import SharingDialog from "../view-invoice/[id]/_components/dialogs/SharingDialog";
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
    case "INVOICE_ITEMS":
      return <ItemsDialog />;
    case "shareAnalytics":
      return <ShareAnalyticsDialog />;
    case "INVOICE_FEEDBACK":
      return <FeedbackDialog />;
    case "INVOICE_MERCHANT":
      return <MerchantDialog />;
    case "INVOICE_MERCHANT_INVOICES":
      return <MerchantReceiptsDialog />;
    case "INVOICE_METADATA":
      return <MetadataDialog />;
    case "INVOICE_IMAGE":
      return <ImageDialog />;
    case "INVOICE_RECIPE":
      return <RecipeDialog />;
    case "INVOICE_SHARE":
      return <SharingDialog />;
    default:
      return false as unknown as React.JSX.Element;
  }
}
