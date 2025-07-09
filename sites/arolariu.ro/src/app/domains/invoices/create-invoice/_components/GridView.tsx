/** @format */

import {usePaginationWithSearch} from "@/hooks/usePagination";
import {Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious} from "@arolariu/components";
import {useCallback} from "react";
import type {InvoiceScan} from "../_types/InvoiceScan";
import {MediaPreview} from "./MediaPreview";

type Props = {
  scans: InvoiceScan[];
  handleDelete: (index: number) => void;
  handleRotate: (index: number) => void;
};

const IMAGES_PER_PAGE = 9;

/**
 * Component to render a grid view of images with pagination.
 * @returns The JSX for the grid view.
 */
export function GridView({scans, handleDelete, handleRotate}: Readonly<Props>) {
  const {paginatedItems, currentPage, setCurrentPage, totalPages, pageSize} = usePaginationWithSearch({
    items: scans,
    initialPageSize: IMAGES_PER_PAGE,
    initialPage: 1,
  });

  // Memoized scan renderer to prevent unnecessary re-renders
  const renderGridItems = useCallback(() => {
    return paginatedItems.map((scan, idx) => {
      // Calculate the actual index in the original array
      const actualIndex = (currentPage - 1) * pageSize + idx;

      return (
        <div
          key={`scan-${scan.id}`}
          className='relative aspect-square overflow-hidden rounded-lg border'>
          <MediaPreview
            scan={scan}
            index={actualIndex}
            onRotate={handleRotate}
            onDelete={handleDelete}
          />
        </div>
      );
    });
  }, [paginatedItems, currentPage, pageSize, handleDelete, handleRotate]);

  // Navigation handlers
  const handlePrevPage = useCallback(() => {
    setCurrentPage(Math.max(1, currentPage - 1));
  }, [currentPage, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, setCurrentPage]);

  return (
    <div className='flex flex-col space-y-4'>
      {/* Grid layout */}
      <div className='grid min-h-[400px] grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3'>
        {/* Render current page scans */}
        {renderGridItems()}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination className='mx-auto'>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href='#'
                onClick={(e) => {
                  e.preventDefault();
                  handlePrevPage();
                }}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            <PaginationItem className='flex items-center px-2'>
              Page {currentPage} of {totalPages}
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href='#'
                onClick={(e) => {
                  e.preventDefault();
                  handleNextPage();
                }}
                aria-disabled={currentPage >= totalPages}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
