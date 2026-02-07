"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbCreditCard, TbMinus, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {computeBudgetImpact} from "../../_utils/analytics";
import styles from "./BudgetImpactCard.module.scss";

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
        <main className={styles["budgetSection"]}>
          <main className={styles["budgetRow"]}>
            <span className={styles["budgetLabel"]}>Monthly Budget</span>
            <span className={styles["budgetValue"]}>{formatCurrency(monthlyBudget, {currencyCode: currency.code, locale})}</span>
          </main>
          <Progress
            value={Math.min(percentUsed, 100)}
            className={`h-3 ${getProgressColorClass()}`}
          />
          <main className={styles["budgetMeta"]}>
            <span>{formatCurrency(totalSpent, {currencyCode: currency.code, locale})} spent</span>
            <span>{percentUsed.toFixed(0)}%</span>
          </main>
        </main>

        {/* This invoice impact */}
        <main className={styles["impactBox"]}>
          <p className={styles["impactLabel"]}>This invoice used</p>
          <p className={styles["impactPercent"]}>{thisInvoicePercent.toFixed(1)}%</p>
          <p className={styles["impactDescription"]}>of your monthly budget</p>
        </main>

        {/* Remaining stats */}
        <main className={styles["statsGrid"]}>
          <main className={styles["statItem"]}>
            <p className={styles["statLabel"]}>Remaining</p>
            <p className={`${styles["statValue"]} ${isOverBudget ? styles["overBudgetText"] : ""}`}>
              {formatCurrency(Math.abs(remaining), {currencyCode: currency.code, locale})}
            </p>
            {isOverBudget ? <p className={styles["overBudgetLabel"]}>Over budget</p> : null}
          </main>
          <main className={styles["statItem"]}>
            <p className={styles["statLabel"]}>Days Left</p>
            <p className={styles["statValue"]}>{daysRemaining}</p>
            <p className={styles["statLabel"]}>in {monthName}</p>
          </main>
        </main>

        {/* Daily allowance */}
        {!isOverBudget && (
          <main className={styles["dailyAllowanceBox"]}>
            <main className={styles["dailyAllowanceContent"]}>
              <p className={styles["dailyAllowanceLabel"]}>Daily Allowance</p>
              <p className={styles["dailyAllowanceValue"]}>{formatCurrency(dailyAllowance, {currencyCode: currency.code, locale})}/day</p>
            </main>
            {getDailyAllowanceIcon()}
          </main>
        )}
      </CardContent>
    </Card>
  );
}
