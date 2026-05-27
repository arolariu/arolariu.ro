"use client";

import {useUserInformation} from "@/hooks";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import * as React from "react";
import {TbDownload, TbHeart, TbPencil, TbPrinter, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useInvoiceContext} from "../_context/InvoiceContext";
import styles from "./InvoiceHeader.module.scss";

export function InvoiceHeader(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  const {
    userInformation: {userIdentifier},
  } = useUserInformation();
  const {open: openDeleteDialog} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});
  const {open: openExportDialog} = useDialog("VIEW_INVOICE__EXPORT");
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
                  <p>{t((m) => m.shared.invoices.invoiceHeader.tooltips.importantInvoice)}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className={styles["invoiceId"]}>{t((m) => m.shared.invoices.invoiceHeader.id, {id: invoice.id})}</p>
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
                        {t((m) => m.shared.invoices.invoiceHeader.buttons.edit)}
                      </Button>
                    </Link>
                  }
                />
                <TooltipContent>
                  <p>{t((m) => m.shared.invoices.invoiceHeader.tooltips.edit)}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='destructive'
                      onClick={openDeleteDialog}>
                      <TbTrash className={styles["buttonIcon"]} />
                      {t((m) => m.shared.invoices.invoiceHeader.buttons.delete)}
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t((m) => m.shared.invoices.invoiceHeader.tooltips.delete)}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant='outline'>
                  <TbPrinter className={styles["buttonIcon"]} />
                  {t((m) => m.shared.invoices.invoiceHeader.buttons.print)}
                </Button>
              }
            />
            <TooltipContent>
              <p>{t((m) => m.shared.invoices.invoiceHeader.tooltips.print)}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  onClick={openExportDialog}>
                  <TbDownload className={styles["buttonIcon"]} />
                  {t((m) => m.shared.invoices.invoiceHeader.buttons.export)}
                </Button>
              }
            />
            <TooltipContent>
              <p>{t((m) => m.shared.invoices.invoiceHeader.tooltips.export)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
