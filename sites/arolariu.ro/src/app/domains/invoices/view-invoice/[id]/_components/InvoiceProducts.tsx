/** @format */

"use client";

import {Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import Invoice from "@/types/invoices/Invoice";

export const InvoiceProducts = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const {items} = invoice;
  const totalQuantity = items?.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items?.reduce((acc, item) => acc + item.totalPrice, 0);

  return (
    <Table className='mx-auto mb-8 border-b border-gray-200'>
      <TableHeader>
        <TableRow>
          <TableHead className='text-center'>Name</TableHead>
          <TableHead className='text-center'>Price</TableHead>
          <TableHead className='text-center'>Quantity</TableHead>
          <TableHead className='text-center'>Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items?.map((item, index) => (
          <TableRow
            key={`${item.rawName}#${String(index)}`}
            className='text-center odd:bg-gray-900'>
            <TableCell>{item.rawName}</TableCell>
            <TableCell>{item.price}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{item.totalPrice}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell
            colSpan={2}
            className='text-center'>
            <strong>TOTAL</strong>
          </TableCell>
          <TableCell className='text-center'>{totalQuantity}</TableCell>
          <TableCell className='text-center'>{totalPrice}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
};
