/** @format */

"use client";

import {usePaginationWithSearch} from "@/hooks/usePagination";
import {formatCurrency} from "@/lib/utils.generic";
import {Invoice} from "@/types/invoices";
import {
  Button,
  Table,
  TableBody,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback} from "react";
import {TbEdit} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
};

/**
 * The ItemsTable component displays a paginated table of invoice items.
 * It allows users to edit items and view their details.
 * @param items The list of invoice items to display.
 * @returns The ItemsTable component, CSR'ed.
 */
export function ItemsTable({invoice}: Readonly<Props>) {
  const {open} = useDialog("editItems", "edit", invoice);

  const totalAmount = invoice.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const {paginatedItems, currentPage, setCurrentPage, totalPages} = usePaginationWithSearch({items: invoice.items, initialPageSize: 5});

  const handleNextPage = useCallback(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const handlePreviousPage = useCallback(() => {
    const previousPage = currentPage - 1;
    if (previousPage >= 1) {
      setCurrentPage(previousPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <div>
      <div className='mb-2 flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Items</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                onClick={open}
                className='h-8'>
                <TbEdit className='mr-1 h-3.5 w-3.5' />
                Edit Items
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit invoice items and quantities</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className='overflow-hidden rounded-md border'>
        <Table className='min-w-full divide-y divide-border'>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>Item</TableHead>
              <TableHead className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground'>Qty</TableHead>
              <TableHead className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                Price
              </TableHead>
              <TableHead className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='divide-y divide-border bg-popover'>
            {paginatedItems.map((item, index) => (
              <motion.tr
                key={item.rawName}
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: index * 0.05}}
                className='hover:bg-muted/50'>
                <td className='whitespace-nowrap px-4 py-3 text-sm'>{item.rawName}</td>
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                  {item.quantity} {item.quantityUnit}
                </td>
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm'>{formatCurrency(item.price)}</td>
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm font-medium'>{formatCurrency(item.price * item.quantity)}</td>
              </motion.tr>
            ))}
            {Array.from({length: 5 - paginatedItems.length}).map((_, index) => (
              <motion.tr
                // eslint-disable-next-line react/no-array-index-key -- Using index as key for empty rows
                key={index}
                initial={{opacity: 0, x: 0}}
                animate={{opacity: 1, x: 0}}
                transition={{delay: index * 0.05}}
                className='h-12'>
                <td className='whitespace-nowrap px-4 py-3 text-sm' />
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm' />
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm' />
                <td className='whitespace-nowrap px-4 py-3 text-right text-sm' />
              </motion.tr>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className='bg-muted/50'>
              <TableHead
                colSpan={3}
                className='px-4 py-3 text-right text-sm font-medium'>
                Total
              </TableHead>
              <TableHead className='px-4 py-3 text-right text-sm font-medium'>{formatCurrency(totalAmount)}</TableHead>
            </TableRow>
          </TableFooter>
        </Table>

        {/* Pagination controls*/}
        <div className='flex items-center justify-between border-t bg-popover p-4'>
          <div className='text-sm text-muted-foreground'>
            {invoice.items.length} {invoice.items.length === 1 ? "item" : "items"} in total
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handlePreviousPage}>
              Previous
            </Button>
            <span className='text-sm font-medium'>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={handleNextPage}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
