/**
 * @fileoverview Weekly invoice statistics email.
 * @module emails/invoices/statistics/WeeklyInvoiceStatisticsEmail
 */

import {InvoiceStatisticsEmail, type InvoiceStatisticsEmailProps} from "./InvoiceStatisticsEmail";

type Props = Readonly<Omit<InvoiceStatisticsEmailProps, "frequency">>;

const WeeklyInvoiceStatisticsEmail = (props: Readonly<Props>) => {
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
    />
  );
};

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
} satisfies Props;

export default WeeklyInvoiceStatisticsEmail;
