"use client";

/**
 * @fileoverview Currency Distribution Chart - displays spending by currency with RON conversion.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/CurrencyDistributionChart
 *
 * @remarks
 * This component visualizes multi-currency invoice spending patterns, showing:
 * - Distribution across different currencies
 * - Total spending in both original currency and RON equivalent
 * - Percentage share of each currency in total spending
 * - Toggle between viewing original amounts and RON equivalents
 *
 * **Single Currency Scenario:**
 * When all invoices use the same currency, displays a message instead of chart.
 *
 * **Visual Design:**
 * - Horizontal progress bars for each currency
 * - Currency flag emoji + code for identification
 * - Dual amount display (original + RON)
 * - Percentage badges for quick comparison
 */

import {Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {TbCurrencyDollar, TbSwitchHorizontal} from "react-icons/tb";
import type {CurrencyDistribution} from "../../../_utils/statistics";
import styles from "./CurrencyDistributionChart.module.scss";

type Props = {
  readonly data: CurrencyDistribution[];
};

/**
 * Maps currency codes to their flag emoji for visual identification.
 *
 * @remarks
 * Uses Unicode regional indicator symbols to display country flags.
 * Falls back to 🌐 globe emoji for currencies without specific country mapping.
 */
const CURRENCY_FLAGS: Record<string, string> = {
  RON: "🇷🇴", // Romanian Leu
  EUR: "🇪🇺", // Euro
  USD: "🇺🇸", // US Dollar
  GBP: "🇬🇧", // British Pound
  CHF: "🇨🇭", // Swiss Franc
  JPY: "🇯🇵", // Japanese Yen
  AUD: "🇦🇺", // Australian Dollar
  CAD: "🇨🇦", // Canadian Dollar
  CNY: "🇨🇳", // Chinese Yuan
  SEK: "🇸🇪", // Swedish Krona
  NOK: "🇳🇴", // Norwegian Krone
  DKK: "🇩🇰", // Danish Krone
  PLN: "🇵🇱", // Polish Złoty
  CZK: "🇨🇿", // Czech Koruna
  HUF: "🇭🇺", // Hungarian Forint
  BGN: "🇧🇬", // Bulgarian Lev
  HRK: "🇭🇷", // Croatian Kuna
  RSD: "🇷🇸", // Serbian Dinar
  UAH: "🇺🇦", // Ukrainian Hryvnia
  TRY: "🇹🇷", // Turkish Lira
};

/**
 * Empty state component for single-currency scenario.
 */
function SingleCurrencyMessage({currency}: {readonly currency: CurrencyDistribution}): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.currencyDistribution");
  const flag = CURRENCY_FLAGS[currency.currencyCode] ?? "🌐";

  return (
    <div className={styles["singleCurrency"]}>
      <div className={styles["singleCurrencyIcon"]}>
        <span className={styles["singleCurrencyFlag"]}>{flag}</span>
        <TbCurrencyDollar size={48} />
      </div>
      <p className={styles["singleCurrencyText"]}>
        {t("singleCurrency", {
          currency: currency.currencyCode,
          symbol: currency.currencySymbol,
        })}
      </p>
      <div className={styles["singleCurrencyStats"]}>
        <div className={styles["statItem"]}>
          <span className={styles["statLabel"]}>{t("totalAmount")}</span>
          <span className={styles["statValue"]}>
            {currency.totalOriginal.toFixed(2)} {currency.currencySymbol}
          </span>
        </div>
        <div className={styles["statItem"]}>
          <span className={styles["statLabel"]}>{t("invoiceCount")}</span>
          <span className={styles["statValue"]}>{currency.invoiceCount}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a horizontal bar chart showing spending distribution by currency.
 *
 * @remarks
 * **Features:**
 * - Toggle between original currency and RON equivalent view
 * - Progress bars sized by percentage of total spending
 * - Currency identification with flag emoji
 * - Dual amount display for transparency
 * - Responsive layout with proper spacing
 *
 * **Interaction:**
 * - Click toggle button to switch between original and RON view
 * - Hover over bars for visual feedback
 *
 * **Accessibility:**
 * - Semantic HTML with proper ARIA labels
 * - Keyboard navigation support
 * - High contrast colors for readability
 *
 * @param data - Array of currency distribution data
 * @returns Currency distribution chart JSX element
 */
export function CurrencyDistributionChart({data}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.currencyDistribution");
  const [showRON, setShowRON] = useState(false);

  // Handle single currency scenario
  if (data.length === 1) {
    const [currency] = data;
    if (!currency) return <></>;
    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <SingleCurrencyMessage currency={currency} />
        </CardContent>
      </Card>
    );
  }

  // Handle empty state
  if (data.length === 0) {
    return <></>;
  }

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <div className={styles["headerTop"]}>
          <div>
            <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
            <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
          </div>
          <button
            onClick={() => setShowRON(!showRON)}
            className={styles["toggleButton"]}
            aria-label={t("toggleLabel")}
            title={t("toggleLabel")}>
            <TbSwitchHorizontal size={20} />
            <span className={styles["toggleText"]}>{showRON ? t("showOriginal") : t("showRON")}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div className={styles["currencyList"]}>
          {data.map((currency, index) => {
            const flag = CURRENCY_FLAGS[currency.currencyCode] ?? "🌐";
            const displayAmount = showRON ? currency.totalInRON : currency.totalOriginal;
            const displaySymbol = showRON ? "lei" : currency.currencySymbol;

            return (
              <motion.div
                key={currency.currencyCode}
                className={styles["currencyItem"]}
                initial={{opacity: 0, x: -20}}
                animate={{opacity: 1, x: 0}}
                transition={{duration: 0.3, delay: index * 0.05}}>
                {/* Currency Header */}
                <div className={styles["currencyHeader"]}>
                  <div className={styles["currencyInfo"]}>
                    <span
                      className={styles["currencyFlag"]}
                      aria-label={`${currency.currencyCode} flag`}>
                      {flag}
                    </span>
                    <span className={styles["currencyCode"]}>{currency.currencyCode}</span>
                    <Badge
                      variant='secondary'
                      className={styles["invoiceBadge"]}>
                      {t("invoiceCount", {count: currency.invoiceCount})}
                    </Badge>
                  </div>
                  <div className={styles["currencyAmount"]}>
                    <span className={styles["amount"]}>
                      {displayAmount.toFixed(2)} {displaySymbol}
                    </span>
                    <Badge
                      variant='outline'
                      className={styles["percentageBadge"]}>
                      {currency.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress
                  value={currency.percentage}
                  className={styles["progressBar"]}
                  aria-label={`${currency.currencyCode} spending: ${currency.percentage}%`}
                />

                {/* Secondary Amount (Original or RON) */}
                {currency.currencyCode !== "RON" && (
                  <div className={styles["secondaryAmount"]}>
                    {showRON ? (
                      <span>
                        {t("originalAmount")}: {currency.totalOriginal.toFixed(2)} {currency.currencySymbol}
                      </span>
                    ) : (
                      <span>
                        {t("ronEquivalent")}: {currency.totalInRON.toFixed(2)} lei
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className={styles["summarySection"]}>
          <div className={styles["summaryItem"]}>
            <span className={styles["summaryLabel"]}>{t("totalCurrencies")}</span>
            <span className={styles["summaryValue"]}>{data.length}</span>
          </div>
          <div className={styles["summaryItem"]}>
            <span className={styles["summaryLabel"]}>{t("totalSpending")}</span>
            <span className={styles["summaryValue"]}>{data.reduce((sum, curr) => sum + curr.totalInRON, 0).toFixed(2)} lei</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
