"use client";

import {Product, ProductCategory} from "@/types/invoices";
import {Alert, AlertDescription, AlertTitle, Badge, Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useMemo, useState} from "react";
import {TbAlertCircle, TbChevronDown, TbX} from "react-icons/tb";
import styles from "./GuidedEditBanner.module.scss";

type Props = Readonly<{
  /** The invoice items to analyze for completeness */
  readonly items: Product[];
  /** Callback to scroll to the first item needing attention */
  readonly onReviewAll?: () => void;
}>;

/**
 * Dismissible banner displaying incomplete product statistics and guided editing.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Purpose**: Surfaces products requiring manual review after AI analysis:
 * - Products with `metadata.isComplete === false`
 * - Products with low OCR confidence (`metadata.confidence < 0.7`)
 * - Products with `category === ProductCategory.NOT_DEFINED`
 * - Products with empty `name`
 *
 * **Dismissal Behavior**:
 * - Banner can be dismissed via X button
 * - Dismissal state persists in localStorage per invoice
 * - Can be re-enabled by clearing localStorage or resetting state
 *
 * **Summary Breakdown**:
 * Displays counts for:
 * - Total incomplete products
 * - Uncategorized products
 * - Low confidence extractions
 * - Missing names
 *
 * **Actions**:
 * - "Review All" button scrolls to first flagged item
 * - "Dismiss" button hides banner
 *
 * **Animation**: Uses Framer Motion for smooth entrance/exit transitions.
 *
 * **Domain Context**: Part of guided editing feature for edit-invoice page.
 *
 * @param props - Component properties containing items array and optional callback
 * @returns Client-rendered banner or null if dismissed or no issues found
 *
 * @example
 * ```tsx
 * <GuidedEditBanner
 *   items={invoice.items}
 *   onReviewAll={() => scrollToFirstIncompleteItem()}
 * />
 * ```
 *
 * @see {@link Product} - Product type with metadata
 * @see {@link ProductCategory} - Product category enum
 */
export default function GuidedEditBanner({items, onReviewAll}: Props): React.JSX.Element | null {
  const t = useTranslations("IMS--Edit.guidedEditBanner");
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage on mount for dismissal state
  useEffect(() => {
    const dismissed = localStorage.getItem("guidedEditBannerDismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  // Analyze products for issues
  const analysis = useMemo(() => {
    const incomplete: Product[] = [];
    const lowConfidence: Product[] = [];
    const uncategorized: Product[] = [];
    const missingName: Product[] = [];

    items.forEach((item) => {
      // Skip soft-deleted items
      if (item.metadata.isSoftDeleted) return;

      // Check for incomplete products
      if (!item.metadata.isComplete) {
        incomplete.push(item);
      }

      // Check for low confidence (only if confidence > 0, meaning OCR was attempted)
      if (item.metadata.confidence > 0 && item.metadata.confidence < 0.7) {
        lowConfidence.push(item);
      }

      // Check for uncategorized products
      if (item.category === ProductCategory.NOT_DEFINED) {
        uncategorized.push(item);
      }

      // Check for missing name
      if (!item.name.trim()) {
        missingName.push(item);
      }
    });

    return {
      incomplete,
      lowConfidence,
      uncategorized,
      missingName,
      totalIssues: incomplete.length,
    };
  }, [items]);

  // Handle dismiss action
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem("guidedEditBannerDismissed", "true");
  }, []);

  // Don't show banner if dismissed or no issues found
  if (isDismissed || analysis.totalIssues === 0) {
    return null;
  }

  // Build summary text
  const buildSummary = (): string => {
    const parts: string[] = [];

    if (analysis.uncategorized.length > 0) {
      parts.push(t("summary.uncategorized", {count: analysis.uncategorized.length}));
    }

    if (analysis.lowConfidence.length > 0) {
      parts.push(t("summary.lowConfidence", {count: analysis.lowConfidence.length}));
    }

    if (analysis.missingName.length > 0) {
      parts.push(t("summary.missingName", {count: analysis.missingName.length}));
    }

    return parts.join(", ");
  };

  return (
    <motion.div
      initial={{opacity: 0, y: -20}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -20}}
      transition={{duration: 0.3}}
      className={styles["bannerContainer"]}>
      <Alert
        variant='default'
        className={styles["banner"]}>
        <TbAlertCircle className={styles["alertIcon"]} />
        <div className={styles["content"]}>
          <div className={styles["header"]}>
            <AlertTitle className={styles["title"]}>{t("title", {count: analysis.totalIssues})}</AlertTitle>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleDismiss}
              className={styles["dismissButton"]}
              aria-label={t("actions.dismiss")}>
              <TbX className={styles["dismissIcon"]} />
            </Button>
          </div>

          <AlertDescription className={styles["description"]}>{buildSummary()}</AlertDescription>

          <div className={styles["actions"]}>
            {onReviewAll && (
              <Button
                variant='default'
                size='sm'
                onClick={onReviewAll}
                className={styles["reviewButton"]}>
                <TbChevronDown className={styles["reviewIcon"]} />
                {t("actions.reviewAll")}
              </Button>
            )}

            {/* Display issue counts as badges */}
            <div className={styles["badges"]}>
              {analysis.uncategorized.length > 0 && (
                <Badge
                  variant='secondary'
                  className={styles["badge"]}>
                  {t("badges.uncategorized", {count: analysis.uncategorized.length})}
                </Badge>
              )}
              {analysis.lowConfidence.length > 0 && (
                <Badge
                  variant='secondary'
                  className={styles["badge"]}>
                  {t("badges.lowConfidence", {count: analysis.lowConfidence.length})}
                </Badge>
              )}
              {analysis.missingName.length > 0 && (
                <Badge
                  variant='secondary'
                  className={styles["badge"]}>
                  {t("badges.missingName", {count: analysis.missingName.length})}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </motion.div>
  );
}
