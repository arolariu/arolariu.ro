/** @format */

"use client";

import {Invoice} from "@/types/invoices";
import {Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {TbPrinter} from "react-icons/tb";
import {CurrencySelector} from "./CurrencySelector";

type Props = {
  invoice: Invoice;
  onCurrencyChange: (currency: string) => void;
  onPrint: () => void;
};

/**
 * The InvoiceHeader component displays the header of an invoice.
 * It includes the invoice ID, name, a badge for important invoices, and a print button.
 * @returns The InvoiceHeader component, CSR'ed.
 */
export function InvoiceHeader({invoice, onPrint}: Readonly<Props>) {
  return (
    <motion.div
      initial={{opacity: 0, y: -20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.5}}
      className='mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center'>
      <div className='flex items-center gap-2'>
        <div>
          <Input
            type='text'
            value={invoice.name}
            className='w-full border-0 text-3xl font-bold tracking-tight focus-visible:border-0 focus-visible:ring-0'
          />
          <p className='text-gray-300 dark:text-gray-800'>{invoice.id}</p>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <CurrencySelector />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                onClick={onPrint}>
                <TbPrinter className='mr-2 h-4 w-4' />
                Print
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print this invoice with all details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
