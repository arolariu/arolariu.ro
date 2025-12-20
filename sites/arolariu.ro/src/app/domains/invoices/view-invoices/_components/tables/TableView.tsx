import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import {InvoiceCategory, type Invoice} from "@/types/invoices";
import {
  Badge,
  Button,
  Checkbox,
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
import Link from "next/link";
import {useCallback} from "react";
import {TbArrowsUpDown, TbEye} from "react-icons/tb";
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
      <div className='flex flex-col items-center justify-center py-10'>
        <div className='text-muted-foreground mb-2'>No invoices found</div>
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
          <TableHead className='print:hidden'>
            <Checkbox
              className='bg-background/80 backdrop-blur-sm'
              checked={isAllSelected || (isIndeterminate && "indeterminate")}
              onCheckedChange={handleSelectAllInvoices}
              aria-label='Select all invoices'
            />
          </TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>
            <Button
              variant='ghost'
              className='flex h-auto cursor-pointer items-center gap-1 p-0 font-medium'>
              Date
              <TbArrowsUpDown className='h-4 w-4 print:hidden' />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant='ghost'
              className='flex h-auto cursor-pointer items-center gap-1 p-0 font-medium'>
              Amount
              <TbArrowsUpDown className='h-4 w-4 print:hidden' />
            </Button>
          </TableHead>
          <TableHead className='text-end'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices
          .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className='print:hidden'>
                <Checkbox
                  checked={selectedInvoices.some((s) => s.id === invoice.id)}
                  // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                  onCheckedChange={() => handleSelectInvoice(invoice.id)}
                  aria-label={`Select invoice ${invoice.id}`}
                />
              </TableCell>
              <TableCell>
                <span className='print:hidden'>{invoice.name.length > 0 ? invoice.name : invoice.id}</span>
                <span className='hidden print:inline'>{invoice.id}</span>
              </TableCell>
              <TableCell>
                <Badge variant={invoice.category % 200 === 0 ? "default" : "secondary"}>{InvoiceCategory[invoice.category]}</Badge>
              </TableCell>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className='cursor-help'>{formatDate(invoice.createdAt, {locale})} </span>
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
              <TableCell className='relative text-right'>
                <div className='flex justify-end gap-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        asChild
                        className='cursor-pointer hover:text-blue-500'>
                        <Link
                          target='_blank'
                          href={`/domains/invoices/view-invoice/${invoice.id}`}
                          className='h-8 w-8'>
                          <TbEye className='mt-1.5 ml-1.5 h-5 w-5' />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>View Invoice</TooltipContent>
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
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground text-sm'>Rows per page:</span>
                <select
                  value={pageSize}
                  // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  aria-label='Rows per page'
                  className='border-muted bg-background h-8 w-16 cursor-pointer rounded-md border p-1 text-sm'>
                  {[5, 10, 20, 50, 100, 500, 1000].map((size) => (
                    <option
                      key={size}
                      value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className='text-muted-foreground text-sm'>
                  Page {currentPage} of {totalPages}
                </span>
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
                Previous Page
              </Button>
            </TableCell>
            <TableCell>
              <Button
                variant='outline'
                className='h-full w-full cursor-pointer'
                size='sm'
                onClick={handleNextPage}
                disabled={invoices.length === 0}>
                Next Page
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};
