/** @format */

import type Invoice from "@/types/invoices/Invoice";
import InvoiceCard from "./InvoiceCard";

type Props = Readonly<{
  invoices: Invoice[];
  displayStyle: "grid" | "list";
}>;

/**
 * The invoice list component.
 * This component renders a list of invoices, in either grid or list style.
 * @param invoices The list of invoices to render.
 * @param displayStyle The display style of the invoices.
 * @returns The invoice list component, with the invoices rendered.
 */
export default function InvoiceList({invoices, displayStyle}: Props) {
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
}
