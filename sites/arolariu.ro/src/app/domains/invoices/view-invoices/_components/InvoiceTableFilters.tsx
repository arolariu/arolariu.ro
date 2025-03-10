/** @format */

"use client";

import {Invoice} from "@/types/invoices";
import {
  Popover as DatePopover,
  PopoverContent as DatePopoverContent,
  PopoverTrigger as DatePopoverTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@arolariu/components";
import {format} from "date-fns";
import {AnimatePresence, motion} from "framer-motion";
import {CalendarIcon, CheckIcon, ChevronDown, CreditCard, DollarSign, Filter, Store, X} from "lucide-react";
import {useEffect, useState} from "react";

type Props = {
  invoices: Invoice[];
  onFilterChange: (filters: FilterState) => void;
};

export interface FilterState {
  merchants: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  priceRange: [number, number];
  paymentMethods: string[];
}

export function AdvancedFilters({invoices, onFilterChange}: Readonly<Props>) {
  // Extract unique merchants and payment methods from mock data
  const uniqueMerchants = Array.from(new Set(mockInvoices.map((invoice) => invoice.merchantName || "Unknown"))).sort();

  const uniquePaymentMethods = Array.from(
    new Set(mockInvoices.map((invoice) => invoice.paymentInformation?.paymentMethod || "Unknown")),
  ).sort();

  // Find min and max prices
  const prices = mockInvoices.map((invoice) => invoice.amount);
  const minPrice = Math.floor(Math.min(...prices));
  const maxPrice = Math.ceil(Math.max(...prices));

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    merchants: [],
    dateRange: {
      from: undefined,
      to: undefined,
    },
    priceRange: [minPrice, maxPrice],
    paymentMethods: [],
  });

  // UI state
  const [merchantsOpen, setMerchantsOpen] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Update active filters count
  useEffect(() => {
    let count = 0;
    if (filters.merchants.length > 0) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice) count++;
    if (filters.paymentMethods.length > 0) count++;

    setActiveFiltersCount(count);
    onFilterChange(filters);
  }, [filters, minPrice, maxPrice, onFilterChange]);

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      merchants: [],
      dateRange: {
        from: undefined,
        to: undefined,
      },
      priceRange: [minPrice, maxPrice],
      paymentMethods: [],
    });
  };

  // Toggle merchant selection
  const toggleMerchant = (merchant: string) => {
    setFilters((prev) => {
      const merchants = prev.merchants.includes(merchant)
        ? prev.merchants.filter((m) => m !== merchant)
        : [...prev.merchants, merchant];

      return {...prev, merchants};
    });
  };

  // Toggle payment method selection
  const togglePaymentMethod = (method: string) => {
    setFilters((prev) => {
      const paymentMethods = prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method];

      return {...prev, paymentMethods};
    });
  };

  // Remove a specific filter
  const removeFilter = (type: keyof FilterState, value?: string) => {
    setFilters((prev) => {
      const newFilters = {...prev};

      if (type === "merchants" && value) {
        newFilters.merchants = prev.merchants.filter((m) => m !== value);
      } else if (type === "dateRange") {
        newFilters.dateRange = {from: undefined, to: undefined};
      } else if (type === "priceRange") {
        newFilters.priceRange = [minPrice, maxPrice];
      } else if (type === "paymentMethods" && value) {
        newFilters.paymentMethods = prev.paymentMethods.filter((m) => m !== value);
      }

      return newFilters;
    });
  };

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className='gap-2'>
          <Filter className='h-4 w-4' />
          <span>Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant='secondary'
              className='ml-1'>
              {activeFiltersCount}
            </Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", isFiltersExpanded ? "rotate-180" : "")} />
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={resetFilters}
            className='text-muted-foreground'>
            Reset filters
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
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

          {(filters.dateRange.from || filters.dateRange.to) && (
            <Badge
              variant='secondary'
              className='gap-1'>
              <CalendarIcon className='h-3 w-3' />
              {filters.dateRange.from ? format(filters.dateRange.from, "PP") : "Any"}
              {" to "}
              {filters.dateRange.to ? format(filters.dateRange.to, "PP") : "Any"}
              <X
                className='ml-1 h-3 w-3 cursor-pointer'
                onClick={() => removeFilter("dateRange")}
              />
            </Badge>
          )}

          {(filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice) && (
            <Badge
              variant='secondary'
              className='gap-1'>
              <DollarSign className='h-3 w-3' />
              {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
              <X
                className='ml-1 h-3 w-3 cursor-pointer'
                onClick={() => removeFilter("priceRange")}
              />
            </Badge>
          )}

          {filters.paymentMethods.map((method) => (
            <Badge
              key={method}
              variant='secondary'
              className='gap-1'>
              <CreditCard className='h-3 w-3' />
              {method}
              <X
                className='ml-1 h-3 w-3 cursor-pointer'
                onClick={() => removeFilter("paymentMethods", method)}
              />
            </Badge>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isFiltersExpanded && (
          <motion.div
            initial={{height: 0, opacity: 0}}
            animate={{height: "auto", opacity: 1}}
            exit={{height: 0, opacity: 0}}
            transition={{duration: 0.2}}
            className='overflow-hidden'>
            <Accordion
              type='single'
              collapsible
              className='w-full'>
              {/* Merchant Filter */}
              <AccordionItem value='merchants'>
                <AccordionTrigger className='py-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <Store className='h-4 w-4' />
                    <span>Merchants</span>
                    {filters.merchants.length > 0 && <Badge variant='secondary'>{filters.merchants.length}</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Popover
                    open={merchantsOpen}
                    onOpenChange={setMerchantsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        role='combobox'
                        aria-expanded={merchantsOpen}
                        className='w-full justify-between'>
                        {filters.merchants.length > 0 ? `${filters.merchants.length} selected` : "Select merchants..."}
                        <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className='w-full p-0'
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
                </AccordionContent>
              </AccordionItem>

              {/* Date Range Filter */}
              <AccordionItem value='dateRange'>
                <AccordionTrigger className='py-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <CalendarIcon className='h-4 w-4' />
                    <span>Date Range</span>
                    {(filters.dateRange.from || filters.dateRange.to) && <Badge variant='secondary'>Active</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='flex flex-col gap-2'>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-muted-foreground text-sm'>From</span>
                        <DatePopover>
                          <DatePopoverTrigger asChild>
                            <Button
                              variant='outline'
                              className='w-full justify-start text-left font-normal'>
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {filters.dateRange.from ? (
                                format(filters.dateRange.from, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </DatePopoverTrigger>
                          <DatePopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={filters.dateRange.from}
                              onSelect={(date) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  dateRange: {...prev.dateRange, from: date},
                                }))
                              }
                              initialFocus
                            />
                          </DatePopoverContent>
                        </DatePopover>
                      </div>

                      <div className='flex flex-col gap-1'>
                        <span className='text-muted-foreground text-sm'>To</span>
                        <DatePopover>
                          <DatePopoverTrigger asChild>
                            <Button
                              variant='outline'
                              className='w-full justify-start text-left font-normal'>
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </DatePopoverTrigger>
                          <DatePopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={filters.dateRange.to}
                              onSelect={(date) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  dateRange: {...prev.dateRange, to: date},
                                }))
                              }
                              initialFocus
                            />
                          </DatePopoverContent>
                        </DatePopover>
                      </div>
                    </div>

                    {(filters.dateRange.from || filters.dateRange.to) && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: {from: undefined, to: undefined},
                          }))
                        }
                        className='self-end'>
                        Clear dates
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Price Range Filter */}
              <AccordionItem value='priceRange'>
                <AccordionTrigger className='py-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <DollarSign className='h-4 w-4' />
                    <span>Price Range</span>
                    {(filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice) && (
                      <Badge variant='secondary'>Active</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className='space-y-4 pt-2'>
                    <div className='flex justify-between'>
                      <span className='text-sm font-medium'>{formatCurrency(filters.priceRange[0])}</span>
                      <span className='text-sm font-medium'>{formatCurrency(filters.priceRange[1])}</span>
                    </div>
                    <Slider
                      defaultValue={[minPrice, maxPrice]}
                      min={minPrice}
                      max={maxPrice}
                      step={1}
                      value={filters.priceRange}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          priceRange: value as [number, number],
                        }))
                      }
                    />
                    {(filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice) && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            priceRange: [minPrice, maxPrice],
                          }))
                        }
                        className='w-full'>
                        Reset to default
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Payment Method Filter */}
              <AccordionItem value='paymentMethods'>
                <AccordionTrigger className='py-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <CreditCard className='h-4 w-4' />
                    <span>Payment Methods</span>
                    {filters.paymentMethods.length > 0 && (
                      <Badge variant='secondary'>{filters.paymentMethods.length}</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Popover
                    open={paymentMethodsOpen}
                    onOpenChange={setPaymentMethodsOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        role='combobox'
                        aria-expanded={paymentMethodsOpen}
                        className='w-full justify-between'>
                        {filters.paymentMethods.length > 0
                          ? `${filters.paymentMethods.length} selected`
                          : "Select payment methods..."}
                        <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className='w-full p-0'
                      align='start'>
                      <Command>
                        <CommandInput placeholder='Search payment methods...' />
                        <CommandList>
                          <CommandEmpty>No payment methods found.</CommandEmpty>
                          <CommandGroup>
                            {uniquePaymentMethods.map((method) => (
                              <CommandItem
                                key={method}
                                value={method}
                                onSelect={() => togglePaymentMethod(method)}>
                                <div className='flex items-center gap-2'>
                                  <div
                                    className={cn(
                                      "flex h-4 w-4 items-center justify-center rounded-sm border",
                                      filters.paymentMethods.includes(method)
                                        ? "text-primary-foreground bg-primary"
                                        : "opacity-50",
                                    )}>
                                    {filters.paymentMethods.includes(method) && <CheckIcon className='h-3 w-3' />}
                                  </div>
                                  <span>{method}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

