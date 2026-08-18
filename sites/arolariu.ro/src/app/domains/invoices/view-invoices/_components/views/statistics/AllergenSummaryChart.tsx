"use client";

/**
 * @fileoverview Allergen assessment signal frequencies with evidence coverage.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/AllergenSummaryChart
 *
 * @remarks
 * This component visualizes allergen occurrences across all products to help users
 * review assessment signals and their evidentiary coverage.
 *
 * **Features:**
 * - Compact card layout with allergen badges
 * - Color-coded signal-frequency levels
 * - Shows product count and percentage
 * - Responsive grid layout
 *
 * **Empty State:**
 * Reports assessment coverage without asserting an outcome when no signals exist.
 */

import {formatAmount} from "@/lib/utils.generic";
import {AllergenCodeLabel} from "@/app/domains/invoices/_components/analysis/StructuredAnalysisDetails";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbAlertTriangle, TbInfoCircle} from "react-icons/tb";
import type {AllergenFrequency, AllergenStatistics} from "../../../_utils/statistics";
import styles from "./AllergenSummaryChart.module.scss";

type Props = {
  /** Detected-signal frequencies using assessed-product coverage as their denominator. */
  readonly data: readonly AllergenFrequency[];
  /** Separate assessment coverage so empty signal results cannot overstate the evidence. */
  readonly coverage?: Omit<AllergenStatistics, "frequencies">;
};

const EMPTY_COVERAGE: Omit<AllergenStatistics, "frequencies"> = {
  assessedProductCount: 0,
  insufficientDataProductCount: 0,
  unassessedProductCount: 0,
  totalProductCount: 0,
};

/**
 * Determines the signal-frequency level based on assessed-product percentage.
 *
 * @param percentage - Percentage of products containing the allergen
 * @returns Signal level: "high", "medium", or "low"
 */
function getSignalLevel(percentage: number): "high" | "medium" | "low" {
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
  const t = useTranslations();
  const signalLevel = getSignalLevel(allergen.percentage);

  return (
    <div
      className={`${styles["allergenCard"]} ${styles[signalLevel]}`}
      role='listitem'>
      <div className={styles["allergenHeader"]}>
        <div className={styles["allergenIcon"]}>
          <TbAlertTriangle size={20} />
        </div>
        <div className={styles["allergenInfo"]}>
          <h4
            className={styles["allergenName"]}
            title={allergen.description}>
            <AllergenCodeLabel code={allergen.name} />
          </h4>
          <p className={styles["allergenDescription"]}>{allergen.description}</p>
        </div>
      </div>
      <div className={styles["allergenStats"]}>
        <div className={styles["statItem"]}>
          <span className={styles["statValue"]}>{allergen.productCount}</span>
          <span className={styles["statLabel"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.stats.products)}</span>
        </div>
        <div className={styles["statItem"]}>
          <span className={styles["statValue"]}>{formatAmount(allergen.percentage, "en-US", 1)}%</span>
          <span className={styles["statLabel"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.stats.ofAssessedProducts)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a compact summary of allergen assessment signals across products.
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
 * - High (≥20%): Red signal-frequency emphasis
 * - Medium (10-19%): Yellow signal-frequency emphasis
 * - Low (<10%): Blue signal-frequency emphasis
 *
 * @param data - Allergen frequencies sorted by product count
 * @returns Grid of allergen cards
 */
export function AllergenSummaryChart({data, coverage = EMPTY_COVERAGE}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();

  if (data.length === 0) {
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
            <TbInfoCircle className={styles["emptyIcon"]} />
            <p className={styles["emptyText"]}>{t((m) => m.cards.invoices.statistics.allergenSummary.empty)}</p>
            <AssessmentCoverage coverage={coverage} />
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
        <AssessmentCoverage coverage={coverage} />
        <div
          className={styles["allergenGrid"]}
          role='list'
          aria-label={t((m) => m.cards.invoices.statistics.allergenSummary.ariaLabel)}>
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

function AssessmentCoverage({coverage}: Readonly<{coverage: Omit<AllergenStatistics, "frequencies">}>): React.JSX.Element {
  const t = useTranslations();
  return (
    <dl className={styles["coverage"]}>
      <div>
        <dt>{t((m) => m.cards.invoices.statistics.allergenSummary.coverage.assessed)}</dt>
        <dd>
          {coverage.assessedProductCount}/{coverage.totalProductCount}
        </dd>
      </div>
      <div>
        <dt>{t((m) => m.cards.invoices.statistics.allergenSummary.coverage.insufficientData)}</dt>
        <dd>{coverage.insufficientDataProductCount}</dd>
      </div>
      <div>
        <dt>{t((m) => m.cards.invoices.statistics.allergenSummary.coverage.notAssessed)}</dt>
        <dd>{coverage.unassessedProductCount}</dd>
      </div>
    </dl>
  );
}
