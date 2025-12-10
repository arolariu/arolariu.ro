"use client";

// TODO: refactor.
/* eslint-disable */

import {usePaginationWithSearch} from "@/hooks";
import {formatDate} from "@/lib/utils.generic";
import type {Invoice, Merchant} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useEffect, useState} from "react";
import {TbArrowsUpDown, TbCalendar, TbDownload, TbSearch} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

/**
 * Dialog displaying all receipts/invoices from a specific merchant with filtering.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Features**:
 * - **Search**: Filter receipts by text search
 * - **Date Filter**: Filter by time period (dropdown selector)
 * - **Sort**: Order receipts by various criteria
 * - **Pagination**: Navigate large receipt lists
 * - **Export**: Download option for filtered results (placeholder)
 *
 * **Table Columns**:
 * Displays receipt date, amount, and other relevant details in a
 * paginated table format.
 *
 * **Data Fetching**: Currently uses mock data with 3-second simulated delay.
 * TODO: Implement real API call to fetch receipts by merchant ID.
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_MERCHANT_INVOICES`
 * type. Payload contains the `Merchant` object for context.
 *
 * **Layout**: Extra-wide dialog (`sm:max-w-4xl lg:max-w-7xl`) to accommodate
 * table with multiple columns and filtering controls.
 *
 * **Domain Context**: Enables cross-invoice navigation within the edit-invoice
 * flow, helping users analyze spending patterns at specific merchants.
 *
 * @returns Client-rendered dialog with filterable receipts table
 *
 * @example
 * ```tsx
 * // Opened via MerchantCard "View All Receipts" button:
 * const {open} = useDialog("INVOICE_MERCHANT_INVOICES", "view", merchant);
 * <Button onClick={open}>View All Receipts</Button>
 * ```
 *
 * @see {@link MerchantCard} - Parent component that opens this dialog
 * @see {@link usePaginationWithSearch} - Pagination and search hook
 * @see {@link Merchant} - Merchant type definition
 */
export default function MerchantReceiptsDialog(): React.JSX.Element {
  const locale = useLocale();
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__MERCHANT_INVOICES");
  const merchant = payload as Merchant;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [receipts, setReceipts] = useState<Invoice[]>([]);
  const {paginatedItems, resetPagination, currentPage, totalPages, setCurrentPage} = usePaginationWithSearch({
    items: receipts,
    initialPageSize: 10,
    searchQuery,
  });

  useEffect(() => {
    // Fetch receipts from the server or API
    // For now, we'll use a timeout of 3 sec and do mock invoices
    setTimeout(() => {
      setReceipts([]);
    }, 3000);
  }, [payload]);

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    console.log("Selected date filter:", value);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    console.log("Selected sort option:", value);
    resetPagination();
  };

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-4xl lg:max-w-7xl'>
        <DialogHeader>
          <DialogTitle>All receipts from {merchant.name}</DialogTitle>
          <DialogDescription>View and filter all your receipts from this merchant</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <TbSearch className='text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4' />
              <Input
                placeholder='Search receipts...'
                className='pl-8'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className='flex gap-2'>
              <div className='w-40'>
                <Select onValueChange={handleDateFilterChange}>
                  <SelectTrigger>
                    <TbCalendar className='mr-2 h-4 w-4' />
                    <SelectValue placeholder='Date' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Time</SelectItem>
                    <SelectItem value='30days'>Last 30 Days</SelectItem>
                    <SelectItem value='90days'>Last 90 Days</SelectItem>
                    <SelectItem value='thisYear'>This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='w-40'>
                <Select onValueChange={handleSortChange}>
                  <SelectTrigger>
                    <TbArrowsUpDown className='mr-2 h-4 w-4' />
                    <SelectValue placeholder='Sort' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='date-desc'>Newest First</SelectItem>
                    <SelectItem value='date-asc'>Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className='overflow-hidden rounded-md border'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='text-muted-foreground px-4 py-3 text-xs font-medium tracking-wider uppercase'>Receipt</TableHead>
                    <TableHead className='text-muted-foreground px-4 py-3 text-xs font-medium tracking-wider uppercase'>Date</TableHead>
                    <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase'>
                      Items #
                    </TableHead>
                    <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase'>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='divide-border bg-popover divide-y'>
                  {paginatedItems.map((item) => {
                    const invoiceDate = formatDate(item.paymentInformation?.transactionDate || item.createdAt, {locale});
                    return (
                      <TableRow
                        key={item.id}
                        className='hover:bg-muted/50'>
                        <TableCell className='px-4 py-3 text-sm font-medium whitespace-nowrap'>{item.name}</TableCell>
                        <TableCell className='px-4 py-3 text-sm whitespace-nowrap'>{invoiceDate}</TableCell>
                        <TableCell className='px-4 py-3 text-right text-sm whitespace-nowrap'>{item.items.length}</TableCell>
                        <TableCell className='px-4 py-3 text-right text-sm whitespace-nowrap'>
                          <Button
                            variant='ghost'
                            size='sm'>
                            <TbDownload className='mr-1 h-4 w-4' />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableHead className='text-muted-foreground px-4 py-3 text-sm font-medium'>
                      {receipts.length} receipts found (showing {paginatedItems.length})
                    </TableHead>
                    <TableCell
                      className='text-muted-foreground px-4 py-3 text-right text-sm font-medium'
                      colSpan={2}>
                      Page {currentPage} of {totalPages}
                    </TableCell>
                    <TableCell
                      className='text-muted-foreground px-4 py-3 text-right text-sm font-medium'
                      colSpan={2}>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}>
                        Previous
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}>
                        Next
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
