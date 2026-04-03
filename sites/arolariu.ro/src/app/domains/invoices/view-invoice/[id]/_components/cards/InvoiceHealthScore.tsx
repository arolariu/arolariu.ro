/**
 * @fileoverview Invoice Health Score component for view-invoice domain.
 * @module domains/invoices/view-invoice/[id]/components/cards/InvoiceHealthScore
 *
 * @remarks
 * Displays a comprehensive "health score" (0-100) for an invoice data quality,
 * encouraging users to improve data completeness and accuracy. Includes:
 * - Animated circular progress meter with color-coded status
 * - Weighted scoring across multiple quality dimensions
 * - Actionable improvement suggestions with direct links
 * - Detailed factor breakdown in collapsible view
 *
 * **Enhanced Score Calculation:**
 * | Factor | Weight | Criteria |
 * |--------|--------|----------|
 * | Products present | 15% | Has at least 1 product |
 * | Product completeness | 20% | % of products where metadata.isComplete = true |
 * | OCR confidence | 20% | Average of products' metadata.confidence (skip 0s) |
 * | Merchant linked | 10% | merchantReference is not empty/zero GUID |
 * | Payment info | 15% | Has transactionDate, totalCostAmount > 0, currency set |
 * | Categories assigned | 10% | % of products with category ≠ NOT_DEFINED |
 * | Recipes generated | 10% | Has at least 1 recipe |
 *
 * **Improvement Suggestions:**
 * Dynamically generated based on missing or incomplete data:
 * - Low OCR confidence → Review products manually
 * - No merchant linked → Add merchant details
 * - Uncategorized products → Assign categories
 * - No recipes → Run recipe analysis
 *
 * **Rendering Context:** Client Component (requires useState, useMemo).
 *
 * @see {@link useInvoiceContext} for data access
 * @see {@link InvoiceCategory} for category enum
 * @see {@link Product} for product structure
 * @see {@link ProductMetadata} for completeness flags
 */

"use client";

import {InvoiceCategory, ProductCategory} from "@/types/invoices";
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
import {TbAlertCircle, TbCheck, TbChevronDown, TbChevronUp, TbExternalLink, TbSparkles, TbX} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceHealthScore.module.scss";

/**
 * Represents a single score factor with its achievement status.
 *
 * @remarks
 * Used internally to track which factors contribute to the total score.
 * Enhanced to include percentage-based scoring for partial achievement.
 */
type ScoreFactor = {
  /** i18n key for the factor label */
  readonly key:
    | "productsPresent"
    | "productCompleteness"
    | "ocrConfidence"
    | "merchantLinked"
    | "paymentInfo"
    | "categoriesAssigned"
    | "recipesGenerated";
  /** Maximum points available for this factor */
  readonly maxPoints: number;
  /** Actual points earned (0 to maxPoints) */
  readonly earnedPoints: number;
  /** Whether this factor is fully achieved */
  readonly achieved: boolean;
  /** Optional detail text (e.g., percentage, count) */
  readonly detail?: string;
};

/**
 * Represents an actionable improvement suggestion for the user.
 *
 * @remarks
 * Suggestions are dynamically generated based on incomplete factors.
 */
/** Known suggestion key names matching `suggestions.*` in the i18n messages. */
type SuggestionKey =
  | "noProducts"
  | "incompleteProducts"
  | "lowOcrConfidence"
  | "noMerchant"
  | "incompletePayment"
  | "uncategorizedProducts"
  | "noRecipes"
  | "productsPresent"
  | "productCompleteness"
  | "ocrConfidence"
  | "merchantLinked"
  | "paymentInfo"
  | "categoriesAssigned"
  | "recipesGenerated";

type ImprovementSuggestion = {
  /** i18n key for the suggestion text (must match a `suggestions.*` key) */
  readonly key: SuggestionKey;
  /** Icon component to display */
  readonly icon: React.ComponentType<{className?: string}>;
  /** Optional link to navigate to for action */
  readonly link?: string;
  /** Optional detail parameters for i18n interpolation */
  readonly params?: Record<string, string | number>;
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
 * **Enhanced Scoring:**
 * - Weighted scoring across 7 quality dimensions
 * - Partial credit for incomplete factors (e.g., 50% product completeness)
 * - OCR confidence averaging (excludes zero-confidence products)
 *
 * **Improvement Suggestions:**
 * - Dynamically generated based on score gaps
 * - Actionable links to relevant edit screens
 * - Priority-ordered (highest impact first)
 *
 * **Performance:**
 * - Score computation is memoized to prevent unnecessary recalculations
 * - Collapsible sections reduce initial visual clutter
 *
 * **Color Coding:**
 * - Green (80-100): Excellent data quality
 * - Yellow (60-79): Good but needs improvement
 * - Red (0-59): Incomplete or low quality
 *
 * @returns Card component displaying invoice health score
 *
 * @example
 * ```tsx
 * // In view-invoice island.tsx
 * <InvoiceHealthScore />
 * ```
 */
export function InvoiceHealthScore(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const t = useTranslations("IMS--View.healthScore");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);

  /**
   * Compute comprehensive score factors with weighted scoring.
   *
   * @remarks
   * Memoized to prevent recalculation on every render.
   * Only recomputes when invoice reference changes.
   *
   * **Scoring Logic:**
   * - Products present (15 pts): Binary - has at least 1 product
   * - Product completeness (20 pts): Percentage of complete products
   * - OCR confidence (20 pts): Average confidence score (0-1 scale)
   * - Merchant linked (10 pts): Binary - has merchant reference
   * - Payment info (15 pts): Binary - has complete payment data
   * - Categories assigned (10 pts): Percentage of categorized products
   * - Recipes generated (10 pts): Binary - has at least 1 recipe
   */
  const {factors, score, maxScore, suggestions} = useMemo(() => {
    const items = invoice.items.filter((item) => !item.metadata.isSoftDeleted);
    const totalItems = items.length;

    // Factor 1: Products present (15 points)
    const hasProducts = totalItems > 0;
    const productsPoints = hasProducts ? 15 : 0;

    // Factor 2: Product completeness (20 points)
    const completeProducts = items.filter((item) => item.metadata.isComplete).length;
    const completenessRatio = totalItems > 0 ? completeProducts / totalItems : 0;
    const completenessPoints = Math.round(completenessRatio * 20);

    // Factor 3: OCR confidence (20 points)
    const confidenceScores = items.map((item) => item.metadata.confidence).filter((c) => c > 0);
    const avgConfidence = confidenceScores.length > 0 ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length : 0;
    const confidencePoints = Math.round(avgConfidence * 20);

    // Factor 4: Merchant linked (10 points)
    const hasMerchant = invoice.merchantReference !== EMPTY_GUID && invoice.merchantReference.length > 0;
    const merchantPoints = hasMerchant ? 10 : 0;

    // Factor 5: Payment info (15 points)
    const hasCompletePayment =
      Boolean(invoice.paymentInformation.transactionDate)
      && invoice.paymentInformation.totalCostAmount > 0
      && invoice.paymentInformation.currency.length > 0;
    const paymentPoints = hasCompletePayment ? 15 : 0;

    // Factor 6: Categories assigned (10 points)
    const categorizedProducts = items.filter((item) => item.category !== ProductCategory.NOT_DEFINED).length;
    const categoryRatio = totalItems > 0 ? categorizedProducts / totalItems : 0;
    const categoryPoints = Math.round(categoryRatio * 10);

    // Factor 7: Recipes generated (10 points)
    const hasRecipes = invoice.possibleRecipes.length > 0;
    const recipesPoints = hasRecipes ? 10 : 0;

    const computedFactors: ScoreFactor[] = [
      {
        key: "productsPresent",
        maxPoints: 15,
        earnedPoints: productsPoints,
        achieved: hasProducts,
        detail: totalItems > 0 ? String(totalItems) : undefined,
      },
      {
        key: "productCompleteness",
        maxPoints: 20,
        earnedPoints: completenessPoints,
        achieved: completenessRatio === 1,
        detail: totalItems > 0 ? `${Math.round(completenessRatio * 100)}%` : undefined,
      },
      {
        key: "ocrConfidence",
        maxPoints: 20,
        earnedPoints: confidencePoints,
        achieved: avgConfidence >= 0.9,
        detail: confidenceScores.length > 0 ? `${Math.round(avgConfidence * 100)}%` : undefined,
      },
      {
        key: "merchantLinked",
        maxPoints: 10,
        earnedPoints: merchantPoints,
        achieved: hasMerchant,
      },
      {
        key: "paymentInfo",
        maxPoints: 15,
        earnedPoints: paymentPoints,
        achieved: hasCompletePayment,
      },
      {
        key: "categoriesAssigned",
        maxPoints: 10,
        earnedPoints: categoryPoints,
        achieved: categoryRatio === 1,
        detail: totalItems > 0 ? `${Math.round(categoryRatio * 100)}%` : undefined,
      },
      {
        key: "recipesGenerated",
        maxPoints: 10,
        earnedPoints: recipesPoints,
        achieved: hasRecipes,
        detail: invoice.possibleRecipes.length > 0 ? String(invoice.possibleRecipes.length) : undefined,
      },
    ];

    const totalScore = computedFactors.reduce((sum, f) => sum + f.earnedPoints, 0);
    const totalMaxScore = computedFactors.reduce((sum, f) => sum + f.maxPoints, 0);

    // Generate improvement suggestions
    const improvementSuggestions: ImprovementSuggestion[] = [];

    if (!hasProducts) {
      improvementSuggestions.push({
        key: "noProducts",
        icon: TbAlertCircle,
        link: `/domains/invoices/edit-invoice/${invoice.id}`,
      });
    }

    if (totalItems > 0 && completenessRatio < 1) {
      const incompleteCount = totalItems - completeProducts;
      improvementSuggestions.push({
        key: "incompleteProducts",
        icon: TbAlertCircle,
        params: {count: incompleteCount},
        link: `/domains/invoices/edit-invoice/${invoice.id}`,
      });
    }

    if (confidenceScores.length > 0 && avgConfidence < 0.8) {
      const lowConfidenceCount = items.filter((item) => item.metadata.confidence > 0 && item.metadata.confidence < 0.8).length;
      improvementSuggestions.push({
        key: "lowOcrConfidence",
        icon: TbAlertCircle,
        params: {count: lowConfidenceCount},
        link: `/domains/invoices/edit-invoice/${invoice.id}`,
      });
    }

    if (!hasMerchant) {
      improvementSuggestions.push({
        key: "noMerchant",
        icon: TbAlertCircle,
        link: `/domains/invoices/edit-invoice/${invoice.id}`,
      });
    }

    if (!hasCompletePayment) {
      improvementSuggestions.push({
        key: "incompletePayment",
        icon: TbAlertCircle,
        link: `/domains/invoices/edit-invoice/${invoice.id}`,
      });
    }

    if (totalItems > 0 && categoryRatio < 1) {
      const uncategorizedCount = totalItems - categorizedProducts;
      improvementSuggestions.push({
        key: "uncategorizedProducts",
        icon: TbAlertCircle,
        params: {count: uncategorizedCount},
        link: `/domains/invoices/edit-invoice/${invoice.id}`,
      });
    }

    if (!hasRecipes) {
      improvementSuggestions.push({
        key: "noRecipes",
        icon: TbSparkles,
      });
    }

    return {
      factors: computedFactors,
      score: totalScore,
      maxScore: totalMaxScore,
      suggestions: improvementSuggestions,
    };
  }, [invoice]);

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  /**
   * Determine status color and label based on percentage.
   */
  const status = useMemo((): {key: "excellent" | "good" | "needsAttention" | "incomplete"; color: string} => {
    if (percentage >= 80) {
      return {key: "excellent", color: "success"};
    }
    if (percentage >= 60) {
      return {key: "good", color: "warning"};
    }
    if (percentage > 0) {
      return {key: "needsAttention", color: "error"};
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

        {/* Improvement Suggestions */}
        {suggestions.length > 0 && showSuggestions ? (
          <div className={styles["suggestionsContainer"]}>
            <div className={styles["suggestionsHeader"]}>
              <h4 className={styles["suggestionsTitle"]}>{t("suggestions.title")}</h4>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowSuggestions(false)}
                className={styles["dismissButton"]}>
                <TbX className={styles["dismissIcon"]} />
              </Button>
            </div>
            <div className={styles["suggestionsList"]}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.key}-${index}`}
                  className={styles["suggestionItem"]}>
                  <suggestion.icon className={styles["suggestionIcon"]} />
                  <span className={styles["suggestionText"]}>
                    {suggestion.params
                      ? t.rich(`suggestions.${suggestion.key}`, {
                          ...suggestion.params,
                          strong: (chunks) => <strong>{chunks}</strong>,
                        })
                      : t(`suggestions.${suggestion.key}`)}
                  </span>
                  {suggestion.link ? (
                    <Button
                      asChild
                      variant='ghost'
                      size='sm'
                      className={styles["suggestionAction"]}>
                      <Link href={suggestion.link}>
                        <TbExternalLink className={styles["actionIcon"]} />
                        {t("suggestions.fix")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

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
                    <span className={styles["factorPoints"]}>
                      {factor.earnedPoints}/{factor.maxPoints}
                    </span>
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
                {t("cta.edit")}
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
