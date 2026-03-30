"use client";

// TODO: refactor.
/* eslint-disable no-console -- TODO: replace console.log with proper logging */

import {usePaginationWithSearch} from "@/hooks";
import {formatDate} from "@/lib/utils.generic";
import type {Invoice, Merchant} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {TbArrowsUpDown, TbCalendar, TbDownload, TbSearch} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./MerchantReceiptsDialog.module.scss";

/**
 * Dialog displaying all receipts/invoices from a specific merchant with filtering.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Features**:
 * - **Search**: Filter receipts by text search
 * - **Date Filter**: Filter by time period (dropdown selector)
 * - **Sort**: Order receipts by various criteria
 * - **Pagination**: Navigate large receipt lists
 * - **Export**: Download option for filtered results (placeholder)
 *
 * **Table Columns**:
 * Displays receipt date, amount, and other relevant details in a
 * paginated table format.
 *
 * **Data Fetching**: Currently uses mock data with 3-second simulated delay.
 * TODO: Implement real API call to fetch receipts by merchant ID.
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_MERCHANT_INVOICES`
 * type. Payload contains the `Merchant` object for context.
 *
 * **Layout**: Extra-wide dialog (`sm:max-w-4xl lg:max-w-7xl`) to accommodate
 * table with multiple columns and filtering controls.
 *
 * **Domain Context**: Enables cross-invoice navigation within the edit-invoice
 * flow, helping users analyze spending patterns at specific merchants.
 *
 * @returns Client-rendered dialog with filterable receipts table
 *
 * @example
 * ```tsx
 * // Opened via MerchantCard "View All Receipts" button:
 * const {open} = useDialog("INVOICE_MERCHANT_INVOICES", "view", merchant);
 * <Button onClick={open}>View All Receipts</Button>
 * ```
 *
 * @see {@link MerchantCard} - Parent component that opens this dialog
 * @see {@link usePaginationWithSearch} - Pagination and search hook
 * @see {@link Merchant} - Merchant type definition
 */
export default function MerchantReceiptsDialog(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.EditInvoice.merchantReceiptsDialog");
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__MERCHANT_INVOICES");
  const merchant = payload as Merchant | null;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [receipts, setReceipts] = useState<Invoice[]>([]);
  const {paginatedItems, resetPagination, currentPage, totalPages, setCurrentPage} = usePaginationWithSearch({
    items: receipts,
    initialPageSize: 10,
    searchQuery,
  });

  useEffect(() => {
    // Fetch receipts from the server or API
    // For now, we'll use a timeout of 3 sec and do mock invoices
    setTimeout(() => {
      setReceipts([]);
    }, 3000);
  }, [payload]);

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    console.log("Selected date filter:", value);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    console.log("Selected sort option:", value);
    resetPagination();
  };

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title", {merchant: merchant?.name ?? ""})}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className={styles["body"]}>
          <div className={styles["filterRow"]}>
            <div className={styles["searchWrapper"]}>
              <TbSearch className={styles["searchIcon"]} />
              <Input
                placeholder={t("searchPlaceholder")}
                className={styles["searchInput"]}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles["filterControls"]}>
              <div className={styles["selectWrapper"]}>
                <Select onValueChange={handleDateFilterChange}>
                  <SelectTrigger>
                    <TbCalendar className={styles["filterIcon"]} />
                    <SelectValue placeholder={t("filters.date")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>{t("dateOptions.allTime")}</SelectItem>
                    <SelectItem value='30days'>{t("dateOptions.last30Days")}</SelectItem>
                    <SelectItem value='90days'>{t("dateOptions.last90Days")}</SelectItem>
                    <SelectItem value='thisYear'>{t("dateOptions.thisYear")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={styles["selectWrapper"]}>
                <Select onValueChange={handleSortChange}>
                  <SelectTrigger>
                    <TbArrowsUpDown className={styles["filterIcon"]} />
                    <SelectValue placeholder={t("filters.sort")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='date-desc'>{t("sortOptions.newest")}</SelectItem>
                    <SelectItem value='date-asc'>{t("sortOptions.oldest")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className={styles["tableOuter"]}>
            <div className={styles["tableScroll"]}>
              <Table>
                <TableHeader>
                  <TableRow className={styles["headerRow"]}>
                    <TableHead className={styles["tableHeader"]}>{t("table.receipt")}</TableHead>
                    <TableHead className={styles["tableHeader"]}>{t("table.date")}</TableHead>
                    <TableHead className={styles["tableHeaderRight"]}>{t("table.itemsCount")}</TableHead>
                    <TableHead className={styles["tableHeaderRight"]}>{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={styles["tableBody"]}>
                  {paginatedItems.map((item) => {
                    const invoiceDate = formatDate(item.paymentInformation?.transactionDate || item.createdAt, {locale});
                    return (
                      <TableRow
                        key={item.id}
                        className={styles["dataRow"]}>
                        <TableCell className={styles["cellBold"]}>{item.name}</TableCell>
                        <TableCell className={styles["cell"]}>{invoiceDate}</TableCell>
                        <TableCell className={styles["cellRight"]}>{item.items.length}</TableCell>
                        <TableCell className={styles["cellRight"]}>
                          <Button
                            variant='ghost'
                            size='sm'>
                            <TbDownload className={styles["downloadIcon"]} />
                            {t("table.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableHead className={styles["tableHeader"]}>
                      {t("footer.receiptsFound", {count: String(receipts.length), showing: String(paginatedItems.length)})}
                    </TableHead>
                    <TableCell
                      className={styles["tableHeaderRight"]}
                      colSpan={2}>
                      {t("footer.page", {current: String(currentPage), total: String(totalPages)})}
                    </TableCell>
                    <TableCell
                      className={styles["tableHeaderRight"]}
                      colSpan={2}>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}>
                        {t("buttons.previous")}
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}>
                        {t("buttons.next")}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
