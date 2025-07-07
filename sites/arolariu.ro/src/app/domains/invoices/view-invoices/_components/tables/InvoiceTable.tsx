/** @format */

import {useZustandStore} from "@/hooks/stateStore";
import {InvoiceCategory, type Invoice} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import {motion} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {useCallback, useEffect} from "react";
import {TbArrowsUpDown, TbCalendar, TbEye} from "react-icons/tb";
import InvoiceTableActions from "./InvoiceTableActions";

type Props = {
  mode: "table" | "grid";
  paginatedInvoices: Invoice[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  pageSize: number;
};

/**
 * This function renders the invoices table or grid view based on the mode.
 * It also handles pagination and selection of invoices.
 * @param props The props for the component.
 * @returns The rendered invoices table or grid view.
 */
export default function InvoicesTable(props: Readonly<Props>): React.JSX.Element {
  const {mode, currentPage, pageSize, setCurrentPage, setPageSize, totalPages, paginatedInvoices: invoices} = props;
  const setSelectedInvoices = useZustandStore((state) => state.setSelectedInvoices);

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

  useEffect(
    () => {
      return () => {
        setSelectedInvoices([]);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [],
  );

  switch (mode) {
    case "table":
      return (
        <TableView
          invoices={invoices}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageSizeChange={handlePageSizeChange}
        />
      );
    case "grid":
      return <GridView invoices={invoices} />;
  }
}

type TableViewProps = {
  invoices: Invoice[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePageSizeChange: (size: number) => void;
};

const TableView = (props: Readonly<TableViewProps>): React.JSX.Element => {
  const {invoices, currentPage, pageSize, totalPages, handlePrevPage, handleNextPage, handlePageSizeChange} = props;
  const selectedInvoices = useZustandStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useZustandStore((state) => state.setSelectedInvoices);

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
  }, [invoices, selectedInvoices]);

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

const GridView = ({invoices}: Readonly<{invoices: Invoice[]}>): React.JSX.Element => {
  const selectedInvoices = useZustandStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useZustandStore((state) => state.setSelectedInvoices);

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

  if (invoices.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-10'>
        <div className='text-muted-foreground mb-2'>No invoices found</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.2}}
      className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          className='relative'>
          <div className='absolute top-2 left-2 z-10'>
            <Checkbox
              checked={selectedInvoices.includes(invoice)}
              onCheckedChange={() => handleSelectInvoice(invoice.id)}
              aria-label={`Select invoice ${invoice.name}`}
              className='bg-background/80 backdrop-blur-sm'
            />
          </div>
          <Card className='overflow-hidden'>
            <Image
              src={invoice.photoLocation || "/placeholder.svg"}
              alt={invoice.name}
              className='h-full w-full object-fill transition-transform duration-500'
              width={400}
              height={400}
            />
            <CardHeader className='mt-6 pt-4 pb-2'>
              <CardTitle className='text-lg'>{invoice.name}</CardTitle>
              <div className='absolute top-80 right-2 z-10 flex gap-1'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      asChild
                      className='cursor-pointer'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='bg-background/80 h-8 w-8 backdrop-blur-sm'>
                        <TbEye className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Details</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <InvoiceTableActions invoice={invoice} />
              </div>
              <CardDescription>{invoice.description}</CardDescription>
            </CardHeader>
            <CardContent className='pb-2'>
              <div className='flex items-center justify-between'>
                <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                  <TbCalendar className='h-3.5 w-3.5' />
                  <span>{invoice.createdAt.toUTCString()}</span>
                </div>
                <div className='text-lg font-medium'>TODO EURO</div>
              </div>
            </CardContent>
            <CardFooter className='flex justify-between pt-2'>
              <div className='text-muted-foreground text-sm'>{invoice.items?.length || 0} items</div>
            </CardFooter>
          </Card>
        </div>
      ))}
    </motion.div>
  );
};
