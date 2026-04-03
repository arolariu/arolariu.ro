"use client";

/**
 * @fileoverview KPI Summary Row - displays key performance indicators in animated cards.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/KPISummaryRow
 */

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbBuildingStore, TbCurrencyDollar, TbReceipt, TbShoppingCart, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import type {KPIData} from "../../../_utils/statistics";
import styles from "./KPISummaryRow.module.scss";

type Props = {
  readonly data: KPIData;
  readonly currency: string;
};

type KPICardProps = {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
  readonly subtitle: string;
  readonly trend?: {value: number; isPositive: boolean} | null;
  readonly index: number;
};

/**
 * Individual KPI card with icon, value, and optional trend indicator.
 */
function KPICard({icon, label, value, subtitle, trend, index}: KPICardProps): React.JSX.Element {
  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4, delay: index * 0.1}}>
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <div className={styles["iconWrapper"]}>{icon}</div>
          <CardTitle className={styles["cardTitle"]}>{label}</CardTitle>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["valueSection"]}>
            <motion.p
              className={styles["value"]}
              initial={{scale: 0.8}}
              animate={{scale: 1}}
              transition={{duration: 0.3, delay: index * 0.1 + 0.2}}>
              {value}
            </motion.p>
            {trend ? (
              <div className={`${styles["trend"]} ${trend.isPositive ? styles["trendUp"] : styles["trendDown"]}`}>
                {trend.isPositive ? <TbTrendingUp size={16} /> : <TbTrendingDown size={16} />}
                <span>{formatAmount(Math.abs(trend.value), "en-US", 1)}%</span>
              </div>
            ) : null}
          </div>
          <p className={styles["subtitle"]}>{subtitle}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Renders a row of KPI summary cards with key metrics.
 *
 * @param data - Computed KPI data
 * @param currency - Currency code for display
 * @returns Row of animated KPI cards
 */
export function KPISummaryRow({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.kpi");

  const kpiCards: Omit<KPICardProps, "index">[] = [
    {
      icon: <TbCurrencyDollar size={24} />,
      label: t("totalSpending"),
      value: `${formatAmount(data.totalSpending)} ${currency}`,
      subtitle: `${data.invoiceCount} invoices`,
    },
    {
      icon: <TbReceipt size={24} />,
      label: t("invoiceCount"),
      value: data.invoiceCount.toString(),
      subtitle: t("avgPerInvoice", {
        amount: data.invoiceCount > 0 ? formatAmount(data.totalSpending / data.invoiceCount) : formatAmount(0),
      }),
    },
    {
      icon: <TbBuildingStore size={24} />,
      label: t("topMerchant"),
      value: data.mostFrequentMerchant ? data.mostFrequentMerchant.id.slice(0, 12) : t("noneYet"),
      subtitle: data.mostFrequentMerchant ? t("visits", {count: String(data.mostFrequentMerchant.count)}) : "",
    },
    {
      icon: <TbShoppingCart size={24} />,
      label: t("averageItems"),
      value: formatAmount(data.averageItemsPerInvoice, "en-US", 1),
      subtitle: t("acrossInvoices", {count: String(data.invoiceCount)}),
    },
  ];

  return (
    <div className={styles["container"]}>
      {kpiCards.map((card, index) => (
        <KPICard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          subtitle={card.subtitle}
          trend={card.trend}
          index={index}
        />
      ))}
    </div>
  );
}
