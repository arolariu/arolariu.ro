/** @format */

"use client";

import {usePagination} from "@/hooks/usePagination";
import {formatDate} from "@/lib/utils.generic";
import type {Invoice, Merchant} from "@/types/invoices";
import {
  Button,
  Calendar,
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
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components";
import {ArrowUpDown, Download, Search} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  merchant: Merchant;
};

export function MerchantReceiptsDialog({merchant}: Readonly<Props>) {
  const {isOpen, open, close} = useDialog("merchantReceipts");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [receipts, setReceipts] = useState<Invoice[]>([]);
  const {paginatedItems} = usePagination({items: receipts, searchQuery});

  useEffect(() => {
    const fetchReceipts = async () => {
      setReceipts([]);
    };

    fetchReceipts();
  }, [merchant.id]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {}, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((size: number) => {}, []);

  // Reset pagination when filters change
  const resetPagination = useCallback(() => {}, []);

  // Handle search
  const handleSearch = (value: string) => {};

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {};

  // Handle sort change
  const handleSortChange = (value: string) => {
    resetPagination();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>All receipts from {merchant.name}</DialogTitle>
          <DialogDescription>View and filter all your receipts from this merchant</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Filters */}
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
              <Input
                placeholder='Search receipts...'
                className='pl-8'
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className='flex gap-2'>
              <div className='w-40'>
                <Select
                  value={dateFilter}
                  onValueChange={handleDateFilterChange}>
                  <SelectTrigger>
                    <Calendar className='mr-2 h-4 w-4' />
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
                <Select
                  value={sortBy}
                  onValueChange={handleSortChange}>
                  <SelectTrigger>
                    <ArrowUpDown className='mr-2 h-4 w-4' />
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

          {/* Receipts Table */}
          <div className='overflow-hidden rounded-md border'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='text-muted-foreground px-4 py-3 text-xs font-medium uppercase tracking-wider'>
                      Receipt ID
                    </TableHead>
                    <TableHead className='text-muted-foreground px-4 py-3 text-xs font-medium uppercase tracking-wider'>Date</TableHead>
                    <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                      Items #
                    </TableHead>
                    <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='bg-popover divide-border divide-y'>
                  {paginatedItems.map((item) => {
                    const invoiceDate = formatDate(item.paymentInformation?.transactionDate || item.createdAt);
                    return (
                      <TableRow
                        key={item.id}
                        className='hover:bg-muted/50'>
                        <TableCell className='whitespace-nowrap px-4 py-3 text-sm font-medium'>{item.id}</TableCell>
                        <TableCell className='whitespace-nowrap px-4 py-3 text-sm'>{invoiceDate}</TableCell>
                        <TableCell className='whitespace-nowrap px-4 py-3 text-right text-sm'>{item.items.length}</TableCell>
                        <TableCell className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                          <Button
                            variant='ghost'
                            size='sm'>
                            <Download className='mr-1 h-4 w-4' />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

