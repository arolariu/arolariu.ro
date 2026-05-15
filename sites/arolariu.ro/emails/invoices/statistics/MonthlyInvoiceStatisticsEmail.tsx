/**
 * @fileoverview Monthly invoice statistics email.
 * @module emails/invoices/statistics/MonthlyInvoiceStatisticsEmail
 */

import type {EmailLocale} from "../../_i18n";
import {InvoiceStatisticsEmail, type InvoiceStatisticsEmailProps} from "./InvoiceStatisticsEmail";

type Props = Readonly<Omit<InvoiceStatisticsEmailProps, "frequency">>;

async function MonthlyInvoiceStatisticsEmail(props: Readonly<Props>): Promise<React.JSX.Element> {
  const {
    username,
    periodStart,
    periodEnd,
    currency,
    totals,
    topMerchants,
    topCategories,
    categorySpendBreakdown,
    categorySpendChartUrl,
    invoicesUrl,
    createInvoiceUrl,
    locale,
  } = props;

  return (
    <InvoiceStatisticsEmail
      username={username}
      periodStart={periodStart}
      periodEnd={periodEnd}
      currency={currency}
      totals={totals}
      topMerchants={topMerchants}
      topCategories={topCategories}
      categorySpendBreakdown={categorySpendBreakdown}
      categorySpendChartUrl={categorySpendChartUrl}
      invoicesUrl={invoicesUrl}
      createInvoiceUrl={createInvoiceUrl}
      frequency='monthly'
      locale={locale}
    />
  );
}

MonthlyInvoiceStatisticsEmail.PreviewProps = {
  username: "Test User",
  periodStart: "2025-11-01",
  periodEnd: "2025-11-30",
  currency: "EUR",
  totals: {
    invoicesCount: 23,
    scansCount: 23,
    totalSpend: 812.4,
    averageSpend: 35.32,
  },
  topMerchants: [
    {name: "Kaufland", totalSpend: 214.75},
    {name: "eMAG", totalSpend: 176.2},
    {name: "OMV", totalSpend: 92},
  ],
  topCategories: [
    {name: "Groceries", totalSpend: 342.3},
    {name: "Household", totalSpend: 141.2},
    {name: "Fuel", totalSpend: 112.1},
  ],
  locale: "en",
} satisfies Props;

export default MonthlyInvoiceStatisticsEmail;
