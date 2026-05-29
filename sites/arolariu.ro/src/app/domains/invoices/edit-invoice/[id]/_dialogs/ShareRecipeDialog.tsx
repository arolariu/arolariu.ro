"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbCopy, TbShare} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./ShareRecipeDialog.module.scss";

export default function ShareRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__RECIPE_SHARE", "share");
  const recipe = payload?.recipe ?? null;
  const shareUrl = recipe?.referenceForMoreDetails.trim() ?? "";

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      toast.info(t((m) => m.dialogs.invoices.recipeDialog.share.unavailable));
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t((m) => m.dialogs.invoices.recipeDialog.share.copied));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t((m) => m.dialogs.invoices.recipeDialog.share.copyFailed));
    }
  }, [shareUrl, t]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.recipeDialog.share.title)}</DialogTitle>
          <DialogDescription>
            {recipe
              ? t((m) => m.dialogs.invoices.recipeDialog.share.description)
              : t((m) => m.dialogs.invoices.recipeDialog.share.missingRecipe)}
          </DialogDescription>
        </DialogHeader>

        <div className={styles["formBody"]}>
          {recipe ? (
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-share-url'>{recipe.name}</Label>
              {shareUrl ? (
                <div className={styles["timeRow"]}>
                  <TbShare className={styles["mutedIcon"]} />
                  <Input
                    id='recipe-share-url'
                    value={shareUrl}
                    readOnly
                  />
                </div>
              ) : (
                <p className={styles["readText"]}>{t((m) => m.dialogs.invoices.recipeDialog.share.unavailable)}</p>
              )}
            </div>
          ) : (
            <p className={styles["readText"]}>{t((m) => m.dialogs.invoices.recipeDialog.share.missingRecipe)}</p>
          )}
        </div>

        <DialogFooter className={styles["dialogFooter"]}>
          <div className={styles["footerActions"]}>
            <Button
              type='button'
              variant='outline'
              onClick={close}>
              {t((m) => m.dialogs.invoices.recipeDialog.buttons.close)}
            </Button>
            <Button
              type='button'
              onClick={handleCopy}
              disabled={!shareUrl}>
              <TbCopy className={styles["saveIcon"]} />
              {t((m) => m.dialogs.invoices.recipeDialog.share.copy)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
