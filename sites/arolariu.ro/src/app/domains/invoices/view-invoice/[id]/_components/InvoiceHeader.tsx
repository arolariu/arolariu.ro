"use client";

import {useUserInformation} from "@/hooks";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import Link from "next/link";
import * as React from "react";
import {TbHeart, TbPencil, TbPrinter, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useInvoiceContext} from "../_context/InvoiceContext";

export function InvoiceHeader(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const {
    userInformation: {userIdentifier},
  } = useUserInformation();
  const {open: openDeleteDialog} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});
  const isOwner = invoice.userIdentifier === userIdentifier;

  return (
    <TooltipProvider>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <h1 className='text-3xl font-bold tracking-tight'>{invoice.name}</h1>
            {Boolean(invoice.isImportant) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <TbHeart className='h-5 w-5 fill-red-500 text-red-500' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Important Invoice</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className='text-muted-foreground font-mono text-sm'>ID: {invoice.id}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {Boolean(isOwner) && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/domains/invoices/edit-invoice/${invoice.id}`}
                    className='flex'>
                    <Button>
                      <TbPencil className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit this invoice</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='destructive'
                    onClick={openDeleteDialog}>
                    <TbTrash className='mr-2 h-4 w-4' />
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete this invoice permanently</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='outline'>
                <TbPrinter className='mr-2 h-4 w-4' />
                Print
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print this invoice</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
