/** @format */

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import Invoice, {InvoiceCategory} from "@/types/invoices/Invoice";
import {useRouter} from "next/navigation";
import {InvoiceCard} from "./InvoiceCard";

interface Props {
  invoices: Invoice[];
  displayStyle: "grid" | "list";
}

export const InvoiceList = ({invoices, displayStyle}: Readonly<Props>) => {
  const router = useRouter();
  switch (displayStyle) {
    case "grid":
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <TableCell>Identifier</TableCell>
              </TableHead>
              <TableHead>
                <TableCell>Merchant</TableCell>
              </TableHead>
              <TableHead>
                <TableCell>Category</TableCell>
              </TableHead>
              <TableHead>
                <TableCell>Products #</TableCell>
              </TableHead>
              <TableHead>
                <TableCell>Total Cost</TableCell>
              </TableHead>
              <TableHead>
                <TableCell>Total Savings</TableCell>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className={`${invoice.isImportant ? "bg-red-700" : ""} cursor-pointer`}
                onClick={() => router.push(`/domains/invoices/view-invoice/${invoice.id}`)}>
                <TableCell>{invoice.id}</TableCell>
                <TableCell>{invoice.merchant?.name ?? "No merchant found.."}</TableCell>
                <TableCell>{InvoiceCategory[invoice.category]}</TableCell>
                <TableCell>{invoice.items?.length}</TableCell>
                <TableCell>{invoice.paymentInformation?.totalAmount}</TableCell>
                <TableCell>{invoice.paymentInformation?.totalTax}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
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
