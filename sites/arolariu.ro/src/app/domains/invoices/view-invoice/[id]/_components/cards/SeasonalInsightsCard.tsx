"use client";

import {generateRandomInvoices} from "@/data/mocks/invoice";
import {formatCurrency, formatEnum} from "@/lib/utils.generic";
import {ProductCategory, type Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbBulb, TbShoppingBag, TbSparkles, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

type Insight = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "info" | "warning" | "success";
};

/**
 * Calculate category spending totals from invoice items.
 */
function calculateCategorySpending(invoice: Invoice): Record<ProductCategory, number> {
  const categorySpending: Record<ProductCategory, number> = {} as Record<ProductCategory, number>;
  for (const item of invoice.items) {
    categorySpending[item.category] = (categorySpending[item.category] || 0) + item.totalPrice;
  }
  return categorySpending;
}

/**
 * Calculate historical average spending by category.
 */
function calculateHistoricalAverage(): Record<ProductCategory, {total: number; count: number}> {
  const historicalInvoices: Invoice[] = generateRandomInvoices(50);
  const historicalAvg: Record<ProductCategory, {total: number; count: number}> = {} as Record<
    ProductCategory,
    {total: number; count: number}
  >;
  for (const inv of historicalInvoices) {
    for (const [cat, amount] of Object.entries(inv.items)) {
      const category = Number.parseInt(cat, 10) as ProductCategory;
      if (!historicalAvg[category]) {
        historicalAvg[category] = {total: 0, count: 0};
      }
      historicalAvg[category].total += amount.totalPrice;
      historicalAvg[category].count += 1;
    }
  }
  return historicalAvg;
}

/**
 * Detect spending spikes compared to historical averages.
 */
function detectSpendingSpikes(
  categorySpending: Record<ProductCategory, number>,
  historicalAvg: Record<ProductCategory, {total: number; count: number}>,
): Insight[] {
  const insights: Insight[] = [];
  for (const [cat, amount] of Object.entries(categorySpending)) {
    const category = Number.parseInt(cat, 10) as ProductCategory;
    const avg = historicalAvg[category];
    const hasValidAverage = avg && avg.count > 0;

    if (hasValidAverage) {
      const avgAmount = avg.total / avg.count;
      const percentChange = ((amount - avgAmount) / avgAmount) * 100;
      const isSignificantSpike = percentChange > 100;

      if (isSignificantSpike) {
        insights.push({
          id: `spike-${category}`,
          icon: <TbTrendingUp className='h-4 w-4' />,
          title: `${formatEnum(ProductCategory, category)} Spike`,
          description: `+${percentChange.toFixed(0)}% vs your average`,
          type: "warning",
        });
      }
    }
  }
  return insights;
}

/**
 * Get December-specific seasonal insights.
 */
function getDecemberInsights(date: Date): Insight[] {
  const insights: Insight[] = [
    {
      id: "holiday-season",
      icon: <TbSparkles className='h-4 w-4' />,
      title: "Holiday Season",
      description: "December spending is typically 35% higher",
      type: "info",
    },
  ];

  const isEarlyDecember = date.getDate() < 15;
  if (isEarlyDecember) {
    insights.push({
      id: "stock-up-tip",
      icon: <TbBulb className='h-4 w-4' />,
      title: "Stock Up Tip",
      description: "Prices increase ~15% after Dec 15th",
      type: "success",
    });
  }
  return insights;
}

/**
 * Get the default insight when no specific patterns are detected.
 */
function getDefaultInsight(): Insight {
  return {
    id: "normal-pattern",
    icon: <TbShoppingBag className='h-4 w-4' />,
    title: "Normal Shopping Pattern",
    description: "Your spending is within typical range",
    type: "success",
  };
}

function detectSeasonalInsights(invoice: Invoice): Insight[] {
  const insights: Insight[] = [];
  const date = new Date(invoice.paymentInformation.transactionDate);
  const month = date.getMonth();

  const categorySpending = calculateCategorySpending(invoice);
  const historicalAvg = calculateHistoricalAverage();
  const spendingSpikes = detectSpendingSpikes(categorySpending, historicalAvg);
  insights.push(...spendingSpikes);

  const isDecember = month === 11;
  if (isDecember) {
    const decemberInsights = getDecemberInsights(date);
    insights.push(...decemberInsights);
  }

  if (insights.length === 0) {
    insights.push(getDefaultInsight());
  }

  return insights.slice(0, 3);
}

/**
 * Get the border and background CSS classes for an insight based on its type.
 */
function getInsightContainerClasses(type: Insight["type"]): string {
  if (type === "warning") return "border-amber-500/30 bg-amber-500/5";
  if (type === "success") return "border-emerald-500/30 bg-emerald-500/5";
  return "border-border bg-muted/30";
}

/**
 * Get the text color CSS class for an insight icon based on its type.
 */
function getInsightIconColorClass(type: Insight["type"]): string {
  if (type === "warning") return "text-amber-500";
  if (type === "success") return "text-emerald-500";
  return "text-muted-foreground";
}

export function SeasonalInsightsCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const insights = detectSeasonalInsights(invoice);
  const date = new Date(invoice.paymentInformation.transactionDate);
  const monthName = new Intl.DateTimeFormat("en-US", {month: "long"}).format(date);
  const {currency} = invoice.paymentInformation;

  // Simulated December spending data
  const decemberAverage = 1800;
  const currentDecemberSpending = 1245;
  const percentOfAverage = (currentDecemberSpending / decemberAverage) * 100;

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbSparkles className='text-muted-foreground h-4 w-4' />
          Seasonal Insight
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Month comparison */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>{monthName} so far</span>
            <span className='font-medium'>{formatCurrency(currentDecemberSpending, {currencyCode: currency.code, locale})}</span>
          </div>
          <Progress
            value={percentOfAverage}
            className='h-2'
          />
          <div className='text-muted-foreground flex items-center justify-between text-xs'>
            <span>
              vs {monthName} avg: {formatCurrency(decemberAverage, {currencyCode: currency.code, locale})}
            </span>
            <span>{percentOfAverage.toFixed(0)}%</span>
          </div>
        </div>

        {/* Insights list */}
        <div className='space-y-2'>
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${getInsightContainerClasses(insight.type)}`}>
              <div className={`mt-0.5 ${getInsightIconColorClass(insight.type)}`}>{insight.icon}</div>
              <div className='min-w-0 flex-1'>
                <p className='text-sm leading-tight font-medium'>{insight.title}</p>
                <p className='text-muted-foreground text-xs'>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
