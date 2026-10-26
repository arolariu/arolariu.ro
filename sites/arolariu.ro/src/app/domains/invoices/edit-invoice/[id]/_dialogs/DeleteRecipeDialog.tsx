"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  toast,
} from "@arolariu/components";
import {isRecipeSuggestion, type RecipeSuggestion} from "@/types/invoices";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useMemo} from "react";
import {useDialog} from "../../../_contexts/DialogContext";
import {useRecipeDelete} from "../../../_hooks/invoice";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";
import styles from "./DeleteRecipeDialog.module.scss";

function RichTextStrong(chunks: React.ReactNode): React.JSX.Element {
  return <strong>{chunks}</strong>;
}

type DeleteRecipePayload = Readonly<{
  recipe: RecipeSuggestion;
  recipeIndex: number;
}>;

function getDeleteRecipePayload(payload: unknown): DeleteRecipePayload | null {
  if (typeof payload !== "object" || payload === null || !("recipe" in payload) || !("recipeIndex" in payload)) {
    return null;
  }
  const {recipe, recipeIndex} = payload;
  if (!isRecipeSuggestion(recipe) || typeof recipeIndex !== "number" || !Number.isSafeInteger(recipeIndex)) {
    return null;
  }
  return {recipe, recipeIndex};
}

export default function DeleteRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__RECIPE_DELETE", "delete");
  const recipePayload = useMemo(() => getDeleteRecipePayload(payload), [payload]);
  const {invoice} = useEditInvoiceContext();
  const {isDeleting, removeRecipeCallback} = useRecipeDelete(invoice);

  const handleDelete = useCallback(async () => {
    if (recipePayload === null) {
      toast.error(t((m) => m.dialogs.invoices.recipeDialog.delete.missingRecipe));
      return;
    }

    try {
      await removeRecipeCallback(recipePayload.recipeIndex);
      toast.success(t((m) => m.dialogs.invoices.recipeDialog.delete.success));
      close();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t((m) => m.dialogs.invoices.recipeDialog.delete.error));
    }
  }, [recipePayload, removeRecipeCallback, close, router, t]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t((m) => m.dialogs.invoices.recipeDialog.delete.title)}</AlertDialogTitle>
          <AlertDialogDescription>
            {recipePayload === null
              ? t((m) => m.dialogs.invoices.recipeDialog.delete.missingRecipe)
              : t.rich((m) => m.dialogs.invoices.recipeDialog.delete.description, {
                  name: recipePayload.recipe.name,
                  strong: RichTextStrong,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t((m) => m.dialogs.invoices.recipeDialog.buttons.cancel)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || recipePayload === null}
            className={styles["deleteAction"]}>
            {isDeleting
              ? t((m) => m.dialogs.invoices.recipeDialog.buttons.deleting)
              : t((m) => m.dialogs.invoices.recipeDialog.buttons.delete)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
