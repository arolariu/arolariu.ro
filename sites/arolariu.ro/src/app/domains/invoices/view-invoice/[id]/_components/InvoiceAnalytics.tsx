"use client";

import {useUserInformation} from "@/hooks";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {TbChartBar, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../_context/InvoiceContext";
import {
  getCategoryComparison,
  getCategorySpending,
  getComparisonStats,
  getInvoiceSummary,
  getMerchantBreakdown,
  getPriceDistribution,
  getQuantityAnalysis,
  getSpendingTrend,
} from "../_utils/analytics";
import {ComparisonStatsCard} from "./cards/ComparisonStatsCard";
import {SummaryStatsCard} from "./cards/SummaryStatsCard";
import {CategoryComparisonChart} from "./charts/CategoryComparisonChart";
import {ItemsBreakdownChart} from "./charts/ItemsBreakdownChart";
import {MerchantBreakdownChart} from "./charts/MerchantBreakdownChart";
import {PriceDistributionChart} from "./charts/PriceDistributionChart";
import {SpendingByCategoryChart} from "./charts/SpendingByCategoryChart";
import {SpendingTrendChart} from "./charts/SpendingTrendChart";

export function InvoiceAnalytics(): React.JSX.Element {
  const {invoice, merchant} = useInvoiceContext();
  const {
    userInformation: {userIdentifier},
  } = useUserInformation();

  const isOwner = invoice.userIdentifier === userIdentifier;
  const currency = invoice.paymentInformation.currency.symbol;
  const categoryData = getCategorySpending(invoice.items);
  const priceData = getPriceDistribution(invoice.items);
  const quantityData = getQuantityAnalysis(invoice.items);
  const summary = getInvoiceSummary(invoice);
  const trendData = getSpendingTrend();
  const comparisonStats = getComparisonStats();
  const categoryComparison = getCategoryComparison();
  const merchantBreakdown = getMerchantBreakdown();

  return (
    <div className='space-y-6'>
      <Tabs
        defaultValue='current'
        className='w-full'>
        <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2'>
            <TbChartBar className='text-muted-foreground h-5 w-5' />
            <h2 className='text-xl font-semibold'>Analytics & Insights</h2>
          </div>
          <TabsList className='grid w-full grid-cols-2 sm:w-auto'>
            <TabsTrigger
              value='current'
              className='text-xs sm:text-sm'>
              <TbChartBar className='mr-1.5 h-3.5 w-3.5' />
              This Invoice
            </TabsTrigger>
            {Boolean(isOwner) && (
              <TabsTrigger
                value='compare'
                className='text-xs sm:text-sm'>
                <TbTrendingUp className='mr-1.5 h-3.5 w-3.5' />
                Comparison
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Current Invoice Analytics */}
        <TabsContent
          value='current'
          className='mt-0'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {/* Summary Stats */}
            <div className='animate-in fade-in slide-in-from-bottom-4 duration-300'>
              <SummaryStatsCard
                summary={summary}
                currency={currency}
              />
            </div>

            {/* Spending by Category */}
            <div className='animate-in fade-in slide-in-from-bottom-4 delay-75 duration-300'>
              <SpendingByCategoryChart
                data={categoryData}
                currency={currency}
              />
            </div>

            {/* Price Distribution */}
            <div className='animate-in fade-in slide-in-from-bottom-4 delay-100 duration-300'>
              <PriceDistributionChart
                data={priceData}
                currency={currency}
              />
            </div>

            {/* Items Breakdown - Full Width on larger screens */}
            <div className='animate-in fade-in slide-in-from-bottom-4 delay-150 duration-300 sm:col-span-2 lg:col-span-3'>
              <ItemsBreakdownChart
                data={quantityData}
                currency={currency}
              />
            </div>
          </div>
        </TabsContent>

        {/* Comparison Analytics */}
        {Boolean(isOwner) && (
          <TabsContent
            value='compare'
            className='mt-0'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {/* Comparison Stats */}
              <div className='animate-in fade-in slide-in-from-bottom-4 duration-300'>
                <ComparisonStatsCard
                  stats={comparisonStats}
                  currency={currency}
                />
              </div>

              {/* Spending Trend */}
              <div className='animate-in fade-in slide-in-from-bottom-4 delay-75 duration-300 sm:col-span-1 lg:col-span-2'>
                <SpendingTrendChart
                  data={trendData}
                  currency={currency}
                />
              </div>

              {/* Category Comparison */}
              <div className='animate-in fade-in slide-in-from-bottom-4 delay-100 duration-300 sm:col-span-2 lg:col-span-2'>
                <CategoryComparisonChart
                  data={categoryComparison}
                  currency={currency}
                />
              </div>

              {/* Merchant Breakdown */}
              <div className='animate-in fade-in slide-in-from-bottom-4 delay-150 duration-300'>
                <MerchantBreakdownChart
                  data={merchantBreakdown}
                  currency={currency}
                  currentMerchant={merchant.name}
                />
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
