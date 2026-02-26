"use client";

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback} from "react";
import {TbDownload, TbPlus, TbPrinter, TbUpload} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";
import styles from "./InvoicesHeader.module.scss";

/**
 * This function renders the header for the invoices page.
 * It includes a title, description, and buttons for importing, exporting, and creating new invoices.
 * @returns The rendered invoices header.
 */
export default function InvoicesHeader(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.invoicesHeader");
  const {open: openImportDialog} = useDialog("VIEW_INVOICES__IMPORT");
  const {open: openExportDialog} = useDialog("VIEW_INVOICES__EXPORT");

  const handlePrintAction = useCallback(() => {
    globalThis.window.print();
  }, []);

  return (
    <motion.article
      initial={{y: -20, opacity: 0}}
      animate={{y: 0, opacity: 1}}
      transition={{duration: 0.3}}
      className={styles["header"]}>
      <div>
        <h1 className={styles["title"]}>{t("title")}</h1>
        <p className={styles["description"]}>{t("description")}</p>
      </div>
      <div className={styles["actions"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='cursor-pointer gap-1'
                onClick={openImportDialog}>
                <TbUpload className={styles["actionIcon"]} />
                <span className={styles["buttonLabel"]}>{t("actions.import")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("tooltips.import")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='cursor-pointer gap-1'
                onClick={openExportDialog}>
                <TbDownload className={styles["actionIcon"]} />
                <span className={styles["buttonLabel"]}>{t("actions.export")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("tooltips.export")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='cursor-pointer gap-1'
                onClick={handlePrintAction}>
                <TbPrinter className={styles["actionIcon"]} />
                <span className={styles["buttonLabel"]}>{t("actions.print")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("tooltips.print")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href='/domains/invoices/create-invoice'>
                <Button
                  size='sm'
                  className='cursor-pointer gap-1'>
                  <TbPlus className={styles["actionIcon"]} />
                  <span>{t("actions.newInvoice")}</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t("tooltips.newInvoice")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.article>
  );
}
