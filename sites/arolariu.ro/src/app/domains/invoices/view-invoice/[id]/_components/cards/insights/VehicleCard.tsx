"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Button, Card, CardContent, CardHeader, CardTitle, ChartContainer, ChartTooltip, ChartTooltipContent} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useCallback} from "react";
import {TbBarrel, TbBulb, TbCalendar, TbCar, TbCurrencyDollar, TbGasStation, TbGauge, TbMapPin, TbTrendingUp} from "react-icons/tb";
import {Area, AreaChart, ResponsiveContainer, XAxis, YAxis} from "recharts";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./VehicleCard.module.scss";

export function VehicleCard(): React.JSX.Element {
  const locale = useLocale();
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
    {month: "Sep", amount: 420},
    {month: "Oct", amount: 480},
    {month: "Nov", amount: 510},
    {month: "Dec", amount: 560},
  ];

  const monthlyTotal = 560;
  const fillUps = 3;
  const costPerKm = 0.52;
  const priceChange = 8;

  // Maintenance reminders
  const reminders = [
    {id: "oil-change", task: "Oil change due in ~1,200 km", urgent: false},
    {id: "tire-rotation", task: "Tire rotation recommended", urgent: false},
  ];

  // Cheapest nearby
  const cheapestStation = "MOL Drumul Taberei";
  const cheapestPrice = 6.55;

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbCar className='h-5 w-5 text-blue-600' />
          Vehicle Expense Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Expense Type Badge */}
        <main className={styles["expenseType"]}>
          <TbGasStation className='h-4 w-4 text-amber-500' />
          <span className={styles["expenseTypeLabel"]}>Expense Type: Fuel</span>
        </main>

        {/* Fuel Details Grid */}
        <main className={styles["detailsGrid"]}>
          <main className={styles["detailItem"]}>
            <TbGasStation className='h-4 w-4 text-amber-500' />
            <main>
              <p className={styles["detailLabel"]}>Liters</p>
              <p className={styles["detailValue"]}>~{liters}L</p>
            </main>
          </main>
          <main className={styles["detailItem"]}>
            <TbCurrencyDollar className='h-4 w-4 text-green-500' />
            <main>
              <p className={styles["detailLabel"]}>Price/L</p>
              <p className={styles["detailValue"]}>{formatCurrency(pricePerLiter, {currencyCode: currency.code, locale})}</p>
            </main>
          </main>
          <main className={styles["detailItem"]}>
            <TbMapPin className='h-4 w-4 text-red-500' />
            <main>
              <p className={styles["detailLabel"]}>Station</p>
              <p className={styles["detailValue"]}>{station}</p>
            </main>
          </main>
          <main className={styles["detailItem"]}>
            <TbCar className='h-4 w-4 text-blue-500' />
            <main>
              <p className={styles["detailLabel"]}>Vehicle</p>
              <p className={styles["detailValueMuted"]}>Not set</p>
            </main>
          </main>
        </main>

        {/* Monthly Fuel Spending Chart */}
        <main className={styles["chartSection"]}>
          <h4 className={styles["chartTitle"]}>Monthly Fuel Spending</h4>
          <ChartContainer
            config={{
              amount: {label: "Amount", color: "hsl(var(--chart-1))"},
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
        </main>

        {/* Stats Cards */}
        <main className={styles["statsGrid"]}>
          <main className={styles["statCard"]}>
            <TbCalendar className='mx-auto mb-1 h-4 w-4 text-blue-500' />
            <p className={styles["statLabel"]}>This Month</p>
            <p className={styles["statValue"]}>{formatCurrency(monthlyTotal, {currencyCode: currency.code, locale})}</p>
            <p className={styles["statSub"]}>{fillUps} fill-ups</p>
          </main>
          <main className={styles["statCard"]}>
            <TbGauge className='mx-auto mb-1 h-4 w-4 text-green-500' />
            <p className={styles["statLabel"]}>Cost/km</p>
            <p className={styles["statValue"]}>{formatCurrency(costPerKm, {currencyCode: currency.code, locale})}</p>
            <p className={styles["statSub"]}>estimated</p>
          </main>
          <main className={styles["statCard"]}>
            <TbTrendingUp className='mx-auto mb-1 h-4 w-4 text-red-500' />
            <p className={styles["statLabel"]}>Fuel Price</p>
            <p className={`${styles["statValue"]} ${styles["statValueRed"]}`}>+{priceChange}%</p>
            <p className={styles["statSub"]}>this month</p>
          </main>
        </main>

        {/* Maintenance Reminders */}
        <main>
          <main className={styles["remindersHeader"]}>
            <TbBarrel className='h-4 w-4 text-gray-500' />
            <h4 className={styles["remindersTitle"]}>Maintenance Reminders</h4>
          </main>
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
        </main>

        {/* Cheapest Nearby */}
        <main className={styles["tipBox"]}>
          <TbBulb className='mt-0.5 h-4 w-4 shrink-0 text-green-600' />
          <main>
            <p className={styles["tipTitle"]}>Cheapest Nearby</p>
            <p className={styles["tipDescription"]}>
              {cheapestStation} - {formatCurrency(cheapestPrice, {currencyCode: currency.code, locale})}/L
            </p>
          </main>
        </main>

        {/* CTA Buttons */}
        <main className={styles["ctaButtons"]}>
          <Button
            variant='outline'
            size='sm'
            className='flex-1 bg-transparent'>
            Add Vehicle
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='flex-1 bg-transparent'>
            Full Report
          </Button>
        </main>
      </CardContent>
    </Card>
  );
}
