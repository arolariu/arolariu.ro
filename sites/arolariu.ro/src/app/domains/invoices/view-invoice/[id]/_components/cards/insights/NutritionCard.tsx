"use client";

/**
 * @fileoverview Cautious product-allergen evidence summary.
 * @module domains/invoices/view-invoice/[id]/components/cards/insights/NutritionCard
 */

import {
  getAllergenCodeLabel,
  getAllergenEvidenceLevelLabel,
  getAllergenStatusLabel,
} from "@/app/domains/invoices/_utils/classificationUtilities";
import {Badge, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbAlertTriangle, TbLeaf} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./NutritionCard.module.scss";

/** Renders assessment outcomes without inferring an allergen-free condition. */
export function NutritionCard(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  const assessedItems = invoice.items.filter((item) => item.allergenAssessment !== null);

  return (
    <Card>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["titleRow"]}>
          <TbLeaf className={styles["titleIcon"]} />
          {t((m) => m.cards.invoices.nutritionCard.title)}
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["contentSpaced"]}>
        {assessedItems.length === 0 ? (
          <p className={styles["scoreLabel"]}>{t((m) => m.cards.invoices.nutritionCard.allergens.title)}</p>
        ) : (
          <ul className={styles["allergenList"]}>
            {assessedItems.map((item) => {
              const assessment = item.allergenAssessment;
              if (assessment === null) return null;
              return (
                <li key={`${item.productCode}-${item.name}`}>
                  <p className={styles["scoreLabel"]}>
                    {item.name}: {getAllergenStatusLabel(assessment.status)}
                  </p>
                  {assessment.signals.map((signal) => (
                    <Badge
                      key={signal.code}
                      variant='outline'>
                      <TbAlertTriangle />
                      {getAllergenCodeLabel(signal.code)} · {getAllergenEvidenceLevelLabel(signal.evidenceLevel)}
                    </Badge>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
