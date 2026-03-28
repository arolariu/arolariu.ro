"use client";

import {usePaginationWithSearch} from "@/hooks";
import type {Invoice} from "@/types/invoices";
import {useWindowSize} from "@arolariu/components";
import {useCallback, useMemo, useState} from "react";
import {useFilteredInvoices} from "../../_hooks/useFilteredInvoices";
import FilterBar, {type FilterState} from "../filters/FilterBar";
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
 * This component integrates the new FilterBar component with comprehensive filtering:
 * - Text search with debouncing
 * - Date range filtering
 * - Amount range filtering
 * - Multi-select category filtering
 * - Multi-select payment type filtering
 * - Sort by multiple fields
 *
 * Defaults to grid view on mobile devices for better touch interaction.
 *
 * @param props - Component props
 * @returns The RenderInvoicesView component, CSR'ed.
 */
export default function RenderInvoicesView({invoices}: Readonly<Props>): React.JSX.Element {
  const {isMobile} = useWindowSize();
  const [viewMode, setViewMode] = useState<"table" | "grid">(isMobile ? "grid" : "table");
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    categories: [],
    paymentTypes: [],
    sortBy: "date-desc",
  });

  // Apply filters and sorting
  const filteredInvoices = useFilteredInvoices(invoices, filters);

  // Pagination for filtered results
  const {paginatedItems, currentPage, totalPages, setCurrentPage, setPageSize, pageSize} = usePaginationWithSearch<Invoice>({
    items: filteredInvoices,
    initialPageSize: 10,
    searchQuery: "", // Search is handled by FilterBar
  });

  /**
   * Calculate active filter count for badge.
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.amountMin !== null) count++;
    if (filters.amountMax !== null) count++;
    if (filters.categories.length > 0) count++;
    if (filters.paymentTypes.length > 0) count++;
    return count;
  }, [filters]);

  /**
   * Handle filter changes.
   */
  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    },
    [setCurrentPage],
  );

  /**
   * Handle view mode change.
   */
  const handleViewModeChange = useCallback((mode: "table" | "grid") => {
    setViewMode(mode);
  }, []);

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
   * Render view content based on view mode.
   */
  const viewContent =
    viewMode === "table" ? (
      <TableView
        invoices={paginatedItems}
        pageSize={pageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
        handlePageSizeChange={handlePageSizeChange}
      />
    ) : (
      <GridView invoices={paginatedItems} />
    );

  return (
    <div className={styles["container"]}>
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        activeFilterCount={activeFilterCount}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      {viewContent}
    </div>
  );
}
