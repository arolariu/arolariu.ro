/**
 * @fileoverview Daily invoice statistics email.
 * @module emails/invoices/statistics/DailyInvoiceStatisticsEmail
 */

import {InvoiceStatisticsEmail, type InvoiceStatisticsEmailProps} from "./InvoiceStatisticsEmail";

type Props = Readonly<Omit<InvoiceStatisticsEmailProps, "frequency">>;

const DailyInvoiceStatisticsEmail = (props: Readonly<Props>) => (
  <InvoiceStatisticsEmail
    {...props}
    frequency='daily'
  />
);

DailyInvoiceStatisticsEmail.PreviewProps = {
  username: "Test User",
  periodStart: "2025-12-23",
  periodEnd: "2025-12-23",
  currency: "EUR",
  totals: {
    invoicesCount: 2,
    scansCount: 2,
    totalSpend: 47.9,
    averageSpend: 23.95,
  },
  topMerchants: [{name: "Mega Image", totalSpend: 27.2}],
  topCategories: [{name: "Groceries", totalSpend: 31.4}],
} satisfies Props;

export default DailyInvoiceStatisticsEmail;
