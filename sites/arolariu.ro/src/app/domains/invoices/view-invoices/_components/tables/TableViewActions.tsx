"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbEdit, TbMenu3, TbShare, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./TableViewActions.module.scss";

type Props = {invoice: Invoice};

/**
 * This function renders the actions for the invoice table.
 * It includes options to edit, share, and delete the invoice.
 * @returns The rendered invoice table actions.
 */
export default function TableViewActions({invoice}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.tableViewActions");
  const {open: openShareDialog} = useDialog("SHARED__INVOICE_SHARE", "share", {invoice});
  const {open: openDeleteDialog} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});

  return (
    <TooltipProvider>
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                className={styles["menuTrigger"]}
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    className={styles["actionButton"]}>
                    <TbMenu3 className={styles["menuIcon"]} />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side='left'>{t("tooltips.moreActions")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align='end'
          className={styles["menuContent"]}>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuItem
                  className={styles["menuItem"]}
                  render={
                    <Link
                      href={`/domains/invoices/edit-invoice/${invoice.id}`}
                      className={styles["editLink"]}>
                      <TbEdit className={styles["menuItemIcon"]} />
                      {t("actions.edit")}
                    </Link>
                  }
                />
              }
            />
            <TooltipContent side='left'>{t("tooltips.edit")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuItem
                  onClick={openShareDialog}
                  className={styles["menuItem"]}>
                  <TbShare className={styles["menuItemIcon"]} />
                  {t("actions.share")}
                </DropdownMenuItem>
              }
            />
            <TooltipContent side='left'>{t("tooltips.share")}</TooltipContent>
          </Tooltip>
          <DropdownMenuSeparator />
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuItem
                  className={styles["menuItemDestructive"]}
                  onClick={openDeleteDialog}>
                  <TbTrash className={styles["menuItemIcon"]} />
                  {t("actions.delete")}
                </DropdownMenuItem>
              }
            />
            <TooltipContent side='left'>{t("tooltips.delete")}</TooltipContent>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
