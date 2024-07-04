/** @format */

import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import Invoice, {InvoiceCategory} from "@/types/invoices/Invoice";
import {ArrowUpIcon, DotsHorizontalIcon} from "@radix-ui/react-icons";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import Link from "next/link";
import {useState} from "react";

const columns: ColumnDef<Invoice>[] = [
  {
    id: "id",
    header: "Identifier",
    accessorKey: "id",
  },
  {
    id: "merchant",
    header: "Merchant",
    accessorKey: "merchant.name",
  },
  {
    id: "category",
    accessorKey: "category",
    header: ({column}) => {
      const possibleCategories = Object.keys(InvoiceCategory).filter((item) => Number.isNaN(Number(item)));
      return (
        <>
          Category
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost'>#</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='center'>
              {possibleCategories.map((category) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={column.getFilterValue() === category}
                    onCheckedChange={(_) => column.setFilterValue(_ && category)}>
                    {category}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
    filterFn: (row, _columnId, filterValue) => InvoiceCategory[row.original.category] === filterValue,
    cell: ({row}) => {
      return InvoiceCategory[row.original.category];
    },
  },
  {
    id: "products",
    header: ({column}) => {
      const columnIsSorted = column.getIsSorted();

      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(columnIsSorted === "asc")}>
          Products # (
          <ArrowUpIcon className={`h-4 w-4 ${columnIsSorted === "asc" ? "rotate-180 transform ease-in" : ""}`} />)
        </Button>
      );
    },
    accessorKey: "items.length",
  },
  {
    id: "totalCost",
    header: ({column}) => {
      const columnIsSorted = column.getIsSorted();
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(columnIsSorted === "asc")}>
          Total Cost (<ArrowUpIcon className={`h-4 w-4 ${columnIsSorted === "asc" ? "rotate-180 transform" : ""}`} />)
        </Button>
      );
    },
    accessorKey: "paymentInformation.totalAmount",
  },
  {
    id: "totalSavings",
    header: ({column}) => {
      const columnIsSorted = column.getIsSorted();
      return (
        <Button
          variant='ghost'
          onClick={() => column.toggleSorting(columnIsSorted === "asc")}>
          Total Savings (<ArrowUpIcon className={`h-4 w-4 ${columnIsSorted === "asc" ? "rotate-180 transform" : ""}`} />
          )
        </Button>
      );
    },
    accessorKey: "paymentInformation.totalTax",
  },
  {
    id: "actions",
    cell: ({row}) => {
      const invoice = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost'>
              <DotsHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='center'>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(invoice.id)}
              className='w-full text-center'>
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link
                href={`/domains/invoices/edit-invoice/${invoice.id}`}
                className='w-full text-center'>
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                href='/domains/invoices/view-invoices'
                className='w-full text-center'>
                Delete
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

/**
 * This function renders the invoices table display.
 * @returns The invoices table display.
 */
export function InvoicesTableDisplay({invoices}: Readonly<{invoices: Invoice[]}>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {sorting, columnFilters, columnVisibility},
  });

  return (
    <article>
      <div className='flex w-full flex-row items-stretch justify-between justify-items-stretch pb-4'>
        <input
          className='w-2/3 rounded border border-gray-200 p-2'
          placeholder='Search for a specific product...'
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- This is a bug in the eslint plugin.
          value={(table.getColumn("merchant")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("merchant")?.setFilterValue(event.target.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='secondary'>Show/Hide Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className='capitalize'
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}>
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table className='rounded-md border'>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center'>
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell
              colSpan={table.getVisibleFlatColumns().length - 2}
              className='w-full'>
              <span className='bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-center font-medium tracking-widest text-transparent'>
                You can download your invoices in .PDF, .CSV and .XLSX file formats.
              </span>
            </TableCell>
            <TableCell>
              <Button
                className='items-end justify-end justify-items-end'
                variant='outline'>
                Share
              </Button>
            </TableCell>
            <TableCell>
              <Button
                className='items-end justify-end justify-items-end'
                variant='destructive'>
                Download
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </article>
  );
}
