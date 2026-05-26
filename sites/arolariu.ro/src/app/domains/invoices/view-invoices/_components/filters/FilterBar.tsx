"use client";

import {useInvoicesStore} from "@/stores";
import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {
  Badge,
  Button,
  Input,
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
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useMemo, useState} from "react";
import {TbCards, TbFilter, TbSearch, TbTable, TbX} from "react-icons/tb";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {computeAvailableCategories, computeAvailableCurrencies, computeAvailablePaymentTypes} from "../../_utils/filterOptions";
import {AmountFilterCard} from "./AmountFilterCard";
import {CategoryFilterCard} from "./CategoryFilterCard";
import {CurrencyFilterCard} from "./CurrencyFilterCard";
import {DateFilterCard} from "./DateFilterCard";
import {PaymentTypeFilterCard} from "./PaymentTypeFilterCard";
import {SortFilterCard} from "./SortFilterCard";
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
  /** Count after filters apply — drives the mobile "Show N results" CTA label. */
  filteredCount: number;
};

/**
 * Advanced filter bar component for the invoice list, with URL-based state
 * management and a card-based panel UX.
 *
 * @param props - Filter state, filter update callbacks, view mode state, and filtered count.
 * @returns The rendered invoice filter bar.
 */
export default function FilterBar({
  filters,
  onFiltersChange,
  activeFilterCount,
  viewMode,
  onViewModeChange,
  filteredCount,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const {isMobile} = useWindowSize();
  const invoices = useInvoicesStore((state) => state.entities);
  const [searchInput, setSearchInput] = useState<string>(filters.search);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFiltersChange({search: debouncedSearch});
    }
  }, [debouncedSearch, filters.search, onFiltersChange]);

  const availableCurrencies = useMemo(() => computeAvailableCurrencies(invoices), [invoices]);
  const availableCategories = useMemo(() => computeAvailableCategories(invoices), [invoices]);
  const availablePaymentTypes = useMemo(() => computeAvailablePaymentTypes(invoices), [invoices]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  }, []);

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
      currencies: [],
      sortBy: "date",
      sortOrder: "desc",
    });
  }, [onFiltersChange]);

  const getCategoryLabel = useCallback(
    (category: InvoiceCategory): string => {
      switch (category) {
        case InvoiceCategory.GROCERY:
          return t((m) => m.pages.invoices.viewInvoices.invoicesView.categories.groceries);
        case InvoiceCategory.FAST_FOOD:
          return t((m) => m.pages.invoices.viewInvoices.invoicesView.categories.dining);
        case InvoiceCategory.HOME_CLEANING:
          return t((m) => m.pages.invoices.viewInvoices.invoicesView.categories.utilities);
        case InvoiceCategory.CAR_AUTO:
          return t((m) => m.pages.invoices.viewInvoices.invoicesView.categories.travel);
        default:
          return t((m) => m.pages.invoices.viewInvoices.invoicesView.categories.other);
      }
    },
    [t],
  );

  const getPaymentTypeLabel = useCallback(
    (paymentType: PaymentType): string => {
      switch (paymentType) {
        case PaymentType.Cash:
          return t((m) => m.forms.invoices.filters.paymentTypeLabels.cash);
        case PaymentType.Card:
          return t((m) => m.forms.invoices.filters.paymentTypeLabels.card);
        case PaymentType.Transfer:
          return t((m) => m.forms.invoices.filters.paymentTypeLabels.transfer);
        case PaymentType.MobilePayment:
          return t((m) => m.forms.invoices.filters.paymentTypeLabels.mobile);
        case PaymentType.Voucher:
          return t((m) => m.forms.invoices.filters.paymentTypeLabels.voucher);
        default:
          return t((m) => m.forms.invoices.filters.paymentTypeLabels.other);
      }
    },
    [t],
  );

  const renderFilterPanel = (): React.JSX.Element => (
    <TooltipProvider>
      <div className={styles["panelGrid"]}>
        <DateFilterCard
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
        <AmountFilterCard
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
        <CurrencyFilterCard
          filters={filters}
          availableCurrencies={availableCurrencies}
          onFiltersChange={onFiltersChange}
        />
        <CategoryFilterCard
          filters={filters}
          availableCategories={availableCategories}
          getCategoryLabel={getCategoryLabel}
          onFiltersChange={onFiltersChange}
        />
        <PaymentTypeFilterCard
          filters={filters}
          availablePaymentTypes={availablePaymentTypes}
          getPaymentTypeLabel={getPaymentTypeLabel}
          onFiltersChange={onFiltersChange}
        />
        <SortFilterCard
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      </div>
    </TooltipProvider>
  );

  return (
    <div className={styles["container"]}>
      <div className={styles["topBar"]}>
        <div className={styles["searchWrapper"]}>
          <TbSearch className={styles["searchIcon"]} />
          <Input
            placeholder={t((m) => m.pages.invoices.viewInvoices.invoicesView.searchPlaceholder)}
            className={styles["searchInput"]}
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>

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
                <h3 className={styles["sheetTitle"]}>
                  {t((m) => m.forms.invoices.filters.title)}
                  {activeFilterCount > 0 && (
                    <span className={styles["panelHeaderActiveBadge"]}>{t((m) => m.forms.invoices.filters.activeCount, {count: String(activeFilterCount)})}</span>
                  )}
                </h3>
                {activeFilterCount > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={handleClearFilters}
                    className={styles["clearButton"]}>
                    <TbX className={styles["clearIcon"]} />
                    {t((m) => m.forms.invoices.filters.clear)}
                  </Button>
                )}
              </div>
              <div className={styles["sheetBodyScrollable"]}>{renderFilterPanel()}</div>
              <div className={styles["mobileShowResultsBar"]}>
                <Button
                  className={styles["mobileShowResultsButton"]}
                  // eslint-disable-next-line react/jsx-no-bind -- inline close handler
                  onClick={() => setIsFilterOpen(false)}>
                  {t((m) => m.forms.invoices.filters.showResults, {count: filteredCount})}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Button
            variant='outline'
            size='sm'
            className={styles["filterButton"]}
            // eslint-disable-next-line react/jsx-no-bind -- inline toggle handler
            onClick={() => setIsFilterOpen((previous) => !previous)}
            aria-expanded={isFilterOpen}
            aria-controls='inline-filter-panel'>
            <TbFilter className={styles["filterIcon"]} />
            {t((m) => m.forms.invoices.filters.button)}
            {activeFilterCount > 0 && (
              <Badge
                variant='default'
                className={styles["filterBadge"]}>
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}

        {activeFilterCount > 0 && !isMobile && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearFilters}
            className={styles["clearFiltersButton"]}>
            <TbX className={styles["clearIcon"]} />
            {t((m) => m.forms.invoices.filters.clear)}
          </Button>
        )}

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
                    // eslint-disable-next-line react/jsx-no-bind -- inline mode setter
                    onClick={() => onViewModeChange("table")}>
                    <TbTable className={styles["viewIcon"]} />
                  </Button>
                }
              />
              <TooltipContent>{t((m) => m.pages.invoices.viewInvoices.invoicesView.viewModes.table)}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                className={styles["tooltipTrigger"]}
                render={
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size='sm'
                    className={styles["viewButtonRight"]}
                    // eslint-disable-next-line react/jsx-no-bind -- inline mode setter
                    onClick={() => onViewModeChange("grid")}>
                    <TbCards className={styles["viewIcon"]} />
                  </Button>
                }
              />
              <TooltipContent>{t((m) => m.pages.invoices.viewInvoices.invoicesView.viewModes.grid)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {!isMobile && isFilterOpen ? (
        <div
          id='inline-filter-panel'
          className={styles["inlineFilterPanel"]}>
          <div className={styles["inlineFilterHeader"]}>
            <h4 className={styles["inlineFilterTitle"]}>
              {t((m) => m.forms.invoices.filters.title)}
              {activeFilterCount > 0 && (
                <span className={styles["panelHeaderActiveBadge"]}>{t((m) => m.forms.invoices.filters.activeCount, {count: String(activeFilterCount)})}</span>
              )}
            </h4>
            <div className={styles["inlineFilterActions"]}>
              {activeFilterCount > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleClearFilters}
                  className={styles["clearButton"]}>
                  <TbX className={styles["clearIcon"]} />
                  {t((m) => m.forms.invoices.filters.clear)}
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                // eslint-disable-next-line react/jsx-no-bind -- inline close handler
                onClick={() => setIsFilterOpen(false)}
                aria-label={t((m) => m.forms.invoices.filters.title)}
                className={styles["clearButton"]}>
                <TbX className={styles["clearIcon"]} />
              </Button>
            </div>
          </div>
          {renderFilterPanel()}
        </div>
      ) : null}
    </div>
  );
}
