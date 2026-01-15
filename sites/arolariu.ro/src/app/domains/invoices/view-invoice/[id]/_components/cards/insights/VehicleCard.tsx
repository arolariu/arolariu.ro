"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Button, Card, CardContent, CardHeader, CardTitle, ChartContainer, ChartTooltip, ChartTooltipContent} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useCallback} from "react";
import {TbBarrel, TbBulb, TbCalendar, TbCar, TbCurrencyDollar, TbGasStation, TbGauge, TbMapPin, TbTrendingUp} from "react-icons/tb";
import {Area, AreaChart, ResponsiveContainer, XAxis, YAxis} from "recharts";
import {useInvoiceContext} from "../../../_context/InvoiceContext";

export function VehicleCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;
  const {currency, totalCostAmount: totalAmount} = paymentInformation;

  const tooltipFormatter = useCallback(
    (value: number | string) => formatCurrency(Number(value), {currencyCode: currency.code, locale}),
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
        <div className='flex items-center gap-2'>
          <TbGasStation className='h-4 w-4 text-amber-500' />
          <span className='text-sm font-medium'>Expense Type: Fuel</span>
        </div>

        {/* Fuel Details Grid */}
        <div className='grid grid-cols-2 gap-2'>
          <div className='flex items-center gap-2 rounded-lg border p-2.5'>
            <TbGasStation className='h-4 w-4 text-amber-500' />
            <div>
              <p className='text-muted-foreground text-xs'>Liters</p>
              <p className='text-sm font-semibold'>~{liters}L</p>
            </div>
          </div>
          <div className='flex items-center gap-2 rounded-lg border p-2.5'>
            <TbCurrencyDollar className='h-4 w-4 text-green-500' />
            <div>
              <p className='text-muted-foreground text-xs'>Price/L</p>
              <p className='text-sm font-semibold'>{formatCurrency(pricePerLiter, {currencyCode: currency.code, locale})}</p>
            </div>
          </div>
          <div className='flex items-center gap-2 rounded-lg border p-2.5'>
            <TbMapPin className='h-4 w-4 text-red-500' />
            <div>
              <p className='text-muted-foreground text-xs'>Station</p>
              <p className='text-sm font-semibold'>{station}</p>
            </div>
          </div>
          <div className='flex items-center gap-2 rounded-lg border p-2.5'>
            <TbCar className='h-4 w-4 text-blue-500' />
            <div>
              <p className='text-muted-foreground text-xs'>Vehicle</p>
              <p className='text-muted-foreground text-sm font-semibold'>Not set</p>
            </div>
          </div>
        </div>

        {/* Monthly Fuel Spending Chart */}
        <div className='space-y-2'>
          <h4 className='text-muted-foreground text-sm font-medium'>Monthly Fuel Spending</h4>
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
                <ChartTooltip
                  content={ChartTooltipContent}
                  formatter={tooltipFormatter}
                />
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
        <div className='grid grid-cols-3 gap-2'>
          <div className='bg-card rounded-lg border p-2.5 text-center'>
            <TbCalendar className='mx-auto mb-1 h-4 w-4 text-blue-500' />
            <p className='text-muted-foreground text-xs'>This Month</p>
            <p className='text-sm font-semibold'>{formatCurrency(monthlyTotal, {currencyCode: currency.code, locale})}</p>
            <p className='text-muted-foreground text-xs'>{fillUps} fill-ups</p>
          </div>
          <div className='bg-card rounded-lg border p-2.5 text-center'>
            <TbGauge className='mx-auto mb-1 h-4 w-4 text-green-500' />
            <p className='text-muted-foreground text-xs'>Cost/km</p>
            <p className='text-sm font-semibold'>{formatCurrency(costPerKm, {currencyCode: currency.code, locale})}</p>
            <p className='text-muted-foreground text-xs'>estimated</p>
          </div>
          <div className='bg-card rounded-lg border p-2.5 text-center'>
            <TbTrendingUp className='mx-auto mb-1 h-4 w-4 text-red-500' />
            <p className='text-muted-foreground text-xs'>Fuel Price</p>
            <p className='text-sm font-semibold text-red-500'>+{priceChange}%</p>
            <p className='text-muted-foreground text-xs'>this month</p>
          </div>
        </div>

        {/* Maintenance Reminders */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <TbBarrel className='h-4 w-4 text-gray-500' />
            <h4 className='text-sm font-medium'>Maintenance Reminders</h4>
          </div>
          <ul className='text-muted-foreground space-y-1 text-sm'>
            {reminders.map((r) => (
              <li
                key={r.id}
                className='flex items-center gap-2'>
                <span className='text-muted-foreground'>•</span>
                {r.task}
              </li>
            ))}
          </ul>
        </div>

        {/* Cheapest Nearby */}
        <div className='flex items-start gap-2 rounded-lg border border-green-200 bg-green-500/10 p-3 dark:border-green-800'>
          <TbBulb className='mt-0.5 h-4 w-4 shrink-0 text-green-600' />
          <div>
            <p className='text-sm font-medium'>Cheapest Nearby</p>
            <p className='text-muted-foreground text-sm'>
              {cheapestStation} - {formatCurrency(cheapestPrice, {currencyCode: currency.code, locale})}/L
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className='flex gap-2'>
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
        </div>
      </CardContent>
    </Card>
  );
}
