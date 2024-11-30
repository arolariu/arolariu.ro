/** @format */

import type Invoice from "@/types/invoices/Invoice";
import {InvoiceCard} from "./InvoiceCard";

interface Props {
  invoices: Invoice[];
  displayStyle: "grid" | "list";
}
export const InvoiceList = ({invoices, displayStyle}: Readonly<Props>) => {
  switch (displayStyle) {
    case "grid":
      return <></>; // TODO.
    case "list":
      return (
        <section className='-m-4 flex flex-row flex-wrap'>
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
            />
          ))}
        </section>
      );
    default:
      return null;
  }
};
