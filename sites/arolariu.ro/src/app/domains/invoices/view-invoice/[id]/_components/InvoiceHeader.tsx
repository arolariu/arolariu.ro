"use client";

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {TbHeart, TbPencil, TbPrinter, TbShare2} from "react-icons/tb";
import {useInvoiceContext} from "../_context/InvoiceContext";

export function InvoiceHeader(): React.JSX.Element {
  const {invoice} = useInvoiceContext();

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
      <div className='space-y-1'>
        <div className='flex items-center gap-2'>
          <h1 className='text-3xl font-bold tracking-tight'>{invoice.name}</h1>
          {invoice.isImportant && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TbHeart className='h-5 w-5 fill-red-500 text-red-500' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Important Invoice</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className='text-muted-foreground font-mono text-sm'>ID: {invoice.id}</p>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button asChild>
          <a href='#'>
            <TbPencil className='mr-2 h-4 w-4' />
            Edit
          </a>
        </Button>
        <Button variant='outline'>
          <TbPrinter className='mr-2 h-4 w-4' />
          Print
        </Button>
        <Button variant='outline'>
          <TbShare2 className='mr-2 h-4 w-4' />
          Share
        </Button>
      </div>
    </div>
  );
}
