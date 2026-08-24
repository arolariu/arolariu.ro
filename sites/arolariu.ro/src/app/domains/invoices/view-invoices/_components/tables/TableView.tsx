"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import {type Invoice} from "@/types/invoices";
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

type SortField = "date" | "amount" | "name";
type SortDirection = "asc" | "desc" | null;

/**
 * Resolves the accessible sort state for a table column.
 *
 * @param activeField - Currently sorted field.
 * @param direction - Current sort direction.
 * @param field - Column field being rendered.
 * @returns The matching ARIA sort state.
 */
function getAriaSort(activeField: SortField | null, direction: SortDirection, field: SortField): "ascending" | "descending" | "none" {
  if (activeField !== field) return "none";
  return direction === "asc" ? "ascending" : "descending";
}

/**
 * Resolves the visible sort arrow for a table column.
 *
 * @param activeField - Currently sorted field.
 * @param direction - Current sort direction.
 * @param field - Column field being rendered.
 * @returns An upward or downward arrow.
 */
function getSortArrow(activeField: SortField | null, direction: SortDirection, field: SortField): string {
  if (activeField === field && direction === "desc") return "\u25BC";
  return "\u25B2";
}

/**
 * Toggles one invoice in the selected invoice collection.
 *
 * @param invoices - Invoices visible on the current page.
 * @param selectedInvoices - Existing global selection.
 * @param invoiceId - Invoice identifier to toggle.
 * @returns Updated selection, or `null` when the invoice is not on the page.
 */
function toggleInvoiceSelection(
  invoices: ReadonlyArray<Invoice>,
  selectedInvoices: ReadonlyArray<Invoice>,
  invoiceId: string,
): Invoice[] | null {
  const invoice = invoices.find((candidate) => candidate.id === invoiceId);
  if (!invoice) return null;
  if (selectedInvoices.some((selected) => selected.id === invoiceId)) {
    return selectedInvoices.filter((selected) => selected.id !== invoiceId);
  }
  return [...selectedInvoices, invoice];
}

/**
 * Toggles selection for every invoice on the current page.
 *
 * @param invoices - Invoices visible on the current page.
 * @param selectedInvoices - Existing global selection.
 * @returns Updated global selection.
 */
function togglePageSelection(invoices: ReadonlyArray<Invoice>, selectedInvoices: ReadonlyArray<Invoice>): Invoice[] {
  const allPageInvoicesSelected = invoices.every((invoice) => selectedInvoices.some((selected) => selected.id === invoice.id));
  if (allPageInvoicesSelected) {
    const pageInvoiceIds = new Set(invoices.map((invoice) => invoice.id));
    return selectedInvoices.filter((invoice) => !pageInvoiceIds.has(invoice.id));
  }

  const selectionById = new Map(selectedInvoices.map((invoice) => [invoice.id, invoice]));
  for (const invoice of invoices) {
    selectionById.set(invoice.id, invoice);
  }
  return [...selectionById.values()];
}

type InvoiceTableRowProps = {
  readonly invoice: Invoice;
  readonly isSelected: boolean;
  readonly onSelectInvoice: (invoiceId: string) => void;
};

/**
 * Renders one selectable invoice table row.
 *
 * @param props - Invoice data and selection callback.
 * @returns A table row preserving the desktop and print presentation.
 */
function InvoiceTableRow({invoice, isSelected, onSelectInvoice}: Readonly<InvoiceTableRowProps>): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const handleCheckedChange = useCallback(() => {
    onSelectInvoice(invoice.id);
  }, [invoice.id, onSelectInvoice]);

  return (
    <TableRow>
      <TableCell className={styles["printHidden"]}>
        <Checkbox
          nativeButton
          checked={isSelected}
          onCheckedChange={handleCheckedChange}
          aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.aria.selectInvoice, {name: invoice.name || invoice.id})}
        />
      </TableCell>
      <TableCell>
        <span className={styles["printInline"]}>{invoice.name.length > 0 ? invoice.name : invoice.id}</span>
        <span className={styles["printOnly"]}>{invoice.id}</span>
      </TableCell>
      <TableCell>
        <Badge variant='outline'>{invoice.classification?.officialLabel ?? "Unclassified"}</Badge>
      </TableCell>
      <TableCell>
        {invoice.paymentInformation?.transactionDate ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<span className={styles["cursorHelp"]}>{formatDate(invoice.paymentInformation.transactionDate, {locale})}</span>}
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
  );
}

export const TableView = (props: Readonly<Props>): React.JSX.Element => {
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
      const nextSelection = toggleInvoiceSelection(invoices, selectedInvoices, invoiceId);
      if (nextSelection) setSelectedInvoices(nextSelection);
    },
    [invoices, selectedInvoices, setSelectedInvoices],
  );

  const handleSelectAllInvoices = useCallback(() => {
    setSelectedInvoices(togglePageSelection(invoices, selectedInvoices));
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
    (e: React.KeyboardEvent, field: SortField) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSort(field);
      }
    },
    [onSort],
  );

  const handleSortNameKeyDown = useCallback((event: React.KeyboardEvent) => handleSortKeyDown(event, "name"), [handleSortKeyDown]);
  const handleSortDateKeyDown = useCallback((event: React.KeyboardEvent) => handleSortKeyDown(event, "date"), [handleSortKeyDown]);
  const handleSortAmountKeyDown = useCallback((event: React.KeyboardEvent) => handleSortKeyDown(event, "amount"), [handleSortKeyDown]);
  const handlePageSizeValueChange = useCallback(
    (value: string) => {
      handlePageSizeChange(Number(value));
    },
    [handlePageSizeChange],
  );

  // Early return with empty state when no invoices are present, to avoid rendering the table structure.
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
            aria-sort={getAriaSort(sortBy, sortDirection, "name")}
            tabIndex={0}
            onKeyDown={handleSortNameKeyDown}>
            {t((m) => m.pages.invoices.viewInvoices.tableView.columns.invoice)}
            <span
              className={`${styles["sortArrow"]} ${sortBy === "name" && sortDirection ? "" : styles["sortArrowInactive"]}`}
              aria-hidden='true'>
              {getSortArrow(sortBy, sortDirection, "name")}
            </span>
          </TableHead>
          <TableHead>{t((m) => m.pages.invoices.viewInvoices.tableView.columns.category)}</TableHead>
          <TableHead
            className={`${styles["tableHeaderCell"]} ${styles["sortableHeader"]}`}
            onClick={handleSortByDate}
            role='columnheader'
            aria-sort={getAriaSort(sortBy, sortDirection, "date")}
            tabIndex={0}
            onKeyDown={handleSortDateKeyDown}>
            {t((m) => m.pages.invoices.viewInvoices.tableView.columns.date)}
            <span
              className={`${styles["sortArrow"]} ${sortBy === "date" && sortDirection ? "" : styles["sortArrowInactive"]}`}
              aria-hidden='true'>
              {getSortArrow(sortBy, sortDirection, "date")}
            </span>
          </TableHead>
          <TableHead
            className={`${styles["tableHeaderCell"]} ${styles["sortableHeader"]}`}
            onClick={handleSortByAmount}
            role='columnheader'
            aria-sort={getAriaSort(sortBy, sortDirection, "amount")}
            tabIndex={0}
            onKeyDown={handleSortAmountKeyDown}>
            {t((m) => m.pages.invoices.viewInvoices.tableView.columns.amount)}
            <span
              className={`${styles["sortArrow"]} ${sortBy === "amount" && sortDirection ? "" : styles["sortArrowInactive"]}`}
              aria-hidden='true'>
              {getSortArrow(sortBy, sortDirection, "amount")}
            </span>
          </TableHead>
          <TableHead className={styles["actionsHeader"]}>{t((m) => m.pages.invoices.viewInvoices.tableView.columns.actions)}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <InvoiceTableRow
            key={invoice.id}
            invoice={invoice}
            isSelected={selectedInvoices.some((selected) => selected.id === invoice.id)}
            onSelectInvoice={handleSelectInvoice}
          />
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
                  onValueChange={handlePageSizeValueChange}>
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
