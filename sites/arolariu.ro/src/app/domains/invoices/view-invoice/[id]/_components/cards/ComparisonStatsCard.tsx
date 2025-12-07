"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, cn, Progress} from "@arolariu/components";
import {TbBuildingStore, TbMinus, TbShoppingBag, TbTarget, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {ComparisonStats} from "../../_utils/analytics";

type Props = {
  stats: ComparisonStats;
  currency: string;
};

export function ComparisonStatsCard({stats, currency}: Props): React.JSX.Element {
  const percentageProgress = Math.min(((stats.currentAmount - stats.minAmount) / (stats.maxAmount - stats.minAmount)) * 100, 100);

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TbTrendingUp className='h-4 w-4 text-amber-500' />;
    if (value < -5) return <TbTrendingDown className='h-4 w-4 text-emerald-500' />;
    return <TbMinus className='text-muted-foreground h-4 w-4' />;
  };

  const getTrendColor = (value: number) => {
    if (value > 5) return "text-amber-500";
    if (value < -5) return "text-emerald-500";
    return "text-muted-foreground";
  };

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>How You Compare</CardTitle>
        <CardDescription className='text-xs'>Against your last {stats.totalInvoices} invoices</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Current vs Average */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <TbTarget className='text-muted-foreground h-4 w-4' />
              <span className='text-sm'>vs Average</span>
            </div>
            <div className='flex items-center gap-1'>
              {getTrendIcon(stats.percentageDiff)}
              <span className={cn("text-sm font-medium", getTrendColor(stats.percentageDiff))}>
                {stats.percentageDiff > 0 ? "+" : ""}
                {stats.percentageDiff}%
              </span>
            </div>
          </div>
          <div className='text-muted-foreground flex justify-between text-xs'>
            <span>
              Avg: {stats.averageAmount.toFixed(2)} {currency}
            </span>
            <span>
              This: {stats.currentAmount.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        {/* Spending Range Progress */}
        <div className='space-y-2'>
          <div className='text-muted-foreground flex justify-between text-xs'>
            <span>Min: {stats.minAmount.toFixed(0)}</span>
            <span>Max: {stats.maxAmount.toFixed(0)}</span>
          </div>
          <Progress
            value={percentageProgress}
            className='h-2'
          />
          <p className='text-muted-foreground text-center text-xs'>Your position in spending range</p>
        </div>

        {/* Item Count Comparison */}
        <div className='flex items-center justify-between border-t pt-2'>
          <div className='flex items-center gap-2'>
            <TbShoppingBag className='text-muted-foreground h-4 w-4' />
            <span className='text-sm'>Item Count</span>
          </div>
          <div className='text-right'>
            <div className='flex items-center gap-1'>
              {getTrendIcon(stats.itemCountDiff)}
              <span className={cn("text-sm font-medium", getTrendColor(stats.itemCountDiff))}>
                {stats.itemCountDiff > 0 ? "+" : ""}
                {stats.itemCountDiff}%
              </span>
            </div>
            <span className='text-muted-foreground text-xs'>
              {stats.currentItemCount} vs avg {stats.averageItemCount}
            </span>
          </div>
        </div>

        {/* Same Merchant Comparison */}
        <div className='flex items-center justify-between border-t pt-2'>
          <div className='flex items-center gap-2'>
            <TbBuildingStore className='text-muted-foreground h-4 w-4' />
            <span className='text-sm'>Same Store</span>
          </div>
          <div className='text-right'>
            <div className='flex items-center gap-1'>
              {getTrendIcon(stats.sameMerchantDiff)}
              <span className={cn("text-sm font-medium", getTrendColor(stats.sameMerchantDiff))}>
                {stats.sameMerchantDiff > 0 ? "+" : ""}
                {stats.sameMerchantDiff}%
              </span>
            </div>
            <span className='text-muted-foreground text-xs'>
              vs avg {stats.sameMerchantAvg.toFixed(0)} {currency}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
