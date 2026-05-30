"use client";

import {formatCurrency, formatDate, formatEnum} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import {InvoiceCategory, type Invoice} from "@/types/invoices";
import {
  Badge,
  Button,
  Checkbox,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {useCallback} from "react";
import {TbEye, TbReceipt} from "react-icons/tb";
import EmptyState from "../../../_components/EmptyState";
import styles from "./TableView.module.scss";
import TableViewActions from "./TableViewActions";

type Props = Readonly<{
  invoices: ReadonlyArray<Invoice> | Invoice[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePageSizeChange: (size: number) => void;
  sortBy: "date" | "amount" | "name" | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (field: "date" | "amount" | "name") => void;
}>;

export const TableView = (props: Readonly<Props>): React.JSX.Element => {
  const locale = useLocale();
  const t = useTranslations();
  const {invoices, currentPage, pageSize, totalPages, handlePrevPage, handleNextPage, handlePageSizeChange, sortBy, sortDirection, onSort} =
    props;

  /** Sorts the invoice table by the merchant name column. */
  const handleSortByName = useCallback(() => onSort("name"), [onSort]);

  /** Sorts the invoice table by the transaction date column. */
  const handleSortByDate = useCallback(() => onSort("date"), [onSort]);

  /** Sorts the invoice table by the total amount column. */
  const handleSortByAmount = useCallback(() => onSort("amount"), [onSort]);
  const selectedInvoices = useInvoicesStore((state) => state.selectedEntities);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedEntities);

  const handleSelectInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (!invoice) return;

      const isSelected = selectedInvoices.some((inv) => inv.id === invoiceId);
      if (isSelected) {
        setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoiceId));
      } else {
        setSelectedInvoices([...selectedInvoices, invoice]);
      }
    },
    [invoices, selectedInvoices, setSelectedInvoices],
  );

  const handleSelectAllInvoices = useCallback(() => {
    const allPageInvoicesSelected = invoices.every((invoice) => selectedInvoices.some((selected) => selected.id === invoice.id));

    if (allPageInvoicesSelected) {
      const pageInvoiceIds = new Set(invoices.map((inv) => inv.id));
      setSelectedInvoices(selectedInvoices.filter((inv) => !pageInvoiceIds.has(inv.id)));
    } else {
      const newSelection = [...selectedInvoices];
      invoices.forEach((invoice) => {
        if (!newSelection.some((selected) => selected.id === invoice.id)) {
          newSelection.push(invoice);
        }
      });
      setSelectedInvoices(newSelection);
    }
  }, [invoices, selectedInvoices, setSelectedInvoices]);

  /**
   * Handle key down events for sortable headers (accessibility).
   *
   * @remarks
   * Defined BEFORE the empty-state early return below so React's hook count
   * stays constant across renders. Moving this `useCallback` past the early
   * return broke Rules of Hooks when the parent re-rendered from
   * `invoices=[stale]` (IndexedDB-hydrated Zustand state) to `invoices=[]`
   * (server returned no rows), which threw
   * "Rendered fewer hooks than expected". See TableView.test.tsx for the
   * pinned regression.
   */
  const handleSortKeyDown = useCallback(
    (e: React.KeyboardEvent, field: "date" | "amount" | "name") => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSort(field);
      }
    },
    [onSort],
  );

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<TbReceipt className={styles["emptyIcon"]} />}
        title={t((m) => m.pages.invoices.viewInvoices.tableView.empty.title)}
        description={t((m) => m.pages.invoices.viewInvoices.tableView.empty.description)}
        primaryAction={{
          label: t((m) => m.pages.invoices.viewInvoices.tableView.empty.uploadCta),
          href: "/domains/invoices/upload-scans",
        }}
      />
    );
  }

  const selectedCountOnPage = invoices.filter((inv) => selectedInvoices.some((s) => s.id === inv.id)).length;
  const isAllSelected = invoices.length > 0 && selectedCountOnPage === invoices.length;
  const isIndeterminate = selectedCountOnPage > 0 && selectedCountOnPage < invoices.length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={styles["printHidden"]}>
            <Checkbox
              nativeButton
              className={styles["frostedCheckbox"]}
              checked={isAllSelected || (isIndeterminate && "indeterminate")}
              onCheckedChange={handleSelectAllInvoices}
              aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.aria.selectAllInvoices)}
            />
          </TableHead>
          <TableHead
            className={`${styles["tableHeaderCell"]} ${styles["sortableHeader"]}`}
            onClick={handleSortByName}
            role='columnheader'
            aria-sort={sortBy === "name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            tabIndex={0}
            // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
            onKeyDown={(e) => handleSortKeyDown(e, "name")}>
            {t((m) => m.pages.invoices.viewInvoices.tableView.columns.invoice)}
            <span
              className={`${styles["sortArrow"]} ${sortBy === "name" && sortDirection ? "" : styles["sortArrowInactive"]}`}
              aria-hidden='true'>
              {sortBy === "name" && sortDirection === "desc" ? "\u25BC" : "\u25B2"}
            </span>
          </TableHead>
          <TableHead>{t((m) => m.pages.invoices.viewInvoices.tableView.columns.category)}</TableHead>
          <TableHead
            className={`${styles["tableHeaderCell"]} ${styles["sortableHeader"]}`}
            onClick={handleSortByDate}
            role='columnheader'
            aria-sort={sortBy === "date" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            tabIndex={0}
            // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
            onKeyDown={(e) => handleSortKeyDown(e, "date")}>
            {t((m) => m.pages.invoices.viewInvoices.tableView.columns.date)}
            <span
              className={`${styles["sortArrow"]} ${sortBy === "date" && sortDirection ? "" : styles["sortArrowInactive"]}`}
              aria-hidden='true'>
              {sortBy === "date" && sortDirection === "desc" ? "\u25BC" : "\u25B2"}
            </span>
          </TableHead>
          <TableHead
            className={`${styles["tableHeaderCell"]} ${styles["sortableHeader"]}`}
            onClick={handleSortByAmount}
            role='columnheader'
            aria-sort={sortBy === "amount" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
            tabIndex={0}
            // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
            onKeyDown={(e) => handleSortKeyDown(e, "amount")}>
            {t((m) => m.pages.invoices.viewInvoices.tableView.columns.amount)}
            <span
              className={`${styles["sortArrow"]} ${sortBy === "amount" && sortDirection ? "" : styles["sortArrowInactive"]}`}
              aria-hidden='true'>
              {sortBy === "amount" && sortDirection === "desc" ? "\u25BC" : "\u25B2"}
            </span>
          </TableHead>
          <TableHead className={styles["actionsHeader"]}>{t((m) => m.pages.invoices.viewInvoices.tableView.columns.actions)}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className={styles["printHidden"]}>
              <Checkbox
                nativeButton
                checked={selectedInvoices.some((s) => s.id === invoice.id)}
                // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                onCheckedChange={() => handleSelectInvoice(invoice.id)}
                aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.aria.selectInvoice, {name: invoice.name || invoice.id})}
              />
            </TableCell>
            <TableCell>
              <span className={styles["printInline"]}>{invoice.name.length > 0 ? invoice.name : invoice.id}</span>
              <span className={styles["printOnly"]}>{invoice.id}</span>
            </TableCell>
            <TableCell>
              <Badge variant={invoice.category % 200 === 0 ? "default" : "secondary"}>
                {formatEnum(InvoiceCategory, invoice.category) || "NOT_DEFINED"}
              </Badge>
            </TableCell>
            <TableCell>
              {invoice.paymentInformation?.transactionDate ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className={styles["cursorHelp"]}>{formatDate(invoice.paymentInformation.transactionDate, {locale})}</span>
                      }
                    />
                    <TooltipContent>
                      <p>{new Date(invoice.paymentInformation.transactionDate).toUTCString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger render={<Badge variant='outline'>N/A</Badge>} />
                    <TooltipContent>
                      <p>{t((m) => m.pages.invoices.viewInvoices.tableView.tooltips.notAnalyzed)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </TableCell>
            <TableCell>
              {formatCurrency(invoice.paymentInformation.totalCostAmount, {
                locale,
                currencyCode: invoice.paymentInformation.currency.code,
              })}
            </TableCell>
            <TableCell className={styles["actionsCell"]}>
              <div className={styles["actionsRow"]}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      className={styles["viewTrigger"]}
                      render={
                        <Link
                          href={`/domains/invoices/view-invoice/${invoice.id}`}
                          className={styles["viewLink"]}>
                          <TbEye className={styles["viewIcon"]} />
                        </Link>
                      }
                    />
                    <TooltipContent>{t((m) => m.pages.invoices.viewInvoices.tableView.viewInvoice)}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TableViewActions invoice={invoice} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {totalPages > 1 && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>
              <div className={styles["footerContent"]}>
                <span className={styles["footerLabel"]}>{t((m) => m.pages.invoices.viewInvoices.tableView.rowsPerPage)}</span>
                <Select
                  value={String(pageSize)}
                  // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                  onValueChange={(value) => handlePageSizeChange(Number(value))}>
                  <SelectTrigger
                    className={styles["pageSizeTrigger"]}
                    aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.aria.rowsPerPage)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100, 500, 1000].map((size) => (
                      <SelectItem
                        key={size}
                        value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={styles["footerLabel"]}>
                  {t((m) => m.pages.invoices.viewInvoices.tableView.pageOf, {current: String(currentPage), total: String(totalPages)})}
                </span>
              </div>
            </TableCell>
            <TableCell
              colSpan={1}
              className={styles["paginationButtonsCell"]}>
              <Button
                variant='outline'
                className={styles["paginationButton"]}
                size='sm'
                onClick={handlePrevPage}
                disabled={invoices.length === 0}>
                {t((m) => m.pages.invoices.viewInvoices.tableView.previousPage)}
              </Button>
            </TableCell>
            <TableCell>
              <Button
                variant='outline'
                className={styles["paginationButton"]}
                size='sm'
                onClick={handleNextPage}
                disabled={invoices.length === 0}>
                {t((m) => m.pages.invoices.viewInvoices.tableView.nextPage)}
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};
