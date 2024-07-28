/** @format */

import Invoice from "@/types/invoices/Invoice";
import {InvoiceCard} from "./InvoiceCard";
import {InvoicesTableDisplay} from "./InvoicesTableDisplay";

interface Props {
  invoices: Invoice[];
  displayStyle: "grid" | "list";
}
export const InvoiceList = ({invoices, displayStyle}: Readonly<Props>) => {
  switch (displayStyle) {
    case "grid":
      return <InvoicesTableDisplay invoices={invoices} />;
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
