"use client";

import {useUserInformation} from "@/hooks";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";
import * as React from "react";
import {TbHeart, TbPencil, TbPrinter, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useInvoiceContext} from "../_context/InvoiceContext";
import styles from "./InvoiceHeader.module.scss";

export function InvoiceHeader(): React.JSX.Element {
  const t = useTranslations("Invoices.Shared.invoiceHeader");
  const {invoice} = useInvoiceContext();
  const {
    userInformation: {userIdentifier},
  } = useUserInformation();
  const {open: openDeleteDialog} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});
  const isOwner = invoice.userIdentifier === userIdentifier;

  return (
    <TooltipProvider>
      <div className={styles["header"]}>
        <div className={styles["titleArea"]}>
          <div className={styles["titleRow"]}>
            <h1 className={styles["title"]}>{invoice.name}</h1>
            {Boolean(invoice.isImportant) && (
              <Tooltip>
                <TooltipTrigger render={<TbHeart className={styles["heartIcon"]} />} />
                <TooltipContent>
                  <p>{t("tooltips.importantInvoice")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className={styles["invoiceId"]}>{t("id", {id: invoice.id})}</p>
        </div>
        <div className={styles["actions"]}>
          {Boolean(isOwner) && (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={`/domains/invoices/edit-invoice/${invoice.id}`}
                      className={styles["editLink"]}>
                      <Button>
                        <TbPencil className={styles["buttonIcon"]} />
                        {t("buttons.edit")}
                      </Button>
                    </Link>
                  }
                />
                <TooltipContent>
                  <p>{t("tooltips.edit")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='destructive'
                      onClick={openDeleteDialog}>
                      <TbTrash className={styles["buttonIcon"]} />
                      {t("buttons.delete")}
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t("tooltips.delete")}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant='outline'>
                  <TbPrinter className={styles["buttonIcon"]} />
                  {t("buttons.print")}
                </Button>
              }
            />
            <TooltipContent>
              <p>{t("tooltips.print")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
