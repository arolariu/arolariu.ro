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
import Link from "next/link";
import {useCallback} from "react";
import {TbArrowsUpDown, TbEye} from "react-icons/tb";
import InvoiceTableActions from "./InvoiceTableActions";

type TableViewProps = {
  invoices: Invoice[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePageSizeChange: (size: number) => void;
};

export const TableView = (props: Readonly<TableViewProps>): React.JSX.Element => {
  const {invoices, currentPage, pageSize, totalPages, handlePrevPage, handleNextPage, handlePageSizeChange} = props;
  const selectedInvoices = useInvoicesStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedInvoices);

  const handleSelectInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = invoices.find((invoice) => invoice.id === invoiceId);
      if (invoice && !selectedInvoices.includes(invoice)) {
        setSelectedInvoices([...selectedInvoices, invoice]);
      } else if (invoice && selectedInvoices.includes(invoice)) {
        setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoice.id));
      }
    },
    [invoices, selectedInvoices, setSelectedInvoices],
  );

  const handleSelectAllInvoices = useCallback(() => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices);
    }
  }, [invoices, selectedInvoices, setSelectedInvoices]);

  if (invoices.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-10'>
        <div className='text-muted-foreground mb-2'>No invoices found</div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Checkbox
              className='bg-background/80 backdrop-blur-sm'
              checked={
                selectedInvoices.length === invoices.length
                || (selectedInvoices.length > 0 && selectedInvoices.length < invoices.length && "indeterminate")
              }
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
              <TbArrowsUpDown className='h-4 w-4' />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant='ghost'
              className='flex h-auto cursor-pointer items-center gap-1 p-0 font-medium'>
              Amount
              <TbArrowsUpDown className='h-4 w-4' />
            </Button>
          </TableHead>
          <TableHead className='text-end'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>
              <Checkbox
                checked={selectedInvoices.includes(invoice)}
                // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                onCheckedChange={() => handleSelectInvoice(invoice.id)}
                aria-label={`Select invoice ${invoice.id}`}
              />
            </TableCell>
            <TableCell>{invoice.name}</TableCell>
            <TableCell>
              <Badge variant={invoice.category % 200 === 0 ? "default" : "secondary"}>{InvoiceCategory[invoice.category]}</Badge>
            </TableCell>
            <TableCell>{invoice.createdAt.toUTCString()}</TableCell>
            <TableCell>{invoice.paymentInformation?.totalCostAmount}</TableCell>
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
                <InvoiceTableActions invoice={invoice} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-sm'>Rows per page:</span>
              <select
                value={pageSize}
                // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
    </Table>
  );
};
