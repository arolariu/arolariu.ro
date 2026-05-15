/**
 * @fileoverview Weekly invoice statistics email.
 * @module emails/invoices/statistics/WeeklyInvoiceStatisticsEmail
 */

import type {EmailLocale} from "../../_i18n";
import {InvoiceStatisticsEmail, type InvoiceStatisticsEmailProps} from "./InvoiceStatisticsEmail";

type Props = Readonly<Omit<InvoiceStatisticsEmailProps, "frequency">>;

async function WeeklyInvoiceStatisticsEmail(props: Readonly<Props>): Promise<React.JSX.Element> {
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
      frequency='weekly'
      locale={locale}
    />
  );
}

WeeklyInvoiceStatisticsEmail.PreviewProps = {
  username: "Test User",
  periodStart: "2025-12-16",
  periodEnd: "2025-12-22",
  currency: "EUR",
  totals: {
    invoicesCount: 7,
    scansCount: 7,
    totalSpend: 221.55,
    averageSpend: 31.65,
  },
  topMerchants: [
    {name: "Carrefour", totalSpend: 98.2},
    {name: "Lidl", totalSpend: 54.1},
    {name: "Uber", totalSpend: 21.3},
  ],
  topCategories: [
    {name: "Groceries", totalSpend: 132.4},
    {name: "Transport", totalSpend: 38.1},
    {name: "Coffee", totalSpend: 18.9},
  ],
  locale: "en",
} satisfies Props;

export default WeeklyInvoiceStatisticsEmail;
