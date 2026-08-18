"use client";

/**
 * @fileoverview Product analytics using canonical GPC classifications.
 * @module domains/invoices/view-invoice/[id]/components/cards/ItemAnalyticsCard
 */

import {
  getAllergenStatusLabel,
  getClassificationRoot,
  getClassificationSummary,
} from "@/app/domains/invoices/_utils/classificationUtilities";
import {Badge, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useInvoiceContext} from "../../_context/InvoiceContext";

/** Displays product classification roots and structured allergen outcomes. */
export default function ItemAnalyticsCard(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t((m) => m.cards.invoices.invoiceDetailsCard.itemsTitle, {count: String(invoice.items.length)})}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {invoice.items.map((item, index) => {
            const root = getClassificationRoot(item.classification);
            return (
              <li key={`${item.productCode}-${item.name}-${index}`}>
                <strong>{item.name}</strong>
                <Badge variant='outline'>{getClassificationSummary(item.classification)}</Badge>
                {root === null ? null : <span>{root.officialLabel}</span>}
                {item.allergenAssessment === null ? null : (
                  <Badge variant='secondary'>{getAllergenStatusLabel(item.allergenAssessment.status)}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
