"use client";

/**
 * @fileoverview Canonical invoice details card.
 * @module domains/invoices/view-invoice/[id]/components/cards/InvoiceDetailsCard
 */

import {getClassificationSummary} from "@/app/domains/invoices/_utils/classificationUtilities";
import {getPaymentTypeLabel} from "@/app/domains/invoices/_utils/labelUtilities";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useInvoiceContext} from "../../_context/InvoiceContext";

/** Renders public receipt, payment, classification, and line-item DTO fields. */
export default function InvoiceDetailsCard(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t((m) => m.cards.invoices.invoiceDetailsCard.title)}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <dt>{t((m) => m.cards.invoices.invoiceDetailsCard.labels.category)}</dt>
          <dd>
            <Badge variant='outline'>{getClassificationSummary(invoice.classification)}</Badge>
          </dd>
          <dt>{t((m) => m.cards.invoices.invoiceDetailsCard.labels.payment)}</dt>
          <dd>{getPaymentTypeLabel(paymentInformation.paymentType)}</dd>
          <dt>{t((m) => m.cards.invoices.invoiceDetailsCard.labels.receiptType)}</dt>
          <dd>{invoice.receiptType || "—"}</dd>
          <dt>{t((m) => m.cards.invoices.invoiceDetailsCard.labels.countryRegion)}</dt>
          <dd>{invoice.countryRegion || "—"}</dd>
        </dl>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t((m) => m.cards.invoices.invoiceDetailsCard.table.item)}</TableHead>
              <TableHead>{t((m) => m.cards.invoices.invoiceDetailsCard.table.qty)}</TableHead>
              <TableHead>{t((m) => m.cards.invoices.invoiceDetailsCard.table.total)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, index) => (
              <TableRow key={`${item.productCode}-${item.name}-${index}`}>
                <TableCell>
                  {item.name} <Badge variant='outline'>{getClassificationSummary(item.classification)}</Badge>
                </TableCell>
                <TableCell>
                  {item.quantity} {item.quantityUnit}
                </TableCell>
                <TableCell>{item.totalPrice}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
