"use client";

import {usePaginationWithSearch} from "@/hooks";
import type {Invoice} from "@/types/invoices";
import {useWindowSize} from "@arolariu/components";
import {useCallback, useEffect, useMemo} from "react";
import {useFilteredInvoices} from "../../_hooks/useFilteredInvoices";
import {useInvoiceFilters, type FilterState} from "../../_hooks/useInvoiceFilters";
import FilterBar from "../filters/FilterBar";
import {GridView} from "../tables/GridView";
import {TableView} from "../tables/TableView";
import styles from "./InvoicesView.module.scss";

type Props = {
  invoices: ReadonlyArray<Invoice>;
};

/**
 * The RenderInvoicesView component displays a list of invoices with advanced filtering and sorting.
 * It allows users to switch between table and grid views.
 *
 * @remarks
 * This component integrates URL-based filter management using the `useInvoiceFilters` hook.
 * All filter state is synchronized with URL search parameters, enabling:
 * - **Bookmarkable filters**: Users can save filtered views as bookmarks
 * - **Shareable URLs**: Users can share filtered views with colleagues
 * - **Browser history**: Back/forward navigation respects filter changes
 * - **No prop drilling**: Filter state is managed via URL, not React state
 *
 * **Filter Capabilities**:
 * - Text search with debouncing (300ms)
 * - Date range filtering (from/to dates)
 * - Amount range filtering (min/max amounts)
 * - Multi-select category filtering
 * - Multi-select payment type filtering
 * - Sort by multiple fields (date, amount, name)
 * - View mode toggle (table/grid)
 *
 * **Responsive Design**:
 * - Defaults to grid view on mobile devices for better touch interaction
 * - Uses window size detection to set initial view mode
 * - View mode is stored in URL and persists across sessions
 *
 * **Performance**:
 * - Filtered results are memoized via `useFilteredInvoices` hook
 * - Pagination reduces DOM nodes for large invoice lists
 * - Debounced search input prevents excessive filtering
 *
 * @param props - Component props
 * @returns The RenderInvoicesView component, CSR'ed.
 */
export default function RenderInvoicesView({invoices}: Readonly<Props>): React.JSX.Element {
  const {isMobile} = useWindowSize();
  const {filters, setFilters, activeFilterCount} = useInvoiceFilters();

  // Set initial view mode based on device type (only on first render if not in URL)
  useEffect(() => {
    if (!filters.view) {
      setFilters({view: isMobile ? "grid" : "table"});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Apply filters and sorting
  const filteredInvoices = useFilteredInvoices(invoices, filters);

  // Pagination for filtered results
  const {paginatedItems, currentPage, totalPages, setCurrentPage, setPageSize, pageSize} = usePaginationWithSearch<Invoice>({
    items: filteredInvoices,
    initialPageSize: 20,
    searchQuery: "", // Search is handled by URL filters
  });

  /**
   * Handle filter changes from FilterBar.
   * Updates URL search params via the useInvoiceFilters hook.
   */
  const handleFiltersChange = useCallback(
    (newFilters: Partial<typeof filters>) => {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    },
    [setFilters, setCurrentPage],
  );

  /**
   * Handle view mode change.
   * Updates URL search params to persist view mode.
   */
  const handleViewModeChange = useCallback(
    (mode: "table" | "grid") => {
      setFilters({view: mode});
    },
    [setFilters],
  );

  /**
   * Handle pagination.
   */
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    [setPageSize, setCurrentPage],
  );

  /**
   * Parse sort params into field and direction for TableView.
   */
  const {sortBy, sortDirection} = useMemo(() => {
    return {sortBy: filters.sortBy, sortDirection: filters.sortOrder};
  }, [filters.sortBy, filters.sortOrder]);

  /**
   * Handle column sort click.
   * Toggles direction if same field, otherwise defaults to desc (or asc for name).
   */
  const handleSort = useCallback(
    (field: "date" | "amount" | "name") => {
      const currentField = filters.sortBy;
      const currentDir = filters.sortOrder;

      // Toggle direction if same field, otherwise default to desc (or asc for name)
      const newDir = currentField === field ? (currentDir === "asc" ? "desc" : "asc") : field === "name" ? "asc" : "desc";

      setFilters({sortBy: field, sortOrder: newDir});
      setCurrentPage(1); // Reset to first page when sort changes
    },
    [filters.sortBy, filters.sortOrder, setFilters, setCurrentPage],
  );

  /**
   * Render view content based on view mode from URL.
   */
  const viewContent =
    filters.view === "table" ? (
      <TableView
        invoices={paginatedItems}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
        handlePageSizeChange={handlePageSizeChange}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    ) : (
      <GridView
        invoices={paginatedItems}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
        handlePageSizeChange={handlePageSizeChange}
      />
    );

  return (
    <div className={styles["container"]}>
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        activeFilterCount={activeFilterCount}
        viewMode={filters.view}
        onViewModeChange={handleViewModeChange}
      />
      {viewContent}
    </div>
  );
}
