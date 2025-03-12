/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {differenceInDays, format} from "date-fns";
import {motion} from "framer-motion";
import {ArrowRight, ShoppingBag, TrendingDown, TrendingUp} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {ChartActions} from "./ChartActions";
import {StatisticsFilters, StatisticsFilterState} from "./InvoiceStatisticsFilters";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

// Custom tooltip formatter for currency
const currencyFormatter = (value: number) => formatCurrencyWithSymbol(value, currency);

type Props = {
  invoices: Invoice[];
};

export function InvoiceStatistics({invoices}: Readonly<Props>) {
  const [filters, setFilters] = useState<StatisticsFilterState>({
    dateRange: {
      preset: "last30days",
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    },
    merchants: [],
    categories: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewLoaded, setOverviewLoaded] = useState<boolean>(false);
  const [trendsLoaded, setTrendsLoaded] = useState<boolean>(false);
  const [merchantsLoaded, setMerchantsLoaded] = useState<boolean>(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState<boolean>(false);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState<boolean>(false);
  const [dataReady, setDataReady] = useState<boolean>(false);

  // Simulate loading delay
  useEffect(() => {
    if (filters) {
      setLoading(true);
      setOverviewLoaded(false);
      setTrendsLoaded(false);
      setMerchantsLoaded(false);
      setCategoriesLoaded(false);
      setPaymentMethodsLoaded(false);
      setDataReady(false);

      // Simulate API calls with different loading times
      setTimeout(() => setOverviewLoaded(true), 800);
      setTimeout(() => setTrendsLoaded(true), 1200);
      setTimeout(() => setMerchantsLoaded(true), 1500);
      setTimeout(() => setCategoriesLoaded(true), 1800);
      setTimeout(() => setPaymentMethodsLoaded(true), 2000);
      setTimeout(() => {
        setLoading(false);
        setDataReady(true);
      }, 2000);
    }
  }, [filters]); // TODO: Re-run when currency changes

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: StatisticsFilterState) => {
    setFilters(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      dateRange: {
        preset: "last30days",
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
      },
      merchants: [],
      categories: [],
    });
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
        <StatisticsFilters
          invoices={invoices}
          onFilterChange={handleFilterChange}
        />
        {/* <CurrencySelector /> */}
      </div>

      {/* Overview Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoaded ? (
              <>
                <div className='text-2xl font-bold'>{formatCurrencyWithSymbol(totalSpent, currency)}</div>
                <p className='text-muted-foreground mt-1 text-xs'>From {invoiceCount} invoices</p>
              </>
            ) : (
              <>
                <Skeleton className='mb-1 h-8 w-32' />
                <Skeleton className='h-4 w-24' />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>Average Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoaded ? (
              <>
                <div className='text-2xl font-bold'>{formatCurrencyWithSymbol(averageAmount, currency)}</div>
                <p className='text-muted-foreground mt-1 text-xs'>Per invoice</p>
              </>
            ) : (
              <>
                <Skeleton className='mb-1 h-8 w-32' />
                <Skeleton className='h-4 w-24' />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoaded && pieData.length > 0 ? (
              <>
                <div className='text-2xl font-bold capitalize'>{pieData[0].name}</div>
                <p className='text-muted-foreground mt-1 text-xs'>{Math.round((pieData[0].value / totalSpent) * 100)}% of total spending</p>
              </>
            ) : (
              <>
                <Skeleton className='mb-1 h-8 w-32' />
                <Skeleton className='h-4 w-24' />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>Top Merchant</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoaded && topMerchants.length > 0 ? (
              <>
                <div className='text-2xl font-bold'>{topMerchants[0].name}</div>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {Math.round((topMerchants[0].total / totalSpent) * 100)}% of total spending
                </p>
              </>
            ) : (
              <>
                <Skeleton className='mb-1 h-8 w-32' />
                <Skeleton className='h-4 w-24' />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue='overview'>
        <TabsList className='grid w-full max-w-md grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='trends'>Trends</TabsTrigger>
          <TabsTrigger value='merchants'>Merchants</TabsTrigger>
          <TabsTrigger value='categories'>Categories</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent
          value='overview'
          className='mt-6 space-y-6'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Spending by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Breakdown of your expenses by category</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='category-pie-chart'
                  title='Spending by Category'
                />
                {categoriesLoaded ? (
                  <div
                    id='category-pie-chart'
                    className='h-full'>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx='50%'
                            cy='50%'
                            labelLine={false}
                            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill='#8884d8'
                            dataKey='value'>
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={currencyFormatter} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No category data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-64 rounded-full' />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>How you're paying for purchases</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='payment-methods-bar-chart'
                  title='Payment Methods'
                />
                {paymentMethodsLoaded ? (
                  <div
                    id='payment-methods-bar-chart'
                    className='h-full'>
                    {paymentMethodChartData.length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <BarChart
                          data={paymentMethodChartData}
                          layout='vertical'
                          margin={{top: 20, right: 30, left: 60, bottom: 5}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis
                            type='number'
                            tickFormatter={currencyFormatter}
                          />
                          <YAxis
                            dataKey='name'
                            type='category'
                            tick={{fontSize: 12}}
                            width={100}
                          />
                          <Tooltip formatter={currencyFormatter} />
                          <Legend />
                          <Bar
                            dataKey='value'
                            name='Amount'
                            fill='#8884d8'
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No payment method data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full flex-col justify-center space-y-4'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending by Day of Week */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Day of Week</CardTitle>
                <CardDescription>Which days you spend the most</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='day-of-week-bar-chart'
                  title='Spending by Day of Week'
                />
                {trendsLoaded ? (
                  <div
                    id='day-of-week-bar-chart'
                    className='h-full'>
                    {dayOfWeekChartData.some((item) => item.value > 0) ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <BarChart
                          data={dayOfWeekChartData}
                          margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis dataKey='name' />
                          <YAxis tickFormatter={currencyFormatter} />
                          <Tooltip formatter={currencyFormatter} />
                          <Legend />
                          <Bar
                            dataKey='value'
                            name='Amount'
                            fill='#82ca9d'
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No day of week data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full flex-col justify-center space-y-2'>
                    {Array(7)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className='flex items-center gap-2'>
                          <Skeleton className='h-4 w-20' />
                          <Skeleton className={`h-8 w-${Math.floor(Math.random() * 60) + 20}%`} />
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending by Time of Day */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Time of Day</CardTitle>
                <CardDescription>When you spend the most</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='time-of-day-area-chart'
                  title='Spending by Time of Day'
                />
                {trendsLoaded ? (
                  <div
                    id='time-of-day-area-chart'
                    className='h-full'>
                    {hourlyChartData.some((item) => item.amount > 0) ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <AreaChart
                          data={hourlyChartData}
                          margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis
                            dataKey='formattedHour'
                            tick={{fontSize: 10}}
                            interval={1}
                          />
                          <YAxis tickFormatter={currencyFormatter} />
                          <Tooltip formatter={currencyFormatter} />
                          <Legend />
                          <Area
                            type='monotone'
                            dataKey='amount'
                            name='Amount'
                            stroke='#8884d8'
                            fill='#8884d8'
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No time of day data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-full rounded-lg' />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent
          value='trends'
          className='mt-6 space-y-6'>
          <div className='grid grid-cols-1 gap-6'>
            {/* Monthly Spending with Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Spending Trends & Forecast</CardTitle>
                <CardDescription>Track how your spending changes over time with 2-month forecast</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='monthly-spending-composed-chart'
                  title='Monthly Spending Trends & Forecast'
                />
                {trendsLoaded ? (
                  <div
                    id='monthly-spending-composed-chart'
                    className='h-full'>
                    {barData.length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <ComposedChart
                          data={forecastData()}
                          margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis dataKey='name' />
                          <YAxis
                            yAxisId='left'
                            tickFormatter={currencyFormatter}
                          />
                          <YAxis
                            yAxisId='right'
                            orientation='right'
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "total" || name === "forecast") return currencyFormatter(value as number);
                              return currencyFormatter(value as number);
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId='left'
                            dataKey='total'
                            name='Actual Spending'
                            fill='#8884d8'
                            hide={(d) => d.forecast === true}
                          />
                          <Bar
                            yAxisId='left'
                            dataKey='total'
                            name='Forecast'
                            fill='#82ca9d'
                            fillOpacity={0.6}
                            hide={(d) => d.forecast !== true}
                          />
                          <Line
                            yAxisId='right'
                            type='monotone'
                            dataKey='average'
                            name='Avg Transaction'
                            stroke='#ff7300'
                            dot={true}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No monthly data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-full rounded-lg' />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Spending Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Spending</CardTitle>
                <CardDescription>Your spending patterns day by day</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='daily-spending-line-chart'
                  title='Daily Spending'
                />
                {trendsLoaded ? (
                  <div
                    id='daily-spending-line-chart'
                    className='h-full'>
                    {lineData.length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <LineChart
                          data={lineData}
                          margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis
                            dataKey='date'
                            tick={{fontSize: 10}}
                            tickFormatter={(value) => format(new Date(value), "MMM dd")}
                          />
                          <YAxis tickFormatter={currencyFormatter} />
                          <Tooltip
                            formatter={currencyFormatter}
                            labelFormatter={(value) => format(new Date(value), "MMMM d, yyyy")}
                          />
                          <Legend />
                          <Line
                            type='monotone'
                            dataKey='amount'
                            name='Spending'
                            stroke='#8884d8'
                            activeDot={{r: 8}}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No daily data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-full rounded-lg' />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spending Patterns Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Spending Patterns Analysis</CardTitle>
                <CardDescription>Insights into your spending behavior</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoaded ? (
                  <div className='space-y-6'>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                      <div className='bg-muted flex flex-col items-center justify-center rounded-lg p-4'>
                        <div className='mb-2 text-2xl font-bold text-blue-500'>
                          {formatCurrencyWithSymbol(
                            totalSpent / (differenceInDays(filters.dateRange.to || new Date(), filters.dateRange.from || new Date()) + 1),
                            currency,
                          )}
                        </div>
                        <div className='text-sm font-medium'>Daily Average</div>
                      </div>

                      <div className='bg-muted flex flex-col items-center justify-center rounded-lg p-4'>
                        <div className='mb-2 flex items-center text-2xl font-bold text-green-500'>
                          {barData.length > 1 && barData[barData.length - 1].total > barData[barData.length - 2].total ? (
                            <TrendingUp className='mr-1 h-5 w-5' />
                          ) : (
                            <TrendingDown className='mr-1 h-5 w-5' />
                          )}
                          {barData.length > 1
                            ? Math.abs(
                                Math.round(
                                  ((barData[barData.length - 1].total - barData[barData.length - 2].total)
                                    / barData[barData.length - 2].total)
                                    * 100,
                                ),
                              ) + "%"
                            : "0%"}
                        </div>
                        <div className='text-sm font-medium'>Month-over-Month</div>
                      </div>

                      <div className='bg-muted flex flex-col items-center justify-center rounded-lg p-4'>
                        <div className='mb-2 text-2xl font-bold text-purple-500'>
                          {invoiceCount > 0 ? (Math.round((totalSpent / invoiceCount) * 100) / 100).toFixed(1) : "0"}
                          <span className='ml-1 text-sm'>per transaction</span>
                        </div>
                        <div className='text-sm font-medium'>Transaction Frequency</div>
                      </div>
                    </div>

                    <div className='rounded-lg border p-4'>
                      <h3 className='mb-2 font-medium'>Spending Insights</h3>
                      <ul className='space-y-2 text-sm'>
                        {pieData.length > 0 && (
                          <li className='flex items-start'>
                            <ArrowRight className='mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500' />
                            <span>
                              Your highest spending category is <span className='font-medium capitalize'>{pieData[0].name}</span>,
                              accounting for {Math.round((pieData[0].value / totalSpent) * 100)}% of your total spending.
                            </span>
                          </li>
                        )}

                        {dayOfWeekChartData.some((item) => item.value > 0) && (
                          <li className='flex items-start'>
                            <ArrowRight className='mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500' />
                            <span>
                              You tend to spend the most on{" "}
                              <span className='font-medium'>{dayOfWeekChartData.sort((a, b) => b.value - a.value)[0].name}s</span>.
                            </span>
                          </li>
                        )}

                        {hourlyChartData.some((item) => item.amount > 0) && (
                          <li className='flex items-start'>
                            <ArrowRight className='mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500' />
                            <span>
                              Your peak spending time is around{" "}
                              <span className='font-medium'>{hourlyChartData.sort((a, b) => b.amount - a.amount)[0].formattedHour}</span>.
                            </span>
                          </li>
                        )}

                        {barData.length > 2 && (
                          <li className='flex items-start'>
                            <ArrowRight className='mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500' />
                            <span>
                              Your spending is{" "}
                              {barData[barData.length - 1].total > barData[barData.length - 2].total ? "increasing" : "decreasing"} compared
                              to previous months.
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton
                            key={i}
                            className='h-24 w-full rounded-lg'
                          />
                        ))}
                    </div>
                    <Skeleton className='h-40 w-full rounded-lg' />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent
          value='merchants'
          className='mt-6 space-y-6'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Top Merchants */}
            <Card>
              <CardHeader>
                <CardTitle>Top Merchants</CardTitle>
                <CardDescription>Where you spend the most money</CardDescription>
              </CardHeader>
              <CardContent>
                {merchantsLoaded ? (
                  <div className='space-y-8'>
                    {topMerchants.length > 0 ? (
                      topMerchants.map((merchant, index) => (
                        <div
                          key={merchant.name}
                          className='space-y-2'>
                          <div className='flex items-center'>
                            <div className='mr-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10'>
                              <ShoppingBag className='h-5 w-5 text-primary' />
                            </div>
                            <div className='flex-1'>
                              <div className='mb-1 flex items-center justify-between'>
                                <span className='font-medium'>{merchant.name}</span>
                                <span className='font-medium'>{formatCurrencyWithSymbol(merchant.total, currency)}</span>
                              </div>
                              <div className='bg-muted h-2 w-full rounded-full'>
                                <motion.div
                                  initial={{width: 0}}
                                  animate={{width: `${(merchant.total / topMerchants[0].total) * 100}%`}}
                                  transition={{duration: 0.5, delay: index * 0.1}}
                                  className='h-2 rounded-full bg-primary'
                                />
                              </div>
                            </div>
                          </div>
                          <div className='text-muted-foreground flex justify-between pl-12 text-xs'>
                            <span>{merchant.transactions} transactions</span>
                            <span>Avg: {formatCurrencyWithSymbol(merchant.averageTransaction, currency)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No merchant data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='space-y-8'>
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className='space-y-2'>
                          <div className='flex items-center'>
                            <Skeleton className='mr-3 h-9 w-9 rounded-full' />
                            <div className='flex-1'>
                              <div className='mb-1 flex items-center justify-between'>
                                <Skeleton className='h-5 w-32' />
                                <Skeleton className='h-5 w-20' />
                              </div>
                              <Skeleton className='h-2 w-full rounded-full' />
                            </div>
                          </div>
                          <div className='flex justify-between pl-12'>
                            <Skeleton className='h-4 w-24' />
                            <Skeleton className='h-4 w-24' />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merchant Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Merchant Category Breakdown</CardTitle>
                <CardDescription>What you buy from each merchant</CardDescription>
              </CardHeader>
              <CardContent className='h-96 overflow-y-auto'>
                {merchantsLoaded ? (
                  <div className='space-y-8'>
                    {topMerchants.length > 0 ? (
                      topMerchants.map((merchant) => (
                        <div
                          key={merchant.name}
                          className='space-y-2'>
                          <h3 className='font-medium'>{merchant.name}</h3>
                          <div className='space-y-4 border-l-2 border-primary/20 pl-4'>
                            <div className='h-40'>
                              <ResponsiveContainer
                                width='100%'
                                height='100%'>
                                <PieChart>
                                  <Pie
                                    data={merchant.categories}
                                    cx='50%'
                                    cy='50%'
                                    labelLine={false}
                                    label={({category, percent}) => `${category}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={50}
                                    fill='#8884d8'
                                    dataKey='amount'
                                    nameKey='category'>
                                    {merchant.categories.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(value) => currencyFormatter(value as number)}
                                    labelFormatter={(name) => `Category: ${name}`}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className='text-muted-foreground text-sm'>
                              Most frequent category: <span className='font-medium capitalize'>{merchant.categories[0]?.category}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No merchant category data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='space-y-8'>
                    {Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className='space-y-2'>
                          <Skeleton className='h-6 w-40' />
                          <div className='space-y-4 border-l-2 border-primary/20 pl-4'>
                            <Skeleton className='h-40 w-full rounded-lg' />
                            <Skeleton className='h-4 w-48' />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Merchant Comparison */}
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle>Merchant Comparison</CardTitle>
                <CardDescription>Compare spending across your top merchants</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='merchant-comparison-bar-chart'
                  title='Merchant Comparison'
                />
                {merchantsLoaded ? (
                  <div
                    id='merchant-comparison-bar-chart'
                    className='h-full'>
                    {topMerchants.length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <BarChart
                          data={topMerchants}
                          margin={{top: 20, right: 30, left: 20, bottom: 60}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis
                            dataKey='name'
                            tick={{fontSize: 12}}
                            angle={-45}
                            textAnchor='end'
                            height={60}
                          />
                          <YAxis
                            yAxisId='left'
                            tickFormatter={currencyFormatter}
                          />
                          <YAxis
                            yAxisId='right'
                            orientation='right'
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "total") return currencyFormatter(value as number);
                              if (name === "transactions") return `${value} transactions`;
                              return currencyFormatter(value as number);
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId='left'
                            dataKey='total'
                            name='Total Spent'
                            fill='#8884d8'
                          />
                          <Bar
                            yAxisId='right'
                            dataKey='transactions'
                            name='# of Transactions'
                            fill='#82ca9d'
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No merchant comparison data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-full rounded-lg' />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent
          value='categories'
          className='mt-6 space-y-6'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Detailed view of spending by category</CardDescription>
              </CardHeader>
              <CardContent className='h-96 overflow-y-auto'>
                {categoriesLoaded ? (
                  <div className='space-y-6'>
                    {pieData.length > 0 ? (
                      pieData.map((category, index) => (
                        <div
                          key={category.name}
                          className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <div
                                className='h-3 w-3 rounded-full'
                                style={{backgroundColor: COLORS[index % COLORS.length]}}
                              />
                              <h3 className='font-medium capitalize'>{category.name}</h3>
                            </div>
                            <span className='font-medium'>{formatCurrencyWithSymbol(category.value, currency)}</span>
                          </div>
                          <div className='space-y-1 pl-5'>
                            <div className='bg-muted h-2 w-full rounded-full'>
                              <motion.div
                                initial={{width: 0}}
                                animate={{width: `${(category.value / totalSpent) * 100}%`}}
                                transition={{duration: 0.5, delay: index * 0.1}}
                                className='h-2 rounded-full'
                                style={{backgroundColor: COLORS[index % COLORS.length]}}
                              />
                            </div>
                            <div className='text-muted-foreground flex justify-between text-xs'>
                              <span>{Math.round((category.value / totalSpent) * 100)}% of total</span>
                              <span>{filteredInvoices.filter((invoice) => invoice.category === category.name).length} transactions</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No category breakdown data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='space-y-6'>
                    {Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className='space-y-2'>
                          <div className='flex items-center justify-between'>
                            <Skeleton className='h-5 w-32' />
                            <Skeleton className='h-5 w-20' />
                          </div>
                          <div className='space-y-1 pl-5'>
                            <Skeleton className='h-2 w-full rounded-full' />
                            <div className='flex justify-between'>
                              <Skeleton className='h-4 w-20' />
                              <Skeleton className='h-4 w-24' />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Category Comparison</CardTitle>
                <CardDescription>Compare spending across categories by month</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='category-comparison-radar-chart'
                  title='Category Comparison'
                />
                {categoriesLoaded ? (
                  <div
                    id='category-comparison-radar-chart'
                    className='h-full'>
                    {categoryComparisonData.length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <RadarChart
                          outerRadius={90}
                          data={categoryComparisonData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey='category' />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, "auto"]}
                          />
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => (
                            <Radar
                              key={month}
                              name={month}
                              dataKey={month}
                              stroke={COLORS[index % COLORS.length]}
                              fill={COLORS[index % COLORS.length]}
                              fillOpacity={0.2}
                            />
                          ))}
                          <Legend />
                          <Tooltip formatter={(value) => currencyFormatter(value as number)} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No category comparison data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-64 rounded-full' />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Trends */}
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle>Category Trends Over Time</CardTitle>
                <CardDescription>How your category spending has changed</CardDescription>
              </CardHeader>
              <CardContent className='relative h-80'>
                <ChartActions
                  chartId='category-trends-area-chart'
                  title='Category Trends Over Time'
                />
                {categoriesLoaded ? (
                  <div
                    id='category-trends-area-chart'
                    className='h-full'>
                    {barData.length > 0 && Object.keys(categoryData).length > 0 ? (
                      <ResponsiveContainer
                        width='100%'
                        height='100%'>
                        <AreaChart
                          data={barData}
                          margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis dataKey='name' />
                          <YAxis tickFormatter={currencyFormatter} />
                          <Tooltip formatter={currencyFormatter} />
                          <Legend />
                          {Object.keys(categoryData)
                            .slice(0, 5)
                            .map((category, index) => {
                              // Calculate monthly data for this category
                              const categoryMonthlyData = filteredInvoices
                                .filter((invoice) => invoice.category === category)
                                .reduce(
                                  (acc, invoice) => {
                                    try {
                                      const date = new Date(invoice.date);
                                      const month = format(date, "MMM yyyy");
                                      if (!acc[month]) {
                                        acc[month] = 0;
                                      }
                                      acc[month] += invoice.amount;
                                      return acc;
                                    } catch (error) {
                                      console.error("Error processing date:", error);
                                      return acc;
                                    }
                                  },
                                  {} as Record<string, number>,
                                );

                              // Map to the same structure as barData
                              const mappedData = barData.map((item) => ({
                                name: item.name,
                                [category]: categoryMonthlyData[item.name] || 0,
                              }));

                              return (
                                <Area
                                  key={category}
                                  type='monotone'
                                  dataKey={category}
                                  name={category}
                                  stroke={COLORS[index % COLORS.length]}
                                  fill={COLORS[index % COLORS.length]}
                                  fillOpacity={0.2}
                                  data={mappedData}
                                />
                              );
                            })}
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center'>
                        <p className='text-muted-foreground'>No category trends data available for the selected filters</p>
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='flex h-full items-center justify-center'>
                    <Skeleton className='h-64 w-full rounded-lg' />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for ComposedChart
const ComposedChart = ({children, ...props}: any) => {
  return (
    <ResponsiveContainer
      width='100%'
      height='100%'>
      <BarChart {...props}>{children}</BarChart>
    </ResponsiveContainer>
  );
};
