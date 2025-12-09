"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
export default function InvoiceTableActions({invoice}: Readonly<Props>): React.JSX.Element {
  const {open: openShareDialog} = useDialog("VIEW_INVOICES__SHARE", "view", {invoice});
  const {open: openDeleteDialog} = useDialog("VIEW_INVOICES__DELETE", "delete", {invoice});

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        asChild
        className='cursor-pointer hover:text-blue-500'>
        <Button
          variant='ghost'
          size='icon'
          className='bg-background/80 h-8 w-8'>
          <TbMenu3 className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-[160px]'>
        <DropdownMenuItem className='cursor-pointer'>
          <Link
            href={`/domains/invoices/edit-invoice/${invoice.id}`}
            className='flex items-center gap-2'>
            <TbEdit className='mr-2 h-4 w-4' />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={openShareDialog}
          className='cursor-pointer'>
          <TbShare className='mr-2 h-4 w-4' />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive cursor-pointer'
          onClick={openDeleteDialog}>
          <TbTrash className='mr-2 h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
