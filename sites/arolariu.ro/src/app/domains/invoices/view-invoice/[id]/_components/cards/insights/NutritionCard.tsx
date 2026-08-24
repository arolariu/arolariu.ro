"use client";

/**
 * @fileoverview NutritionCard — shows structured allergen assessments for invoice products.
 * @module app/domains/invoices/view-invoice/[id]/components/cards/insights/NutritionCard
 *
 * @remarks
 * **Decision D5** — The food-grouping subsection has been removed. It derived from
 * the deprecated numeric category enum which has no valid taxonomy mapping.
 *
 * This card now renders the EU-14 structured allergen assessment for each product
 * via {@link AllergenAssessmentView}.
 */

import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {TbAlertTriangle} from "react-icons/tb";
import {AllergenAssessmentView} from "../../../../../_components/allergens/AllergenAssessmentView";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./NutritionCard.module.scss";

/**
 * Renders allergen assessments for each product on the invoice.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * Products with `allergenAssessment: null` are shown as "not assessed" — they are
 * never presented as allergen-free.
 *
 * @returns Card with per-product allergen assessment views.
 */
export function NutritionCard(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  const {items} = invoice;

  return (
    <Card>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["titleRow"]}>
          <TbAlertTriangle className={styles["titleIcon"]} />
          {t(selectorFromPath("cards.invoices.nutritionCard.title"))}
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["contentSpaced"]}>
        {items.length === 0 ? (
          <p className={styles["emptyText"]}>{t(selectorFromPath("cards.invoices.nutritionCard.allergens.noProducts"))}</p>
        ) : (
          <div className={styles["productList"]}>
            {items.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className={styles["productAllergenRow"]}>
                <div className={styles["productName"]}>{item.name}</div>
                <AllergenAssessmentView assessment={item.allergenAssessment ?? null} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
