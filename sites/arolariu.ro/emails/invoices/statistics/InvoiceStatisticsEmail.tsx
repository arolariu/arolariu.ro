/**
 * @fileoverview Base email template for invoice statistics summaries.
 * @module emails/invoices/statistics/InvoiceStatisticsEmail
 */

import {Link, Text} from "@react-email/components";

import {BRAND, EMAIL_COLORS} from "../../components/brand";
import {BulletList} from "../../components/BulletList";
import {DonutChart} from "../../components/DonutChart";
import {EmailCard} from "../../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../../components/EmailLayout";
import {KeyValueTable} from "../../components/KeyValueTable";
import {MetricsGrid} from "../../components/MetricsGrid";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type RankedItem = Readonly<{
  readonly name: string;
  readonly totalSpend: number;
}>;

type Totals = Readonly<{
  readonly invoicesCount: number;
  readonly scansCount: number;
  readonly totalSpend: number;
  readonly averageSpend: number;
}>;

export type InvoiceStatisticsEmailProps = Readonly<{
  readonly username: string;
  readonly frequency: Frequency;

  /** Inclusive start/end labels (e.g. 2025-01-01). */
  readonly periodStart: string;
  readonly periodEnd: string;

  /** ISO currency code (e.g. EUR, USD). */
  readonly currency: string;

  readonly totals: Totals;

  /** Top merchants and categories by spend. */
  readonly topMerchants: readonly RankedItem[];
  readonly topCategories: readonly RankedItem[];

  /** Optional breakdown used for charts (recommended: include an "Other" bucket). */
  readonly categorySpendBreakdown?: readonly RankedItem[];

  /** Optional pre-rendered chart image URL (preferred when you want full control/privacy). */
  readonly categorySpendChartUrl?: string;

  /** Primary destination (defaults to invoices list). */
  readonly invoicesUrl?: string;

  /** Secondary destination (defaults to create invoice). */
  readonly createInvoiceUrl?: string;
}>;

function safeFormatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function frequencyLabel(frequency: Frequency): string {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default: {
      const exhaustive: never = frequency;
      return exhaustive;
    }
  }
}

function summarizeRanked(items: readonly RankedItem[], currency: string): readonly string[] {
  const top = items.slice(0, 3);

  if (top.length === 0) {
    return ["No data yet — upload a couple of invoices to unlock insights."];
  }

  return top.map((item, index) => `${index + 1}. ${item.name} — ${safeFormatCurrency(item.totalSpend, currency)}`);
}

function toPercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return "0%";
  }

  const raw = (part / total) * 100;
  const rounded = raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10;
  return `${rounded}%`;
}

export function InvoiceStatisticsEmail(props: Readonly<InvoiceStatisticsEmailProps>) {
  const {
    username,
    frequency,
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

  const name = username?.trim() ? username : "there";

  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
  const effectiveCreateInvoiceUrl = createInvoiceUrl ?? `${BRAND.url}/domains/invoices/create-invoice`;

  const label = frequencyLabel(frequency);
  const preview = `${label} stats for ${name} — ${safeFormatCurrency(totals.totalSpend, currency)} total.`;

  const breakdownSource = categorySpendBreakdown ?? topCategories;
  const breakdownTop = breakdownSource.slice(0, 6);
  const breakdownForChart = breakdownTop.map((item) => ({label: item.name, value: item.totalSpend}));

  return (
    <EmailLayout
      title={`${BRAND.name} | ${label} invoice stats`}
      preview={preview}
      badge='Invoices'
      heading={`${label} invoice statistics`}
      primaryCta={{href: effectiveInvoicesUrl, label: "View invoices"}}
      secondaryCta={{href: effectiveCreateInvoiceUrl, label: "Upload a new invoice"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        This is your invoice activity and spending summary for <strong>{periodStart}</strong> → <strong>{periodEnd}</strong>.
      </Text>

      <MetricsGrid
        metrics={[
          {label: "Invoices", value: String(totals.invoicesCount)},
          {label: "Scans", value: String(totals.scansCount)},
          {label: "Total spend", value: safeFormatCurrency(totals.totalSpend, currency)},
          {label: "Avg / invoice", value: safeFormatCurrency(totals.averageSpend, currency)},
        ]}
      />

      <EmailCard title='Report details'>
        <KeyValueTable
          items={[
            {label: "Period", value: `${periodStart} → ${periodEnd}`},
            {label: "Currency", value: currency},
          ]}
        />
      </EmailCard>

      <EmailCard title='Top merchants'>
        <BulletList items={summarizeRanked(topMerchants, currency)} />
      </EmailCard>

      <EmailCard title='Top categories'>
        <BulletList items={summarizeRanked(topCategories, currency)} />
      </EmailCard>

      {breakdownForChart.length > 0 ? (
        <EmailCard title='Spending breakdown (by category)'>
          <DonutChart
            title='Category spend distribution'
            data={breakdownForChart}
            chartImageUrl={categorySpendChartUrl}
            alt='Donut chart showing spending distribution by category.'
          />

          <KeyValueTable
            title='Breakdown'
            items={breakdownTop.map((item) => ({
              label: item.name,
              value: `${safeFormatCurrency(item.totalSpend, currency)} (${toPercent(item.totalSpend, totals.totalSpend)})`,
            }))}
          />

          {categorySpendBreakdown ? null : (
            <Text style={{...EmailParagraphStyles, fontSize: "12px", lineHeight: "18px", margin: "0", color: EMAIL_COLORS.muted}}>
              Note: This chart uses the available category ranking data for the period.
            </Text>
          )}
        </EmailCard>
      ) : null}

      <Text style={EmailParagraphStyles}>
        For a complete breakdown of your spending, visit your invoices list to review trends, merchants, categories, and totals over time.
        These insights can help you identify spending patterns and make more informed financial decisions.
      </Text>

      <Text style={EmailParagraphStyles}>
        Questions or something looks off? Email{" "}
        <Link
          href={`mailto:${BRAND.supportEmail}`}
          style={EmailLinkStyles}>
          {BRAND.supportEmail}
        </Link>
        .
      </Text>

      <Text style={{...EmailParagraphStyles, margin: "0"}}>
        {BRAND.signOff},
        <br />
        {BRAND.teamName}
      </Text>
    </EmailLayout>
  );
}
