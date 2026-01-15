"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbCreditCard, TbMinus, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {computeBudgetImpact} from "../../_utils/analytics";

export function BudgetImpactCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;
  const {currency} = paymentInformation;

  const {
    monthlyBudget,
    totalSpent,
    remaining,
    percentUsed,
    thisInvoicePercent,
    daysRemaining,
    dailyAllowance,
    isOverBudget,
    isNearLimit,
    monthName,
  } = computeBudgetImpact(paymentInformation);

  // Determine progress bar color class based on budget status
  const getProgressColorClass = (): string => {
    if (isOverBudget) return "[&>div]:bg-destructive";
    if (isNearLimit) return "[&>div]:bg-amber-500";
    return "";
  };

  // Determine daily allowance trend icon
  const getDailyAllowanceIcon = (): React.JSX.Element => {
    if (dailyAllowance > 60) return <TbTrendingUp className='h-5 w-5 text-emerald-500' />;
    if (dailyAllowance > 40) return <TbMinus className='h-5 w-5 text-amber-500' />;
    return <TbTrendingDown className='text-destructive h-5 w-5' />;
  };

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbCreditCard className='text-muted-foreground h-4 w-4' />
          {monthName} Budget Impact
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Budget progress */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>Monthly Budget</span>
            <span className='font-medium'>{formatCurrency(monthlyBudget, {currencyCode: currency.code, locale})}</span>
          </div>
          <Progress
            value={Math.min(percentUsed, 100)}
            className={`h-3 ${getProgressColorClass()}`}
          />
          <div className='text-muted-foreground flex items-center justify-between text-xs'>
            <span>{formatCurrency(totalSpent, {currencyCode: currency.code, locale})} spent</span>
            <span>{percentUsed.toFixed(0)}%</span>
          </div>
        </div>

        {/* This invoice impact */}
        <div className='border-border bg-muted/30 space-y-1 rounded-lg border p-3'>
          <p className='text-muted-foreground text-xs'>This invoice used</p>
          <p className='text-2xl font-semibold tabular-nums'>{thisInvoicePercent.toFixed(1)}%</p>
          <p className='text-muted-foreground text-xs'>of your monthly budget</p>
        </div>

        {/* Remaining stats */}
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-xs'>Remaining</p>
            <p className={`text-lg font-semibold tabular-nums ${isOverBudget ? "text-destructive" : ""}`}>
              {formatCurrency(Math.abs(remaining), {currencyCode: currency.code, locale})}
            </p>
            {isOverBudget ? <p className='text-destructive text-xs'>Over budget</p> : null}
          </div>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-xs'>Days Left</p>
            <p className='text-lg font-semibold tabular-nums'>{daysRemaining}</p>
            <p className='text-muted-foreground text-xs'>in {monthName}</p>
          </div>
        </div>

        {/* Daily allowance */}
        {!isOverBudget && (
          <div className='border-border flex items-center justify-between rounded-lg border p-3'>
            <div className='space-y-0.5'>
              <p className='text-muted-foreground text-xs'>Daily Allowance</p>
              <p className='text-sm font-medium'>{formatCurrency(dailyAllowance, {currencyCode: currency.code, locale})}/day</p>
            </div>
            {getDailyAllowanceIcon()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
