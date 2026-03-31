"use client";

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbGrid3X3, TbPackage, TbPercentage, TbReceipt, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {InvoiceSummary} from "../../_utils/analytics";
import styles from "./SummaryStatsCard.module.scss";

type Props = {
  summary: InvoiceSummary;
  currency: string;
};

export function SummaryStatsCard({summary, currency}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.summaryStatsCard");
  const stats = [
    {
      label: t("stats.totalItems.label"),
      value: summary.totalItems.toString(),
      icon: TbPackage,
      description: t("stats.totalItems.description"),
    },
    {
      label: t("stats.categories.label"),
      value: summary.uniqueCategories.toString(),
      icon: TbGrid3X3,
      description: t("stats.categories.description"),
    },
    {
      label: t("stats.averagePrice.label"),
      value: `${formatAmount(summary.averageItemPrice)}`,
      icon: TbReceipt,
      description: t("stats.averagePrice.description", {currency}),
    },
    {
      label: t("stats.taxRate.label"),
      value: `${formatAmount(summary.taxPercentage, "en-US", 1)}%`,
      icon: TbPercentage,
      description: t("stats.taxRate.description", {amount: formatAmount(summary.taxAmount), currency}),
    },
  ];

  return (
    <div className={styles["card"]}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
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
                <span className={styles["extremeLabelText"]}>{t("extremes.highest")}</span>
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
                <span className={styles["extremeLabelText"]}>{t("extremes.lowest")}</span>
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
