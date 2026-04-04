"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import type {CategorySpending} from "../../_utils/analytics";
import styles from "./SpendingByCategoryChart.module.scss";

type Props = {
  readonly data: CategorySpending[];
  readonly currency: string;
};

type LegendEntry = {
  color: string;
  value: string;
};

type TooltipPayloadItem = {
  payload: {category: string; amount: number; count: number};
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
};

type CustomLegendProps = {
  readonly payload: LegendEntry[];
};

function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("IMS--View.spendingByCategoryChart");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipCategory"]}>{data.category}</p>
      <p className={styles["tooltipAmount"]}>
        {data.amount.toFixed(2)} {currency}
      </p>
      <p className={styles["tooltipCount"]}>{t("tooltip.itemCount", {count: data.count})}</p>
    </div>
  );
}

function CustomLegend({payload}: CustomLegendProps): React.JSX.Element {
  return (
    <div className={styles["legendContainer"]}>
      {payload.map((entry) => (
        <div
          key={`legend-${entry.value}`}
          className={styles["legendItem"]}>
          <div
            className={styles["legendDot"]}
            style={{backgroundColor: entry.color}}
          />
          <span className={styles["legendLabel"]}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SpendingByCategoryChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("IMS--View.spendingByCategoryChart");
  const chartConfig: Record<string, {label: string; color: string}> = {};
  for (const [index, item] of data.entries()) {
    chartConfig[item.category] = {
      label: item.category,
      color: `var(--ac-chart-${(index % 5) + 1})`,
    };
  }

  let total = 0;
  for (const item of data) {
    total += item.amount;
  }

  const coloredData = data.map((item, index) => ({
    ...item,
    fill: `var(--ac-chart-${(index % 5) + 1})`,
  }));

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <ChartContainer
          config={chartConfig}
          className={styles["chartContainerSm"]}>
          <ResponsiveContainer
            width='100%'
            height='100%'>
            <PieChart>
              <Pie
                data={coloredData}
                dataKey='amount'
                nameKey='category'
                cx='50%'
                cy='50%'
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                className={styles["pieStroke"]}
              />
              <ChartTooltip
                content={
                  <CustomTooltip
                    active={false}
                    payload={[]}
                    currency={currency}
                  />
                }
              />
              <ChartLegend content={<CustomLegend payload={[]} />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className={styles["totalSection"]}>
          <p className={styles["totalAmount"]}>
            {total.toFixed(2)} {currency}
          </p>
          <p className={styles["totalLabel"]}>{t("totalLabel")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
