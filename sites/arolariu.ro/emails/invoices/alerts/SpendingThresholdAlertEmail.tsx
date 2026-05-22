/**
 * @fileoverview Spending threshold alert email when spending crosses a budget limit.
 * @module emails/invoices/alerts/SpendingThresholdAlertEmail
 *
 * @remarks
 * This template is sent when a user's spending in a given category or overall
 * crosses a configurable percentage threshold (e.g., 80%, 90%, 100%) of their
 * budget for a time period.
 *
 * **Triggering Condition**: User's cumulative spending for a category/period
 * crosses a defined threshold percentage.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Alert-style with warning visuals — proactive notification
 * to help users stay on budget before they overspend. Uses DonutChart to show
 * category breakdown and MetricsGrid for key figures.
 *
 * @see {@link InvoiceStatisticsEmail} - Regular spending summaries
 * @see {@link EmailLayout} - Base layout component
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

/**
 * A spending category with its amount for the donut chart.
 */
type SpendingCategory = {
  /** Category label (e.g., "Groceries", "Fast Food"). */
  readonly label: string;
  /** Amount spent in this category. */
  readonly value: number;
};

/**
 * Properties for the SpendingThresholdAlertEmail component.
 */
type Props = {
  /** User's display name. Falls back to "there" if empty. */
  readonly username: string;

  /** The category that triggered the alert (e.g., "Groceries") or "Overall" for total spending. */
  readonly category: string;

  /** The time period for the budget (e.g., "February 2026", "Q1 2026"). */
  readonly period: string;

  /** The budget limit amount (formatted, e.g., "500.00 RON"). */
  readonly budgetLimit: string;

  /** The current spending amount (formatted, e.g., "412.50 RON"). */
  readonly currentSpending: string;

  /** The remaining budget amount (formatted, e.g., "87.50 RON"). */
  readonly remainingBudget: string;

  /** The threshold percentage that was crossed (e.g., 80, 90, 100). */
  readonly thresholdPercent: 80 | 90 | 100;

  /** Breakdown of spending by category for the donut chart. */
  readonly categoryBreakdown: readonly SpendingCategory[];

  /** Optional pre-rendered chart image URL. */
  readonly chartImageUrl?: string;

  /** Link to the spending dashboard. */
  readonly dashboardUrl?: string;
};

/**
 * React component that renders the "Spending Threshold Alert" email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Warning-styled alert card with threshold info
 * - MetricsGrid: budget limit, current spending, remaining, threshold %
 * - DonutChart: category breakdown
 * - Tips card for managing spending
 * - Primary CTA: view dashboard
 *
 * @param props - User details, budget figures, and category breakdown.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <SpendingThresholdAlertEmail
 *   username="Sarah Chen"
 *   category="Groceries"
 *   period="February 2026"
 *   budgetLimit="500.00 RON"
 *   currentSpending="412.50 RON"
 *   remainingBudget="87.50 RON"
 *   thresholdPercent={80}
 *   categoryBreakdown={[
 *     {label: "Groceries", value: 280},
 *     {label: "Fast Food", value: 85},
 *     {label: "Household", value: 47.50},
 *   ]}
 * />
 * ```
 */
const SpendingThresholdAlertEmail = defineEmailTemplate<Props>({
  namespace: "email.spendingAlert",
  render: ({locale, t, props}) => {
    const {
      username,
      category,
      period,
      budgetLimit,
      currentSpending,
      remainingBudget,
      thresholdPercent,
      categoryBreakdown,
      chartImageUrl,
      dashboardUrl,
    } = props;

    const name = username?.trim() ? username : "there";
    const effectiveDashboardUrl = dashboardUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
    const isOverBudget = thresholdPercent >= 100;
    const budgetState = isOverBudget ? "over" : "under";

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | Spending alert`}
        preview={t("preview", {name, percent: thresholdPercent, category, period})}
        badge={t("badge", {percent: thresholdPercent})}
        heading={t("heading", {percent: thresholdPercent})}
        primaryCta={{href: effectiveDashboardUrl, label: t("ctaPrimary")}}
        secondaryCta={null}
        showUnsubscribe={true}
        unsubscribeUrl={`${BRAND.url}/unsubscribe`}
        managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
        {" "}
        <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>
        <Text style={EmailParagraphStyles}>{t("intro", {state: budgetState, category, period, percent: thresholdPercent})}</Text>
        {isOverBudget ? (
          <Text
            style={{
              ...EmailParagraphStyles,
              fontSize: "14px",
              backgroundColor: EMAIL_COLORS.warningBackground,
              border: `1px solid ${EMAIL_COLORS.warningInk}`,
              borderRadius: "10px",
              padding: "12px",
            }}>
            {t("overBudgetWarning")}
          </Text>
        ) : null}
        <MetricsGrid
          metrics={[
            {label: t("metricsLabels.budgetLimit"), value: budgetLimit},
            {label: t("metricsLabels.currentSpending"), value: currentSpending},
            {label: t("metricsLabels.remaining"), value: isOverBudget ? t("overBudgetValue") : remainingBudget},
            {label: t("metricsLabels.threshold"), value: `${thresholdPercent}%`},
          ]}
        />
        <KeyValueTable
          title={t("detailsTitle")}
          items={[
            {label: t("detailsLabels.category"), value: category},
            {label: t("detailsLabels.period"), value: period},
            {label: t("detailsLabels.budget"), value: budgetLimit},
            {label: t("detailsLabels.spent"), value: currentSpending},
          ]}
        />
        {categoryBreakdown.length > 0 ? (
          <DonutChart
            title={t("chartTitle")}
            data={categoryBreakdown}
            chartImageUrl={chartImageUrl ?? ""}
            alt={t("chartAlt", {period})}
          />
        ) : null}
        <EmailCard title={t("tipsTitle", {state: budgetState})}>
          <BulletList
            items={
              isOverBudget
                ? [t("tipsOverBudget.0"), t("tipsOverBudget.1"), t("tipsOverBudget.2")]
                : [t("tipsOnTrack.0"), t("tipsOnTrack.1"), t("tipsOnTrack.2")]
            }
          />
        </EmailCard>
        <Text style={EmailParagraphStyles}>
          {t.rich("notificationsParagraph", {
            settings: () => (
              <Link
                href={`${BRAND.url}/settings/notifications`}
                style={EmailLinkStyles}>
                {t("notificationsLink")}
              </Link>
            ),
          })}
        </Text>
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
  },
});

SpendingThresholdAlertEmail.PreviewProps = {
  username: "Test User",
  category: "Groceries",
  period: "February 2026",
  budgetLimit: "500.00 RON",
  currentSpending: "412.50 RON",
  remainingBudget: "87.50 RON",
  thresholdPercent: 80,
  categoryBreakdown: [
    {label: "Groceries", value: 280},
    {label: "Fast Food", value: 85},
    {label: "Household", value: 47.5},
  ],
  locale: "en",
};

export default SpendingThresholdAlertEmail;
