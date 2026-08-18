"use client";

/**
 * @fileoverview Product analytics using canonical GPC classifications.
 * @module domains/invoices/view-invoice/[id]/components/cards/ItemAnalyticsCard
 */

import {
  AllergenAssessmentStatusBadge,
  ClassificationProvenance,
} from "@/app/domains/invoices/_components/analysis/StructuredAnalysisDetails";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
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
            return (
              <li key={`${item.productCode}-${item.name}-${index}`}>
                <strong>{item.name}</strong>
                <ClassificationProvenance
                  classification={item.classification}
                  compact
                />
                <AllergenAssessmentStatusBadge assessment={item.allergenAssessment} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
