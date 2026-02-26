"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {TbCreditCard, TbMinus, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {computeBudgetImpact} from "../../_utils/analytics";
import styles from "./BudgetImpactCard.module.scss";

export function BudgetImpactCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoice.budgetImpactCard");
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
          {t("title", {month: monthName})}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Budget progress */}
        <div className={styles["budgetSection"]}>
          <div className={styles["budgetRow"]}>
            <span className={styles["budgetLabel"]}>{t("monthlyBudget")}</span>
            <span className={styles["budgetValue"]}>{formatCurrency(monthlyBudget, {currencyCode: currency.code, locale})}</span>
          </div>
          <Progress
            value={Math.min(percentUsed, 100)}
            className={`h-3 ${getProgressColorClass()}`}
          />
          <div className={styles["budgetMeta"]}>
            <span>{t("spent", {amount: formatCurrency(totalSpent, {currencyCode: currency.code, locale})})}</span>
            <span>{percentUsed.toFixed(0)}%</span>
          </div>
        </div>

        {/* This invoice impact */}
        <div className={styles["impactBox"]}>
          <p className={styles["impactLabel"]}>{t("invoiceUsed")}</p>
          <p className={styles["impactPercent"]}>{thisInvoicePercent.toFixed(1)}%</p>
          <p className={styles["impactDescription"]}>{t("ofMonthlyBudget")}</p>
        </div>

        {/* Remaining stats */}
        <div className={styles["statsGrid"]}>
          <div className={styles["statItem"]}>
            <p className={styles["statLabel"]}>{t("remaining")}</p>
            <p className={`${styles["statValue"]} ${isOverBudget ? styles["overBudgetText"] : ""}`}>
              {formatCurrency(Math.abs(remaining), {currencyCode: currency.code, locale})}
            </p>
            {isOverBudget ? <p className={styles["overBudgetLabel"]}>{t("overBudget")}</p> : null}
          </div>
          <div className={styles["statItem"]}>
            <p className={styles["statLabel"]}>{t("daysLeft")}</p>
            <p className={styles["statValue"]}>{daysRemaining}</p>
            <p className={styles["statLabel"]}>{t("inMonth", {month: monthName})}</p>
          </div>
        </div>

        {/* Daily allowance */}
        {!isOverBudget && (
          <div className={styles["dailyAllowanceBox"]}>
            <div className={styles["dailyAllowanceContent"]}>
              <p className={styles["dailyAllowanceLabel"]}>{t("dailyAllowance")}</p>
              <p className={styles["dailyAllowanceValue"]}>
                {t("dailyAllowanceValue", {amount: formatCurrency(dailyAllowance, {currencyCode: currency.code, locale})})}
              </p>
            </div>
            {getDailyAllowanceIcon()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
