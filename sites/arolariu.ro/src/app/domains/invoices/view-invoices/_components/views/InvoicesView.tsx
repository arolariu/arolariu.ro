"use client";

import {usePaginationWithSearch} from "@/hooks";
import type {Invoice} from "@/types/invoices";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useWindowSize,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbCards, TbCategory, TbClock, TbFilter, TbMoon, TbSearch, TbSun, TbTable} from "react-icons/tb";
import {GridView} from "../tables/GridView";
import {TableView} from "../tables/TableView";
import styles from "./InvoicesView.module.scss";

type FiltersType = {category: string; time: string};

type Props = {
  invoices: ReadonlyArray<Invoice>;
};

/**
 * The RenderInvoicesView component displays a list of invoices with search and filter functionality.
 * It allows users to switch between table and grid views.
 * @param invoices The list of invoices to display.
 * @returns The RenderInvoicesView component, CSR'ed.
 */
export default function RenderInvoicesView({invoices}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.invoicesView");
  const {isMobile} = useWindowSize();
  const [view, setView] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FiltersType>({category: "all", time: "all"});
  const {paginatedItems, resetPagination, currentPage, totalPages, setCurrentPage, setPageSize, pageSize} =
    usePaginationWithSearch<Invoice>({
      items: invoices,
      initialPageSize: 10,
      searchQuery,
    });

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      resetPagination();
    },
    [resetPagination],
  );

  const handleFilters = useCallback(
    (value: string) => {
      if (
        value === "all"
        || value === "groceries"
        || value === "dining"
        || value === "utilities"
        || value === "entertainment"
        || value === "travel"
        || value === "other"
      ) {
        setFilters((prev) => ({...prev, category: value}));
      } else if (value === "day" || value === "night") {
        setFilters((prev) => ({...prev, time: value}));
      }
      resetPagination();
    },
    [resetPagination],
  );

  const handleNextPage = useCallback(
    () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [currentPage, totalPages],
  );

  const handlePrevPage = useCallback(
    () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [currentPage],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [],
  );

  const viewContent =
    view === "table" ? (
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
      <div className={styles["toolbar"]}>
        <div className={styles["searchWrapper"]}>
          <TbSearch className={styles["searchIcon"]} />
          <Input
            placeholder={t("searchPlaceholder")}
            className='pl-8'
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <div className={styles["filtersRow"]}>
          <Select
            value={filters.category}
            onValueChange={handleFilters}>
            <SelectTrigger className='w-[150px] cursor-pointer'>
              <div className={styles["filterTriggerContent"]}>
                <TbCategory className={styles["filterIcon"]} />
                <span>{t("filters.category")}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                className='cursor-pointer'
                value='all'>
                {t("categories.all")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='groceries'>
                {t("categories.groceries")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='dining'>
                {t("categories.dining")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='utilities'>
                {t("categories.utilities")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='entertainment'>
                {t("categories.entertainment")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='travel'>
                {t("categories.travel")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='other'>
                {t("categories.other")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.time}
            onValueChange={handleFilters}>
            <SelectTrigger className='w-[150px] cursor-pointer'>
              <div className={styles["filterTriggerContent"]}>
                <TbClock className={styles["filterIcon"]} />
                <span>{t("filters.timeOfDay")}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                className='cursor-pointer'
                value='all'>
                {t("times.all")}
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='day'>
                <div className={styles["filterTriggerContent"]}>
                  <TbSun className={styles["sunIcon"]} />
                  <span>{t("times.day")}</span>
                </div>
              </SelectItem>
              <SelectItem
                className='cursor-pointer'
                value='night'>
                <div className={styles["filterTriggerContent"]}>
                  <TbMoon className={styles["moonIcon"]} />
                  <span>{t("times.night")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='cursor-pointer gap-1'>
                  <TbFilter className={styles["filterIcon"]} />
                </Button>
              </SheetTrigger>
              <SheetContent>{t("placeholderPanel")}</SheetContent>
            </Sheet>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='cursor-pointer gap-1'>
                  <TbFilter className={styles["filterIcon"]} />
                </Button>
              </PopoverTrigger>
              <PopoverContent>{t("placeholderPanel")}</PopoverContent>
            </Popover>
          )}

          <div className={styles["viewToggle"]}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className='cursor-pointer'>
                  <Button
                    variant={view === "table" ? "default" : "ghost"}
                    size='sm'
                    className='rounded-r-none'
                    // eslint-disable-next-line react/jsx-no-bind -- small fn
                    onClick={() => setView("table")}>
                    <TbTable className={styles["filterIcon"]} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("viewModes.table")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className='cursor-pointer'>
                  <Button
                    variant={view === "grid" ? "default" : "ghost"}
                    size='sm'
                    className='rounded-l-none'
                    // eslint-disable-next-line react/jsx-no-bind -- small fn
                    onClick={() => setView("grid")}>
                    <TbCards className={styles["filterIcon"]} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("viewModes.grid")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      {viewContent}
    </div>
  );
}
