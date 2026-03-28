/**
 * @fileoverview Related Invoices card displaying similar invoices in a horizontal carousel.
 * @module domains/invoices/view-invoice/[id]/components/cards/RelatedInvoicesCard
 *
 * @remarks
 * Displays a horizontal scrollable row of related invoices based on:
 * - Same Merchant: Invoices from the same merchant
 * - Same Category: Invoices with the same category
 * - Similar Amount: Invoices within ±30% of the current invoice amount
 *
 * **Rendering Context**: Client Component (requires hooks and interactivity).
 *
 * **Data Sources:**
 * - Invoice context: current invoice and merchant
 * - Invoices store: all user invoices for comparison
 *
 * **Performance:**
 * - Related invoices computation is memoized with `useMemo`
 * - Only recomputes when invoices array changes
 * - Maximum of 6 related invoices displayed
 *
 * **Empty States:**
 * - Displays friendly message when no related invoices found
 * - Hidden completely if user has only one invoice
 */

"use client";

import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {Badge, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useMemo} from "react";
import {TbArrowRight, TbCalendar, TbReceipt, TbTag} from "react-icons/tb";
import {useShallow} from "zustand/react/shallow";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./RelatedInvoicesCard.module.scss";

/**
 * Type for relationship between current and related invoice.
 *
 * @remarks
 * Used for badge display to show why an invoice is related.
 */
type RelationType = "sameMerchant" | "sameCategory" | "similarAmount";

/**
 * Extended invoice type with relationship metadata.
 *
 * @remarks
 * Includes the primary reason why this invoice is considered related.
 * Multiple reasons may apply, but only the primary one is displayed.
 */
type RelatedInvoiceWithMeta = {
  /** The related invoice */
  readonly invoice: Invoice;
  /** Primary relationship type */
  readonly relationType: RelationType;
};

/**
 * Calculates whether two amounts are similar (within ±30% range).
 *
 * @param amount1 - First amount to compare
 * @param amount2 - Second amount to compare
 * @returns True if amounts are within ±30% of each other
 *
 * @example
 * ```typescript
 * isSimilarAmount(100, 120); // true (+20%)
 * isSimilarAmount(100, 150); // false (+50%)
 * isSimilarAmount(100, 75); // true (-25%)
 * isSimilarAmount(100, 60); // false (-40%)
 * ```
 */
function isSimilarAmount(amount1: number, amount2: number): boolean {
  const threshold = 0.3; // ±30%
  const difference = Math.abs(amount1 - amount2);
  const average = (amount1 + amount2) / 2;
  return difference / average <= threshold;
}

/**
 * Client Component displaying a carousel of related invoices.
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive required).
 *
 * **Why Client Component?**
 * - Uses custom hooks (useInvoiceContext, useInvoicesStore)
 * - Interactive carousel with horizontal scrolling
 * - Motion animations on entrance
 *
 * **Related Invoice Logic:**
 * 1. **Same Merchant** (highest priority): Invoices from the same merchant
 * 2. **Same Category**: Invoices with matching category
 * 3. **Similar Amount**: Invoices within ±30% of current amount
 *
 * **Deduplication:**
 * - Current invoice is always excluded
 * - If an invoice matches multiple criteria, only the highest priority relationship is shown
 *
 * **Sorting:**
 * - Same merchant invoices appear first
 * - Then same category
 * - Then similar amount
 * - Within each group, sorted by date (newest first)
 *
 * **Performance:**
 * - Related invoices are computed with `useMemo` to prevent unnecessary recalculations
 * - Zustand store access uses `useShallow` to avoid unnecessary re-renders
 *
 * @returns Related invoices carousel card component
 *
 * @example
 * ```tsx
 * // In island.tsx center column
 * <div className={styles["centerItem"]}>
 *   <RelatedInvoicesCard />
 * </div>
 * ```
 */
export function RelatedInvoicesCard(): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoice.relatedInvoices");
  const {invoice: currentInvoice} = useInvoiceContext();
  const invoices = useInvoicesStore(useShallow((state) => state.invoices));

  // Extract values for memoization dependencies
  const currentAmount = currentInvoice.paymentInformation.totalCostAmount;
  const currentCategory = currentInvoice.category;
  const currentMerchantId = currentInvoice.merchantReference;

  /**
   * Memoized computation of related invoices with relationship metadata.
   *
   * @remarks
   * **Performance:** Only recomputes when invoices array or current invoice changes.
   *
   * **Algorithm:**
   * 1. Filter out current invoice
   * 2. Map each invoice to its relationship type (highest priority wins)
   * 3. Sort by relationship priority and date
   * 4. Take max 6 invoices
   *
   * **Priority Order:**
   * - Same merchant (highest)
   * - Same category
   * - Similar amount (lowest)
   */
  const relatedInvoices = useMemo<RelatedInvoiceWithMeta[]>(() => {
    // Filter and map invoices to their relationship type
    const related = invoices
      .filter((inv) => inv.id !== currentInvoice.id)
      .map((inv): RelatedInvoiceWithMeta | null => {
        // Same merchant (highest priority)
        if (inv.merchantReference === currentMerchantId) {
          return {invoice: inv, relationType: "sameMerchant"};
        }

        // Same category
        if (inv.category === currentCategory && currentCategory !== 0) {
          return {invoice: inv, relationType: "sameCategory"};
        }

        // Similar amount
        if (isSimilarAmount(inv.paymentInformation.totalCostAmount, currentAmount)) {
          return {invoice: inv, relationType: "similarAmount"};
        }

        return null;
      })
      .filter((item): item is RelatedInvoiceWithMeta => item !== null);

    // Sort by priority and date
    const priorityOrder: Record<RelationType, number> = {
      sameMerchant: 1,
      sameCategory: 2,
      similarAmount: 3,
    };

    return related
      .sort((a, b) => {
        // First by priority
        const priorityDiff = priorityOrder[a.relationType] - priorityOrder[b.relationType];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by date (newest first)
        return new Date(b.invoice.createdAt).getTime() - new Date(a.invoice.createdAt).getTime();
      })
      .slice(0, 6); // Max 6 related invoices
  }, [invoices, currentInvoice, currentCategory, currentAmount, currentMerchantId]);

  // Don't render if no related invoices
  if (relatedInvoices.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.3}}>
      <Card>
        <CardHeader>
          <div className={styles["header"]}>
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <p className={styles["subtitle"]}>{t("subtitle")}</p>
            </div>
            <TbReceipt className={styles["headerIcon"]} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={styles["carouselContainer"]}>
            <div className={styles["carousel"]}>
              {relatedInvoices.map(({invoice, relationType}) => (
                <RelatedInvoiceMiniCard
                  key={invoice.id}
                  invoice={invoice}
                  relationType={relationType}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Props for the RelatedInvoiceMiniCard component.
 */
interface RelatedInvoiceMiniCardProps {
  /** The related invoice to display */
  readonly invoice: Invoice;
  /** The relationship type with current invoice */
  readonly relationType: RelationType;
}

/**
 * Mini card displaying a related invoice in the carousel.
 *
 * @remarks
 * Compact card showing essential invoice information:
 * - Invoice name
 * - Date
 * - Total amount
 * - Category badge
 * - Relationship badge
 *
 * **Interactions:**
 * - Entire card is clickable and navigates to the invoice detail page
 * - Hover effect for better UX
 *
 * @param props - Component props
 * @param props.invoice - The related invoice to display
 * @param props.relationType - The relationship type (for badge display)
 * @returns Mini invoice card component
 */
function RelatedInvoiceMiniCard({invoice, relationType}: Readonly<RelatedInvoiceMiniCardProps>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.relatedInvoices");

  const formattedDate = new Date(invoice.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const amount = `${invoice.paymentInformation.currency.symbol}${invoice.paymentInformation.totalCostAmount.toFixed(2)}`;

  const relationTypeBadge = t(relationType);

  return (
    <Link
      href={`/domains/invoices/view-invoice/${invoice.id}`}
      className={styles["miniCard"]}>
      <div className={styles["miniCardContent"]}>
        {/* Relationship Badge */}
        <Badge
          variant='secondary'
          className={styles["relationBadge"]}>
          {relationTypeBadge}
        </Badge>

        {/* Invoice Name */}
        <h4 className={styles["invoiceName"]}>{invoice.name}</h4>

        {/* Date */}
        <div className={styles["infoRow"]}>
          <TbCalendar className={styles["icon"]} />
          <span className={styles["infoText"]}>{formattedDate}</span>
        </div>

        {/* Amount */}
        <div className={styles["amount"]}>{amount}</div>

        {/* Category Badge */}
        {invoice.category !== 0 && (
          <div className={styles["categoryRow"]}>
            <TbTag className={styles["icon"]} />
            <Badge variant='outline'>{invoice.category}</Badge>
          </div>
        )}

        {/* View Arrow */}
        <div className={styles["viewAction"]}>
          <span className={styles["viewText"]}>{t("viewInvoice")}</span>
          <TbArrowRight className={styles["arrowIcon"]} />
        </div>
      </div>
    </Link>
  );
}
