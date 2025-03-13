/** @format */

"use client";

import type {Invoice, Merchant, Recipe} from "@/types/invoices";
import {ExportDialog} from "./ExportDialog";
import {FeedbackDialog} from "./FeedbackDialog";
import {ItemsDialog} from "./ItemsDialog";
import {MerchantDialog} from "./MerchantDialog";
import {MerchantReceiptsDialog} from "./MerchantReceiptsDialog";
import {MetadataDialog} from "./MetadataDialog";
import {RecipeDialog} from "./RecipeDialog";
import {ShareAnalyticsDialog} from "./ShareAnalytics";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
  selectedMode: "add" | "edit" | "view";
  selectedRecipe: Recipe;
  selectedMetadata: Record<string, string>;
};

/**
 * The DialogContainer component manages the visibility and functionality of various dialogs
 * related to invoices, merchants, recipes, and metadata.
 * @returns The DialogContainer component, CSR'ed.
 */
export function DialogContainer(props: Readonly<Props>) {
  const {invoice, merchant, selectedMetadata, selectedRecipe, selectedMode} = props;

  const onAddRecipe = () => {
    // Implement recipe creation logic
    setMode("add");
  };

  const onSaveRecipe = (recipe: Recipe) => {
    // Implement recipe saving logic
    console.log("Saving recipe:", recipe);
  };

  const onDeleteRecipe = (recipe: Recipe) => {
    // Implement recipe deletion logic
    console.log("Deleting recipe:", recipe);
  };

  return (
    <>
      <ExportDialog invoice={invoice} />
      <FeedbackDialog invoice={invoice} />
      <MerchantDialog merchant={merchant} />
      <MerchantReceiptsDialog merchant={merchant} />

      <RecipeDialog
        invoice={invoice}
        recipe={selectedRecipe}
        mode={selectedMode}
        onCreate={onAddRecipe}
        onUpdate={onSaveRecipe}
        onDelete={onDeleteRecipe}
      />

      <MetadataDialog
        invoice={invoice}
        mode={selectedMode === "edit" ? "edit" : "add"}
        metadata={selectedMetadata}
      />

      <ItemsDialog invoice={invoice} />

      {/* <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              {itemToDelete.type === "recipe" ? " recipe" : " metadata field"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}

      <ShareAnalyticsDialog
        invoice={invoice}
        merchant={merchant}
      />
    </>
  );
}
