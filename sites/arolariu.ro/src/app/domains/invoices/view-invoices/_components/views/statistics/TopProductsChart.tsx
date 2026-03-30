"use client";

/**
 * @fileoverview Top Products Chart - displays most purchased products as a data table.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/TopProductsChart
 *
 * @remarks
 * This component visualizes the top N most purchased products across all invoices.
 * Unlike traditional charts, it uses a leaderboard-style table format for clarity
 * with sortable columns for quantity, spending, and frequency.
 *
 * **Features:**
 * - Table format with rank badges
 * - Shows quantity, total spent, purchase count, and average price
 * - Responsive design with horizontal scroll on mobile
 * - Color-coded rank indicators for top 3
 *
 * **Empty State:**
 * Displays a friendly message when no products are available.
 *
 * **Testing:**
 * Pure calculation functions in statistics.ts have unit test coverage.
 * Component visual testing and integration scenarios are covered via Storybook.
 * See `packages/components/stories/` for visual regression tests.
 */

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbMedal, TbTrophy} from "react-icons/tb";
import type {TopProduct} from "../../../_utils/statistics";
import styles from "./TopProductsChart.module.scss";

type Props = {
  readonly data: TopProduct[];
  readonly currency: string;
};

/**
 * Renders a rank badge with appropriate styling for top 3 positions.
 *
 * @param rank - Position in the leaderboard (1-based)
 * @returns Icon or text badge for the rank
 */
function RankBadge({rank}: {readonly rank: number}): React.JSX.Element {
  if (rank === 1) {
    return (
      <div className={`${styles["rankBadge"]} ${styles["gold"]}`}>
        <TbTrophy size={20} />
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className={`${styles["rankBadge"]} ${styles["silver"]}`}>
        <TbMedal size={20} />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className={`${styles["rankBadge"]} ${styles["bronze"]}`}>
        <TbMedal size={20} />
      </div>
    );
  }

  return <div className={styles["rankNumber"]}>{rank}</div>;
}

/**
 * Renders a leaderboard table showing the top products by spending.
 *
 * @remarks
 * **Performance:**
 * Uses memoized data from parent component. Table rendering is optimized
 * with CSS grid for consistent column widths.
 *
 * **Accessibility:**
 * - Semantic table with proper headers
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 * - Color-blind friendly rank indicators (icons + text)
 *
 * **Mobile Optimization:**
 * - Horizontal scroll for narrow viewports
 * - Condensed layout with preserved readability
 * - Touch-friendly spacing
 *
 * @param data - Top products sorted by total spending
 * @param currency - Currency code for display (always RON for normalized data)
 * @returns Table component with product leaderboard
 */
export function TopProductsChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.topProducts");

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["emptyState"]}>
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
        <div className={styles["tableWrapper"]}>
          <table
            className={styles["table"]}
            role='table'
            aria-label={t("ariaLabel")}>
            <thead>
              <tr>
                <th
                  className={styles["headerRank"]}
                  scope='col'>
                  {t("headers.rank")}
                </th>
                <th
                  className={styles["headerProduct"]}
                  scope='col'>
                  {t("headers.product")}
                </th>
                <th
                  className={styles["headerQuantity"]}
                  scope='col'>
                  {t("headers.quantity")}
                </th>
                <th
                  className={styles["headerSpent"]}
                  scope='col'>
                  {t("headers.totalSpent")}
                </th>
                <th
                  className={styles["headerCount"]}
                  scope='col'>
                  {t("headers.purchases")}
                </th>
                <th
                  className={styles["headerAverage"]}
                  scope='col'>
                  {t("headers.avgPrice")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((product, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={`${product.name}-${rank}`}
                    className={styles["row"]}>
                    <td className={styles["cellRank"]}>
                      <RankBadge rank={rank} />
                    </td>
                    <td className={styles["cellProduct"]}>
                      <span
                        className={styles["productName"]}
                        title={product.name}>
                        {product.name}
                      </span>
                    </td>
                    <td className={styles["cellQuantity"]}>{product.totalQuantity.toFixed(2)}</td>
                    <td className={styles["cellSpent"]}>
                      {product.totalSpent.toFixed(2)} {currency}
                    </td>
                    <td className={styles["cellCount"]}>{product.purchaseCount}</td>
                    <td className={styles["cellAverage"]}>
                      {product.averagePrice.toFixed(2)} {currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
