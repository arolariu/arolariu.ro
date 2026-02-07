"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {TbBuildingStore, TbMinus, TbShoppingBag, TbTarget, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {ComparisonStats} from "../../_utils/analytics";
import styles from "./ComparisonStatsCard.module.scss";

type Props = {
  stats: ComparisonStats;
  currency: string;
};

function getTrendIcon(value: number): React.JSX.Element {
  if (value > 5) return <TbTrendingUp className='h-4 w-4 text-amber-500' />;
  if (value < -5) return <TbTrendingDown className='h-4 w-4 text-emerald-500' />;
  return <TbMinus className='text-muted-foreground h-4 w-4' />;
}

function getTrendColor(value: number): string {
  if (value > 5) return styles["trendAmber"] ?? "";
  if (value < -5) return styles["trendEmerald"] ?? "";
  return styles["trendMuted"] ?? "";
}

export function ComparisonStatsCard({stats, currency}: Readonly<Props>): React.JSX.Element {
  const percentageProgress = Math.min(((stats.currentAmount - stats.minAmount) / (stats.maxAmount - stats.minAmount)) * 100, 100);

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>How You Compare</CardTitle>
        <CardDescription className='text-xs'>Against your last {stats.totalInvoices} invoices</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Current vs Average */}
        <div className={styles["section"]}>
          <div className={styles["row"]}>
            <div className={styles["rowWithIcon"]}>
              <TbTarget className='text-muted-foreground h-4 w-4' />
              <span className={styles["label"]}>vs Average</span>
            </div>
            <div className={styles["trendRow"]}>
              {getTrendIcon(stats.percentageDiff)}
              <span className={`${styles["trendValue"]} ${getTrendColor(stats.percentageDiff)}`}>
                {stats.percentageDiff > 0 ? "+" : ""}
                {stats.percentageDiff}%
              </span>
            </div>
          </div>
          <div className={styles["mutedRow"]}>
            <span>
              Avg: {stats.averageAmount.toFixed(2)} {currency}
            </span>
            <span>
              This: {stats.currentAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        {/* Spending Range Progress */}
        <div className={styles["section"]}>
          <div className={styles["mutedRow"]}>
            <span>Min: {stats.minAmount.toFixed(0)}</span>
            <span>Max: {stats.maxAmount.toFixed(0)}</span>
          </div>
          <Progress
            value={percentageProgress}
            className='h-2'
          />
          <p className={styles["positionLabel"]}>Your position in spending range</p>
        </div>

        {/* Item Count Comparison */}
        <div className={styles["borderTopRow"]}>
          <div className={styles["rowWithIcon"]}>
            <TbShoppingBag className='text-muted-foreground h-4 w-4' />
            <span className={styles["label"]}>Item Count</span>
          </div>
          <div className={styles["rightAlign"]}>
            <div className={styles["trendRow"]}>
              {getTrendIcon(stats.itemCountDiff)}
              <span className={`${styles["trendValue"]} ${getTrendColor(stats.itemCountDiff)}`}>
                {stats.itemCountDiff > 0 ? "+" : ""}
                {stats.itemCountDiff}%
              </span>
            </div>
            <span className={styles["subLabel"]}>
              {stats.currentItemCount} vs avg {stats.averageItemCount}
            </span>
          </div>
        </div>

        {/* Same Merchant Comparison */}
        <div className={styles["borderTopRow"]}>
          <div className={styles["rowWithIcon"]}>
            <TbBuildingStore className='text-muted-foreground h-4 w-4' />
            <span className={styles["label"]}>Same Store</span>
          </div>
          <div className={styles["rightAlign"]}>
            <div className={styles["trendRow"]}>
              {getTrendIcon(stats.sameMerchantDiff)}
              <span className={`${styles["trendValue"]} ${getTrendColor(stats.sameMerchantDiff)}`}>
                {stats.sameMerchantDiff > 0 ? "+" : ""}
                {stats.sameMerchantDiff}%
              </span>
            </div>
            <span className={styles["subLabel"]}>
              vs avg {stats.sameMerchantAvg.toFixed(0)} {currency}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
