"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {
  Area,
  AreaChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbBarrel, TbBulb, TbCalendar, TbCar, TbCurrencyDollar, TbGasStation, TbGauge, TbMapPin, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./VehicleCard.module.scss";

export function VehicleCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
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
    {month: t((m) => m.cards.invoices.vehicleCard.months.sep), amount: 420},
    {month: t((m) => m.cards.invoices.vehicleCard.months.oct), amount: 480},
    {month: t((m) => m.cards.invoices.vehicleCard.months.nov), amount: 510},
    {month: t((m) => m.cards.invoices.vehicleCard.months.dec), amount: 560},
  ];

  const monthlyTotal = 560;
  const fillUps = 3;
  const costPerKm = 0.52;
  const priceChange = 8;

  // Maintenance reminders
  const reminders = [
    {id: "oil-change", task: t((m) => m.cards.invoices.vehicleCard.reminders.oilChange), urgent: false},
    {id: "tire-rotation", task: t((m) => m.cards.invoices.vehicleCard.reminders.tireRotation), urgent: false},
  ];

  // Cheapest nearby
  const cheapestStation = "MOL Drumul Taberei";
  const cheapestPrice = 6.55;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbCar className={styles["titleIcon"]} />
            {t((m) => m.cards.invoices.vehicleCard.title)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {/* Expense Type Badge */}
          <div className={styles["expenseType"]}>
            <TbGasStation className={styles["iconAmber"]} />
            <span className={styles["expenseTypeLabel"]}>{t((m) => m.cards.invoices.vehicleCard.expenseType)}</span>
          </div>

          {/* Fuel Details Grid */}
          <div className={styles["detailsGrid"]}>
            <div className={styles["detailItem"]}>
              <TbGasStation className={styles["iconAmber"]} />
              <div>
                <p className={styles["detailLabel"]}>{t((m) => m.cards.invoices.vehicleCard.details.liters)}</p>
                <p className={styles["detailValue"]}>~{liters}L</p>
              </div>
            </div>
            <div className={styles["detailItem"]}>
              <TbCurrencyDollar className={styles["iconGreen"]} />
              <div>
                <p className={styles["detailLabel"]}>{t((m) => m.cards.invoices.vehicleCard.details.pricePerLiter)}</p>
                <p className={styles["detailValue"]}>{formatCurrency(pricePerLiter, {currencyCode: currency.code, locale})}</p>
              </div>
            </div>
            <div className={styles["detailItem"]}>
              <TbMapPin className={styles["iconRed"]} />
              <div>
                <p className={styles["detailLabel"]}>{t((m) => m.cards.invoices.vehicleCard.details.station)}</p>
                <p className={styles["detailValue"]}>{station}</p>
              </div>
            </div>
            <div className={styles["detailItem"]}>
              <TbCar className={styles["iconBlue"]} />
              <div>
                <p className={styles["detailLabel"]}>{t((m) => m.cards.invoices.vehicleCard.details.vehicle)}</p>
                <p className={styles["detailValueMuted"]}>{t((m) => m.cards.invoices.vehicleCard.details.notSet)}</p>
              </div>
            </div>
          </div>

          {/* Monthly Fuel Spending Chart */}
          <div className={styles["chartSection"]}>
            <h4 className={styles["chartTitle"]}>{t((m) => m.cards.invoices.vehicleCard.chart.title)}</h4>
            <ChartContainer
              config={{
                amount: {label: t((m) => m.cards.invoices.vehicleCard.chart.amount), color: "var(--ac-chart-1)"},
              }}
              className={styles["chartWrapper"]}>
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
                        stopColor='var(--ac-chart-1)'
                        stopOpacity={0.3}
                      />
                      <stop
                        offset='100%'
                        stopColor='var(--ac-chart-1)'
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
                    stroke='var(--ac-chart-1)'
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
              <TbCalendar className={`${styles["habitIconWrapper"]} ${styles["iconBlue"]}`} />
              <p className={styles["statLabel"]}>{t((m) => m.cards.invoices.vehicleCard.stats.thisMonth)}</p>
              <p className={styles["statValue"]}>{formatCurrency(monthlyTotal, {currencyCode: currency.code, locale})}</p>
              <p className={styles["statSub"]}>{t((m) => m.cards.invoices.vehicleCard.stats.fillUps, {count: String(fillUps)})}</p>
            </div>
            <div className={styles["statCard"]}>
              <TbGauge className={`${styles["habitIconWrapper"]} ${styles["iconGreen"]}`} />
              <p className={styles["statLabel"]}>{t((m) => m.cards.invoices.vehicleCard.stats.costPerKm)}</p>
              <p className={styles["statValue"]}>{formatCurrency(costPerKm, {currencyCode: currency.code, locale})}</p>
              <p className={styles["statSub"]}>{t((m) => m.cards.invoices.vehicleCard.stats.estimated)}</p>
            </div>
            <div className={styles["statCard"]}>
              <TbTrendingUp className={`${styles["habitIconWrapper"]} ${styles["iconRed"]}`} />
              <p className={styles["statLabel"]}>{t((m) => m.cards.invoices.vehicleCard.stats.fuelPrice)}</p>
              <p className={`${styles["statValue"]} ${styles["statValueRed"]}`}>+{priceChange}%</p>
              <p className={styles["statSub"]}>{t((m) => m.cards.invoices.vehicleCard.stats.thisMonthSuffix)}</p>
            </div>
          </div>

          {/* Maintenance Reminders */}
          <div>
            <div className={styles["remindersHeader"]}>
              <TbBarrel className={styles["iconGray"]} />
              <h4 className={styles["remindersTitle"]}>{t((m) => m.cards.invoices.vehicleCard.maintenance.title)}</h4>
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
            <TbBulb className={styles["tipIcon"]} />
            <div>
              <p className={styles["tipTitle"]}>{t((m) => m.cards.invoices.vehicleCard.tip.title)}</p>
              <p className={styles["tipDescription"]}>
                {cheapestStation} - {formatCurrency(cheapestPrice, {currencyCode: currency.code, locale})}/{t((m) => m.cards.invoices.vehicleCard.tip.perLiter)}
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={styles["ctaButtons"]}>
            <Button
              variant='outline'
              size='sm'>
              {t((m) => m.cards.invoices.vehicleCard.buttons.addVehicle)}
            </Button>
            <Button
              variant='outline'
              size='sm'>
              {t((m) => m.cards.invoices.vehicleCard.buttons.fullReport)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
