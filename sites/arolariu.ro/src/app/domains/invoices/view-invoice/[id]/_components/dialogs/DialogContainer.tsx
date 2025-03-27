/** @format */

"use client";

import {useDialogs} from "../../_contexts/DialogContext";
import {FeedbackDialog} from "./FeedbackDialog";
import {ItemsDialog} from "./ItemsDialog";
import {MerchantDialog} from "./MerchantDialog";
import {MerchantReceiptsDialog} from "./MerchantReceiptsDialog";
import {MetadataDialog} from "./MetadataDialog";
import {RecipeDialog} from "./RecipeDialog";
import {ShareAnalyticsDialog} from "./ShareAnalytics";
import {SharingDialog} from "./SharingDialog";

/**
 * The DialogContainer component manages the visibility and functionality of various dialogs
 * related to invoices, merchants, recipes, and metadata.
 * @returns The DialogContainer component, CSR'ed.
 */
export function DialogContainer() {
  const {
    currentDialog: {type},
  } = useDialogs();

  switch (type) {
    case "editItems":
      return <ItemsDialog />;
    case "shareAnalytics":
      return <ShareAnalyticsDialog />;
    case "feedback":
      return <FeedbackDialog />;
    case "merchantReceipts":
      return <MerchantReceiptsDialog />;
    case "merchant":
      return <MerchantDialog />;
    case "metadata":
      return <MetadataDialog />;
    case "recipe":
      return <RecipeDialog />;
    case "share":
      return <SharingDialog />;
    default:
      return null;
  }
}
