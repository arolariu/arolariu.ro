import {formatCurrency, formatDate} from "@/lib/utils.generic";
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
import {useLocale, useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback, useMemo, useState} from "react";
import {TbArrowDown, TbArrowsUpDown, TbArrowUp, TbEye, TbReceipt} from "react-icons/tb";
import EmptyState from "../../../_components/EmptyState";
import styles from "./TableView.module.scss";
import TableViewActions from "./TableViewActions";

type SortField = "date" | "amount" | "name" | "category" | null;
type SortDirection = "asc" | "desc";

type Props = Readonly<{
  invoices: ReadonlyArray<Invoice> | Invoice[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePageSizeChange: (size: number) => void;
}>;

export const TableView = (props: Readonly<Props>): React.JSX.Element => {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoices.tableView");
  const {invoices, currentPage, pageSize, totalPages, handlePrevPage, handleNextPage, handlePageSizeChange} = props;
  const selectedInvoices = useInvoicesStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedInvoices);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField],
  );

  const sortedInvoices = useMemo(() => {
    if (!sortField) return invoices.toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return invoices.toSorted((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison =
            new Date(a.paymentInformation?.transactionDate ?? a.createdAt).getTime()
            - new Date(b.paymentInformation?.transactionDate ?? b.createdAt).getTime();
          break;
        case "amount":
          comparison = (a.paymentInformation?.totalCostAmount ?? 0) - (b.paymentInformation?.totalCostAmount ?? 0);
          break;
        case "name":
          comparison = (a.name ?? "").localeCompare(b.name ?? "");
          break;
        case "category":
          comparison = a.category - b.category;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [invoices, sortField, sortDirection]);

  const getSortIcon = useCallback(
    (field: SortField): React.JSX.Element => {
      if (sortField !== field) return <TbArrowsUpDown className={styles["sortIcon"]} />;
      return sortDirection === "asc" ? <TbArrowUp className={styles["sortIcon"]} /> : <TbArrowDown className={styles["sortIcon"]} />;
    },
    [sortField, sortDirection],
  );

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

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<TbReceipt className={styles["emptyIcon"]} />}
        title={t("empty.title")}
        description={t("empty.description")}
        primaryAction={{
          label: t("empty.uploadCta"),
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
              className={styles["frostedCheckbox"]}
              checked={isAllSelected || (isIndeterminate && "indeterminate")}
              onCheckedChange={handleSelectAllInvoices}
              aria-label={t("aria.selectAllInvoices")}
            />
          </TableHead>
          <TableHead>{t("columns.invoice")}</TableHead>
          <TableHead>{t("columns.category")}</TableHead>
          <TableHead>
            <Button
              variant='ghost'
              className={styles["sortButton"]}
              onClick={() => handleSort("date")}>
              {t("columns.date")}
              {getSortIcon("date")}
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant='ghost'
              className={styles["sortButton"]}
              onClick={() => handleSort("amount")}>
              {t("columns.amount")}
              {getSortIcon("amount")}
            </Button>
          </TableHead>
          <TableHead className={styles["actionsHeader"]}>{t("columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedInvoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className={styles["printHidden"]}>
              <Checkbox
                checked={selectedInvoices.some((s) => s.id === invoice.id)}
                // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                onCheckedChange={() => handleSelectInvoice(invoice.id)}
                aria-label={t("aria.selectInvoice", {name: invoice.name || invoice.id})}
              />
            </TableCell>
            <TableCell>
              <span className={styles["printInline"]}>{invoice.name.length > 0 ? invoice.name : invoice.id}</span>
              <span className={styles["printOnly"]}>{invoice.id}</span>
            </TableCell>
            <TableCell>
              <Badge variant={invoice.category % 200 === 0 ? "default" : "secondary"}>{InvoiceCategory[invoice.category]}</Badge>
            </TableCell>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span className={styles["cursorHelp"]}>{formatDate(invoice.createdAt, {locale})} </span>} />
                  <TooltipContent>
                    <p>{new Date(invoice.createdAt).toUTCString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                    <TooltipContent>{t("viewInvoice")}</TooltipContent>
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
                <span className={styles["footerLabel"]}>{t("rowsPerPage")}</span>
                <Select
                  value={String(pageSize)}
                  // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                  onValueChange={(value) => handlePageSizeChange(Number(value))}>
                  <SelectTrigger
                    className={styles["pageSizeTrigger"]}
                    aria-label={t("aria.rowsPerPage")}>
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
                <span className={styles["footerLabel"]}>{t("pageOf", {current: String(currentPage), total: String(totalPages)})}</span>
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
                {t("previousPage")}
              </Button>
            </TableCell>
            <TableCell>
              <Button
                variant='outline'
                className={styles["paginationButton"]}
                size='sm'
                onClick={handleNextPage}
                disabled={invoices.length === 0}>
                {t("nextPage")}
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};
