"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Button, Card, CardContent, CardHeader, CardTitle, ChartContainer, ChartTooltip, ChartTooltipContent} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbBarrel, TbBulb, TbCalendar, TbCar, TbCurrencyDollar, TbGasStation, TbGauge, TbMapPin, TbTrendingUp} from "react-icons/tb";
import {Area, AreaChart, ResponsiveContainer, XAxis, YAxis} from "recharts";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./VehicleCard.module.scss";

export function VehicleCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Domains.services.invoices.ui.vehicleCard");
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;
  const {currency, totalCostAmount: totalAmount} = paymentInformation;

  const tooltipFormatter = useCallback(
    (value: number | string | readonly (string | number)[] | undefined) => {
      if (value === undefined || Array.isArray(value)) return null;
      return formatCurrency(Number(value), {currencyCode: currency.code, locale});
    },
    [currency.code, locale],
  );

  // Estimate fuel details
  const pricePerLiter = 6.7;
  const liters = Math.round(totalAmount / pricePerLiter);
  const station = "Petrom";

  // Monthly fuel data
  const fuelData = [
    {month: t("months.sep"), amount: 420},
    {month: t("months.oct"), amount: 480},
    {month: t("months.nov"), amount: 510},
    {month: t("months.dec"), amount: 560},
  ];

  const monthlyTotal = 560;
  const fillUps = 3;
  const costPerKm = 0.52;
  const priceChange = 8;

  // Maintenance reminders
  const reminders = [
    {id: "oil-change", task: t("reminders.oilChange"), urgent: false},
    {id: "tire-rotation", task: t("reminders.tireRotation"), urgent: false},
  ];

  // Cheapest nearby
  const cheapestStation = "MOL Drumul Taberei";
  const cheapestPrice = 6.55;

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbCar className='h-5 w-5 text-blue-600' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Expense Type Badge */}
        <div className={styles["expenseType"]}>
          <TbGasStation className='h-4 w-4 text-amber-500' />
          <span className={styles["expenseTypeLabel"]}>{t("expenseType")}</span>
        </div>

        {/* Fuel Details Grid */}
        <div className={styles["detailsGrid"]}>
          <div className={styles["detailItem"]}>
            <TbGasStation className='h-4 w-4 text-amber-500' />
            <div>
              <p className={styles["detailLabel"]}>{t("details.liters")}</p>
              <p className={styles["detailValue"]}>~{liters}L</p>
            </div>
          </div>
          <div className={styles["detailItem"]}>
            <TbCurrencyDollar className='h-4 w-4 text-green-500' />
            <div>
              <p className={styles["detailLabel"]}>{t("details.pricePerLiter")}</p>
              <p className={styles["detailValue"]}>{formatCurrency(pricePerLiter, {currencyCode: currency.code, locale})}</p>
            </div>
          </div>
          <div className={styles["detailItem"]}>
            <TbMapPin className='h-4 w-4 text-red-500' />
            <div>
              <p className={styles["detailLabel"]}>{t("details.station")}</p>
              <p className={styles["detailValue"]}>{station}</p>
            </div>
          </div>
          <div className={styles["detailItem"]}>
            <TbCar className='h-4 w-4 text-blue-500' />
            <div>
              <p className={styles["detailLabel"]}>{t("details.vehicle")}</p>
              <p className={styles["detailValueMuted"]}>{t("details.notSet")}</p>
            </div>
          </div>
        </div>

        {/* Monthly Fuel Spending Chart */}
        <div className={styles["chartSection"]}>
          <h4 className={styles["chartTitle"]}>{t("chart.title")}</h4>
          <ChartContainer
            config={{
              amount: {label: t("chart.amount"), color: "hsl(var(--chart-1))"},
            }}
            className='h-[120px] w-full'>
            <ResponsiveContainer
              width='100%'
              height='100%'>
              <AreaChart
                data={fuelData}
                margin={{top: 5, right: 5, left: -20, bottom: 0}}>
                <defs>
                  <linearGradient
                    id='fillFuel'
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'>
                    <stop
                      offset='0%'
                      stopColor='hsl(var(--chart-1))'
                      stopOpacity={0.3}
                    />
                    <stop
                      offset='100%'
                      stopColor='hsl(var(--chart-1))'
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey='month'
                  tick={{fontSize: 11}}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{fontSize: 11}}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />
                <Area
                  type='monotone'
                  dataKey='amount'
                  stroke='hsl(var(--chart-1))'
                  fill='url(#fillFuel)'
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Stats Cards */}
        <div className={styles["statsGrid"]}>
          <div className={styles["statCard"]}>
            <TbCalendar className='mx-auto mb-1 h-4 w-4 text-blue-500' />
            <p className={styles["statLabel"]}>{t("stats.thisMonth")}</p>
            <p className={styles["statValue"]}>{formatCurrency(monthlyTotal, {currencyCode: currency.code, locale})}</p>
            <p className={styles["statSub"]}>{t("stats.fillUps", {count: String(fillUps)})}</p>
          </div>
          <div className={styles["statCard"]}>
            <TbGauge className='mx-auto mb-1 h-4 w-4 text-green-500' />
            <p className={styles["statLabel"]}>{t("stats.costPerKm")}</p>
            <p className={styles["statValue"]}>{formatCurrency(costPerKm, {currencyCode: currency.code, locale})}</p>
            <p className={styles["statSub"]}>{t("stats.estimated")}</p>
          </div>
          <div className={styles["statCard"]}>
            <TbTrendingUp className='mx-auto mb-1 h-4 w-4 text-red-500' />
            <p className={styles["statLabel"]}>{t("stats.fuelPrice")}</p>
            <p className={`${styles["statValue"]} ${styles["statValueRed"]}`}>+{priceChange}%</p>
            <p className={styles["statSub"]}>{t("stats.thisMonthSuffix")}</p>
          </div>
        </div>

        {/* Maintenance Reminders */}
        <div>
          <div className={styles["remindersHeader"]}>
            <TbBarrel className='h-4 w-4 text-gray-500' />
            <h4 className={styles["remindersTitle"]}>{t("maintenance.title")}</h4>
          </div>
          <ul className={styles["remindersList"]}>
            {reminders.map((r) => (
              <li
                key={r.id}
                className={styles["reminderItem"]}>
                <span className={styles["reminderBullet"]}>•</span>
                {r.task}
              </li>
            ))}
          </ul>
        </div>

        {/* Cheapest Nearby */}
        <div className={styles["tipBox"]}>
          <TbBulb className='mt-0.5 h-4 w-4 shrink-0 text-green-600' />
          <div>
            <p className={styles["tipTitle"]}>{t("tip.title")}</p>
            <p className={styles["tipDescription"]}>
              {cheapestStation} - {formatCurrency(cheapestPrice, {currencyCode: currency.code, locale})}/{t("tip.perLiter")}
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className={styles["ctaButtons"]}>
          <Button
            variant='outline'
            size='sm'
            className='flex-1 bg-transparent'>
            {t("buttons.addVehicle")}
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='flex-1 bg-transparent'>
            {t("buttons.fullReport")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
