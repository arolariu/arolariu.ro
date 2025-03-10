/** @format */

"use client";

import {Invoice, InvoiceCategory} from "@/types/invoices";
import {
  Badge,
  Button,
  Calendar,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  cn,
} from "@arolariu/components";
import {format, subDays, subMonths} from "date-fns";
import {CalendarIcon, CheckIcon, ChevronDown, Command, Store, Tag, X} from "lucide-react";
import {useState} from "react";

export interface StatisticsFilterState {
  dateRange: {
    preset: string;
    from: Date | undefined;
    to: Date | undefined;
  };
  merchants: string[];
  categories: string[];
}

type Props = {
  invoices: Invoice[];
  onFilterChange: (filters: StatisticsFilterState) => void;
};

export function StatisticsFilters({invoices, onFilterChange}: Readonly<Props>) {
  const uniqueMerchants = [...new Set(invoices.map((invoice) => invoice.merchantReference || "Unknown"))];
  const uniqueCategories = [...new Set(invoices.map((invoice) => invoice.category))];

  // Filter state
  const [filters, setFilters] = useState<StatisticsFilterState>({
    dateRange: {
      preset: "last30days",
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    merchants: [],
    categories: [],
  });

  // UI state
  const [merchantsOpen, setMerchantsOpen] = useState<boolean>(false);
  const [categoriesOpen, setCategoriesOpen] = useState<boolean>(false);

  // Handle date preset change
  const handleDatePresetChange = (preset: string) => {
    const now = new Date();
    let from: Date | undefined;
    let to = now;

    switch (preset) {
      case "last7days":
        from = subDays(now, 7);
        break;
      case "last30days":
        from = subDays(now, 30);
        break;
      case "last90days":
        from = subDays(now, 90);
        break;
      case "last6months":
        from = subMonths(now, 6);
        break;
      case "last12months":
        from = subMonths(now, 12);
        break;
      case "ytd":
        from = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        break;
      case "custom":
        from = filters.dateRange.from;
        to = filters.dateRange.to!;
        break;
      default:
        from = subDays(now, 30);
    }

    const newFilters = {
      ...filters,
      dateRange: {
        preset,
        from,
        to,
      },
    };

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Handle custom date change
  const handleCustomDateChange = (field: "from" | "to", date: Date | undefined) => {
    const newFilters = {
      ...filters,
      dateRange: {
        ...filters.dateRange,
        preset: "custom",
        [field]: date,
      },
    };

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Toggle merchant selection
  const toggleMerchant = (merchant: string) => {
    const newFilters = {
      ...filters,
      merchants: filters.merchants.includes(merchant)
        ? filters.merchants.filter((m) => m !== merchant)
        : [...filters.merchants, merchant],
    };

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    const newFilters = {
      ...filters,
      categories: filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category],
    };

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Remove a specific filter
  const removeFilter = (type: "merchants" | "categories", value: string) => {
    const newFilters = {...filters};

    if (type === "merchants") {
      newFilters.merchants = filters.merchants.filter((m) => m !== value);
    } else if (type === "categories") {
      newFilters.categories = filters.categories.filter((c) => c !== value);
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    const newFilters = {
      dateRange: {
        preset: "last30days",
        from: subDays(new Date(), 30),
        to: new Date(),
      },
      merchants: [],
      categories: [],
    };

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row'>
        <div className='flex flex-wrap gap-2'>
          {/* Date Range Selector */}
          <Select
            value={filters.dateRange.preset}
            onValueChange={handleDatePresetChange}>
            <SelectTrigger className='w-[180px]'>
              <div className='flex items-center gap-2'>
                <CalendarIcon className='h-4 w-4' />
                <span>Time Range</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='last7days'>Last 7 Days</SelectItem>
              <SelectItem value='last30days'>Last 30 Days</SelectItem>
              <SelectItem value='last90days'>Last 90 Days</SelectItem>
              <SelectItem value='last6months'>Last 6 Months</SelectItem>
              <SelectItem value='last12months'>Last 12 Months</SelectItem>
              <SelectItem value='ytd'>Year to Date</SelectItem>
              <SelectItem value='custom'>Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          {filters.dateRange.preset === "custom" && (
            <div className='flex gap-2'>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className='w-[130px] justify-start text-left font-normal'>
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {filters.dateRange.from ? format(filters.dateRange.from, "MMM d, yyyy") : <span>Start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className='w-auto p-0'
                  align='start'>
                  <Calendar
                    mode='single'
                    selected={filters.dateRange.from}
                    onSelect={(date) => handleCustomDateChange("from", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    className='w-[130px] justify-start text-left font-normal'>
                    <CalendarIcon className='mr-2 h-4 w-4' />
                    {filters.dateRange.to ? format(filters.dateRange.to, "MMM d, yyyy") : <span>End date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className='w-auto p-0'
                  align='start'>
                  <Calendar
                    mode='single'
                    selected={filters.dateRange.to}
                    onSelect={(date) => handleCustomDateChange("to", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Merchant Filter */}
          <Popover
            open={merchantsOpen}
            onOpenChange={setMerchantsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className='gap-2'>
                <Store className='h-4 w-4' />
                <span>Merchants</span>
                {filters.merchants.length > 0 && <Badge variant='secondary'>{filters.merchants.length}</Badge>}
                <ChevronDown className='h-4 w-4 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='w-[250px] p-0'
              align='start'>
              <Command>
                <CommandInput placeholder='Search merchants...' />
                <CommandList>
                  <CommandEmpty>No merchants found.</CommandEmpty>
                  <CommandGroup>
                    {uniqueMerchants.map((merchant) => (
                      <CommandItem
                        key={merchant}
                        value={merchant}
                        onSelect={() => toggleMerchant(merchant)}>
                        <div className='flex items-center gap-2'>
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border",
                              filters.merchants.includes(merchant)
                                ? "text-primary-foreground bg-primary"
                                : "opacity-50",
                            )}>
                            {filters.merchants.includes(merchant) && <CheckIcon className='h-3 w-3' />}
                          </div>
                          <span>{merchant}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Category Filter */}
          <Popover
            open={categoriesOpen}
            onOpenChange={setCategoriesOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className='gap-2'>
                <Tag className='h-4 w-4' />
                <span>Categories</span>
                {filters.categories.length > 0 && <Badge variant='secondary'>{filters.categories.length}</Badge>}
                <ChevronDown className='h-4 w-4 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='w-[250px] p-0'
              align='start'>
              <Command>
                <CommandInput placeholder='Search categories...' />
                <CommandList>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup>
                    {uniqueCategories.map((category) => (
                      <CommandItem
                        key={category}
                        value={InvoiceCategory[category]}
                        onSelect={() => toggleCategory(InvoiceCategory[category])}>
                        <div className='flex items-center gap-2'>
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border",
                              filters.categories.includes(InvoiceCategory[category])
                                ? "text-primary-foreground bg-primary"
                                : "opacity-50",
                            )}>
                            {filters.categories.includes(InvoiceCategory[category]) && (
                              <CheckIcon className='h-3 w-3' />
                            )}
                          </div>
                          <span className='capitalize'>{category}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Reset Filters */}
        {(filters.merchants.length > 0 ||
          filters.categories.length > 0 ||
          filters.dateRange.preset !== "last30days") && (
          <Button
            variant='ghost'
            size='sm'
            onClick={resetFilters}
            className='self-end'>
            Reset filters
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {(filters.merchants.length > 0 || filters.categories.length > 0) && (
        <div className='flex flex-wrap gap-2'>
          {filters.merchants.map((merchant) => (
            <Badge
              key={merchant}
              variant='secondary'
              className='gap-1'>
              <Store className='h-3 w-3' />
              {merchant}
              <X
                className='ml-1 h-3 w-3 cursor-pointer'
                onClick={() => removeFilter("merchants", merchant)}
              />
            </Badge>
          ))}

          {filters.categories.map((category) => (
            <Badge
              key={category}
              variant='secondary'
              className='gap-1'>
              <Tag className='h-3 w-3' />
              <span className='capitalize'>{category}</span>
              <X
                className='ml-1 h-3 w-3 cursor-pointer'
                onClick={() => removeFilter("categories", category)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
