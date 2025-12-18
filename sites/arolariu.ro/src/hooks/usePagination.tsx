"use client";

/**
 * @fileoverview Custom React hook for pagination with integrated search filtering.
 * @module hooks/usePagination
 *
 * @remarks
 * Utility hook for client components that need stable pagination state.
 * Includes an optional search filter step before pagination.
 */

import {useCallback, useMemo, useState} from "react";

/**
 * Input parameters for the usePaginationWithSearch hook.
 *
 * @template T - The type of items being paginated
 */
type PaginationWithSearchInputType<T> = Readonly<{
  /** Array of items to paginate. Can be any type. */
  items: ReadonlyArray<T> | T[];
  /** Number of items per page. Defaults to 5. */
  readonly initialPageSize?: number;
  /** Initial page number (1-indexed). Defaults to 1. */
  readonly initialPage?: number;
  /** Optional search query string. When provided, filters items via JSON.stringify matching. */
  searchQuery?: string;
}>;

/**
 * Return value from the usePaginationWithSearch hook.
 *
 * @template T - The type of items being paginated
 */
type PaginationWithSearchOutputType<T> = Readonly<{
  /** Current active page number (1-indexed), automatically clamped to valid range. Resets to 1 when searching. */
  currentPage: number;
  /** Sets the requested page number. Will be clamped to [1, totalPages] range. */
  setCurrentPage: (page: number) => void;
  /** Current page size (items per page). */
  pageSize: number;
  /** Updates the page size. Causes totalPages recalculation. */
  setPageSize: (size: number) => void;
  /** Total number of pages based on filtered items and page size. Minimum value is 1. */
  totalPages: number;
  /** Array of items for the current page (filtered and paginated). */
  paginatedItems: ReadonlyArray<T> | T[];
  /** Generic pagination function that can paginate any array using current pagination state. */
  paginate: <U = T>(items: ReadonlyArray<U> | U[]) => U[];
  /** Resets pagination to initial values (page and page size). */
  resetPagination: () => void;
}>;

/**
 * Provides pagination state and controls with integrated search filtering.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Search Behavior:**
 * - When `searchQuery` is provided, filters items using `JSON.stringify` + case-insensitive matching
 * - Automatically resets to page 1 when search query changes (derived, no state mutation)
 * - Empty or whitespace-only queries return all items unfiltered
 *
 * **Pagination Logic:**
 * - Pages are 1-indexed (page 1 is the first page)
 * - `currentPage` is derived and automatically clamped to [1, totalPages]
 * - Requesting page 999 when only 5 pages exist will display page 5
 * - `totalPages` minimum value is 1 (even for empty arrays)
 *
 * **Performance Optimizations:**
 * - Uses `useMemo` to prevent unnecessary recalculations
 * - Uses `useCallback` for stable function references
 * - No unnecessary effects or state updates
 * - Derived state pattern (no sync between state variables)
 *
 * **Generic Pagination:**
 * - The `paginate` function can paginate any array type, not just `T`
 * - Useful for paginating derived/transformed data
 *
 * **State Management:**
 * - Internal state tracks "requested page" (may be out of bounds)
 * - Derived `currentPage` is always valid (clamped)
 * - This prevents state sync issues when items/filters change
 *
 * @template T - The type of items being paginated
 * @param params - Hook configuration
 * @param params.items - Array of items to paginate
 * @param params.initialPageSize - Items per page (default: 5)
 * @param params.initialPage - Starting page number (default: 1)
 * @param params.searchQuery - Optional search filter string
 * @returns Pagination state and control functions
 *
 * @example
 * ```tsx
 * function InvoiceTable({invoices}: {invoices: Invoice[]}) {
 *   const [searchTerm, setSearchTerm] = useState("");
 *
 *   const {
 *     paginatedItems,
 *     currentPage,
 *     setCurrentPage,
 *     totalPages,
 *     pageSize,
 *     setPageSize,
 *   } = usePaginationWithSearch({
 *     items: invoices,
 *     initialPageSize: 10,
 *     searchQuery: searchTerm,
 *   });
 *
 *   return (
 *     <>
 *       <SearchInput value={searchTerm} onChange={setSearchTerm} />
 *       <Table>
 *         {paginatedItems.map((invoice) => (
 *           <InvoiceRow key={invoice.id} invoice={invoice} />
 *         ))}
 *       </Table>
 *       <Pagination
 *         currentPage={currentPage}
 *         totalPages={totalPages}
 *         onPageChange={setCurrentPage}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using generic paginate function for transformed data
 * function MerchantList() {
 *   const {paginate} = usePaginationWithSearch({items: merchants});
 *
 *   const sortedMerchants = merchants.sort((a, b) => a.name.localeCompare(b.name));
 *   const paginatedSortedMerchants = paginate(sortedMerchants);
 *
 *   return <MerchantGrid merchants={paginatedSortedMerchants} />;
 * }
 * ```
 *
 * @see {@link https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes React Derived State Pattern}
 */
export function usePaginationWithSearch<T>({
  items,
  initialPageSize = 5,
  initialPage = 1,
  searchQuery,
}: PaginationWithSearchInputType<T>): PaginationWithSearchOutputType<T> {
  const [requestedPage, setRequestedPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Filter items based on search query if provided
  const filteredItems = useMemo(() => {
    const q = searchQuery?.trim().toLowerCase();
    if (!q) {
      return items;
    }

    return items.filter((item) => {
      try {
        return JSON.stringify(item).toLowerCase().includes(q);
      } catch {
        return false;
      }
    });
  }, [items, searchQuery]);

  // Compute total pages from filtered items
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredItems.length / pageSize)), [filteredItems.length, pageSize]);

  // Derive the current page (no Effects)
  const currentPage = useMemo(() => {
    // If searching, always show page 1 (without mutating state)
    if (searchQuery?.trim()) {
      return 1;
    }

    // Otherwise clamp requested page into [1, totalPages]
    return Math.min(Math.max(requestedPage, 1), totalPages);
  }, [requestedPage, totalPages, searchQuery]);

  // Generic pagination function using the derived current page
  const paginate = useCallback(
    <U = T,>(itemsToPage: ReadonlyArray<U> | U[]): U[] => {
      const startIndex = (currentPage - 1) * pageSize;
      return itemsToPage.slice(startIndex, startIndex + pageSize);
    },
    [currentPage, pageSize],
  );

  // Get current items for this page
  const paginatedItems = useMemo(() => paginate(filteredItems), [filteredItems, paginate]);

  // Reset to initial values (intent state only)
  const resetPagination = useCallback(() => {
    setRequestedPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    currentPage,
    setCurrentPage: setRequestedPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
    paginate,
    resetPagination,
  } as const;
}
