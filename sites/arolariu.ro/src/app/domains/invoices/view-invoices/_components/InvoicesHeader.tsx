"use client";

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
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
      <main>
        <h1 className={styles["title"]}>Invoice Management</h1>
        <p className={styles["description"]}>Manage your receipts and track your spending habits</p>
      </main>
      <main className={styles["actions"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='cursor-pointer gap-1'
                onClick={openImportDialog}>
                <TbUpload className={styles["actionIcon"]} />
                <span className={styles["buttonLabel"]}>Import</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import invoices from files</TooltipContent>
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
                <span className={styles["buttonLabel"]}>Export</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export all invoices</TooltipContent>
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
                <span className={styles["buttonLabel"]}>Print</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print invoices</TooltipContent>
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
                  <span>New Invoice</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Create a new invoice</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </main>
    </motion.article>
  );
}
