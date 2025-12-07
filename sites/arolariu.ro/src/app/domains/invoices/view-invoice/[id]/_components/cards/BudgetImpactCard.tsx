"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {TbCreditCard, TbMinus, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

export function BudgetImpactCard(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const currency = invoice.paymentInformation.currency;
  const invoiceTotal = invoice.paymentInformation.totalCostAmount;

  // Simulated budget data
  const monthlyBudget = 2000;
  const spentBeforeThis = 1057.55;
  const totalSpent = spentBeforeThis + invoiceTotal;
  const remaining = monthlyBudget - totalSpent;
  const percentUsed = (totalSpent / monthlyBudget) * 100;
  const thisInvoicePercent = (invoiceTotal / monthlyBudget) * 100;

  // Calculate days remaining in month
  const today = new Date(invoice.paymentInformation.transactionDate);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = lastDayOfMonth.getDate() - today.getDate();
  const dailyAllowance = remaining / Math.max(daysRemaining, 1);

  // Determine status
  const isOverBudget = remaining < 0;
  const isNearLimit = percentUsed > 80 && !isOverBudget;
  const monthName = new Intl.DateTimeFormat("en-US", {month: "long"}).format(today);

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
            <span className='font-medium'>{formatCurrency(monthlyBudget, currency.code)}</span>
          </div>
          <Progress
            value={Math.min(percentUsed, 100)}
            className={`h-3 ${isOverBudget ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
          />
          <div className='text-muted-foreground flex items-center justify-between text-xs'>
            <span>{formatCurrency(totalSpent, currency.code)} spent</span>
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
              {formatCurrency(Math.abs(remaining), currency.code)}
            </p>
            {isOverBudget && <p className='text-destructive text-xs'>Over budget</p>}
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
              <p className='text-sm font-medium'>{formatCurrency(dailyAllowance, currency.code)}/day</p>
            </div>
            {dailyAllowance > 60 ? (
              <TbTrendingUp className='h-5 w-5 text-emerald-500' />
            ) : dailyAllowance > 40 ? (
              <TbMinus className='h-5 w-5 text-amber-500' />
            ) : (
              <TbTrendingDown className='text-destructive h-5 w-5' />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
