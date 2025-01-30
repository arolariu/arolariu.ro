/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {Cell, Column, Row, Table, TableBody, TableHeader} from "react-aria-components";

export const InvoiceProducts = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const {items} = invoice;
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0).toPrecision(4);
  const totalPrice = items.reduce((acc, item) => acc + item.totalPrice, 0).toPrecision(4);

  return (
    <Table className='mx-auto mb-8 border-b border-gray-200'>
      <TableHeader>
        <Column className='text-center'>Name</Column>
        <Column className='text-center'>Price</Column>
        <Column className='text-center'>Quantity</Column>
        <Column className='text-center'>Total</Column>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <Row
            key={`${item.rawName}#${String(index)}`}
            className='text-center text-black odd:bg-gray-400 even:bg-gray-100'>
            <Cell>{item.rawName}</Cell>
            <Cell>{item.price}</Cell>
            <Cell>{item.quantity}</Cell>
            <Cell>{item.totalPrice}</Cell>
          </Row>
        ))}
      </TableBody>
      <Row>
        <Cell>---</Cell>
        <Cell className='text-center'>
          <strong>TOTAL</strong>
        </Cell>
        <Cell className='text-center'>{totalQuantity}</Cell>
        <Cell className='text-center'>{totalPrice}</Cell>
      </Row>
    </Table>
  );
};
