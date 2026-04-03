"use client";

import {formatDate} from "@/lib/utils.generic";
import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {
  Badge,
  Button,
  Calendar,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useDebounce,
  useWindowSize,
} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {useCallback, useEffect, useState} from "react";
import {TbCalendar, TbCards, TbCurrencyDollar, TbFilter, TbSearch, TbTable, TbX} from "react-icons/tb";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import styles from "./FilterBar.module.scss";

/**
 * Props for the FilterBar component.
 */
type Props = {
  /** Current filter state from URL search params */
  filters: FilterState;
  /** Callback when filters change (updates URL) */
  onFiltersChange: (filters: Partial<FilterState>) => void;
  /** Number of active filters */
  activeFilterCount: number;
  /** Current view mode from URL */
  viewMode: "table" | "grid";
  /** Callback when view mode changes (updates URL) */
  onViewModeChange: (mode: "table" | "grid") => void;
};

/**
 * Advanced filter bar component for invoice list with URL-based state management.
 *
 * @remarks
 * Provides comprehensive filtering and sorting capabilities with all state synchronized
 * to URL search parameters via the parent component's `useInvoiceFilters` hook.
 *
 * **Filter Capabilities**:
 * - Debounced search input (300ms delay before updating URL)
 * - Date range filtering (from/to dates stored as ISO strings in URL)
 * - Amount range filtering (min/max amounts)
 * - Multi-select category and payment type filters
 * - Sort options (date, amount, name - ascending/descending)
 * - View mode toggle (table/grid) stored in URL
 *
 * **URL Integration**:
 * - All filter changes update URL search params via `onFiltersChange` callback
 * - Date values are converted between Date objects (for Calendar) and ISO strings (for URL)
 * - Search input is debounced to avoid excessive URL updates
 * - Filter state is bookmarkable and shareable
 *
 * **Responsive Design**:
 * - Uses Popover on desktop for compact filter panel
 * - Uses Sheet (side panel) on mobile for better touch interaction
 * - Automatically adjusts filter UI based on screen size
 *
 * **Performance**:
 * - Debounced search prevents excessive re-renders and URL updates
 * - Uses `useCallback` for all event handlers to avoid unnecessary re-renders
 * - Filter panel only renders when open (via Popover/Sheet)
 *
 * @param props - Component props
 * @returns FilterBar component
 *
 * @example
 * ```tsx
 * <FilterBar
 *   filters={urlFilters}
 *   onFiltersChange={updateUrlFilters}
 *   activeFilterCount={3}
 *   viewMode="table"
 *   onViewModeChange={setViewMode}
 * />
 * ```
 */
export default function FilterBar({
  filters,
  onFiltersChange,
  activeFilterCount,
  viewMode,
  onViewModeChange,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.invoicesView");
  const locale = useLocale();
  const {isMobile} = useWindowSize();
  const [searchInput, setSearchInput] = useState<string>(filters.search);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Debounce search input (300ms)
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update filters when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({search: debouncedSearch});
    }
  }, [debouncedSearch, filters.search, onFiltersChange]);

  /**
   * Handle search input change.
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  /**
   * Clear all active filters by resetting to defaults.
   * This updates the URL to remove all filter parameters.
   */
  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    onFiltersChange({
      search: "",
      dateFrom: null,
      dateTo: null,
      amountMin: null,
      amountMax: null,
      categories: [],
      paymentTypes: [],
      sortBy: null,
      sortOrder: null,
    });
  }, [onFiltersChange]);

  /**
   * Handle date range change.
   * Converts Date objects to ISO strings for URL storage.
   */
  const handleDateFromChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({dateFrom: date ? date.toISOString().split("T")[0] : null});
    },
    [onFiltersChange],
  );

  const handleDateToChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({dateTo: date ? date.toISOString().split("T")[0] : null});
    },
    [onFiltersChange],
  );

  /**
   * Handle amount range change.
   */
  const handleAmountMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ? Number.parseFloat(e.target.value) : null;
      onFiltersChange({amountMin: value});
    },
    [onFiltersChange],
  );

  const handleAmountMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ? Number.parseFloat(e.target.value) : null;
      onFiltersChange({amountMax: value});
    },
    [onFiltersChange],
  );

  /**
   * Handle category toggle.
   */
  const handleCategoryToggle = useCallback(
    (category: number) => {
      const newCategories = filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category];
      onFiltersChange({categories: newCategories});
    },
    [filters.categories, onFiltersChange],
  );

  /**
   * Handle payment type toggle.
   */
  const handlePaymentTypeToggle = useCallback(
    (paymentType: number) => {
      const newPaymentTypes = filters.paymentTypes.includes(paymentType)
        ? filters.paymentTypes.filter((p) => p !== paymentType)
        : [...filters.paymentTypes, paymentType];
      onFiltersChange({paymentTypes: newPaymentTypes});
    },
    [filters.paymentTypes, onFiltersChange],
  );

  /**
   * Handle sort change.
   * Splits the combined value (e.g., "date-desc") into separate sortBy and sortOrder.
   * Special value "none" clears sorting.
   */
  const handleSortChange = useCallback(
    (value: string) => {
      if (value === "none") {
        onFiltersChange({sortBy: null, sortOrder: null});
        return;
      }
      const parts = value.split("-");
      const direction = parts.pop() as "asc" | "desc";
      const field = parts.join("-") as Exclude<FilterState["sortBy"], null>;
      onFiltersChange({
        sortBy: field,
        sortOrder: direction,
      });
    },
    [onFiltersChange],
  );

  /**
   * Render category filter options.
   */
  const renderCategoryFilters = (): React.JSX.Element => {
    const categories = [
      {value: InvoiceCategory.GROCERY, label: t("categories.groceries")},
      {value: InvoiceCategory.FAST_FOOD, label: t("categories.dining")},
      {value: InvoiceCategory.HOME_CLEANING, label: t("categories.utilities")},
      {value: InvoiceCategory.CAR_AUTO, label: t("categories.travel")},
      {value: InvoiceCategory.OTHER, label: t("categories.other")},
    ];

    return (
      <div className={styles["filterSection"]}>
        <Label className={styles["filterLabel"]}>{t("filters.categories")}</Label>
        <div className={styles["categoryChips"]}>
          {categories.map((category) => (
            <Badge
              key={category.value}
              variant={filters.categories.includes(category.value) ? "default" : "outline"}
              className={styles["categoryChip"]}
              onClick={() => handleCategoryToggle(category.value)}>
              {category.label}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render payment type filter options.
   */
  const renderPaymentTypeFilters = (): React.JSX.Element => {
    const paymentTypes = [
      {value: PaymentType.Cash, label: "Cash"},
      {value: PaymentType.Card, label: "Card"},
      {value: PaymentType.Transfer, label: "Transfer"},
      {value: PaymentType.MobilePayment, label: "Mobile"},
      {value: PaymentType.Voucher, label: "Voucher"},
      {value: PaymentType.Other, label: "Other"},
    ];

    return (
      <div className={styles["filterSection"]}>
        <Label className={styles["filterLabel"]}>{t("filters.paymentTypes")}</Label>
        <div className={styles["paymentTypeList"]}>
          {paymentTypes.map((paymentType) => (
            <div
              key={paymentType.value}
              className={styles["checkboxItem"]}>
              <Checkbox
                id={`payment-${paymentType.value}`}
                checked={filters.paymentTypes.includes(paymentType.value)}
                onCheckedChange={() => handlePaymentTypeToggle(paymentType.value)}
              />
              <Label
                htmlFor={`payment-${paymentType.value}`}
                className={styles["checkboxLabel"]}>
                {paymentType.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render filter panel content.
   */
  const renderFilterPanel = (): React.JSX.Element => (
    <div className={styles["filterPanel"]}>
      {/* Date Range Filter */}
      <div className={styles["filterSection"]}>
        <Label className={styles["filterLabel"]}>{t("filters.dateRange")}</Label>
        <div className={styles["dateRangeInputs"]}>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant='outline'
                  className={styles["dateButton"]}>
                  <TbCalendar className={styles["dateIcon"]} />
                  {filters.dateFrom ? formatDate(filters.dateFrom, {locale}) : t("filters.dateFrom")}
                </Button>
              }
            />
            <PopoverContent className={styles["calendarPopover"]}>
              <Calendar
                mode='single'
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={handleDateFromChange}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant='outline'
                  className={styles["dateButton"]}>
                  <TbCalendar className={styles["dateIcon"]} />
                  {filters.dateTo ? formatDate(filters.dateTo, {locale}) : t("filters.dateTo")}
                </Button>
              }
            />
            <PopoverContent className={styles["calendarPopover"]}>
              <Calendar
                mode='single'
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={handleDateToChange}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Amount Range Filter */}
      <div className={styles["filterSection"]}>
        <Label className={styles["filterLabel"]}>{t("filters.amountRange")}</Label>
        <div className={styles["amountRangeInputs"]}>
          <div className={styles["amountInputWrapper"]}>
            <TbCurrencyDollar className={styles["currencyIcon"]} />
            <Input
              type='number'
              placeholder={t("filters.amountMin")}
              value={filters.amountMin ?? ""}
              onChange={handleAmountMinChange}
              className={styles["amountInput"]}
            />
          </div>
          <div className={styles["amountInputWrapper"]}>
            <TbCurrencyDollar className={styles["currencyIcon"]} />
            <Input
              type='number'
              placeholder={t("filters.amountMax")}
              value={filters.amountMax ?? ""}
              onChange={handleAmountMaxChange}
              className={styles["amountInput"]}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      {renderCategoryFilters()}

      {/* Payment Type Filter */}
      {renderPaymentTypeFilters()}

      {/* Sort By */}
      <div className={styles["filterSection"]}>
        <Label className={styles["filterLabel"]}>{t("filters.sortBy")}</Label>
        <Select
          value={filters.sortBy && filters.sortOrder ? `${filters.sortBy}-${filters.sortOrder}` : "none"}
          onValueChange={handleSortChange}>
          <SelectTrigger className={styles["sortSelect"]}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>{t("filters.sortOptions.none")}</SelectItem>
            <SelectItem value='date-desc'>{t("filters.sortOptions.dateNewest")}</SelectItem>
            <SelectItem value='date-asc'>{t("filters.sortOptions.dateOldest")}</SelectItem>
            <SelectItem value='amount-desc'>{t("filters.sortOptions.amountHighToLow")}</SelectItem>
            <SelectItem value='amount-asc'>{t("filters.sortOptions.amountLowToHigh")}</SelectItem>
            <SelectItem value='name-asc'>{t("filters.sortOptions.nameAZ")}</SelectItem>
            <SelectItem value='name-desc'>{t("filters.sortOptions.nameZA")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className={styles["container"]}>
      {/* Always visible controls */}
      <div className={styles["topBar"]}>
        {/* Search Input */}
        <div className={styles["searchWrapper"]}>
          <TbSearch className={styles["searchIcon"]} />
          <Input
            placeholder={t("searchPlaceholder")}
            className={styles["searchInput"]}
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filter Button with Badge */}
        {isMobile ? (
          <Sheet
            open={isFilterOpen}
            onOpenChange={setIsFilterOpen}>
            <SheetTrigger
              render={
                <Button
                  variant='outline'
                  size='sm'
                  className={styles["filterButton"]}>
                  <TbFilter className={styles["filterIcon"]} />
                  {activeFilterCount > 0 && (
                    <Badge
                      variant='default'
                      className={styles["filterBadge"]}>
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              }
            />
            <SheetContent className={styles["filterSheet"]}>
              <div className={styles["sheetHeader"]}>
                <h3 className={styles["sheetTitle"]}>{t("filters.title")}</h3>
                {activeFilterCount > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleClearFilters}
                    className={styles["clearButton"]}>
                    <TbX className={styles["clearIcon"]} />
                    {t("filters.clear")}
                  </Button>
                )}
              </div>
              {renderFilterPanel()}
            </SheetContent>
          </Sheet>
        ) : (
          <Popover
            open={isFilterOpen}
            onOpenChange={setIsFilterOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant='outline'
                  size='sm'
                  className={styles["filterButton"]}>
                  <TbFilter className={styles["filterIcon"]} />
                  {t("filters.button")}
                  {activeFilterCount > 0 && (
                    <Badge
                      variant='default'
                      className={styles["filterBadge"]}>
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              }
            />
            <PopoverContent className={styles["filterPopover"]}>
              <div className={styles["popoverHeader"]}>
                <h4 className={styles["popoverTitle"]}>{t("filters.title")}</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleClearFilters}
                    className={styles["clearButton"]}>
                    <TbX className={styles["clearIcon"]} />
                    {t("filters.clear")}
                  </Button>
                )}
              </div>
              {renderFilterPanel()}
            </PopoverContent>
          </Popover>
        )}

        {/* Clear Filters Button (when filters active) */}
        {activeFilterCount > 0 && !isMobile && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearFilters}
            className={styles["clearFiltersButton"]}>
            <TbX className={styles["clearIcon"]} />
            {t("filters.clear")}
          </Button>
        )}

        {/* View Toggle */}
        <div className={styles["viewToggle"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                className={styles["tooltipTrigger"]}
                render={
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size='sm'
                    className={styles["viewButtonLeft"]}
                    onClick={() => onViewModeChange("table")}>
                    <TbTable className={styles["viewIcon"]} />
                  </Button>
                }
              />
              <TooltipContent>{t("viewModes.table")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                className={styles["tooltipTrigger"]}
                render={
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size='sm'
                    className={styles["viewButtonRight"]}
                    onClick={() => onViewModeChange("grid")}>
                    <TbCards className={styles["viewIcon"]} />
                  </Button>
                }
              />
              <TooltipContent>{t("viewModes.grid")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Active filter count indicator */}
      {activeFilterCount > 0 && (
        <div className={styles["activeFiltersBar"]}>
          <span className={styles["activeFiltersText"]}>{t("filters.activeCount", {count: String(activeFilterCount)})}</span>
        </div>
      )}
    </div>
  );
}
