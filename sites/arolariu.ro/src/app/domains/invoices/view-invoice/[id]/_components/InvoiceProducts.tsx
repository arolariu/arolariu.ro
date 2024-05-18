/** @format */

"use client";

import {useZustandStore} from "@/hooks/stateStore";
import type Product from "@/types/invoices/Product";

export const InvoiceProducts = () => {
  const invoice = useZustandStore((state) => state.selectedInvoice);
  const items: Product[] = invoice.items;

  return (
    <table className='container mx-auto mb-8 border-b border-gray-200'>
      <thead>
        <tr>
          <th>Name</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr
            key={index}
            className='text-center odd:bg-gray-900'>
            <td>{item.rawName}</td>
            <td>{item.price}</td>
            <td>{item.quantity}</td>
            <td>{item.totalPrice}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
