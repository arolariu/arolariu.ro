"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import Link from "next/link";
import {TbEdit, TbMenu3, TbShare, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";

type Props = {invoice: Invoice};

/**
 * This function renders the actions for the invoice table.
 * It includes options to edit, share, and delete the invoice.
 * @returns The rendered invoice table actions.
 */
export default function TableViewActions({invoice}: Readonly<Props>): React.JSX.Element {
  const {open: openShareDialog} = useDialog("SHARED__INVOICE_SHARE", "share", {invoice});
  const {open: openDeleteDialog} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});

  return (
    <TooltipProvider>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild
          className='hover:text-accent-primary cursor-pointer'>
          <Button
            variant='ghost'
            size='icon'
            className='bg-background/80 h-8 w-8 print:hidden'>
            <TbMenu3 className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-40'>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                asChild
                className='cursor-pointer'>
                <Link
                  href={`/domains/invoices/edit-invoice/${invoice.id}`}
                  className='flex items-center gap-2'>
                  <TbEdit className='mr-2 h-4 w-4' />
                  Edit
                </Link>
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side='left'>Edit invoice details</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                onClick={openShareDialog}
                className='cursor-pointer'>
                <TbShare className='mr-2 h-4 w-4' />
                Share
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side='left'>Share invoice via link or email</TooltipContent>
          </Tooltip>
          <DropdownMenuSeparator />
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                className='text-destructive cursor-pointer'
                onClick={openDeleteDialog}>
                <TbTrash className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side='left'>Permanently delete this invoice</TooltipContent>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
