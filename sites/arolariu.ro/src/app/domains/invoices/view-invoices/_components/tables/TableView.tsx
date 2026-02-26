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
import {useCallback} from "react";
import {TbArrowsUpDown, TbEye} from "react-icons/tb";
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
}>;

export const TableView = (props: Readonly<Props>): React.JSX.Element => {
  const locale = useLocale();
  const t = useTranslations("Domains.services.invoices.ui.tableView");
  const {invoices, currentPage, pageSize, totalPages, handlePrevPage, handleNextPage, handlePageSizeChange} = props;
  const selectedInvoices = useInvoicesStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedInvoices);

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
      <div className={styles["emptyState"]}>
        <div className={styles["emptyMessage"]}>{t("empty")}</div>
      </div>
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
              className='bg-background/80 backdrop-blur-sm'
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
              className='flex h-auto cursor-pointer items-center gap-1 p-0 font-medium'>
              {t("columns.date")}
              <TbArrowsUpDown className={styles["sortIcon"]} />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant='ghost'
              className='flex h-auto cursor-pointer items-center gap-1 p-0 font-medium'>
              {t("columns.amount")}
              <TbArrowsUpDown className={styles["sortIcon"]} />
            </Button>
          </TableHead>
          <TableHead className='text-end'>{t("columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices
          .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className={styles["printHidden"]}>
                <Checkbox
                  checked={selectedInvoices.some((s) => s.id === invoice.id)}
                  // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                  onCheckedChange={() => handleSelectInvoice(invoice.id)}
                  aria-label={t("aria.selectInvoice", {id: invoice.id})}
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
                    <TooltipTrigger asChild>
                      <span className={styles["cursorHelp"]}>{formatDate(invoice.createdAt, {locale})} </span>
                    </TooltipTrigger>
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
                        asChild
                        className='hover:text-accent-primary cursor-pointer'>
                        <Link
                          href={`/domains/invoices/view-invoice/${invoice.id}`}
                          className={styles["viewLink"]}>
                          <TbEye className={styles["viewIcon"]} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>{t("viewInvoice")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TableViewActions invoice={invoice} />
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
      {invoices.length >= 6 && (
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
                    className='h-8 w-20 cursor-pointer'
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
              className='justify-end'>
              <Button
                variant='outline'
                className='h-full w-full cursor-pointer'
                size='sm'
                onClick={handlePrevPage}
                disabled={invoices.length === 0}>
                {t("previousPage")}
              </Button>
            </TableCell>
            <TableCell>
              <Button
                variant='outline'
                className='h-full w-full cursor-pointer'
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
