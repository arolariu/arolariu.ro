"use client";

/**
 * @fileoverview Allergen Summary Chart - displays EU-14 allergen frequencies with warning badges.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/AllergenSummaryChart
 *
 * @remarks
 * Visualizes allergen signal occurrences across **assessed** products.
 * Products with `allergenAssessment: null` are excluded from the denominator —
 * the chart never implies an absence of allergens for unassessed products.
 */

import {formatAmount} from "@/lib/utils.generic";
import {getAllergenLabelKey} from "@/types/invoices";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {TbAlertTriangle} from "react-icons/tb";
import type {AllergenFrequency} from "../../../_utils/statistics";
import styles from "./AllergenSummaryChart.module.scss";

type Props = {
  readonly data: AllergenFrequency[];
  /**
   * Number of products that carried an allergen assessment.
   *
   * @remarks
   * Zero means nothing was assessed. The empty state must then stay neutral rather than
   * reassuring, because an absence of data is not an absence of allergens.
   */
  readonly assessedProductCount: number;
};

/**
 * Determines the warning level based on allergen frequency percentage.
 *
 * @param percentage - Percentage of assessed products containing the allergen
 * @returns Warning level: "high", "medium", or "low"
 */
function getWarningLevel(percentage: number): "high" | "medium" | "low" {
  if (percentage >= 20) return "high";
  if (percentage >= 10) return "medium";
  return "low";
}

/**
 * Renders an allergen frequency card with badge and statistics.
 */
function AllergenCard({allergen}: {readonly allergen: AllergenFrequency}): React.JSX.Element {
  const t = useTranslations();
  const warningLevel = getWarningLevel(allergen.percentage);
  const label = t(selectorFromPath(getAllergenLabelKey(allergen.code)));

  return (
    <div
      className={`${styles["allergenCard"]} ${styles[warningLevel]}`}
      role='listitem'>
      <div className={styles["allergenHeader"]}>
        <div className={styles["allergenIcon"]}>
          <TbAlertTriangle size={20} />
        </div>
        <div className={styles["allergenInfo"]}>
          <h4 className={styles["allergenName"]}>{label}</h4>
        </div>
      </div>
      <div className={styles["allergenStats"]}>
        <div className={styles["statItem"]}>
          <span className={styles["statValue"]}>{allergen.productCount}</span>
          <span className={styles["statLabel"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.stats.products)}</span>
        </div>
        <div className={styles["statItem"]}>
          <span className={styles["statValue"]}>{formatAmount(allergen.percentage, "en-US", 1)}%</span>
          <span className={styles["statLabel"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.stats.ofTotal)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a compact summary of EU-14 allergen frequencies across assessed products.
 *
 * @remarks
 * The denominator for percentages is assessed products only; unassessed products
 * (`allergenAssessment: null`) are excluded. The chart never implies a product is
 * allergen-free for products that were not assessed.
 *
 * @param data - Allergen frequencies sorted by product count, derived from {@link computeAllergenFrequency}
 * @param assessedProductCount - Number of products that carried an assessment, from `countAssessedProducts`
 * @returns Grid of allergen cards, or an empty state.
 */
export function AllergenSummaryChart({data, assessedProductCount}: Props): React.JSX.Element {
  const t = useTranslations();

  if (data.length === 0) {
    // Two very different situations produce an empty list. Nothing assessed means nothing is
    // known, so the UI must not show a checkmark or say no allergens were found.
    const nothingAssessed = assessedProductCount === 0;

    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.title)}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>
            {t((m) => m.cards.invoices.statistics.allergenSummary.description)}
          </CardDescription>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["emptyState"]}>
            <div className={styles["emptyIcon"]}>{nothingAssessed ? "?" : "✓"}</div>
            <p className={styles["emptyText"]}>
              {nothingAssessed
                ? t((m) => m.cards.invoices.statistics.allergenSummary.notAssessed)
                : t((m) => m.cards.invoices.statistics.allergenSummary.empty)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.title)}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>
          {t((m) => m.cards.invoices.statistics.allergenSummary.description)}
        </CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div
          className={styles["allergenGrid"]}
          role='list'
          aria-label={t((m) => m.cards.invoices.statistics.allergenSummary.ariaLabel)}>
          {data.map((allergen) => (
            <AllergenCard
              key={allergen.code}
              allergen={allergen}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
