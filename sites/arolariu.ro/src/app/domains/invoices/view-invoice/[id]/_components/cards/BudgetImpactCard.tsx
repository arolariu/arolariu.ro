"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {TbCreditCard, TbMinus, TbTrendingDown, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {computeBudgetImpact} from "../../_utils/analytics";
import styles from "./BudgetImpactCard.module.scss";

export function BudgetImpactCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const {invoice} = useInvoiceContext();
  const {paymentInformation} = invoice;
  const {currency} = paymentInformation;

  const {monthlyBudget, totalSpent, remaining, percentUsed, thisInvoicePercent, daysRemaining, dailyAllowance, isOverBudget, monthName} =
    computeBudgetImpact(paymentInformation, locale);

  // Determine daily allowance trend icon
  const getDailyAllowanceIcon = (): React.JSX.Element => {
    if (dailyAllowance > 60) return <TbTrendingUp className={styles["trendIconUp"]} />;
    if (dailyAllowance > 40) return <TbMinus className={styles["trendIconNeutral"]} />;
    return <TbTrendingDown className={styles["trendIconDown"]} />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbCreditCard className={styles["titleIcon"]} />
            {t((m) => m.cards.invoices.budgetImpactCard.title, {month: monthName})}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {/* Budget progress */}
          <div className={styles["budgetSection"]}>
            <div className={styles["budgetRow"]}>
              <span className={styles["budgetLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.monthlyBudget)}</span>
              <span className={styles["budgetValue"]}>{formatCurrency(monthlyBudget, {currencyCode: currency.code, locale})}</span>
            </div>
            <Progress value={Math.min(percentUsed, 100)} />
            <div className={styles["budgetMeta"]}>
              <span>
                {t((m) => m.cards.invoices.budgetImpactCard.spent, {
                  amount: formatCurrency(totalSpent, {currencyCode: currency.code, locale}),
                })}
              </span>
              <span>{percentUsed.toFixed(0)}%</span>
            </div>
          </div>

          {/* This invoice impact */}
          <div className={styles["impactBox"]}>
            <p className={styles["impactLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.invoiceUsed)}</p>
            <p className={styles["impactPercent"]}>{thisInvoicePercent.toFixed(1)}%</p>
            <p className={styles["impactDescription"]}>{t((m) => m.cards.invoices.budgetImpactCard.ofMonthlyBudget)}</p>
          </div>

          {/* Remaining stats */}
          <div className={styles["statsGrid"]}>
            <div className={styles["statItem"]}>
              <p className={styles["statLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.remaining)}</p>
              <p className={`${styles["statValue"]} ${isOverBudget ? styles["overBudgetText"] : ""}`}>
                {formatCurrency(Math.abs(remaining), {currencyCode: currency.code, locale})}
              </p>
              {isOverBudget ? <p className={styles["overBudgetLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.overBudget)}</p> : null}
            </div>
            <div className={styles["statItem"]}>
              <p className={styles["statLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.daysLeft)}</p>
              <p className={styles["statValue"]}>{daysRemaining}</p>
              <p className={styles["statLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.inMonth, {month: monthName})}</p>
            </div>
          </div>

          {/* Daily allowance */}
          {!isOverBudget && (
            <div className={styles["dailyAllowanceBox"]}>
              <div className={styles["dailyAllowanceContent"]}>
                <p className={styles["dailyAllowanceLabel"]}>{t((m) => m.cards.invoices.budgetImpactCard.dailyAllowance)}</p>
                <p className={styles["dailyAllowanceValue"]}>
                  {t((m) => m.cards.invoices.budgetImpactCard.dailyAllowanceValue, {
                    amount: formatCurrency(dailyAllowance, {currencyCode: currency.code, locale}),
                  })}
                </p>
              </div>
              {getDailyAllowanceIcon()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
