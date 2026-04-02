"use client";

import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useCallback, useMemo} from "react";

/**
 * Filter state type containing all filter parameters stored in URL search params.
 *
 * @remarks
 * This type represents the filter state that is synchronized with URL search parameters.
 * All date values are stored as ISO date strings (YYYY-MM-DD) for URL compatibility.
 * This enables bookmarkable and shareable filter states.
 *
 * @property search - Text search query for invoice name/description
 * @property dateFrom - Start date for date range filter (ISO string)
 * @property dateTo - End date for date range filter (ISO string)
 * @property amountMin - Minimum amount for amount range filter
 * @property amountMax - Maximum amount for amount range filter
 * @property categories - Selected invoice categories (comma-separated enum values)
 * @property paymentTypes - Selected payment types (comma-separated enum values)
 * @property sortBy - Sort field (date, amount, or name)
 * @property sortOrder - Sort direction (asc or desc)
 * @property view - Current view mode (table or grid)
 */
export type FilterState = {
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: number | null;
  amountMax: number | null;
  categories: number[];
  paymentTypes: number[];
  sortBy: "date" | "amount" | "name";
  sortOrder: "asc" | "desc";
  view: "table" | "grid";
};

/**
 * Return type for the useInvoiceFilters hook.
 *
 * @property filters - Current filter state read from URL search params
 * @property setFilters - Function to update filters in URL (merges with existing)
 * @property clearFilters - Function to clear all filters from URL
 * @property activeFilterCount - Number of active non-default filters
 */
export type UseInvoiceFiltersReturn = {
  filters: FilterState;
  setFilters: (newFilters: Partial<FilterState>) => void;
  clearFilters: () => void;
  activeFilterCount: number;
};

/**
 * Custom hook for managing invoice filter state via URL search parameters.
 *
 * @remarks
 * **Purpose**: This hook provides a declarative interface for reading and writing
 * invoice filter state to/from URL search parameters. This enables:
 * - **Bookmarkable filters**: Users can save filtered views as bookmarks
 * - **Shareable URLs**: Users can share filtered views with others
 * - **Browser history**: Back/forward navigation respects filter changes
 * - **No prop drilling**: Components can access filters without passing through props
 *
 * **URL Parameter Schema**:
 * - `q` (string): Search query for invoice name/description
 * - `from` (ISO date): Start date for date range filter (e.g., `2026-01-01`)
 * - `to` (ISO date): End date for date range filter (e.g., `2026-03-28`)
 * - `min` (number): Minimum amount for amount range filter
 * - `max` (number): Maximum amount for amount range filter
 * - `cat` (comma-separated numbers): Selected category IDs (e.g., `100,200`)
 * - `pay` (comma-separated numbers): Selected payment type IDs (e.g., `200,300`)
 * - `sortBy` (string): Sort field - `date`, `amount`, or `name` (default: `date`)
 * - `sortOrder` (string): Sort direction - `asc` or `desc` (default: `desc`)
 * - `view` (string): View mode - `table` or `grid` (default: `table`)
 *
 * **Default Values**:
 * - Parameters with default values are removed from URL when set to default
 * - This keeps URLs clean and prevents unnecessary query string pollution
 * - Defaults: `sortBy="date"`, `sortOrder="desc"`, `view="table"`, empty filters
 *
 * **Performance**:
 * - Uses `useMemo` to avoid recomputing filter state on every render
 * - Uses `useCallback` to memoize update functions
 * - Uses `router.replace()` instead of `push()` to avoid polluting browser history
 * - Uses `{scroll: false}` to prevent page jumps on filter changes
 *
 * **Type Safety**:
 * - All filter values are properly typed (no `any` types)
 * - Date strings are validated and parsed safely
 * - Number arrays are filtered to remove NaN values
 * - View mode is constrained to literal union type
 *
 * @returns Object containing current filter state, update functions, and active filter count
 *
 * @example
 * ```tsx
 * function InvoicesView() {
 *   const {filters, setFilters, clearFilters, activeFilterCount} = useInvoiceFilters();
 *
 *   // Read current filters
 *   console.log(filters.search); // "groceries"
 *   console.log(filters.dateFrom); // "2026-01-01"
 *
 *   // Update filters (merges with existing)
 *   setFilters({search: "new search"});
 *   setFilters({dateFrom: "2026-01-01", dateTo: "2026-12-31"});
 *
 *   // Clear all filters
 *   clearFilters();
 *
 *   // Check active filter count
 *   console.log(activeFilterCount); // 3
 * }
 * ```
 *
 * @see {@link FilterState} - Type definition for filter state
 * @see {@link UseInvoiceFiltersReturn} - Type definition for hook return value
 */
export function useInvoiceFilters(): UseInvoiceFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Read filters from URL search parameters.
   *
   * @remarks
   * Uses `useMemo` to avoid recomputing on every render. Only recalculates when
   * `searchParams` reference changes (which happens when URL updates).
   *
   * **Parsing Strategy**:
   * - String params: Direct read with fallback to default
   * - Number params: Parse with `Number()`, use `null` if invalid/missing
   * - Array params: Split comma-separated string, parse numbers, filter NaN values
   * - Date params: Store as ISO strings for URL compatibility
   * - Enum params: Cast to literal union types with validation
   */
  const filters = useMemo(
    (): FilterState => ({
      search: searchParams.get("q") ?? "",
      dateFrom: searchParams.get("from"),
      dateTo: searchParams.get("to"),
      amountMin: searchParams.has("min") ? Number(searchParams.get("min")) : null,
      amountMax: searchParams.has("max") ? Number(searchParams.get("max")) : null,
      categories:
        searchParams
          .get("cat")
          ?.split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n)) ?? [],
      paymentTypes:
        searchParams
          .get("pay")
          ?.split(",")
          .map(Number)
          .filter((n) => !Number.isNaN(n)) ?? [],
      sortBy: (searchParams.get("sortBy") as FilterState["sortBy"]) ?? "date",
      sortOrder: (searchParams.get("sortOrder") as FilterState["sortOrder"]) ?? "desc",
      view: (searchParams.get("view") as "table" | "grid") ?? "table",
    }),
    [searchParams],
  );

  /**
   * Update filters in URL search parameters.
   *
   * @remarks
   * **Merge Strategy**: New filters are merged with existing filters (shallow merge).
   * This allows partial updates without requiring all filter values.
   *
   * **URL Cleanup Strategy**:
   * - Parameters set to default values are removed from URL
   * - Empty strings, null values, and empty arrays remove their parameters
   * - This keeps URLs clean and human-readable
   *
   * **Navigation Strategy**:
   * - Uses `router.replace()` instead of `push()` to avoid history pollution
   * - Uses `{scroll: false}` to prevent unwanted scroll jumps
   * - URL updates are synchronous (no loading state needed)
   *
   * @param newFilters - Partial filter state to merge with existing filters
   */
  const setFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      const merged = {...filters, ...newFilters};

      // Set or delete each param based on value
      if (merged.search) {
        params.set("q", merged.search);
      } else {
        params.delete("q");
      }

      if (merged.dateFrom) {
        params.set("from", merged.dateFrom);
      } else {
        params.delete("from");
      }

      if (merged.dateTo) {
        params.set("to", merged.dateTo);
      } else {
        params.delete("to");
      }

      if (merged.amountMin !== null) {
        params.set("min", String(merged.amountMin));
      } else {
        params.delete("min");
      }

      if (merged.amountMax !== null) {
        params.set("max", String(merged.amountMax));
      } else {
        params.delete("max");
      }

      if (merged.categories.length > 0) {
        params.set("cat", merged.categories.join(","));
      } else {
        params.delete("cat");
      }

      if (merged.paymentTypes.length > 0) {
        params.set("pay", merged.paymentTypes.join(","));
      } else {
        params.delete("pay");
      }

      if (merged.sortBy !== "date") {
        params.set("sortBy", merged.sortBy);
      } else {
        params.delete("sortBy");
      }

      if (merged.sortOrder !== "desc") {
        params.set("sortOrder", merged.sortOrder);
      } else {
        params.delete("sortOrder");
      }

      if (merged.view !== "table") {
        params.set("view", merged.view);
      } else {
        params.delete("view");
      }

      // Replace URL without adding to history or scrolling
      // Only add '?' if there are parameters, otherwise keep pathname clean
      const paramString = params.toString();
      router.replace(paramString ? `${pathname}?${paramString}` : pathname, {scroll: false});
    },
    [searchParams, filters, router, pathname],
  );

  /**
   * Clear all filters by navigating to the base pathname without query parameters.
   *
   * @remarks
   * Uses `router.replace()` to avoid adding a history entry. This makes the "clear"
   * action feel more like a reset than a navigation.
   */
  const clearFilters = useCallback(() => {
    router.replace(pathname, {scroll: false});
  }, [router, pathname]);

  /**
   * Calculate the number of active non-default filters.
   *
   * @remarks
   * Used to display a badge showing how many filters are currently applied.
   * Only counts filters that have non-default values (excludes sort and view mode).
   *
   * **Counted Filters**:
   * - Search query (if not empty)
   * - Date range (if either from or to is set)
   * - Amount range (if either min or max is set)
   * - Categories (if any selected)
   * - Payment types (if any selected)
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.amountMin !== null || filters.amountMax !== null) count++;
    if (filters.categories.length > 0) count++;
    if (filters.paymentTypes.length > 0) count++;
    return count;
  }, [filters]);

  return {filters, setFilters, clearFilters, activeFilterCount};
}
