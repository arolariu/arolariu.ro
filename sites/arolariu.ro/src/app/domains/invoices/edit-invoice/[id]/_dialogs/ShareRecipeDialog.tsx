"use client";

import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbCopy, TbShare} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./RecipeDialog.module.scss";

export default function ShareRecipeDialog(): React.JSX.Element {
  const t = useTranslations("IMS--Dialogs.recipeDialog");
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__RECIPE_SHARE", "share");
  const recipe = payload?.recipe ?? null;
  const shareUrl = recipe?.referenceForMoreDetails.trim() ?? "";

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      toast.info(t("share.unavailable"));
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("share.copied"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t("share.copyFailed"));
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
          <DialogTitle>{t("share.title")}</DialogTitle>
          <DialogDescription>{recipe ? t("share.description") : t("share.missingRecipe")}</DialogDescription>
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
                <p className={styles["readText"]}>{t("share.unavailable")}</p>
              )}
            </div>
          ) : (
            <p className={styles["readText"]}>{t("share.missingRecipe")}</p>
          )}
        </div>

        <DialogFooter className={styles["dialogFooter"]}>
          <div className={styles["footerActions"]}>
            <Button
              type='button'
              variant='outline'
              onClick={close}>
              {t("buttons.close")}
            </Button>
            <Button
              type='button'
              onClick={handleCopy}
              disabled={!shareUrl}>
              <TbCopy className={styles["saveIcon"]} />
              {t("share.copy")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
