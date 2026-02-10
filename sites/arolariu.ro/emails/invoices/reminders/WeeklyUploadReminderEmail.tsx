/**
 * @fileoverview Weekly nudge email for active users to upload their receipts.
 * @module emails/invoices/reminders/WeeklyUploadReminderEmail
 *
 * @remarks
 * This template is sent weekly (typically Monday morning) to active users who
 * have uploaded at least one invoice before. Unlike the inactivity series which
 * targets dormant users, this email targets **active** users and encourages
 * consistent uploading habits.
 *
 * **Triggering Condition**: Weekly cron job for users who have uploaded at least
 * one invoice in the past 30 days.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Motivational and lightweight — shows progress metrics
 * to reinforce the habit loop (cue → routine → reward).
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - For dormant users (3-30 days)
 * @see {@link EmailLayout} - Base layout component
 */

import {Link, Text} from "@react-email/components";
import {
  BRAND,
  BulletList,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  MetricsGrid,
} from "../../_components";

/**
 * Properties for the WeeklyUploadReminderEmail component.
 */
type Props = Readonly<{
  /** User's display name. Falls back to "there" if empty. */
  readonly username: string;

  /** Number of invoices uploaded last week. */
  readonly lastWeekCount: number;

  /** Number of invoices uploaded this week so far. */
  readonly thisWeekCount: number;

  /** Total number of invoices the user has tracked all-time. */
  readonly totalInvoices: number;

  /** Total spending amount tracked all-time (formatted, e.g., "1,234.56 RON"). */
  readonly totalTracked: string;

  /** Direct link to upload a new receipt. */
  readonly uploadUrl?: string;

  /** Link to the invoices dashboard. */
  readonly dashboardUrl?: string;
}>;

/**
 * React component that renders the "Weekly Upload Reminder" email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - MetricsGrid with this week vs. last week comparison
 * - Quick tips card for getting value from uploads
 * - Primary CTA: upload receipts
 * - Secondary CTA: view dashboard
 *
 * @param props - User details and activity metrics.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <WeeklyUploadReminderEmail
 *   username="Sarah Chen"
 *   lastWeekCount={5}
 *   thisWeekCount={2}
 *   totalInvoices={47}
 *   totalTracked="3,891.20 RON"
 * />
 * ```
 */
const WeeklyUploadReminderEmail = (props: Readonly<Props>) => {
  const {username, lastWeekCount, thisWeekCount, totalInvoices, totalTracked, uploadUrl, dashboardUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveUploadUrl = uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;
  const effectiveDashboardUrl = dashboardUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Weekly upload reminder`}
      preview={`Hi ${name} — here's your weekly receipt check-in.`}
      badge='Weekly Reminder'
      heading='Your weekly receipt check-in'
      primaryCta={{href: effectiveUploadUrl, label: "Upload this week's receipts"}}
      secondaryCta={{href: effectiveDashboardUrl, label: "View dashboard"}}
      showUnsubscribe
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        Here's a quick look at your receipt tracking activity. Consistent uploading gives you the most accurate spending insights.
      </Text>

      <MetricsGrid
        metrics={[
          {label: "This week", value: String(thisWeekCount)},
          {label: "Last week", value: String(lastWeekCount)},
          {label: "Total invoices", value: String(totalInvoices)},
          {label: "Total tracked", value: totalTracked},
        ]}
      />

      <EmailCard title='Quick tips'>
        <BulletList
          items={[
            "Upload receipts right after shopping — it takes under 30 seconds",
            "Batch upload at the end of the day if you prefer",
            "Even small purchases help build a complete spending picture",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Every receipt you track makes your spending insights more accurate and your dashboards more useful.
      </Text>

      <Text style={EmailParagraphStyles}>
        Questions or feedback? Reach us at{" "}
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

WeeklyUploadReminderEmail.PreviewProps = {
  username: "Test User",
  lastWeekCount: 5,
  thisWeekCount: 2,
  totalInvoices: 47,
  totalTracked: "3,891.20 RON",
} satisfies Props;

export default WeeklyUploadReminderEmail;
