"use client";

import {formatAmount} from "@/lib/utils.generic";
import {
  Area,
  AreaChart,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ReferenceDot,
  ChartTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useCallback} from "react";
import type {SpendingTrendData} from "../../_utils/analytics";
import styles from "./SpendingTrendChart.module.scss";

type Props = {
  readonly data: SpendingTrendData[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: {
    name: string;
    date: string;
    amount: number;
    isCurrent?: boolean;
    invoices?: ReadonlyArray<{id: string; name: string; amount: number}>;
  };
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
};

function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("IMS--View.spendingTrendChart");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipDate"]}>{data.date}</p>
      <p className={styles["tooltipAmount"]}>
        {formatAmount(data.amount)} {currency}
      </p>
      <p className={styles["tooltipName"]}>{data.name}</p>
      {data.isCurrent ? (
        <Badge
          variant='secondary'
          className={styles["tooltipCurrentBadge"]}>
          {t("tooltip.currentInvoice")}
        </Badge>
      ) : null}
      {data.invoices && data.invoices.length > 0 ? (
        <ul className={styles["tooltipInvoices"]}>
          {data.invoices.slice(0, 10).map((inv) => (
            <li
              key={inv.id}
              className={styles["tooltipInvoiceItem"]}>
              <Link
                href={`/domains/invoices/view-invoice/${inv.id}/`}
                target='_blank'
                className={styles["tooltipInvoiceLink"]}>
                • {inv.name} — {formatAmount(inv.amount)} {currency}
              </Link>
            </li>
          ))}
          {data.invoices.length > 10 ? (
            <li className={styles["tooltipMore"]}>{t("tooltip.andMore", {count: String(data.invoices.length - 10)})}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function SpendingTrendChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("IMS--View.spendingTrendChart");
  const chartConfig = {
    amount: {
      label: t("labels.amount"),
      color: "var(--ac-chart-1)",
    },
  };

  const currentPoint = data.find((d) => d.isCurrent);
  const tickFormatter = useCallback((value: number) => `${value}`, []);

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <ChartContainer
          config={chartConfig}
          className={styles["chartContainer"]}>
          <ResponsiveContainer
            width='100%'
            height='100%'>
            <AreaChart
              data={data}
              margin={{top: 8, right: 8, bottom: 8, left: -16}}>
              <defs>
                <linearGradient
                  id='colorAmount'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'>
                  <stop
                    offset='5%'
                    stopColor='var(--ac-chart-1)'
                    stopOpacity={0.3}
                  />
                  <stop
                    offset='95%'
                    stopColor='var(--ac-chart-1)'
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey='date'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                interval='preserveStartEnd'
              />
              <YAxis
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={tickFormatter}
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
              <Area
                type='monotone'
                dataKey='amount'
                stroke='var(--ac-chart-1)'
                strokeWidth={2}
                fill='url(#colorAmount)'
              />
              {currentPoint ? (
                <ReferenceDot
                  x={currentPoint.date}
                  y={currentPoint.amount}
                  r={6}
                  fill='var(--ac-primary)'
                  stroke='var(--ac-background)'
                  strokeWidth={2}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
