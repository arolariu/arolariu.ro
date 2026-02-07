"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {TbGrid3X3, TbPackage, TbPercentage, TbReceipt, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {InvoiceSummary} from "../../_utils/analytics";
import styles from "./SummaryStatsCard.module.scss";

type Props = {
  summary: InvoiceSummary;
  currency: string;
};

export function SummaryStatsCard({summary, currency}: Readonly<Props>): React.JSX.Element {
  const stats = [
    {
      label: "Total Items",
      value: summary.totalItems.toString(),
      icon: TbPackage,
      description: "Products purchased",
    },
    {
      label: "Categories",
      value: summary.uniqueCategories.toString(),
      icon: TbGrid3X3,
      description: "Unique categories",
    },
    {
      label: "Avg. Price",
      value: `${summary.averageItemPrice.toFixed(2)}`,
      icon: TbReceipt,
      description: `${currency} per item`,
    },
    {
      label: "Tax Rate",
      value: `${summary.taxPercentage.toFixed(1)}%`,
      icon: TbPercentage,
      description: `${summary.taxAmount.toFixed(2)} ${currency}`,
    },
  ];

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Invoice Summary</CardTitle>
        <CardDescription className='text-xs'>Key statistics at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <main className={styles["statsGrid"]}>
          {stats.map((stat) => (
            <main
              key={stat.label}
              className={styles["statItem"]}>
              <main className={styles["statLabel"]}>
                <stat.icon className='h-3.5 w-3.5' />
                <span className={styles["statLabelText"]}>{stat.label}</span>
              </main>
              <p className={styles["statValue"]}>{stat.value}</p>
              <p className={styles["statDescription"]}>{stat.description}</p>
            </main>
          ))}
        </main>

        <main className={styles["extremesSection"]}>
          <main className={styles["extremeRow"]}>
            <main className={styles["extremeLabel"]}>
              <TbTrendingUp className='h-3.5 w-3.5 text-emerald-500' />
              <span className={styles["extremeLabelText"]}>Highest</span>
            </main>
            <main className={styles["extremeRight"]}>
              <p className={styles["extremePrice"]}>
                {summary.highestItem.price.toFixed(2)} {currency}
              </p>
              <p className={styles["extremeName"]}>{summary.highestItem.name}</p>
            </main>
          </main>

          <main className={styles["extremeRow"]}>
            <main className={styles["extremeLabel"]}>
              <TbTrendingDown className='h-3.5 w-3.5 text-blue-500' />
              <span className={styles["extremeLabelText"]}>Lowest</span>
            </main>
            <main className={styles["extremeRight"]}>
              <p className={styles["extremePrice"]}>
                {summary.lowestItem.price.toFixed(2)} {currency}
              </p>
              <p className={styles["extremeName"]}>{summary.lowestItem.name}</p>
            </main>
          </main>
        </main>
      </CardContent>
    </Card>
  );
}
