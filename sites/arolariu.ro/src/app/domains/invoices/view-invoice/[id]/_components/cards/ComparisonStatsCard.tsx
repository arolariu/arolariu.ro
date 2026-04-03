"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbBuildingStore, TbMinus, TbShoppingBag, TbTarget, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {ComparisonStats} from "../../_utils/analytics";
import styles from "./ComparisonStatsCard.module.scss";

type Props = {
  stats: ComparisonStats;
  currency: string;
};

function getTrendIcon(value: number): React.JSX.Element {
  if (value > 5) return <TbTrendingUp className={styles["trendIconAmber"]} />;
  if (value < -5) return <TbTrendingDown className={styles["trendIconEmerald"]} />;
  return <TbMinus className={styles["trendIconMuted"]} />;
}

function getTrendColor(value: number): string {
  if (value > 5) return styles["trendAmber"] ?? "";
  if (value < -5) return styles["trendEmerald"] ?? "";
  return styles["trendMuted"] ?? "";
}

export function ComparisonStatsCard({stats, currency}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--Cards.comparisonStatsCard");
  const percentageProgress = Math.min(((stats.currentAmount - stats.minAmount) / (stats.maxAmount - stats.minAmount)) * 100, 100);

  return (
    <div className={styles["card"]}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle", {count: String(stats.totalInvoices)})}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles["contentSpaced"]}>
            {/* Current vs Average */}
            <div className={styles["section"]}>
              <div className={styles["row"]}>
                <div className={styles["rowWithIcon"]}>
                  <TbTarget className={styles["iconMuted"]} />
                  <span className={styles["label"]}>{t("vsAverage")}</span>
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
                <span>{t("avgValue", {amount: stats.averageAmount.toFixed(2), currency})}</span>
                <span>{t("thisValue", {amount: stats.currentAmount.toFixed(2), currency})}</span>
              </div>
            </div>

            {/* Spending Range Progress */}
            <div className={styles["section"]}>
              <div className={styles["mutedRow"]}>
                <span>{t("minValue", {amount: stats.minAmount.toFixed(0)})}</span>
                <span>{t("maxValue", {amount: stats.maxAmount.toFixed(0)})}</span>
              </div>
              <Progress value={percentageProgress} />
              <p className={styles["positionLabel"]}>{t("positionInRange")}</p>
            </div>

            {/* Item Count Comparison */}
            <div className={styles["borderTopRow"]}>
              <div className={styles["rowWithIcon"]}>
                <TbShoppingBag className={styles["iconMuted"]} />
                <span className={styles["label"]}>{t("itemCount")}</span>
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
                  {t("itemCountComparison", {current: String(stats.currentItemCount), average: String(stats.averageItemCount)})}
                </span>
              </div>
            </div>

            {/* Same Merchant Comparison */}
            <div className={styles["borderTopRow"]}>
              <div className={styles["rowWithIcon"]}>
                <TbBuildingStore className={styles["iconMuted"]} />
                <span className={styles["label"]}>{t("sameStore")}</span>
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
                  {t("sameStoreComparison", {average: stats.sameMerchantAvg.toFixed(0), currency})}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
