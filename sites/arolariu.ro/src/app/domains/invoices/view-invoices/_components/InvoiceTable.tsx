/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {AnimatePresence, motion} from "framer-motion";
import {
  AlertCircle,
  ArrowUpDown,
  Badge,
  Calendar,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  Filter,
  Moon,
  MoreHorizontal,
  Receipt,
  Search,
  Share2,
  ShoppingBag,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";

type Props = {
  invoices: Invoice[];
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "groceries":
      return <ShoppingBag className='h-5 w-5 text-green-500' />;
    case "dining":
      return <Receipt className='h-5 w-5 text-orange-500' />;
    case "utilities":
      return <DollarSign className='h-5 w-5 text-blue-500' />;
    case "entertainment":
      return <Eye className='h-5 w-5 text-purple-500' />;
    case "travel":
      return <Calendar className='h-5 w-5 text-yellow-500' />;
    default:
      return <Receipt className='h-5 w-5 text-gray-500' />;
  }
};

const getTimeOfDay = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours();

  if (hours >= 6 && hours < 18) {
    return "day";
  } else {
    return "night";
  }
};

export function InvoiceTable({invoices}: Readonly<Props>) {
  const [view, setView] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [invoiceToShare, setInvoiceToShare] = useState<Invoice | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    merchants: [],
    dateRange: {
      from: undefined,
      to: undefined,
    },
    priceRange: [0, 1000],
    paymentMethods: [],
  });

  // Reference for the header checkbox
  const headerCheckboxRef = useRef<HTMLButtonElement>(null);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedInvoices([]);
    setSelectAll(false);
  }, [searchQuery, categoryFilter, timeFilter, advancedFilters]);

  // Update selectAll state based on selected invoices
  useEffect(() => {}, [selectedInvoices]);

  const toggleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    },
    [sortBy, sortOrder],
  );

  const toggleSelectAll = useCallback(() => {
    if (selectAll || selectedInvoices.length > 0) {
      setSelectedInvoices([]);
      setSelectAll(false);
    } else {
      setSelectedInvoices(invoices.map((invoice) => invoice.id));
      setSelectAll(true);
    }
  }, [selectAll]);

  const toggleSelectInvoice = useCallback(
    (id: string) => {
      if (selectedInvoices.includes(id)) {
        setSelectedInvoices(selectedInvoices.filter((invoiceId) => invoiceId !== id));
      } else {
        setSelectedInvoices([...selectedInvoices, id]);
      }
    },
    [selectedInvoices],
  );

  const handleBulkDelete = useCallback(() => {
    // In a real app, you would call an API to delete the selected invoices
    toast("Invoice deleted", {
      description: `Successfully deleted ${selectedInvoices.length} invoices`,
    });
    setShowDeleteConfirm(false);
    setSelectedInvoices([]);
  }, [selectedInvoices]);

  const handleBulkExport = useCallback(() => {
    // In a real app, you would generate and download a file with the selected invoices
    toast("Invoice exported", {
      description: `Successfully exported ${selectedInvoices.length} invoices`,
    });
  }, [selectedInvoices]);

  const handleShare = (invoice: Invoice) => {
    setInvoiceToShare(invoice);
    setShareDialogOpen(true);
  };

  const handleAdvancedFilterChange = (filters: FilterState) => {
    setAdvancedFilters(filters);
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <Search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
          <Input
            placeholder='Search invoices...'
            className='pl-8'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {/* <CurrencySelector /> */}

          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}>
            <SelectTrigger className='w-[150px]'>
              <div className='flex items-center gap-2'>
                <Filter className='h-4 w-4' />
                <span>Category</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              <SelectItem value='groceries'>Groceries</SelectItem>
              <SelectItem value='dining'>Dining</SelectItem>
              <SelectItem value='utilities'>Utilities</SelectItem>
              <SelectItem value='entertainment'>Entertainment</SelectItem>
              <SelectItem value='travel'>Travel</SelectItem>
              <SelectItem value='other'>Other</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={timeFilter}
            onValueChange={setTimeFilter}>
            <SelectTrigger className='w-[150px]'>
              <div className='flex items-center gap-2'>
                <Clock className='h-4 w-4' />
                <span>Time of Day</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Times</SelectItem>
              <SelectItem value='day'>
                <div className='flex items-center gap-2'>
                  <Sun className='h-4 w-4 text-yellow-500' />
                  <span>Daytime (6am-6pm)</span>
                </div>
              </SelectItem>
              <SelectItem value='night'>
                <div className='flex items-center gap-2'>
                  <Moon className='h-4 w-4 text-blue-500' />
                  <span>Nighttime (6pm-6am)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className='flex rounded-md border'>
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size='sm'
              className='rounded-r-none'
              onClick={() => setView("table")}>
              <Receipt className='h-4 w-4' />
            </Button>
            <Button
              variant={view === "grid" ? "default" : "ghost"}
              size='sm'
              className='rounded-l-none'
              onClick={() => setView("grid")}>
              <ShoppingBag className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters onFilterChange={handleAdvancedFilterChange} />

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{opacity: 0, y: -10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            className='bg-destructive/10 flex items-center justify-between rounded-md p-3'>
            <div className='text-destructive flex items-center gap-2'>
              <AlertCircle className='h-5 w-5' />
              <span>
                Are you sure you want to delete {selectedInvoices.length} {selectedInvoices.length === 1 ? "invoice" : "invoices"}?
              </span>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant='destructive'
                size='sm'
                onClick={handleBulkDelete}>
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode='wait'>
        {view === "table" ? (
          <motion.div
            key='table'
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.2}}>
            <Card>
              <CardContent className='p-0'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[40px]'>
                        <Checkbox
                          checked={selectAll}
                          ref={headerCheckboxRef}
                          onCheckedChange={toggleSelectAll}
                          aria-label='Select all invoices'
                        />
                      </TableHead>
                      <TableHead className='w-[300px]'>
                        <Button
                          variant='ghost'
                          onClick={() => toggleSort("name")}
                          className='flex h-auto items-center gap-1 p-0 font-medium'>
                          Invoice
                          <ArrowUpDown className='h-3 w-3' />
                        </Button>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>
                        <Button
                          variant='ghost'
                          onClick={() => toggleSort("date")}
                          className='flex h-auto items-center gap-1 p-0 font-medium'>
                          Date
                          <ArrowUpDown className='h-3 w-3' />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant='ghost'
                          onClick={() => toggleSort("amount")}
                          className='flex h-auto items-center gap-1 p-0 font-medium'>
                          Amount
                          <ArrowUpDown className='h-3 w-3' />
                        </Button>
                      </TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                            aria-label={`Select invoice ${invoice.name}`}
                          />
                        </TableCell>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-3'>
                            <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-md'>
                              {getCategoryIcon(invoice.category)}
                            </div>
                            <div>
                              <div>{invoice.name}</div>
                              <div className='text-muted-foreground text-sm'>{invoice.merchantName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <CategoryBadge category={invoice.category} />
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            {getTimeOfDay(invoice.date) === "day" ? (
                              <Sun className='h-4 w-4 text-yellow-500' />
                            ) : (
                              <Moon className='h-4 w-4 text-blue-500' />
                            )}
                            {invoice.date}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <DollarSign className='text-muted-foreground h-4 w-4' />
                            {formatCurrencyWithSymbol(convertCurrency(invoice.amount, "USD", currency), currency)}
                          </div>
                        </TableCell>
                        <TableCell className='relative text-right'>
                          <div className='flex justify-end'>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8'>
                                    <Eye className='h-4 w-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Invoice</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-8 w-8'>
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align='end'
                                className='w-[160px]'>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Edit className='mr-2 h-4 w-4' />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShare(invoice)}>
                                  <Share2 className='mr-2 h-4 w-4' />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className='text-destructive'>
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key='grid'
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            transition={{duration: 0.2}}
            className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.3, delay: index * 0.05}}
                className='relative'>
                <div className='absolute left-2 top-2 z-10'>
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                    aria-label={`Select invoice ${invoice.name}`}
                    className='bg-background/80 backdrop-blur-sm'
                  />
                </div>
                <InvoiceCard
                  invoice={invoice}
                  onShare={() => handleShare(invoice)}
                  timeOfDay={getTimeOfDay(invoice.date)}
                  currency={currency}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Action Pill for Bulk Actions */}
      <AnimatePresence>
        {selectedInvoices.length > 0 && (
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 20}}
            className='relative'>
            <div className='bg-background sticky bottom-4 left-1/2 z-50 mx-auto flex w-fit -translate-x-1/2 transform items-center gap-2 rounded-full border px-4 py-2 shadow-lg'>
              <span className='text-sm font-medium'>
                {selectedInvoices.length} {selectedInvoices.length === 1 ? "invoice" : "invoices"} selected
              </span>
              <div className='border-border mx-1 h-4 border-r' />
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setSelectedInvoices([])}
                className='h-8 px-2'>
                <X className='mr-1 h-4 w-4' />
                Clear
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleBulkExport}
                className='h-8'>
                <Download className='mr-1 h-4 w-4' />
                Export
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowDeleteConfirm(true)}
                className='text-destructive hover:text-destructive h-8'>
                <Trash2 className='mr-1 h-4 w-4' />
                Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        invoice={invoiceToShare}
      />
    </div>
  );
}

function CategoryBadge({category}: {category: string}) {
  const getVariant = () => {
    switch (category) {
      case "groceries":
        return "green";
      case "dining":
        return "orange";
      case "utilities":
        return "blue";
      case "entertainment":
        return "purple";
      case "travel":
        return "yellow";
      default:
        return "default";
    }
  };

  const getColor = () => {
    switch (category) {
      case "groceries":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "dining":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "utilities":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "entertainment":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "travel":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <Badge
      className={`${getColor()} capitalize`}
      variant='outline'>
      {category}
    </Badge>
  );
}
