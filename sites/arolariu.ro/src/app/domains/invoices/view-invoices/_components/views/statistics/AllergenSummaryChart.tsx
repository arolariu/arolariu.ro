"use client";

/**
 * @fileoverview Allergen Summary Chart - displays allergen frequencies with warning badges.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/AllergenSummaryChart
 *
 * @remarks
 * This component visualizes allergen occurrences across all products to help users
 * identify dietary risks and allergen exposure patterns.
 *
 * **Features:**
 * - Compact card layout with allergen badges
 * - Color-coded warning levels based on frequency
 * - Shows product count and percentage
 * - Responsive grid layout
 *
 * **Empty State:**
 * Displays a positive message when no allergens are detected.
 */

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbAlertTriangle} from "react-icons/tb";
import type {AllergenFrequency} from "../../../_utils/statistics";
import styles from "./AllergenSummaryChart.module.scss";

type Props = {
  readonly data: AllergenFrequency[];
};

/**
 * Determines the warning level based on allergen frequency percentage.
 *
 * @param percentage - Percentage of products containing the allergen
 * @returns Warning level: "high", "medium", or "low"
 */
function getWarningLevel(percentage: number): "high" | "medium" | "low" {
  if (percentage >= 20) return "high";
  if (percentage >= 10) return "medium";
  return "low";
}

/**
 * Renders an allergen frequency card with badge and statistics.
 *
 * @param allergen - Allergen frequency data
 * @returns Allergen card component
 */
function AllergenCard({allergen}: {readonly allergen: AllergenFrequency}): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.allergenSummary");
  const warningLevel = getWarningLevel(allergen.percentage);

  return (
    <div className={`${styles["allergenCard"]} ${styles[warningLevel]}`}>
      <div className={styles["allergenHeader"]}>
        <div className={styles["allergenIcon"]}>
          <TbAlertTriangle size={20} />
        </div>
        <div className={styles["allergenInfo"]}>
          <h4
            className={styles["allergenName"]}
            title={allergen.description}>
            {allergen.name}
          </h4>
          <p className={styles["allergenDescription"]}>{allergen.description}</p>
        </div>
      </div>
      <div className={styles["allergenStats"]}>
        <div className={styles["statItem"]}>
          <span className={styles["statValue"]}>{allergen.productCount}</span>
          <span className={styles["statLabel"]}>{t("stats.products")}</span>
        </div>
        <div className={styles["statItem"]}>
          <span className={styles["statValue"]}>{formatAmount(allergen.percentage, "en-US", 1)}%</span>
          <span className={styles["statLabel"]}>{t("stats.ofTotal")}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a compact summary of allergen frequencies across all products.
 *
 * @remarks
 * **Performance:**
 * Uses memoized data from parent component. Grid layout is optimized
 * for responsive behavior with CSS Grid.
 *
 * **Accessibility:**
 * - Semantic HTML with proper heading hierarchy
 * - ARIA labels for screen readers
 * - Color-blind friendly (icons + text)
 * - Keyboard navigation support
 *
 * **Color Scheme:**
 * - High (≥20%): Red warning
 * - Medium (10-19%): Yellow warning
 * - Low (<10%): Blue info
 *
 * @param data - Allergen frequencies sorted by product count
 * @returns Grid of allergen cards
 */
export function AllergenSummaryChart({data}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.allergenSummary");

  // Empty state - positive message
  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["emptyState"]}>
            <div className={styles["emptyIcon"]}>✓</div>
            <p className={styles["emptyText"]}>{t("empty")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div
          className={styles["allergenGrid"]}
          role='list'
          aria-label={t("ariaLabel")}>
          {data.map((allergen) => (
            <AllergenCard
              key={allergen.name}
              allergen={allergen}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
