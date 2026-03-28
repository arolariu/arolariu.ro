/**
 * @fileoverview Invoice Health Score component for view-invoice domain.
 * @module domains/invoices/view-invoice/[id]/components/cards/InvoiceHealthScore
 *
 * @remarks
 * Displays a visual "completeness score" (0-100%) for an invoice, encouraging
 * users to fill in missing data. Includes:
 * - Animated circular progress meter with color-coded status
 * - Checklist of completion factors (name, items, payment, etc.)
 * - CTA button to run AI analysis if score < 100%
 *
 * **Score Calculation:**
 * | Factor | Points | Condition |
 * |--------|--------|-----------|
 * | Has merchant info | 15 | merchantReference is not empty GUID |
 * | Has items extracted | 20 | items.length > 0 |
 * | Has payment info | 15 | totalCostAmount > 0 |
 * | Has recipes | 10 | possibleRecipes.length > 0 |
 * | Has category set | 10 | category !== NOT_DEFINED |
 * | Has description | 10 | description.length > 0 |
 * | Has transaction date | 10 | transactionDate is valid |
 * | Has name | 10 | name.length > 0 |
 *
 * **Rendering Context:** Client Component (requires useState, useMemo).
 *
 * @see {@link useInvoiceContext} for data access
 * @see {@link InvoiceCategory} for category enum
 */

"use client";

import {InvoiceCategory} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useMemo, useState} from "react";
import {TbCheck, TbChevronDown, TbChevronUp, TbSparkles, TbX} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceHealthScore.module.scss";

/**
 * Represents a single score factor with its achievement status.
 *
 * @remarks
 * Used internally to track which factors contribute to the total score.
 */
type ScoreFactor = {
  /** i18n key for the factor label */
  readonly key: string;
  /** Points awarded if achieved */
  readonly points: number;
  /** Whether this factor is satisfied */
  readonly achieved: boolean;
  /** Optional detail text (e.g., item count) */
  readonly detail?: string;
};

/**
 * Empty GUID constant representing an unset reference.
 *
 * @remarks
 * Used to check if merchantReference has been set.
 * Empty GUID format: "00000000-0000-0000-0000-000000000000"
 */
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/**
 * Invoice Health Score card component.
 *
 * @remarks
 * **Data Source:** Invoice context via `useInvoiceContext`.
 *
 * **Performance:**
 * - Score computation is memoized to prevent unnecessary recalculations
 * - Collapsible checklist reduces initial visual clutter
 *
 * **Color Coding:**
 * - Green (80-100%): Complete or nearly complete
 * - Yellow (50-79%): Needs work
 * - Red (0-49%): Incomplete
 *
 * @returns Card component displaying invoice completeness score
 *
 * @example
 * ```tsx
 * // In view-invoice island.tsx
 * <InvoiceHealthScore />
 * ```
 */
export function InvoiceHealthScore(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const t = useTranslations("Invoices.ViewInvoice.healthScore");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  /**
   * Compute score factors and total score.
   *
   * @remarks
   * Memoized to prevent recalculation on every render.
   * Only recomputes when invoice reference changes.
   */
  const {factors, score, maxScore} = useMemo(() => {
    const computedFactors: ScoreFactor[] = [
      {
        key: "name",
        points: 10,
        achieved: invoice.name.length > 0,
      },
      {
        key: "merchant",
        points: 15,
        achieved: invoice.merchantReference !== EMPTY_GUID && invoice.merchantReference.length > 0,
      },
      {
        key: "items",
        points: 20,
        achieved: invoice.items.length > 0,
        detail: invoice.items.length > 0 ? String(invoice.items.length) : undefined,
      },
      {
        key: "payment",
        points: 15,
        achieved: invoice.paymentInformation.totalCostAmount > 0,
      },
      {
        key: "date",
        points: 10,
        achieved: Boolean(invoice.paymentInformation.transactionDate) && new Date(invoice.paymentInformation.transactionDate).getTime() > 0,
      },
      {
        key: "category",
        points: 10,
        achieved: invoice.category !== InvoiceCategory.NOT_DEFINED,
      },
      {
        key: "description",
        points: 10,
        achieved: invoice.description.length > 0,
      },
      {
        key: "recipes",
        points: 10,
        achieved: invoice.possibleRecipes.length > 0,
        detail: invoice.possibleRecipes.length > 0 ? String(invoice.possibleRecipes.length) : undefined,
      },
    ];

    const totalScore = computedFactors.filter((f) => f.achieved).reduce((sum, f) => sum + f.points, 0);
    const totalMaxScore = computedFactors.reduce((sum, f) => sum + f.points, 0);

    return {
      factors: computedFactors,
      score: totalScore,
      maxScore: totalMaxScore,
    };
  }, [invoice]);

  const percentage = Math.round((score / maxScore) * 100);

  /**
   * Determine status color and label based on percentage.
   */
  const status = useMemo(() => {
    if (percentage >= 80) {
      return {key: "complete", color: "success"};
    }
    if (percentage >= 50) {
      return {key: "needsWork", color: "warning"};
    }
    return {key: "incomplete", color: "error"};
  }, [percentage]);

  const showCTA = percentage < 100;

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        {/* Circular Progress */}
        <div className={styles["progressContainer"]}>
          <svg
            className={styles["progressCircle"]}
            viewBox='0 0 120 120'>
            {/* Background circle */}
            <circle
              className={styles["progressTrack"]}
              cx='60'
              cy='60'
              r='54'
              fill='none'
              strokeWidth='6'
            />
            {/* Progress circle */}
            <circle
              className={`${styles["progressIndicator"]} ${styles[status.color]}`}
              cx='60'
              cy='60'
              r='54'
              fill='none'
              strokeWidth='6'
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - percentage / 100)}`}
              strokeLinecap='round'
            />
            {/* Percentage text */}
            <text
              x='60'
              y='60'
              className={styles["progressText"]}
              textAnchor='middle'
              dominantBaseline='middle'>
              {percentage}%
            </text>
          </svg>
        </div>

        {/* Status label */}
        <div className={`${styles["statusLabel"]} ${styles[status.color]}`}>{t(`status.${status.key}`)}</div>

        {/* Score breakdown */}
        <div className={styles["scoreBreakdown"]}>
          {score} / {maxScore} {t("points")}
        </div>

        {/* Collapsible factor checklist */}
        <Collapsible
          open={isExpanded}
          onOpenChange={setIsExpanded}>
          <CollapsibleTrigger
            render={
              <Button
                variant='ghost'
                className={styles["toggleButton"]}>
                {isExpanded ? <TbChevronUp className={styles["chevronIcon"]} /> : <TbChevronDown className={styles["chevronIcon"]} />}
                {isExpanded ? t("hideDetails") : t("showDetails")}
              </Button>
            }
          />
          <CollapsibleContent>
            <div className={styles["factorList"]}>
              {factors.map((factor) => (
                <div
                  key={factor.key}
                  className={styles["factorItem"]}>
                  <div className={styles["factorIcon"]}>
                    {factor.achieved ? <TbCheck className={styles["achievedIcon"]} /> : <TbX className={styles["missingIcon"]} />}
                  </div>
                  <div className={styles["factorContent"]}>
                    <span className={factor.achieved ? styles["achievedText"] : styles["missingText"]}>
                      {t(`factors.${factor.key}`)}
                      {factor.detail ? <span className={styles["factorDetail"]}> ({factor.detail})</span> : null}
                    </span>
                    <span className={styles["factorPoints"]}>{factor.achieved ? `+${factor.points}` : `${factor.points}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* CTA Button */}
        {showCTA ? (
          <div className={styles["ctaContainer"]}>
            <Button
              asChild
              variant='default'
              className={styles["ctaButton"]}>
              <Link href={`/domains/invoices/edit-invoice/${invoice.id}`}>
                <TbSparkles className={styles["ctaIcon"]} />
                {t("cta.analyze")}
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
