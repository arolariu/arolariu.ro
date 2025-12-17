import {usePaginationWithSearch} from "@/hooks";
import {
  Button,
  Checkbox,
  Input,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useState} from "react";
import {TbDeselect, TbEdit, TbTrash} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Table display component for invoice scans.
 * Displays scans in a table format without media preview.
 * @returns JSX.Element that displays a table of invoice scans.
 */
export default function TableDisplay(): React.JSX.Element | null {
  const {submissions, renameSubmission, removeSubmissions} = useInvoiceCreator();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set<string>());
  const [query, setQuery] = useState<string>("");

  const shouldShowSearchAndPagination = submissions.length >= 10;

  const {paginatedItems, currentPage, totalPages, pageSize, setPageSize, setCurrentPage} = usePaginationWithSearch({
    items: submissions,
    initialPageSize: 10,
    searchQuery: query,
  });

  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedRows.has(item.id));
  const isSomePageSelected = paginatedItems.some((item) => selectedRows.has(item.id));

  const handleSelectAll = useCallback(() => {
    const newSelected = new Set(selectedRows);
    if (isAllPageSelected) {
      for (const item of paginatedItems) {
        newSelected.delete(item.id);
      }
    } else {
      for (const item of paginatedItems) {
        newSelected.add(item.id);
      }
    }
    setSelectedRows(newSelected);
  }, [isAllPageSelected, paginatedItems, selectedRows]);

  const handleSelectRow = useCallback(
    (id: string) => {
      const newSelected = new Set(selectedRows);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedRows(newSelected);
    },
    [selectedRows],
  );

  const handleBulkDelete = useCallback(() => {
    removeSubmissions(Array.from(selectedRows));
    setSelectedRows(new Set());
  }, [removeSubmissions, selectedRows]);

  const handleDeselectAll = useCallback(() => {
    setSelectedRows(new Set());
  }, [selectedRows]);

  const handleQueryChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setQuery(event.target.value);
  }, []);

  const handleRename = useCallback(
    (submission: {id: string; name: string}) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      renameSubmission(submission.id, submission.name);
      toast("Rename feature coming soon", {
        description: "This feature is currently under development.",
      });
    },
    [renameSubmission],
  );

  const handleDelete = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      removeSubmissions([id]);
    },
    [removeSubmissions],
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      setPageSize(Number(value));
      setCurrentPage(1);
    },
    [setPageSize, setCurrentPage],
  );

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
    (page: number) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setCurrentPage(page);
    },
    [setCurrentPage],
  );

  // Build visible pages with ellipses
  const getVisiblePages = useCallback(() => {
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
  }, [currentPage, totalPages]);

  if (submissions.length === 0) {
    return null;
  }

  return (
    <>
      <div className='mb-6 flex items-center justify-between gap-4'>
        {shouldShowSearchAndPagination ? (
          <>
            <div className='flex-1'>
              <Input
                value={query}
                onChange={handleQueryChange}
                placeholder='Search by filename...'
                className='border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                aria-label='Search uploads'
              />
            </div>
            <div className='shrink-0 text-sm text-gray-600 dark:text-gray-400'>
              {paginatedItems.length} of {submissions.length} shown
            </div>
          </>
        ) : null}
      </div>

      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.3}}
        className='rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-12 text-center'>
                <Checkbox
                  checked={isAllPageSelected || (isSomePageSelected && "indeterminate")}
                  onCheckedChange={handleSelectAll}
                  aria-label='Select all'
                />
              </TableHead>
              <TableHead className='w-12 text-center'>#</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item, index) => (
              <TableRow
                key={item.id}
                className={item.isProcessing ? "bg-purple-50/50 opacity-50 dark:bg-purple-950/20" : ""}
                data-state={selectedRows.has(item.id) ? "selected" : undefined}>
                <TableCell className='text-center'>
                  <Checkbox
                    checked={selectedRows.has(item.id)}
                    onCheckedChange={() => handleSelectRow(item.id)}
                    aria-label={`Select ${item.name}`}
                  />
                </TableCell>
                <TableCell className='font-medium'>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                <TableCell className='max-w-xs truncate font-medium'>
                  <div className='flex items-center gap-2'>
                    {item.isProcessing ? (
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent' />
                    ) : null}
                    <span>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      item.type === "pdf"
                        ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}>
                    {item.type.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell>{(item.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                <TableCell>
                  {item.uploadedAt.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <div className='flex justify-end gap-2'>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 w-8 cursor-pointer p-0'
                            onClick={handleRename(item)}
                            disabled={item.isProcessing}>
                            <TbEdit className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Rename file</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-8 w-8 cursor-pointer p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300'
                            onClick={handleDelete(item.id)}
                            disabled={item.isProcessing}>
                            <TbTrash className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete file</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      {/* Pagination Controls */}
      {shouldShowSearchAndPagination ? (
        <div className='mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row'>
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={handlePageSizeChange}>
              <SelectTrigger className='h-8 w-20'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='10'>10</SelectItem>
                <SelectItem value='20'>20</SelectItem>
                <SelectItem value='50'>50</SelectItem>
                <SelectItem value='100'>100</SelectItem>
              </SelectContent>
            </Select>
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

                {(() => {
                  const visiblePages = getVisiblePages();
                  return visiblePages.map((p, idx) =>
                    p === "..." ? (
                      <PaginationItem
                        // eslint-disable-next-line react/no-array-index-key -- Ellipsis placeholders have no stable identifier and their position is deterministic within the pagination range
                        key={`ellipsis-${idx}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={`page-${p}`}>
                        <PaginationLink
                          href='#'
                          onClick={handlePageClick(p as number)}
                          isActive={currentPage === p}>
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  );
                })()}

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
        </div>
      ) : null}

      {/* Bulk Actions Footer */}
      {selectedRows.size > 1 && (
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: 20}}
          className='fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900'>
          <span className='text-sm font-medium text-gray-900 dark:text-white'>{selectedRows.size} items selected</span>
          <div className='h-4 w-px bg-gray-200 dark:bg-gray-700' />
          <Button
            variant='destructive'
            size='sm'
            onClick={handleBulkDelete}
            className='flex items-center gap-2'>
            <TbTrash className='h-4 w-4' />
            Delete Selected
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleDeselectAll}
            className='flex items-center gap-2'>
            <TbDeselect className='h-4 w-4' />
            Deselect All
          </Button>
        </motion.div>
      )}
    </>
  );
}
