"use client";

import {generateRandomInvoices} from "@/data/mocks/invoice";
import {formatCurrency, formatEnum} from "@/lib/utils.generic";
import {ProductCategory, type Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbBulb, TbShoppingBag, TbSparkles, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

type Insight = {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "info" | "warning" | "success";
};

function detectSeasonalInsights(invoice: Invoice): Insight[] {
  const insights: Insight[] = [];
  const date = new Date(invoice.paymentInformation.transactionDate);
  const month = date.getMonth();
  const currency = invoice.paymentInformation.currency;

  // Calculate category spending
  const categorySpending = invoice.items.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.totalPrice;
      return acc;
    },
    {} as Record<ProductCategory, number>,
  );

  const historicalInvoices: Invoice[] = generateRandomInvoices(50); // This would be fetched from user data
  // Calculate historical average for the same categories
  const historicalAvg = historicalInvoices.reduce(
    (acc, inv) => {
      Object.entries(inv.items).forEach(([cat, amount]) => {
        const category = Number.parseInt(cat) as ProductCategory;
        if (!acc[category]) {
          acc[category] = {total: 0, count: 0};
        }
        acc[category].total += amount.totalPrice;
        acc[category].count += 1;
      });
      return acc;
    },
    {} as Record<ProductCategory, {total: number; count: number}>,
  );

  // Detect unusual spending patterns
  Object.entries(categorySpending).forEach(([cat, amount]) => {
    const category = Number.parseInt(cat) as ProductCategory;
    const avg = historicalAvg[category];
    if (avg && avg.count > 0) {
      const avgAmount = avg.total / avg.count;
      const percentChange = ((amount - avgAmount) / avgAmount) * 100;

      if (percentChange > 100) {
        insights.push({
          icon: <TbTrendingUp className='h-4 w-4' />,
          title: `${formatEnum(category)} Spike`,
          description: `+${percentChange.toFixed(0)}% vs your average`,
          type: "warning",
        });
      }
    }
  });

  // December-specific insights
  if (month === 11) {
    insights.push({
      icon: <TbSparkles className='h-4 w-4' />,
      title: "Holiday Season",
      description: "December spending is typically 35% higher",
      type: "info",
    });

    // Tip based on date
    if (date.getDate() < 15) {
      insights.push({
        icon: <TbBulb className='h-4 w-4' />,
        title: "Stock Up Tip",
        description: "Prices increase ~15% after Dec 15th",
        type: "success",
      });
    }
  }

  // If no specific insights, add a general one
  if (insights.length === 0) {
    insights.push({
      icon: <TbShoppingBag className='h-4 w-4' />,
      title: "Normal Shopping Pattern",
      description: "Your spending is within typical range",
      type: "success",
    });
  }

  return insights.slice(0, 3);
}

export function SeasonalInsightsCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const insights = detectSeasonalInsights(invoice);
  const date = new Date(invoice.paymentInformation.transactionDate);
  const monthName = new Intl.DateTimeFormat("en-US", {month: "long"}).format(date);
  const currency = invoice.paymentInformation.currency;

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
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                insight.type === "warning"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : insight.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border bg-muted/30"
              }`}>
              <div
                className={`mt-0.5 ${
                  insight.type === "warning" ? "text-amber-500" : insight.type === "success" ? "text-emerald-500" : "text-muted-foreground"
                }`}>
                {insight.icon}
              </div>
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
