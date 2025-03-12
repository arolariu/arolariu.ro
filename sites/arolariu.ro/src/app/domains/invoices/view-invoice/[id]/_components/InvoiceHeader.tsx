/** @format */

"use client";

import {Invoice} from "@/types/invoices";
import {Badge, Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "framer-motion";
import {AlertTriangle, Printer} from "lucide-react";

type Props = {
  invoice: Invoice;
  onToggleFavorite: () => void;
  onCurrencyChange: (currency: string) => void;
  onPrint: () => void;
};

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
            className='border-0 text-3xl font-bold tracking-tight focus-visible:border-0 focus-visible:ring-0'
          />
          <p className='text-muted-foreground'>{id}</p>
        </div>
        {isImportant && (
          <Badge
            variant='destructive'
            className='ml-2'>
            <AlertTriangle className='mr-1 h-3 w-3' />
            MARKED AS IMPORTANT!
          </Badge>
        )}
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        {/* <CurrencySelector
          selectedCurrency={selectedCurrency}
          onCurrencyChange={onCurrencyChange}
        /> */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                onClick={onPrint}>
                <Printer className='mr-2 h-4 w-4' />
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

