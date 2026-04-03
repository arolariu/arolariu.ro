"use client";

/**
 * @fileoverview Comparison Cards - displays month-over-month comparison metrics.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/ComparisonCards
 */

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbArrowDown, TbArrowUp, TbBuildingStore, TbMinus, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import type {MonthComparison} from "../../../_utils/statistics";
import styles from "./ComparisonCards.module.scss";

type Props = {
  readonly data: MonthComparison;
  readonly currency: string;
};

type ComparisonCardProps = {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly isPositive: boolean | null;
  readonly progressValue: number;
  readonly index: number;
};

/**
 * Individual comparison card showing a metric and its change.
 */
function ComparisonCard({icon, label, value, delta, isPositive, progressValue, index}: ComparisonCardProps): React.JSX.Element {
  const getTrendIcon = (): React.JSX.Element => {
    if (isPositive === null) return <TbMinus size={16} />;
    return isPositive ? <TbTrendingUp size={16} /> : <TbTrendingDown size={16} />;
  };

  const getTrendClass = (): string => {
    if (isPositive === null) return styles["trendNeutral"];
    return isPositive ? styles["trendPositive"] : styles["trendNegative"];
  };

  const trendIcon = getTrendIcon();
  const trendClass = getTrendClass();

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, delay: index * 0.1}}>
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <div className={styles["headerContent"]}>
            <div className={styles["iconWrapper"]}>{icon}</div>
            <CardTitle className={styles["cardTitle"]}>{label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["valueSection"]}>
            <p className={styles["value"]}>{value}</p>
            <div className={`${styles["trend"]} ${trendClass}`}>
              {trendIcon}
              <span>{delta}</span>
            </div>
          </div>
          <Progress
            value={progressValue}
            className={styles["progress"]}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Renders comparison cards showing month-over-month changes.
 *
 * @param data - Computed comparison metrics
 * @param currency - Currency code for display
 * @returns Grid of comparison cards
 */
export function ComparisonCards({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("IMS--Stats.comparison");

  const spendingIcon = data.spendingDelta < 0 ? <TbArrowDown size={20} /> : <TbArrowUp size={20} />;
  const invoiceIcon = data.invoiceCountDelta < 0 ? <TbArrowDown size={20} /> : <TbArrowUp size={20} />;

  const cards: Omit<ComparisonCardProps, "index">[] = [
    {
      icon: spendingIcon,
      label: t("spendingDelta"),
      value: `${formatAmount(Math.abs(data.spendingDelta))} ${currency}`,
      delta: `${data.spendingDeltaPercent >= 0 ? "+" : ""}${formatAmount(data.spendingDeltaPercent, "en-US", 1)}%`,
      isPositive: data.spendingDelta < 0, // Spending less is positive (saving)
      progressValue: Math.min(Math.abs(data.spendingDeltaPercent), 100),
    },
    {
      icon: invoiceIcon,
      label: t("invoiceCount"),
      value: Math.abs(data.invoiceCountDelta).toString(),
      delta: `${data.invoiceCountDelta >= 0 ? "+" : ""}${data.invoiceCountDelta}`,
      isPositive: data.invoiceCountDelta >= 0,
      progressValue: Math.min(Math.abs(data.invoiceCountDelta) * 10, 100),
    },
    {
      icon: <TbBuildingStore size={20} />,
      label: t("newMerchants"),
      value: data.newMerchantCount.toString(),
      delta: data.newMerchantCount > 0 ? t("discovered") : t("none"),
      isPositive: data.newMerchantCount > 0 ? true : null,
      progressValue: Math.min(data.newMerchantCount * 20, 100),
    },
  ];

  return (
    <div className={styles["container"]}>
      <h3 className={styles["sectionTitle"]}>{t("title")}</h3>
      <div className={styles["grid"]}>
        {cards.map((card, index) => (
          <ComparisonCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            delta={card.delta}
            isPositive={card.isPositive}
            progressValue={card.progressValue}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
