"use client";

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {TbGrid3X3, TbPackage, TbPercentage, TbReceipt, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {InvoiceSummary} from "../../_utils/analytics";
import styles from "./SummaryStatsCard.module.scss";

type Props = {
  summary: InvoiceSummary;
  currency: string;
};

export function SummaryStatsCard({summary, currency}: Readonly<Props>): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const stats = [
    {
      label: t((m) => m["IMS--Cards"].summaryStatsCard.stats.totalItems.label),
      value: summary.totalItems.toString(),
      icon: TbPackage,
      description: t((m) => m["IMS--Cards"].summaryStatsCard.stats.totalItems.description),
    },
    {
      label: t((m) => m["IMS--Cards"].summaryStatsCard.stats.categories.label),
      value: summary.uniqueCategories.toString(),
      icon: TbGrid3X3,
      description: t((m) => m["IMS--Cards"].summaryStatsCard.stats.categories.description),
    },
    {
      label: t((m) => m["IMS--Cards"].summaryStatsCard.stats.averagePrice.label),
      value: `${formatAmount(summary.averageItemPrice)}`,
      icon: TbReceipt,
      description: t((m) => m["IMS--Cards"].summaryStatsCard.stats.averagePrice.description, {currency}),
    },
    {
      label: t((m) => m["IMS--Cards"].summaryStatsCard.stats.taxRate.label),
      value: `${formatAmount(summary.taxPercentage, locale, 1)}%`,
      icon: TbPercentage,
      description: t((m) => m["IMS--Cards"].summaryStatsCard.stats.taxRate.description, {amount: formatAmount(summary.taxAmount), currency}),
    },
  ];

  return (
    <div className={styles["card"]}>
      <Card>
        <CardHeader>
          <CardTitle>{t((m) => m["IMS--Cards"].summaryStatsCard.title)}</CardTitle>
          <CardDescription>{t((m) => m["IMS--Cards"].summaryStatsCard.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles["statsGrid"]}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={styles["statItem"]}>
                <div className={styles["statLabel"]}>
                  <stat.icon className={styles["iconSm"]} />
                  <span className={styles["statLabelText"]}>{stat.label}</span>
                </div>
                <p className={styles["statValue"]}>{stat.value}</p>
                <p className={styles["statDescription"]}>{stat.description}</p>
              </div>
            ))}
          </div>

          <div className={styles["extremesSection"]}>
            <div className={styles["extremeRow"]}>
              <div className={styles["extremeLabel"]}>
                <TbTrendingUp className={styles["iconEmerald"]} />
                <span className={styles["extremeLabelText"]}>{t((m) => m["IMS--Cards"].summaryStatsCard.extremes.highest)}</span>
              </div>
              <div className={styles["extremeRight"]}>
                <p className={styles["extremePrice"]}>
                  {formatAmount(summary.highestItem.price)} {currency}
                </p>
                <p className={styles["extremeName"]}>{summary.highestItem.name}</p>
              </div>
            </div>

            <div className={styles["extremeRow"]}>
              <div className={styles["extremeLabel"]}>
                <TbTrendingDown className={styles["iconBlue"]} />
                <span className={styles["extremeLabelText"]}>{t((m) => m["IMS--Cards"].summaryStatsCard.extremes.lowest)}</span>
              </div>
              <div className={styles["extremeRight"]}>
                <p className={styles["extremePrice"]}>
                  {formatAmount(summary.lowestItem.price)} {currency}
                </p>
                <p className={styles["extremeName"]}>{summary.lowestItem.name}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
