/** @format */

"use client";

import {useCallback, useEffect, useMemo, useState} from "react";

type PaginationWithSearchInputType<T> = {
  items: T[];
  initialPageSize?: number;
  initialPage?: number;
  searchQuery?: string;
};

type PaginationWithSearchOutputType<T> = {
  currentPage: number;
  setCurrentPage: (page: number) => void;
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
  // State for pagination controls
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  // Filter items based on search query if provided
  const filteredItems = useMemo(() => {
    if (!searchQuery?.trim()) return items;

    const normalizedQuery = searchQuery.toLowerCase().trim();

    return items.filter((item) => {
      try {
        // Generic search implementation - in a production app,
        // this would likely be customized based on the item structure
        return JSON.stringify(item).toLowerCase().includes(normalizedQuery);
      } catch (error) {
        console.error("Error filtering item during search:", error);
        return false;
      }
    });
  }, [items, searchQuery]);

  // Calculate total pages based on filtered items
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredItems.length / pageSize));
  }, [filteredItems.length, pageSize]);

  // Reset to first page when search query changes
  useEffect(() => {
    if (searchQuery?.trim()) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Ensure current page is valid when total pages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Generic pagination function
  const paginate = useCallback(
    <U = T,>(itemsToPage: U[]): U[] => {
      const startIndex = (currentPage - 1) * pageSize;
      return itemsToPage.slice(startIndex, startIndex + pageSize);
    },
    [currentPage, pageSize],
  );

  // Get current items for this page
  const paginatedItems = useMemo(() => {
    return paginate(filteredItems);
  }, [filteredItems, paginate]);

  // Reset pagination to initial values
  const resetPagination = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
    paginate,
    resetPagination,
  } as const;
}
