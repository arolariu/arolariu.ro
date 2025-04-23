/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {TbDownload, TbPlus, TbPrinter, TbUpload} from "react-icons/tb";
import {DialogProvider} from "../_contexts/DialogContext";

type Props = {
  invoices: Invoice[];
};

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen({invoices}: Readonly<Props>): React.JSX.Element {
  return (
    <DialogProvider>
      <motion.section>
        <motion.article>
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
                    onClick={() => {}}>
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
                    onClick={() => {}}>
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
                    onClick={() => {}}>
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
                  <Button
                    size='sm'
                    className='cursor-pointer gap-1'>
                    <TbPlus className='h-4 w-4' />
                    <span>New Invoice</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create a new invoice</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.article>

        <motion.article>You have {invoices.length} invoices.</motion.article>
      </motion.section>
    </DialogProvider>
  );
}
