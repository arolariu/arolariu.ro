/** @format */

"use client";

import {Invoice} from "@/types/invoices";
import {Badge, Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "framer-motion";
import {TbAlertTriangle, TbPrinter} from "react-icons/tb";
import {CurrencySelector} from "./CurrencySelector";

type Props = {
  invoice: Invoice;
  onToggleFavorite: () => void;
  onCurrencyChange: (currency: string) => void;
  onPrint: () => void;
};

/**
 * The InvoiceHeader component displays the header of an invoice.
 * It includes the invoice ID, name, a badge for important invoices, and a print button.
 * @returns The InvoiceHeader component, CSR'ed.
 */
export function InvoiceHeader({invoice, onToggleFavorite, onPrint}: Readonly<Props>) {
  const {id, name, isImportant} = invoice;
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
            value={name}
            className='w-full border-0 text-3xl font-bold tracking-tight focus-visible:border-0 focus-visible:ring-0'
          />
          <p className='text-gray-300 dark:text-gray-800'>{id}</p>
        </div>
        {isImportant && (
          <Badge
            variant='destructive'
            className='ml-2'>
            <TbAlertTriangle className='mr-1 h-3 w-3' />
            MARKED AS IMPORTANT!
          </Badge>
        )}
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
