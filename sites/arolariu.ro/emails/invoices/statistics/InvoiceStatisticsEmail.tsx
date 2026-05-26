import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Base email template for invoice statistics summaries.
 * @module emails/invoices/statistics/InvoiceStatisticsEmail
 */

import {Link, Text} from "react-email";
import {
  BRAND,
  BulletList,
  DonutChart,
  EMAIL_COLORS,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
  MetricsGrid,
} from "../../_components";
import {defineEmailTemplate} from "../../_lib/defineEmailTemplate";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type RankedItem = {
  readonly name: string;
  readonly totalSpend: number;
};

type Totals = {
  readonly invoicesCount: number;
  readonly scansCount: number;
  readonly totalSpend: number;
  readonly averageSpend: number;
};

export type InvoiceStatisticsEmailProps = {
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
};

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

function toPercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return "0%";
  }

  const raw = (part / total) * 100;
  const rounded = raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10;
  return `${rounded}%`;
}

function rankedItems(items: readonly RankedItem[], currency: string, fallback: string): readonly string[] {
  const top = items.slice(0, 3);
  if (top.length === 0) return [fallback];
  return top.map((item, i) => `${i + 1}. ${item.name} — ${safeFormatCurrency(item.totalSpend, currency)}`);
}

const InvoiceStatisticsEmail = defineEmailTemplate<InvoiceStatisticsEmailProps>({
  namespace: "email.invoiceStats",
  render: ({locale, t, props}) => {
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

    const label = t(selectorFromPath("email.invoiceStats.frequencyLabel"), {frequency});
    const preview = t(selectorFromPath("email.invoiceStats.preview"), {frequencyLabel: label, name, totalSpend: safeFormatCurrency(totals.totalSpend, currency)});

    const breakdownSource = categorySpendBreakdown ?? topCategories;
    const breakdownTop = breakdownSource.slice(0, 6);
    const breakdownForChart = breakdownTop.map((item) => ({label: item.name, value: item.totalSpend}));

    const noDataFallback = t(selectorFromPath("email.invoiceStats.noDataFallback"));

    return (
      <EmailLayout
        title={t(selectorFromPath("email.invoiceStats.title"), {frequencyLabel: label})}
        preview={preview}
        badge={t(selectorFromPath("email.invoiceStats.badge"))}
        heading={t(selectorFromPath("email.invoiceStats.heading"), {frequencyLabel: label})}
        primaryCta={{href: effectiveInvoicesUrl, label: t(selectorFromPath("email.invoiceStats.ctaPrimary"))}}
        secondaryCta={{href: effectiveCreateInvoiceUrl, label: t(selectorFromPath("email.invoiceStats.ctaSecondary"))}}
        locale={locale}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.invoiceStats.greeting"), {name})}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("email.invoiceStats.intro"), {
            start: () => <strong>{periodStart}</strong>,
            end: () => <strong>{periodEnd}</strong>,
          })}
        </Text>
        <MetricsGrid
          metrics={[
            {label: t(selectorFromPath("email.invoiceStats.metrics.invoices")), value: String(totals.invoicesCount)},
            {label: t(selectorFromPath("email.invoiceStats.metrics.scans")), value: String(totals.scansCount)},
            {label: t(selectorFromPath("email.invoiceStats.metrics.totalSpend")), value: safeFormatCurrency(totals.totalSpend, currency)},
            {label: t(selectorFromPath("email.invoiceStats.metrics.averagePerInvoice")), value: safeFormatCurrency(totals.averageSpend, currency)},
          ]}
        />
        <EmailCard title={t(selectorFromPath("email.invoiceStats.reportDetailsTitle"))}>
          <KeyValueTable
            title=''
            items={[
              {label: t(selectorFromPath("email.invoiceStats.reportDetails.period")), value: `${periodStart} → ${periodEnd}`},
              {label: t(selectorFromPath("email.invoiceStats.reportDetails.currency")), value: currency},
            ]}
          />
        </EmailCard>
        <EmailCard title={t(selectorFromPath("email.invoiceStats.topMerchantsTitle"))}>
          <BulletList items={rankedItems(topMerchants, currency, noDataFallback)} />
        </EmailCard>
        <EmailCard title={t(selectorFromPath("email.invoiceStats.topCategoriesTitle"))}>
          <BulletList items={rankedItems(topCategories, currency, noDataFallback)} />
        </EmailCard>
        {breakdownForChart.length > 0 ? (
          <EmailCard title={t(selectorFromPath("email.invoiceStats.breakdownCardTitle"))}>
            <DonutChart
              title={t(selectorFromPath("email.invoiceStats.donutChartTitle"))}
              data={breakdownForChart}
              chartImageUrl={categorySpendChartUrl ?? ""}
              alt={t(selectorFromPath("email.invoiceStats.donutChartAlt"))}
            />

            <KeyValueTable
              title={t(selectorFromPath("email.invoiceStats.breakdownTableTitle"))}
              items={breakdownTop.map((item) => ({
                label: item.name,
                value: `${safeFormatCurrency(item.totalSpend, currency)} (${toPercent(item.totalSpend, totals.totalSpend)})`,
              }))}
            />

            {categorySpendBreakdown ? null : (
              <Text style={{...EmailParagraphStyles, fontSize: "12px", lineHeight: "18px", margin: "0", color: EMAIL_COLORS.muted}}>
                {t(selectorFromPath("email.invoiceStats.breakdownNote"))}
              </Text>
            )}
          </EmailCard>
        ) : null}
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.invoiceStats.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("email.invoiceStats.feedbackPrompt"), {
            email: () => (
              <Link
                href={`mailto:${BRAND.supportEmail}`}
                style={EmailLinkStyles}>
                {BRAND.supportEmail}
              </Link>
            ),
          })}
        </Text>
        <Text style={{...EmailParagraphStyles, margin: "0"}}>
          {t(selectorFromPath("email.invoiceStats.signOff.line1"))}
          <br />
          {t(selectorFromPath("email.invoiceStats.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

InvoiceStatisticsEmail.PreviewProps = {
  username: "Test User",
  frequency: "monthly",
  periodStart: "2025-01-01",
  periodEnd: "2025-01-31",
  currency: "EUR",
  totals: {invoicesCount: 12, scansCount: 14, totalSpend: 1234.56, averageSpend: 102.88},
  topMerchants: [
    {name: "Lidl", totalSpend: 412.5},
    {name: "Kaufland", totalSpend: 318.2},
    {name: "Carrefour", totalSpend: 215},
  ],
  topCategories: [
    {name: "Groceries", totalSpend: 720},
    {name: "Dining", totalSpend: 280},
    {name: "Transport", totalSpend: 150},
  ],
  locale: "en",
};

export default InvoiceStatisticsEmail;
export {InvoiceStatisticsEmail};
