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

import {Link, Text} from "@react-email/components";
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

/**
 * A spending category with its amount for the donut chart.
 */
type SpendingCategory = Readonly<{
  /** Category label (e.g., "Groceries", "Fast Food"). */
  readonly label: string;
  /** Amount spent in this category. */
  readonly value: number;
}>;

/**
 * Properties for the SpendingThresholdAlertEmail component.
 */
type Props = Readonly<{
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
}>;

/**
 * Generates heading text based on threshold severity.
 *
 * @param thresholdPercent - The threshold percentage crossed.
 * @returns Heading string.
 */
function headingFor(thresholdPercent: Props["thresholdPercent"]): string {
  switch (thresholdPercent) {
    case 80:
      return "Heads up: approaching your budget limit";
    case 90:
      return "Almost there: 90% of your budget used";
    case 100:
      return "Budget reached: you've hit your spending limit";
    default: {
      const exhaustive: never = thresholdPercent;
      return exhaustive;
    }
  }
}

/**
 * Generates badge text based on threshold severity.
 *
 * @param thresholdPercent - The threshold percentage crossed.
 * @returns Badge label string.
 */
function badgeFor(thresholdPercent: Props["thresholdPercent"]): string {
  switch (thresholdPercent) {
    case 80:
      return "Spending Alert • 80%";
    case 90:
      return "Spending Alert • 90%";
    case 100:
      return "Spending Alert • 100%";
    default: {
      const exhaustive: never = thresholdPercent;
      return exhaustive;
    }
  }
}

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
const SpendingThresholdAlertEmail = (props: Readonly<Props>) => {
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

  return (
    <EmailLayout
      title={`${BRAND.name} | Spending alert`}
      preview={`${name}, you've used ${thresholdPercent}% of your ${category} budget for ${period}.`}
      badge={badgeFor(thresholdPercent)}
      heading={headingFor(thresholdPercent)}
      primaryCta={{href: effectiveDashboardUrl, label: "View dashboard"}}
      showUnsubscribe
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        {isOverBudget
          ? `You've reached your spending limit for ${category} in ${period}. Here's a summary of where you stand.`
          : `You've used ${thresholdPercent}% of your ${category} budget for ${period}. Here's a quick summary to help you plan the rest of the period.`}
      </Text>

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
          Your spending has reached or exceeded the budget you set. Review your recent purchases to stay on track.
        </Text>
      ) : null}

      <MetricsGrid
        metrics={[
          {label: "Budget limit", value: budgetLimit},
          {label: "Current spending", value: currentSpending},
          {label: "Remaining", value: isOverBudget ? "Over budget" : remainingBudget},
          {label: "Threshold", value: `${thresholdPercent}%`},
        ]}
      />

      <KeyValueTable
        title='Budget Details'
        items={[
          {label: "Category", value: category},
          {label: "Period", value: period},
          {label: "Budget", value: budgetLimit},
          {label: "Spent", value: currentSpending},
        ]}
      />

      {categoryBreakdown.length > 0 ? (
        <DonutChart
          title='Spending by category'
          data={categoryBreakdown}
          chartImageUrl={chartImageUrl}
          alt={`Spending breakdown by category for ${period}`}
        />
      ) : null}

      <EmailCard title={isOverBudget ? "What you can do" : "Tips to stay on track"}>
        <BulletList
          items={
            isOverBudget
              ? [
                  "Review recent purchases to identify non-essential spending",
                  "Consider adjusting your budget if it no longer reflects reality",
                  "Set a stricter threshold (e.g., 80%) for earlier warnings",
                ]
              : [
                  "Check your recent purchases to see where the bulk is going",
                  "Prioritize essential spending for the rest of the period",
                  "Consider cooking at home more if dining is driving costs up",
                ]
          }
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        You can adjust your budget thresholds and notification preferences in your{" "}
        <Link
          href={`${BRAND.url}/settings/notifications`}
          style={EmailLinkStyles}>
          notification settings
        </Link>
        .
      </Text>

      <Text style={EmailParagraphStyles}>
        Questions? Reach us at{" "}
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
};

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
} satisfies Props;

export default SpendingThresholdAlertEmail;
