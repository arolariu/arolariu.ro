/** @format */

"use client";

import {useCallback, useMemo, useState} from "react";

type PaginationWithSearchInputType<T> = {
  items: T[];
  initialPageSize?: number;
  initialPage?: number;
  searchQuery?: string;
};

type PaginationWithSearchOutputType<T> = {
  currentPage: number; // derived, clamped, and reset to 1 when searching
  setCurrentPage: (page: number) => void; // sets the requested page
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  paginatedItems: T[];
  paginate: <U = T>(items: U[]) => U[];
  resetPagination: () => void;
};

/**
 * Custom React hook for pagination of items with optional search functionality.
 * @template T - The type of items being paginated
 * @returns An object containing pagination state and controls.
 * @example
 * const {
 *   paginatedItems,
 *   currentPage,
 *   setCurrentPage,
 *   totalPages
 * } = usePagination({
 *   items: myDataArray,
 *   initialPageSize: 10,
 *   searchQuery: searchTerm
 * });
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
    <U = T,>(itemsToPage: U[]): U[] => {
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
