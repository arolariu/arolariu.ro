/** @format */

"use client";

import {formatCurrency} from "@/lib/utils.generic";
import type {Invoice, Merchant} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {memo, useMemo} from "react";
import {TbChartBar, TbChartCandle, TbChartPie, TbMessage, TbShare} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import {BarChart, ChartContainer, LineChart, PieChart} from "../charts";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

// Create a memoized version of the component to prevent unnecessary re-renders
export const AnalyticsCard = memo(function AnalyticsCard({invoice, merchant}: Readonly<Props>) {
  const {open: openFeedback} = useDialog("INVOICE_FEEDBACK", "add", {invoice, merchant});
  const {open: openShare} = useDialog("shareAnalytics", "add", {invoice, merchant});

  // Generate mock data for the charts
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = new Date().getMonth();

    return months.map((month, i) => {
      const isCurrentMonth = i === currentMonth;
      const isPastMonth = i < currentMonth;

      // eslint-disable-next-line sonarjs/pseudo-random
      const baseAmount = 2 * (0.7 + Math.random() * 0.6);
      const amount = isPastMonth || isCurrentMonth ? baseAmount : 0;

      return {
        name: month,
        value: amount,
      };
    });
  }, []);

  // Category comparison data
  const categoryData = useMemo(() => {
    const categories = ["Groceries", "Dining", "Entertainment", "Shopping", "Other"];
    const currentCategory = "groceries".toUpperCase();

    return categories.map((cat) => {
      const isCurrentCategory = cat.toUpperCase() === currentCategory;
      // eslint-disable-next-line sonarjs/pseudo-random
      const value = isCurrentCategory ? 2 : 3 * (0.2 + Math.random() * 0.5);

      return {
        name: cat,
        value: value,
      };
    });
  }, []);

  // Merchant comparison data
  const merchantComparisonData = useMemo(() => {
    const merchants = ["Andy's", "Trader Joe's", "Safeway", "Costco", "Target"];
    const merchantName = merchant.name.toUpperCase();
    return merchants.map((merchant) => {
      const isCurrentMerchant = merchant === merchantName;
      // eslint-disable-next-line sonarjs/pseudo-random
      const value = isCurrentMerchant ? 2 : 3 * (0.6 + Math.random() * 0.8);

      return {
        name: merchant,
        value: value,
      };
    });
  }, [merchant.name]);

  return (
    <Card className='group transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <div>
          <CardTitle>Spending Analytics</CardTitle>
          <CardDescription>Detailed analysis of your spending patterns</CardDescription>
        </div>
        <div className='flex gap-2'>
          <Button
            className='cursor-pointer'
            variant='outline'
            size='sm'
            onClick={openShare}>
            <TbShare className='mr-2 h-4 w-4' />
            Share
          </Button>
          <Button
            className='cursor-pointer'
            variant='outline'
            size='sm'
            onClick={openFeedback}>
            <TbMessage className='mr-2 h-4 w-4' />
            Feedback
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue='trends'>
          <TabsList className='mb-4 grid w-full grid-cols-3'>
            <TabsTrigger
              value='trends'
              className='cursor-pointer'>
              <TbChartCandle className='mr-2 h-4 w-4' />
              Trends
            </TabsTrigger>
            <TabsTrigger
              value='comparison'
              className='cursor-pointer'>
              <TbChartBar className='mr-2 h-4 w-4' />
              Comparison
            </TabsTrigger>
            <TabsTrigger
              value='breakdown'
              className='cursor-pointer'>
              <TbChartPie className='mr-2 h-4 w-4' />
              Breakdown
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='trends'
            className='space-y-4'>
            <div className='text-muted-foreground mb-2 text-sm'>Your spending at {merchant.name} over the past year</div>
            <div className='h-[300px]'>
              <ChartContainer
                config={{
                  value: {
                    label: "Amount",
                    color: "hsl(var(--chart-1))",
                  },
                }}>
                <LineChart
                  data={monthlyData}
                  index='name'
                  categories={["value"]}
                  colors={["hsl(var(--chart-1))"]}
                  valueFormatter={(value) => formatCurrency(value)}
                  showLegend={false}
                  showXAxis
                  showYAxis
                  showGridLines
                />
              </ChartContainer>
            </div>
            <div className='mt-4 grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-sm'>Average Spend</div>
                <div className='text-xl font-bold'>{formatCurrency(2 * 0.85)}</div>
              </div>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-sm'>Year to Date</div>
                <div className='text-xl font-bold'>{formatCurrency(3 * 5.2)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value='comparison'
            className='space-y-4'>
            <div className='text-muted-foreground mb-2 text-sm'>How {merchant.name} compares to other merchants</div>
            <div className='h-[300px]'>
              <ChartContainer
                config={{
                  value: {
                    label: "Amount",
                    color: "hsl(var(--chart-2))",
                  },
                }}>
                <BarChart
                  data={merchantComparisonData}
                  index='name'
                  categories={["value"]}
                  colors={["hsl(var(--chart-2))"]}
                  valueFormatter={(value) => formatCurrency(value)}
                  showLegend={false}
                  showXAxis
                  showYAxis
                  showGridLines
                />
              </ChartContainer>
            </div>
            <div className='text-muted-foreground mt-2 text-sm'>
              {merchant.name} is{" "}
              {
                // eslint-disable-next-line sonarjs/pseudo-random
                Math.round(Math.random() * 20 + 10)
              }
              %{" "}
              {
                // eslint-disable-next-line sonarjs/pseudo-random
                Math.random() > 0.5 ? "higher" : "lower"
              }{" "}
              than average for similar merchants
            </div>
          </TabsContent>

          <TabsContent
            value='breakdown'
            className='space-y-4'>
            <div className='text-muted-foreground mb-2 text-sm'>Spending breakdown by category</div>
            <div className='h-[300px]'>
              <ChartContainer
                config={{
                  value: {
                    label: "Amount",
                    color: "hsl(var(--chart-3))",
                  },
                }}>
                <PieChart
                  data={categoryData}
                  index='name'
                  categories={["value"]}
                  colors={[
                    "hsl(var(--chart-1))",
                    "hsl(var(--chart-2))",
                    "hsl(var(--chart-3))",
                    "hsl(var(--chart-4))",
                    "hsl(var(--chart-5))",
                  ]}
                  valueFormatter={(value) => formatCurrency(value)}
                  showLegend
                  showAnimation
                />
              </ChartContainer>
            </div>
            <div className='text-muted-foreground mt-2 text-sm'>
              category represents{" "}
              {Math.round(
                // eslint-disable-next-line sonarjs/pseudo-random
                Math.random() * 20 + 15,
              )}
              % of your total monthly spending
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
