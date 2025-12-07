"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useState} from "react";
import {TbPrinter} from "react-icons/tb";

type Props = {
  invoice: Invoice;
};

/**
 * The InvoiceHeader component displays the header of an invoice.
 * It includes the invoice ID, name, a badge for important invoices, and a print button.
 * @returns The InvoiceHeader component, CSR'ed.
 */
export default function InvoiceHeader({invoice}: Readonly<Props>): React.JSX.Element {
  const [invoiceName, setInvoiceName] = useState<string>(invoice.name);

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceName(event.target.value);
  }, []);

  const handleInvoicePrint = useCallback(() => {
    globalThis.window.print();
  }, []);

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
            value={invoiceName}
            onChange={handleNameChange}
            className='w-full border-0 text-3xl font-bold tracking-tight focus-visible:border-0 focus-visible:ring-0'
          />
          <p className='text-gray-300 dark:text-gray-800'>{invoice.id}</p>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className='cursor-pointer'
                variant='outline'
                size='sm'
                onClick={handleInvoicePrint}>
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
