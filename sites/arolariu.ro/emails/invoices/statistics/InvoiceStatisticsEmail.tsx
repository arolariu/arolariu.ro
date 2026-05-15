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
import {createEmailTranslator, DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../../_i18n";

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

  /** Locale for translations. */
  readonly locale?: EmailLocale;
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

export async function InvoiceStatisticsEmail(props: Readonly<InvoiceStatisticsEmailProps>): Promise<React.JSX.Element> {
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

  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "email.invoiceStats"});

  const name = username?.trim() ? username : "there";

  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
  const effectiveCreateInvoiceUrl = createInvoiceUrl ?? `${BRAND.url}/domains/invoices/create-invoice`;

  const label = t("frequencyLabel", {frequency});
  const preview = t("preview", {frequencyLabel: label, name, totalSpend: safeFormatCurrency(totals.totalSpend, currency)});

  const breakdownSource = categorySpendBreakdown ?? topCategories;
  const breakdownTop = breakdownSource.slice(0, 6);
  const breakdownForChart = breakdownTop.map((item) => ({label: item.name, value: item.totalSpend}));

  const noDataFallback = t("noDataFallback");

  return (
    <EmailLayout
      title={t("title", {frequencyLabel: label})}
      preview={preview}
      badge={t("badge")}
      heading={t("heading", {frequencyLabel: label})}
      primaryCta={{href: effectiveInvoicesUrl, label: t("ctaPrimary")}}
      secondaryCta={{href: effectiveCreateInvoiceUrl, label: t("ctaSecondary")}}
      locale={locale}>
      <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>

      <Text style={EmailParagraphStyles}>
        {t.rich("intro", {
          start: () => <strong>{periodStart}</strong>,
          end: () => <strong>{periodEnd}</strong>,
        })}
      </Text>

      <MetricsGrid
        metrics={[
          {label: t("metrics.invoices"), value: String(totals.invoicesCount)},
          {label: t("metrics.scans"), value: String(totals.scansCount)},
          {label: t("metrics.totalSpend"), value: safeFormatCurrency(totals.totalSpend, currency)},
          {label: t("metrics.averagePerInvoice"), value: safeFormatCurrency(totals.averageSpend, currency)},
        ]}
      />

      <EmailCard title={t("reportDetailsTitle")}>
        <KeyValueTable
          items={[
            {label: t("reportDetails.period"), value: `${periodStart} → ${periodEnd}`},
            {label: t("reportDetails.currency"), value: currency},
          ]}
        />
      </EmailCard>

      <EmailCard title={t("topMerchantsTitle")}>
        <BulletList items={rankedItems(topMerchants, currency, noDataFallback)} />
      </EmailCard>

      <EmailCard title={t("topCategoriesTitle")}>
        <BulletList items={rankedItems(topCategories, currency, noDataFallback)} />
      </EmailCard>

      {breakdownForChart.length > 0 ? (
        <EmailCard title={t("breakdownCardTitle")}>
          <DonutChart
            title={t("donutChartTitle")}
            data={breakdownForChart}
            chartImageUrl={categorySpendChartUrl}
            alt={t("donutChartAlt")}
          />

          <KeyValueTable
            title={t("breakdownTableTitle")}
            items={breakdownTop.map((item) => ({
              label: item.name,
              value: `${safeFormatCurrency(item.totalSpend, currency)} (${toPercent(item.totalSpend, totals.totalSpend)})`,
            }))}
          />

          {categorySpendBreakdown ? null : (
            <Text style={{...EmailParagraphStyles, fontSize: "12px", lineHeight: "18px", margin: "0", color: EMAIL_COLORS.muted}}>
              {t("breakdownNote")}
            </Text>
          )}
        </EmailCard>
      ) : null}

      <Text style={EmailParagraphStyles}>{t("body")}</Text>

      <Text style={EmailParagraphStyles}>
        {t.rich("feedbackPrompt", {
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
        {t("signOff.line1")}
        <br />
        {t("signOff.line2", {brand: BRAND.name})}
      </Text>
    </EmailLayout>
  );
}
