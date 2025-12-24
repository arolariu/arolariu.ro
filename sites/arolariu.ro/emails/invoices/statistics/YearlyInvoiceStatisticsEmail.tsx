/**
 * @fileoverview Yearly invoice statistics email.
 * @module emails/invoices/statistics/YearlyInvoiceStatisticsEmail
 */

import {InvoiceStatisticsEmail, type InvoiceStatisticsEmailProps} from "./InvoiceStatisticsEmail";

type Props = Readonly<Omit<InvoiceStatisticsEmailProps, "frequency">>;

const YearlyInvoiceStatisticsEmail = (props: Readonly<Props>) => (
  <InvoiceStatisticsEmail
    {...props}
    frequency='yearly'
  />
);

YearlyInvoiceStatisticsEmail.PreviewProps = {
  username: "Test User",
  periodStart: "2025-01-01",
  periodEnd: "2025-12-31",
  currency: "EUR",
  totals: {
    invoicesCount: 214,
    scansCount: 214,
    totalSpend: 9_842.71,
    averageSpend: 45.99,
  },
  topMerchants: [
    {name: "Carrefour", totalSpend: 1_842.55},
    {name: "IKEA", totalSpend: 721.2},
    {name: "Decathlon", totalSpend: 418.7},
  ],
  topCategories: [
    {name: "Groceries", totalSpend: 3_312.2},
    {name: "Household", totalSpend: 1_429.9},
    {name: "Transport", totalSpend: 988.1},
  ],
} satisfies Props;

export default YearlyInvoiceStatisticsEmail;
