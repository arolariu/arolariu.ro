/** @format */

"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {
  Badge,
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Table,
} from "lucide-react";
import {useState} from "react";

// Mock data for merchant receipts
const merchantReceipts = [
  {
    id: "INV-2023-001",
    name: "Grocery Shopping",
    date: "2023-03-15",
    amount: 127.85,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-015",
    name: "Weekly Groceries",
    date: "2023-03-22",
    amount: 98.45,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-029",
    name: "Dinner Party Supplies",
    date: "2023-03-30",
    amount: 156.2,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-042",
    name: "Organic Produce",
    date: "2023-04-05",
    amount: 75.3,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-057",
    name: "Household Essentials",
    date: "2023-04-12",
    amount: 112.75,
    category: "HOUSEHOLD",
    status: "PAID",
  },
  {
    id: "INV-2023-068",
    name: "Weekend Shopping",
    date: "2023-04-22",
    amount: 89.95,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-079",
    name: "Monthly Stock-up",
    date: "2023-05-01",
    amount: 203.45,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-092",
    name: "Quick Essentials",
    date: "2023-05-10",
    amount: 45.25,
    category: "GROCERIES",
    status: "PAID",
  },
  {
    id: "INV-2023-105",
    name: "Special Diet Items",
    date: "2023-05-18",
    amount: 135.6,
    category: "HEALTH",
    status: "PAID",
  },
  {
    id: "INV-2023-118",
    name: "Pantry Restock",
    date: "2023-05-25",
    amount: 167.8,
    category: "GROCERIES",
    status: "PENDING",
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantName: string;
  currency: string;
};

export function MerchantReceiptsDialog({open, onOpenChange, merchantName, currency}: Readonly<Props>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "name">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Format date

  // Toggle sort direction
  const toggleSort = (field: "date" | "amount" | "name") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort receipts
  const filteredReceipts = merchantReceipts
    .filter((receipt) => {
      const matchesSearch =
        receipt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || receipt.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || receipt.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === "date") {
        return sortDirection === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortField === "amount") {
        return sortDirection === "asc" ? a.amount - b.amount : b.amount - a.amount;
      } else {
        return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
    });

  // Calculate total amount
  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  // Get unique categories for filter
  const categories = ["all", ...new Set(merchantReceipts.map((receipt) => receipt.category))];
  const statuses = ["all", ...new Set(merchantReceipts.map((receipt) => receipt.status))];

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[900px]'>
        <DialogHeader>
          <DialogTitle>All Receipts from {merchantName}</DialogTitle>
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
            <div className='flex gap-2'>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}>
                <SelectTrigger className='w-[130px]'>
                  <span className='flex items-center'>
                    <SlidersHorizontal className='mr-2 h-4 w-4' />
                    {categoryFilter === "all" ? "All Categories" : categoryFilter}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}>
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}>
                <SelectTrigger className='w-[130px]'>
                  <span className='flex items-center'>
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {statusFilter === "all" ? "All Statuses" : statusFilter}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem
                      key={status}
                      value={status}>
                      {status === "all" ? "All Statuses" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Receipts table */}
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[180px]'>
                    <button
                      className='text-muted-foreground flex items-center text-xs font-medium uppercase tracking-wider'
                      onClick={() => toggleSort("date")}>
                      Date
                      {sortField === "date" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className='ml-1 h-4 w-4' />
                        ) : (
                          <ChevronDown className='ml-1 h-4 w-4' />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className='text-muted-foreground flex items-center text-xs font-medium uppercase tracking-wider'
                      onClick={() => toggleSort("name")}>
                      Receipt
                      {sortField === "name" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className='ml-1 h-4 w-4' />
                        ) : (
                          <ChevronDown className='ml-1 h-4 w-4' />
                        ))}
                    </button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>
                    <button
                      className='text-muted-foreground ml-auto flex items-center text-xs font-medium uppercase tracking-wider'
                      onClick={() => toggleSort("amount")}>
                      Amount
                      {sortField === "amount" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className='ml-1 h-4 w-4' />
                        ) : (
                          <ChevronDown className='ml-1 h-4 w-4' />
                        ))}
                    </button>
                  </TableHead>
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
                  filteredReceipts.map((receipt, index) => (
                    <motion.tr
                      key={receipt.id}
                      initial={{opacity: 0, y: 20}}
                      animate={{opacity: 1, y: 0}}
                      transition={{duration: 0.2, delay: index * 0.05}}
                      className='border-b'>
                      <TableCell className='font-medium'>{formatDate(receipt.date)}</TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span>{receipt.name}</span>
                          <span className='text-muted-foreground text-xs'>{receipt.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{receipt.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={receipt.status === "PAID" ? "default" : "destructive"}>{receipt.status}</Badge>
                      </TableCell>
                      <TableCell className='text-right font-medium'>{formatCurrency(receipt.amount)}</TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-2'>
                          <Button
                            variant='ghost'
                            size='icon'>
                            <Download className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'>
                            <ExternalLink className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary footer */}
          <div className='flex items-center justify-between pt-2'>
            <div className='text-muted-foreground text-sm'>
              Showing {filteredReceipts.length} of {merchantReceipts.length} receipts
            </div>
            <div className='text-right'>
              <div className='text-sm font-medium'>Total</div>
              <div className='text-lg font-bold'>{formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
