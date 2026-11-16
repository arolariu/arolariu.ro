"use client";

import {usePaginationWithSearch} from "@/hooks";
import type {Invoice} from "@/types/invoices";
import {useWindowSize} from "@arolariu/components";
import {useSearchParams} from "next/navigation";
import {useCallback, useMemo, useState} from "react";
import {useFilteredInvoices} from "../../_hooks/useFilteredInvoices";
import {useInvoiceFilters} from "../../_hooks/useInvoiceFilters";
import FilterBar from "../filters/FilterBar";
import {GridView} from "../tables/GridView";
import {TableView} from "../tables/TableView";
import styles from "./InvoicesView.module.scss";

type Props = {
  invoices: ReadonlyArray<Invoice>;
};

type ViewMode = "table" | "grid";

/**
 * Narrows the raw `view` search parameter to a supported view mode.
 *
 * @param rawViewMode - The raw `view` search parameter.
 * @returns The view mode when the parameter names one, otherwise `null`.
 */
function parseViewMode(rawViewMode: string | null): ViewMode | null {
  return rawViewMode === "table" || rawViewMode === "grid" ? rawViewMode : null;
}

/**
 * Resolves which invoices view to render.
 *
 * @param urlViewMode - The view selected by the URL, if any.
 * @param chosenViewMode - The view last chosen during this visit, from the URL or the toggle, if any.
 * @param isMobile - Whether the measured viewport is below the mobile breakpoint.
 * @returns The URL view when present, otherwise the last table choice, otherwise the device default.
 */
function resolveViewMode(urlViewMode: ViewMode | null, chosenViewMode: ViewMode | null, isMobile: boolean): ViewMode {
  if (urlViewMode !== null) {
    return urlViewMode;
  }
  // The URL is empty until a view is chosen, and a table choice is not in it yet while navigation is pending.
  if (chosenViewMode === "table") {
    return "table";
  }
  return isMobile ? "grid" : "table";
}

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
 * - The device default is derived at render time from the measured window size, without rewriting the URL
 * - An explicit `view` URL parameter or a toggle choice always takes precedence over the device default
 * - A toggle choice is written to the URL, so it survives filter or sort updates and remounts such as tab switches
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
  const searchParams = useSearchParams();
  const {filters, setFilters, activeFilterCount} = useInvoiceFilters();
  const filteredInvoices = useFilteredInvoices(invoices, filters);
  const urlViewMode = parseViewMode(searchParams.get("view"));
  const [chosenViewMode, setChosenViewMode] = useState<ViewMode | null>(urlViewMode);
  const [previousUrlViewMode, setPreviousUrlViewMode] = useState(urlViewMode);
  // Only a changed URL can override a toggle choice; router.replace may still be pending.
  if (urlViewMode !== previousUrlViewMode) {
    setPreviousUrlViewMode(urlViewMode);
    if (urlViewMode !== null) {
      setChosenViewMode(urlViewMode);
    }
  }
  const viewMode = resolveViewMode(urlViewMode, chosenViewMode, isMobile);

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
    (mode: ViewMode) => {
      setChosenViewMode(mode);
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
   * Always sets BOTH sortBy and sortOrder together.
   */
  const handleSort = useCallback(
    (field: "date" | "amount" | "name") => {
      if (filters.sortBy === field) {
        // Toggle direction
        const newOrder = filters.sortOrder === "asc" ? "desc" : "asc";
        setFilters({sortBy: field, sortOrder: newOrder});
      } else {
        // New field — default direction
        setFilters({sortBy: field, sortOrder: field === "name" ? "asc" : "desc"});
      }
      setCurrentPage(1); // Reset to first page when sort changes
    },
    [filters.sortBy, filters.sortOrder, setFilters, setCurrentPage],
  );

  /**
   * Render view content based on the resolved view mode.
   */
  const viewContent: React.JSX.Element =
    viewMode === "table" ? (
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
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        filteredCount={filteredInvoices.length}
      />
      {viewContent}
    </div>
  );
}
