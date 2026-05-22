"use client";

import {formatDate} from "@/lib/utils.generic";
import {InvoiceCategory, PaymentType, type Invoice} from "@/types/invoices";
import {
  Badge,
  Button,
  Calendar,
  Input,
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
import {useCallback, useEffect, useMemo, useState} from "react";
import {TbCalendar, TbCards, TbCurrencyDollar, TbFilter, TbSearch, TbTable, TbX} from "react-icons/tb";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {computePresetRange, deriveActivePreset, type DatePresetKey} from "../../_utils/datePresets";
import {computeAvailableCategories, computeAvailableCurrencies, computeAvailablePaymentTypes} from "../../_utils/filterOptions";
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
  /** Full unfiltered invoice list — drives dynamic option derivation for the multi-select cards. */
  invoices: ReadonlyArray<Invoice>;
  /** Count after filters apply — drives the mobile "Show N results" CTA label. */
  filteredCount: number;
};

/**
 * Quick-amount presets shown as chips beneath the Min/Max number inputs.
 * Each preset writes both bounds to filters when clicked (or clears them
 * when the preset is already active — tap-to-toggle).
 */
type AmountPresetKey = "0-50" | "50-100" | "100-500" | "500+";

const AMOUNT_PRESETS = [
  {key: "0-50", labelKey: "0to50", min: 0, max: 50},
  {key: "50-100", labelKey: "50to100", min: 50, max: 100},
  {key: "100-500", labelKey: "100to500", min: 100, max: 500},
  {key: "500+", labelKey: "500plus", min: 500, max: null},
] as const satisfies ReadonlyArray<{key: AmountPresetKey; labelKey: string; min: number; max: number | null}>;

/**
 * Advanced filter bar component for the invoice list, with URL-based state
 * management and a card-based panel UX (variant J, spec
 * `2026-05-21-view-invoices-filter-overhaul-design.md`).
 *
 * @remarks
 * Outer shell (search input, view toggle, mobile Sheet wrapper, desktop
 * inline-panel container) matches the prior design. The panel internals are
 * a 2-column card grid (single column on mobile) with six cards: Date Range,
 * Amount Range, Currency, Categories, Payment Types, Sort By.
 *
 * **Active state**: each card highlights with a tinted background + colored
 * border + a small active-value pill in its header when its filter is set.
 *
 * **Dynamic option lists**: Currency, Categories, Payment Types are derived
 * from the FULL unfiltered invoice array (not the post-filter set) so that
 * filtering down doesn't dead-end the chip rails. Cards with empty derived
 * lists are hidden entirely.
 *
 * **Date presets**: 4 quick-buttons (30d / 90d / YTD / All time) control
 * the From/To Calendar popovers as a true controlled component via
 * `computePresetRange`. Active preset is derived from current From/To via
 * `deriveActivePreset` — no extra URL state.
 *
 * **Sort default**: defaults to "Date (newest first)"; the dropdown has no
 * "none" option.
 *
 * **Mobile**: sticky "Show N results" CTA at the bottom of the Sheet —
 * tactile thumb-reach affordance to close the sheet (filters still apply
 * reactively as the user edits).
 */
export default function FilterBar({
  filters,
  onFiltersChange,
  activeFilterCount,
  viewMode,
  onViewModeChange,
  invoices,
  filteredCount,
}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--List.invoicesView");
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

  // ── Dynamic option lists, derived from the FULL invoice set ──
  const availableCurrencies = useMemo(() => computeAvailableCurrencies(invoices), [invoices]);
  const availableCategories = useMemo(() => computeAvailableCategories(invoices), [invoices]);
  const availablePaymentTypes = useMemo(() => computeAvailablePaymentTypes(invoices), [invoices]);

  // ── Date-preset active state ──
  const activeDatePreset = useMemo(
    () => deriveActivePreset(filters.dateFrom, filters.dateTo, new Date()),
    [filters.dateFrom, filters.dateTo],
  );

  // ── Per-card active predicates ──
  const isDateActive = filters.dateFrom !== null || filters.dateTo !== null;
  const isAmountActive = filters.amountMin !== null || filters.amountMax !== null;
  const isCurrencyActive = filters.currencies.length > 0;
  const isCategoryActive = filters.categories.length > 0;
  const isPaymentActive = filters.paymentTypes.length > 0;
  const isSortActive = !(filters.sortBy === "date" && filters.sortOrder === "desc");

  // ── Handlers ──
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
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

  const handleDateFromChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({dateFrom: date ? (date.toISOString().split("T")[0] ?? null) : null});
    },
    [onFiltersChange],
  );

  const handleDateToChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({dateTo: date ? (date.toISOString().split("T")[0] ?? null) : null});
    },
    [onFiltersChange],
  );

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

  // ── Amount preset (chip) active-state derivation + click handler ──
  const activeAmountPreset = useMemo<AmountPresetKey | null>(() => {
    for (const preset of AMOUNT_PRESETS) {
      if (filters.amountMin === preset.min && filters.amountMax === preset.max) return preset.key;
    }
    return null;
  }, [filters.amountMin, filters.amountMax]);

  const handleAmountPresetClick = useCallback(
    (presetKey: AmountPresetKey) => {
      // Tap-to-toggle: clicking the already-active preset clears the amount filter.
      if (activeAmountPreset === presetKey) {
        onFiltersChange({amountMin: null, amountMax: null});
        return;
      }
      const preset = AMOUNT_PRESETS.find((p) => p.key === presetKey);
      if (preset) onFiltersChange({amountMin: preset.min, amountMax: preset.max});
    },
    [activeAmountPreset, onFiltersChange],
  );

  const handleCategoryToggle = useCallback(
    (category: number) => {
      const newCategories = filters.categories.includes(category)
        ? filters.categories.filter((c) => c !== category)
        : [...filters.categories, category];
      onFiltersChange({categories: newCategories});
    },
    [filters.categories, onFiltersChange],
  );

  const handlePaymentTypeToggle = useCallback(
    (paymentType: number) => {
      const newPaymentTypes = filters.paymentTypes.includes(paymentType)
        ? filters.paymentTypes.filter((p) => p !== paymentType)
        : [...filters.paymentTypes, paymentType];
      onFiltersChange({paymentTypes: newPaymentTypes});
    },
    [filters.paymentTypes, onFiltersChange],
  );

  const handleCurrencyToggle = useCallback(
    (code: string) => {
      const next = filters.currencies.includes(code)
        ? filters.currencies.filter((c) => c !== code)
        : [...filters.currencies, code];
      onFiltersChange({currencies: next});
    },
    [filters.currencies, onFiltersChange],
  );

  const handlePresetClick = useCallback(
    (preset: DatePresetKey) => {
      const range = computePresetRange(preset, new Date());
      onFiltersChange({dateFrom: range.from, dateTo: range.to});
    },
    [onFiltersChange],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const parts = value.split("-");
      const direction = parts.pop() as "asc" | "desc";
      const field = parts.join("-") as Exclude<FilterState["sortBy"], null>;
      onFiltersChange({sortBy: field, sortOrder: direction});
    },
    [onFiltersChange],
  );

  // ── Label helpers (kept inline so they pick up the right `t` namespace) ──
  const formatCurrencyList = useCallback(
    (codes: ReadonlyArray<string>): string =>
      codes.length <= 2 ? codes.join(", ") : `${codes.slice(0, 2).join(", ")}, +${codes.length - 2}`,
    [],
  );

  const getCategoryLabel = useCallback(
    (cat: InvoiceCategory): string => {
      switch (cat) {
        case InvoiceCategory.GROCERY:
          return t("categories.groceries");
        case InvoiceCategory.FAST_FOOD:
          return t("categories.dining");
        case InvoiceCategory.HOME_CLEANING:
          return t("categories.utilities");
        case InvoiceCategory.CAR_AUTO:
          return t("categories.travel");
        default:
          return t("categories.other");
      }
    },
    [t],
  );

  const getPaymentTypeLabel = useCallback((pt: PaymentType): string => {
    switch (pt) {
      case PaymentType.Cash:
        return "Cash";
      case PaymentType.Card:
        return "Card";
      case PaymentType.Transfer:
        return "Transfer";
      case PaymentType.MobilePayment:
        return "Mobile";
      case PaymentType.Voucher:
        return "Voucher";
      default:
        return "Other";
    }
  }, []);

  const getSortLabel = useCallback(
    (sortBy: FilterState["sortBy"], sortOrder: FilterState["sortOrder"]): string => {
      if (sortBy === "date" && sortOrder === "desc") return t("filters.sortOptions.dateNewest");
      if (sortBy === "date" && sortOrder === "asc") return t("filters.sortOptions.dateOldest");
      if (sortBy === "amount" && sortOrder === "desc") return t("filters.sortOptions.amountHighToLow");
      if (sortBy === "amount" && sortOrder === "asc") return t("filters.sortOptions.amountLowToHigh");
      if (sortBy === "name" && sortOrder === "asc") return t("filters.sortOptions.nameAZ");
      if (sortBy === "name" && sortOrder === "desc") return t("filters.sortOptions.nameZA");
      return "";
    },
    [t],
  );

  const dateActivePillText = useMemo(() => {
    if (!isDateActive) return null;
    if (activeDatePreset === "30d") return t("filters.datePresets.30d");
    if (activeDatePreset === "90d") return t("filters.datePresets.90d");
    if (activeDatePreset === "ytd") return t("filters.datePresets.ytd");
    if (filters.dateFrom && filters.dateTo)
      return `${formatDate(filters.dateFrom, {locale})} – ${formatDate(filters.dateTo, {locale})}`;
    if (filters.dateFrom) return `≥ ${formatDate(filters.dateFrom, {locale})}`;
    if (filters.dateTo) return `≤ ${formatDate(filters.dateTo, {locale})}`;
    return null;
  }, [isDateActive, activeDatePreset, filters.dateFrom, filters.dateTo, locale, t]);

  const amountActivePillText = useMemo(() => {
    if (!isAmountActive) return null;
    if (filters.amountMin !== null && filters.amountMax !== null) return `${filters.amountMin} – ${filters.amountMax}`;
    if (filters.amountMin !== null) return `≥ ${filters.amountMin}`;
    if (filters.amountMax !== null) return `≤ ${filters.amountMax}`;
    return null;
  }, [isAmountActive, filters.amountMin, filters.amountMax]);

  // ────────────────────────────────────────────────────────────
  // Panel body — card grid (single-column on mobile via SCSS)
  // ────────────────────────────────────────────────────────────
  // eslint-disable-next-line sonarjs/cognitive-complexity, complexity -- six conditionally-rendered card sections; extracting per-card sub-components would obscure the linear visual order without simplifying logic
  const renderFilterPanel = (): React.JSX.Element => (
    <div className={styles["panelGrid"]}>
      {/* ─────── Date Range ─────── */}
      <div className={`${styles["cardSection"]} ${isDateActive ? styles["cardSectionActive"] : ""}`}>
        <div className={styles["cardSectionHeader"]}>
          <span className={styles["cardSectionTitle"]}>
            <TbCalendar /> {t("filters.dateRange")}
          </span>
          {dateActivePillText ? (
            <span className={styles["activeValuePill"]}>{dateActivePillText}</span>
          ) : (
            <span className={styles["inactiveLabel"]}>{t("filters.anyValue")}</span>
          )}
        </div>
        <div className={styles["presetRow"]}>
          {(["30d", "90d", "ytd", "all"] as const).map((preset) => (
            <button
              key={preset}
              type='button'
              className={`${styles["presetButton"]} ${activeDatePreset === preset ? styles["presetButtonActive"] : ""}`}
              // eslint-disable-next-line react/jsx-no-bind -- preset is a stable literal
              onClick={() => handlePresetClick(preset)}>
              {t(`filters.datePresets.${preset}`)}
            </button>
          ))}
        </div>
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

      {/* ─────── Amount Range ─────── */}
      <div className={`${styles["cardSection"]} ${isAmountActive ? styles["cardSectionActive"] : ""}`}>
        <div className={styles["cardSectionHeader"]}>
          <span className={styles["cardSectionTitle"]}>
            <TbCurrencyDollar /> {t("filters.amountRange")}
          </span>
          {amountActivePillText ? (
            <span className={styles["activeValuePill"]}>{amountActivePillText}</span>
          ) : (
            <span className={styles["inactiveLabel"]}>{t("filters.anyValue")}</span>
          )}
        </div>
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
        <div className={styles["amountPresetRow"]}>
          {AMOUNT_PRESETS.map(({key: presetKey, labelKey}) => (
            <button
              key={presetKey}
              type='button'
              className={`${styles["presetButton"]} ${activeAmountPreset === presetKey ? styles["presetButtonActive"] : ""}`}
              // eslint-disable-next-line react/jsx-no-bind -- presetKey is a stable literal
              onClick={() => handleAmountPresetClick(presetKey)}>
              {t(`filters.amountPresets.${labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ─────── Currency (dynamic) ─────── */}
      {availableCurrencies.length > 0 && (
        <div className={`${styles["cardSection"]} ${isCurrencyActive ? styles["cardSectionActive"] : ""}`}>
          <div className={styles["cardSectionHeader"]}>
            <span className={styles["cardSectionTitle"]}>💵 {t("filters.currency")}</span>
            {isCurrencyActive ? (
              <span className={styles["activeValuePill"]}>{formatCurrencyList(filters.currencies)}</span>
            ) : (
              <span className={styles["inactiveLabel"]}>{t("filters.currencyAny")}</span>
            )}
          </div>
          <div className={styles["categoryChips"]}>
            {availableCurrencies.map((code) => (
              <Badge
                key={code}
                variant={filters.currencies.includes(code) ? "default" : "outline"}
                className={styles["categoryChip"]}
                // eslint-disable-next-line react/jsx-no-bind -- code is a stable literal
                onClick={() => handleCurrencyToggle(code)}>
                {code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ─────── Categories (dynamic) ─────── */}
      {availableCategories.length > 0 && (
        <div className={`${styles["cardSection"]} ${isCategoryActive ? styles["cardSectionActive"] : ""}`}>
          <div className={styles["cardSectionHeader"]}>
            <span className={styles["cardSectionTitle"]}>📂 {t("filters.categories")}</span>
            {isCategoryActive ? (
              <span className={styles["activeValuePill"]}>
                {filters.categories.map((c) => getCategoryLabel(c as InvoiceCategory)).join(", ")}
              </span>
            ) : (
              <span className={styles["inactiveLabel"]}>{t("filters.anyValue")}</span>
            )}
          </div>
          <div className={styles["categoryChips"]}>
            {availableCategories.map((cat) => (
              <Badge
                key={cat}
                variant={filters.categories.includes(cat) ? "default" : "outline"}
                className={styles["categoryChip"]}
                // eslint-disable-next-line react/jsx-no-bind -- cat is a stable enum value
                onClick={() => handleCategoryToggle(cat)}>
                {getCategoryLabel(cat)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ─────── Payment Types (dynamic) ─────── */}
      {availablePaymentTypes.length > 0 && (
        <div className={`${styles["cardSection"]} ${isPaymentActive ? styles["cardSectionActive"] : ""}`}>
          <div className={styles["cardSectionHeader"]}>
            <span className={styles["cardSectionTitle"]}>💳 {t("filters.paymentTypes")}</span>
            {isPaymentActive ? (
              <span className={styles["activeValuePill"]}>
                {filters.paymentTypes.map((p) => getPaymentTypeLabel(p as PaymentType)).join(", ")}
              </span>
            ) : (
              <span className={styles["inactiveLabel"]}>{t("filters.anyValue")}</span>
            )}
          </div>
          <div className={styles["categoryChips"]}>
            {availablePaymentTypes.map((pt) => (
              <Badge
                key={pt}
                variant={filters.paymentTypes.includes(pt) ? "default" : "outline"}
                className={styles["categoryChip"]}
                // eslint-disable-next-line react/jsx-no-bind -- pt is a stable enum value
                onClick={() => handlePaymentTypeToggle(pt)}>
                {getPaymentTypeLabel(pt)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* ─────── Sort By ─────── */}
      <div className={`${styles["cardSection"]} ${isSortActive ? styles["cardSectionActive"] : ""}`}>
        <div className={styles["cardSectionHeader"]}>
          <span className={styles["cardSectionTitle"]}>↕ {t("filters.sortBy")}</span>
          {isSortActive ? (
            <span className={styles["activeValuePill"]}>{getSortLabel(filters.sortBy, filters.sortOrder)}</span>
          ) : (
            <span className={styles["inactiveLabel"]}>{t("filters.defaultValue")}</span>
          )}
        </div>
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={handleSortChange}>
          <SelectTrigger className={styles["sortSelect"]}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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

        {/* Filter Button — mobile opens Sheet, desktop toggles inline panel */}
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
                  {t("filters.title")}
                  {activeFilterCount > 0 && (
                    <span className={styles["panelHeaderActiveBadge"]}>
                      {t("filters.activeCount", {count: String(activeFilterCount)})}
                    </span>
                  )}
                </h3>
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
              <div style={{flex: 1, overflowY: "auto"}}>{renderFilterPanel()}</div>
              <div className={styles["mobileShowResultsBar"]}>
                <Button
                  className={styles["mobileShowResultsButton"]}
                  // eslint-disable-next-line react/jsx-no-bind -- inline close handler
                  onClick={() => setIsFilterOpen(false)}>
                  {t("filters.showResults", {count: filteredCount})}
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
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            aria-controls='inline-filter-panel'>
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
                    // eslint-disable-next-line react/jsx-no-bind -- inline mode setter
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
                    // eslint-disable-next-line react/jsx-no-bind -- inline mode setter
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

      {/* Inline filter panel (desktop only) — collapses below the search bar */}
      {!isMobile && isFilterOpen ? (
        <div
          id='inline-filter-panel'
          className={styles["inlineFilterPanel"]}>
          <div className={styles["inlineFilterHeader"]}>
            <h4 className={styles["inlineFilterTitle"]}>
              {t("filters.title")}
              {activeFilterCount > 0 && (
                <span className={styles["panelHeaderActiveBadge"]}>
                  {t("filters.activeCount", {count: String(activeFilterCount)})}
                </span>
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
                  {t("filters.clear")}
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                // eslint-disable-next-line react/jsx-no-bind -- inline close handler
                onClick={() => setIsFilterOpen(false)}
                aria-label={t("filters.title")}
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
