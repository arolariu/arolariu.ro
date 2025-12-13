"use client";

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import Link from "next/link";
import {useCallback} from "react";
import {TbDownload, TbPlus, TbPrinter, TbUpload} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

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
      className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Invoice Management</h1>
        <p className='text-muted-foreground mt-1'>Manage your receipts and track your spending habits</p>
      </div>
      <div className='flex items-center gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='cursor-pointer gap-1'
                onClick={openImportDialog}>
                <TbUpload className='h-4 w-4' />
                <span className='hidden sm:inline'>Import</span>
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
                <TbDownload className='h-4 w-4' />
                <span className='hidden sm:inline'>Export</span>
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
                <TbPrinter className='h-4 w-4' />
                <span className='hidden sm:inline'>Print</span>
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
                  <TbPlus className='h-4 w-4' />
                  <span>New Invoice</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Create a new invoice</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.article>
  );
}
