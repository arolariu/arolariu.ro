/** @format */

"use client";

import {FakeInvoiceShortList} from "@/data/mocks/invoices";
import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {Invoice, Merchant} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {ChevronDown, ChevronUp, ExternalLink, Search} from "lucide-react";
import {useEffect, useState} from "react";
import {TbDots, TbFileExport, TbHeart, TbMail, TbTrash} from "react-icons/tb";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchant: Merchant;
};

export function MerchantReceiptsDialog({open, onOpenChange, merchant}: Readonly<Props>) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "name">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filteredReceipts, setFilteredReceipts] = useState<Invoice[]>([]);

  // Fire effect to load up receipt data.
  useEffect(() => {
    const artificialTimeout = setTimeout(() => {
      setFilteredReceipts(FakeInvoiceShortList); // TODO: fix this!
    }, 3000);

    return () => {
      clearTimeout(artificialTimeout);
    };
  }, [filteredReceipts]);

  // Toggle sort direction
  const toggleSort = (field: "date" | "name") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (filteredReceipts.length === 0) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}>
        <DialogContent className='max-h-[90 vh] overflow-y-auto sm:max-w-[900px]'>
          <DialogHeader>
            <DialogTitle>Loading receipts...</DialogTitle>
            <DialogDescription>Please wait while we load your receipts.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[900px]'>
        <DialogHeader>
          <DialogTitle>All Receipts from {merchant.name}</DialogTitle>
          <DialogDescription>View and manage all your transactions with this merchant</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Filters and search */}
          <div className='flex flex-col justify-between gap-3 sm:flex-row'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
              <Input
                placeholder='Search receipts...'
                className='pl-8'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Receipts table */}
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[180px]'>
                    <Button
                      className='text-muted-foreground flex items-center text-xs font-medium uppercase tracking-wider'
                      onClick={() => toggleSort("date")}
                      variant={"ghost"}>
                      Date
                      {sortField === "date" &&
                        (sortDirection === "asc" ? <ChevronUp className='ml-1 h-4 w-4' /> : <ChevronDown className='ml-1 h-4 w-4' />)}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      className='text-muted-foreground flex items-center text-xs font-medium uppercase tracking-wider'
                      onClick={() => toggleSort("name")}
                      variant={"ghost"}>
                      Receipt
                      {sortField === "name" &&
                        (sortDirection === "asc" ? <ChevronUp className='ml-1 h-4 w-4' /> : <ChevronDown className='ml-1 h-4 w-4' />)}
                    </Button>
                  </TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                  <TableHead className='w-[100px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='h-24 text-center'>
                      No receipts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((receipt, index) => {
                    const transactionDate = receipt.paymentInformation?.transactionDate;
                    const formattedDate = transactionDate ? formatDate(transactionDate) : "Unknown date";

                    const totalAmount = receipt.paymentInformation?.totalCostAmount;
                    const formattedAmount = totalAmount ? formatCurrency(totalAmount) : "Unknown amount";

                    return (
                      <motion.tr
                        key={receipt.id}
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.2, delay: index * 0.05}}
                        className='border-b'>
                        <TableCell className='font-medium'>{formattedDate}</TableCell>
                        <TableCell>
                          <div className='flex flex-col'>
                            <span>{receipt.name}</span>
                            <span className='text-muted-foreground text-xs'>{receipt.id}</span>
                          </div>
                        </TableCell>
                        <TableCell className='text-right font-medium'>{formattedAmount}</TableCell>
                        <TableCell className='flex justify-end'>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'>
                                  <ExternalLink className='h-4 w-4' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>Navigate to receipt.</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'>
                                <TbDots className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem>
                                  <TbHeart className='mr-2 h-4 w-4' />
                                  Mark as Favorite
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <TbTrash className='mr-2 h-4 w-4' />
                                  Delete Receipt
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuItem>
                                  <TbMail className='mr-2 h-4 w-4' />
                                  E-mail
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <TbFileExport className='mr-2 h-4 w-4' /> Export
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
