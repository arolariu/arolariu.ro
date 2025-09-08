/** @format */

import {usePaginationWithSearch} from "@/hooks";
import {
  Card,
  Input,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useState} from "react";
import MediaPreview from "../_components/MediaPreview";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Grid display component for invoice scans.
 * @returns JSX.Element that displays a grid of invoice scans.
 */
export default function GridDisplay(): React.JSX.Element | null {
  const {scans} = useInvoiceCreator();
  const [query, setQuery] = useState("");

  const {paginatedItems, currentPage, totalPages, setCurrentPage} = usePaginationWithSearch({
    items: scans,
    initialPageSize: 9,
    searchQuery: query,
  });

  const gridClassMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
  };
  const gridClasses = gridClassMap[paginatedItems.length] ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  // Build visible pages with ellipses
  const getVisiblePages = () => {
    if (totalPages <= 1) {
      return [1];
    }
    const delta = 2;
    const range: number[] = [];
    const result: Array<number | string> = [];

    for (const i of Array.from(
      {length: Math.max(0, Math.min(totalPages - 1, currentPage + delta) - Math.max(2, currentPage - delta) + 1)},
      (_, offset) => Math.max(2, currentPage - delta) + offset,
    )) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      result.push(1, "...");
    } else {
      result.push(1);
    }

    result.push(...range);

    if (currentPage + delta < totalPages - 1) {
      result.push("...", totalPages);
    } else if (totalPages > 1) {
      result.push(totalPages);
    }

    return result;
  };

  // Stable handlers to satisfy react/jsx-no-bind
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handlePrevClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    [currentPage, setCurrentPage],
  );

  const handleNextClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    },
    [currentPage, totalPages, setCurrentPage],
  );

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const val = (e.currentTarget as HTMLAnchorElement).dataset["page"];
      const page = val ? Number(val) : Number.NaN;
      if (!Number.isNaN(page)) {
        setCurrentPage(page);
      }
    },
    [setCurrentPage],
  );

  if (scans.length === 0) {
    return null;
  }

  return (
    <>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div className='flex-1'>
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder='Search by filename or metadata...'
            className='border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
            aria-label='Search uploads'
          />
        </div>
        <div className='shrink-0 text-sm text-gray-600 dark:text-gray-400'>
          {paginatedItems.length} of {scans.length} shown
        </div>
      </div>

      <div className={`grid ${gridClasses} mb-8 gap-6 lg:min-h-[800px]`}>
        {paginatedItems.map((scan, index) => (
          <motion.div
            key={scan.id}
            initial={{opacity: 0, scale: 0.9, y: 12}}
            animate={{opacity: 1, scale: 1, y: 0}}
            transition={{duration: 0.25, delay: index * 0.05}}>
            <Card className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
              <MediaPreview file={scan} />
            </Card>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent className='justify-center'>
            <PaginationItem>
              <PaginationPrevious
                href='#'
                onClick={handlePrevClick}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {getVisiblePages().map((p) =>
              p === "..." ? (
                <PaginationItem key={`dots-${currentPage}-${p}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={`page-${p}`}>
                  <PaginationLink
                    href='#'
                    data-page={String(p)}
                    onClick={handlePageClick}
                    isActive={currentPage === p}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href='#'
                onClick={handleNextClick}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
