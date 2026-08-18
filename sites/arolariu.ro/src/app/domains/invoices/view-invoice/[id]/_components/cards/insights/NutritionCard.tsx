"use client";

/**
 * @fileoverview Cautious product-allergen evidence summary.
 * @module domains/invoices/view-invoice/[id]/components/cards/insights/NutritionCard
 */

import {AllergenAssessmentDetails} from "@/app/domains/invoices/_components/analysis/StructuredAnalysisDetails";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbLeaf} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./NutritionCard.module.scss";

/** Renders assessment outcomes without inferring an allergen-free condition. */
export function NutritionCard(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();

  return (
    <Card>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["titleRow"]}>
          <TbLeaf className={styles["titleIcon"]} />
          {t((m) => m.cards.invoices.nutritionCard.title)}
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["contentSpaced"]}>
        {invoice.items.length === 0 ? (
          <p className={styles["scoreLabel"]}>{t((m) => m.cards.invoices.nutritionCard.allergens.title)}</p>
        ) : (
          <ul className={styles["allergenList"]}>
            {invoice.items.map((item, index) => (
              <li key={`${item.productCode}-${item.name}-${index}`}>
                <p className={styles["scoreLabel"]}>{item.name}</p>
                <AllergenAssessmentDetails assessment={item.allergenAssessment} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
