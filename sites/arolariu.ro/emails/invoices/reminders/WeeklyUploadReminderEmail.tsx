import {selectorFromPath} from "next-intl-selector";
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

import {Link, Text} from "react-email";
import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, MetricsGrid} from "../../_components";
import {createEmailTranslator, DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../../_lib/i18n";

/**
 * Properties for the WeeklyUploadReminderEmail component.
 */
type Props = {
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

  /** Email locale for translation. */
  readonly locale?: EmailLocale;
};

/**
 * React component that renders the "Weekly Upload Reminder" emails.
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
 *   locale="en"
 * />
 * ```
 */
const WeeklyUploadReminderEmail = async (props: Readonly<Props>): Promise<React.JSX.Element> => {
  const {username, lastWeekCount, thisWeekCount, totalInvoices, totalTracked, uploadUrl, dashboardUrl} = props;

  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "emails.weeklyUploadReminder"});

  const name = username?.trim() ? username : "there";
  const effectiveUploadUrl = uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;
  const effectiveDashboardUrl = dashboardUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      locale={locale}
      title={`${BRAND.name} | Weekly upload reminder`}
      preview={t(selectorFromPath("emails.weeklyUploadReminder.preview"), {name})}
      badge={t(selectorFromPath("emails.weeklyUploadReminder.badge"))}
      heading={t(selectorFromPath("emails.weeklyUploadReminder.heading"))}
      primaryCta={{href: effectiveUploadUrl, label: t(selectorFromPath("emails.weeklyUploadReminder.primaryCta"))}}
      secondaryCta={{href: effectiveDashboardUrl, label: t(selectorFromPath("emails.weeklyUploadReminder.secondaryCta"))}}
      showUnsubscribe={true}
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.weeklyUploadReminder.greeting"), {name})}</Text>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.weeklyUploadReminder.intro"))}</Text>
      <MetricsGrid
        metrics={[
          {label: t(selectorFromPath("emails.weeklyUploadReminder.metricsLabels.thisWeek")), value: String(thisWeekCount)},
          {label: t(selectorFromPath("emails.weeklyUploadReminder.metricsLabels.lastWeek")), value: String(lastWeekCount)},
          {label: t(selectorFromPath("emails.weeklyUploadReminder.metricsLabels.totalInvoices")), value: String(totalInvoices)},
          {label: t(selectorFromPath("emails.weeklyUploadReminder.metricsLabels.totalTracked")), value: totalTracked},
        ]}
      />
      <EmailCard title={t(selectorFromPath("emails.weeklyUploadReminder.quickTipsTitle"))}>
        <BulletList items={[t(selectorFromPath("emails.weeklyUploadReminder.quickTips.item0")), t(selectorFromPath("emails.weeklyUploadReminder.quickTips.item1")), t(selectorFromPath("emails.weeklyUploadReminder.quickTips.item2"))]} />
      </EmailCard>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.weeklyUploadReminder.bodyText"))}</Text>
      <Text style={EmailParagraphStyles}>
        {t.rich(selectorFromPath("emails.weeklyUploadReminder.feedback"), {
          supportEmail: BRAND.supportEmail,
          // eslint-disable-next-line react/no-unstable-nested-components -- emails render server-side via React Email; never mounted, no reconciliation
          link: (chunks) => (
            <Link
              href={`mailto:${BRAND.supportEmail}`}
              style={EmailLinkStyles}>
              {chunks}
            </Link>
          ),
        })}
      </Text>
      <Text style={{...EmailParagraphStyles, margin: "0"}}>
        {t(selectorFromPath("emails.weeklyUploadReminder.signOff.line1"))}
        <br />
        {t(selectorFromPath("emails.weeklyUploadReminder.signOff.line2"), {brand: BRAND.name})}
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
  locale: "en",
} satisfies Props;

export default WeeklyUploadReminderEmail;
