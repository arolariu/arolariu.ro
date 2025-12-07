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
  ChartContainer,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {memo, useMemo} from "react";
import {TbChartBar, TbChartCandle, TbChartPie, TbMessage, TbShare} from "react-icons/tb";
import {BarChart, LineChart, PieChart} from "recharts";
import {useDialog} from "../../../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

/**
 * Displays comprehensive spending analytics with interactive charts and sharing options.
 *
 * @remarks
 * **Rendering Context**: Client Component with `memo` wrapper for render optimization.
 *
 * **Analytics Views** (tabbed interface):
 * - **Trends**: Line chart showing monthly spending at merchant over the past year
 * - **Comparison**: Bar chart comparing spending at current merchant vs. similar merchants
 * - **Breakdown**: Pie chart showing spending distribution by category
 *
 * **Chart Data**: Currently uses mock data generated via `useMemo` hooks.
 * TODO: Replace with real analytics data from backend aggregation service.
 *
 * **Summary Statistics**:
 * - Average spend at merchant
 * - Year-to-date total spending
 * - Comparative analysis text (e.g., "25% lower than average")
 *
 * **Actions**:
 * - **Share**: Opens `ShareAnalyticsDialog` for exporting analytics as image/email
 * - **Feedback**: Opens `FeedbackDialog` for rating analytics features
 *
 * **Performance**: Wrapped in `memo` to prevent re-renders when parent updates
 * but props remain unchanged. Chart data memoized with `useMemo`.
 *
 * **Domain Context**: Part of the edit-invoice main content area, providing
 * value-add insights to encourage continued invoice tracking.
 *
 * @param props - Component properties with invoice and merchant for analytics context
 * @returns Memoized client-rendered card with tabbed analytics charts
 *
 * @example
 * ```tsx
 * <AnalyticsCard invoice={invoice} merchant={merchant} />
 * // Displays: Tabbed card with Trends/Comparison/Breakdown charts
 * ```
 *
 * @see {@link ShareAnalyticsDialog} - Dialog for sharing analytics
 * @see {@link FeedbackDialog} - Dialog for analytics feedback
 * @see {@link ChartContainer} - Chart wrapper component from @arolariu/components
 */
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

      const baseAmount = 2 * 3;
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
      const value = isCurrentCategory ? 2 : 3;

      return {
        name: cat,
        value,
      };
    });
  }, []);

  // Merchant comparison data
  const merchantComparisonData = useMemo(() => {
    const merchants = ["Andy's", "Trader Joe's", "Safeway", "Costco", "Target"];
    const merchantName = merchant.name.toUpperCase();
    return merchants.map((merchant) => {
      const isCurrentMerchant = merchant === merchantName;
      const value = isCurrentMerchant ? 2 : 3;

      return {
        name: merchant,
        value,
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
                <LineChart data={monthlyData} />
              </ChartContainer>
            </div>
            <div className='mt-4 grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-sm'>Average Spend</div>
                <div className='text-xl font-bold'>{formatCurrency(2 * 0.85, invoice.paymentInformation.currency.code)}</div>
              </div>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-sm'>Year to Date</div>
                <div className='text-xl font-bold'>{formatCurrency(3 * 5.2, invoice.paymentInformation.currency.code)}</div>
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
                <BarChart data={merchantComparisonData} />
              </ChartContainer>
            </div>
            <div className='text-muted-foreground mt-2 text-sm'>{merchant.name} is 25% lower than average for similar merchants</div>
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
                <PieChart data={categoryData} />
              </ChartContainer>
            </div>
            <div className='text-muted-foreground mt-2 text-sm'>category represents 30 % of your total monthly spending</div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
