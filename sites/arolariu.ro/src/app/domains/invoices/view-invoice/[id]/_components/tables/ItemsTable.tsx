/** @format */

"use client";

import {usePagination} from "@/hooks/usePagination";
import {formatCurrency} from "@/lib/utils.generic";
import {Product} from "@/types/invoices";
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
import {motion} from "framer-motion";
import {TbEdit} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  items: Product[];
};

export function ItemsTable({items}: Readonly<Props>) {
  const {open} = useDialog("editItems");

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const {paginatedItems, currentPage, setCurrentPage, totalPages} = usePagination({items, initialPageSize: 5});

  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
  };

  const handlePreviousPage = () => {
    const previousPage = currentPage - 1;
    if (previousPage >= 1) {
      setCurrentPage(previousPage);
    }
  };

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
        <Table className='divide-border min-w-full divide-y'>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead className='text-muted-foreground px-4 py-3 text-left text-xs font-medium uppercase tracking-wider'>Item</TableHead>
              <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>Qty</TableHead>
              <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                Price
              </TableHead>
              <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='bg-popover divide-border divide-y'>
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
        <div className='bg-popover flex items-center justify-between border-t p-4'>
          <div className='text-muted-foreground text-sm'>
            {items.length} {items.length === 1 ? "item" : "items"} in total
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
