/**
 * @fileoverview Account inactivity warning email component for user retention.
 * @module emails/accounts/AccountInactivityWarningEmail
 *
 * @remarks
 * This email template is sent to users whose accounts have been inactive for a
 * prolonged period, warning them about potential account closure according to
 * retention policies. The email provides clear timelines and actionable steps
 * to keep the account active.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Key Features**:
 * - Progressive disclosure: Timeline, policy explanation, and action steps
 * - Accessible HTML email with proper fallbacks
 * - Branded design consistent with arolariu.ro identity
 * - Support contact information for user assistance
 *
 * @see {@link https://react.email} - React Email documentation
 * @see {@link EmailLayout} - Base layout component
 */

import {Link, Text} from "react-email";
import {
  BRAND,
  BulletList,
  EMAIL_COLORS,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
} from "../_components";
import {createEmailTranslator, DEFAULT_LOCALE, type EmailLocale, loadMessages, selectorFromPath} from "../_lib/i18n";

/**
 * Properties for the account inactivity warning email component.
 *
 * @remarks
 * **Validation Requirements**:
 * - `inactiveDays` must be a positive integer
 * - `daysUntilClosure` must be a positive integer
 * - `signInUrl` must be a valid HTTPS URL if provided
 *
 * **Business Rules**:
 * - Typically sent when `inactiveDays` reaches policy threshold (e.g., 30 days)
 * - `daysUntilClosure` represents grace period before account deletion
 */
type Props = {
  /**
   * The user's display name for email personalization.
   * Falls back to "there" if empty or undefined.
   */
  readonly username: string;

  /**
   * Number of days the account has been inactive.
   * Must be positive. Used to inform user of current inactivity duration.
   */
  readonly inactiveDays: number;

  /**
   * Days remaining before potential account closure per retention policy.
   * Must be positive. Provides urgency context for user action.
   */
  readonly daysUntilClosure: number;

  /**
   * Custom sign-in URL for account reactivation.
   * Defaults to `${BRAND.url}/auth/sign-in` if not provided.
   * Should include tracking parameters for email campaign analytics.
   */
  readonly signInUrl?: string;

  /**
   * Locale for email translation (en, ro, fr).
   * Defaults to DEFAULT_LOCALE ("en").
   */
  readonly locale?: EmailLocale;
};

/**
 * Renders an account inactivity warning email with timeline and action steps.
 *
 * @remarks
 * **Rendering Context**: React Email component rendered to HTML email markup.
 *
 * **Email Client Compatibility**: Tested with major email clients (Gmail, Outlook, Apple Mail).
 * Uses inline styles and table-based layout for maximum compatibility.
 *
 * **Personalization**:
 * - Username appears in greeting (falls back to "there")
 * - Dynamic timeline values (inactive days, days until closure)
 * - Custom sign-in URL with optional tracking parameters
 *
 * **Design Pattern**: Progressive disclosure
 * 1. Personal greeting establishes context
 * 2. Clear statement of current status
 * 3. Explanation card with bullet points
 * 4. Timeline card with key dates
 * 5. Primary CTA (Sign in) and secondary CTA (Contact support)
 *
 * **Accessibility**:
 * - Semantic HTML structure
 * - Proper link labels
 * - Clear hierarchy with headings
 * - Sufficient color contrast
 *
 * @param props - Email configuration including user details and timeline
 * @returns React Email component JSX rendered to HTML
 *
 * @example
 * ```tsx
 * // Sending to user after 30 days of inactivity with 60-day grace period
 * <AccountInactivityWarningEmail
 *   username="John Doe"
 *   inactiveDays={30}
 *   daysUntilClosure={60}
 *   signInUrl="https://arolariu.ro/auth/sign-in?utm_source=email&utm_campaign=retention"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Minimal props with defaults
 * <AccountInactivityWarningEmail
 *   username=""
 *   inactiveDays={45}
 *   daysUntilClosure={30}
 * />
 * ```
 *
 * @see {@link EmailLayout} - Base layout with header/footer
 * @see {@link EmailCard} - Card component for content sections
 * @see {@link BulletList} - Accessibility-optimized bullet lists
 * @see {@link KeyValueTable} - Timeline data display
 */
const AccountInactivityWarningEmail = async (props: Readonly<Props>) => {
  const {username, inactiveDays, daysUntilClosure, signInUrl} = props;

  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "emails.accountInactivity"});

  const name = username?.trim() ? username : "there";
  const effectiveSignInUrl = signInUrl ?? `${BRAND.url}/auth/sign-in`;

  return (
    <EmailLayout
      locale={locale}
      title={`${BRAND.name} | ${t(selectorFromPath("emails.accountInactivity.heading"))}`}
      preview={t(selectorFromPath("emails.accountInactivity.preview"), {name, inactiveDays})}
      badge={t(selectorFromPath("emails.accountInactivity.badge"))}
      heading={t(selectorFromPath("emails.accountInactivity.heading"))}
      primaryCta={{href: effectiveSignInUrl, label: t(selectorFromPath("emails.accountInactivity.cta.primary"))}}
      secondaryCta={{href: `mailto:${BRAND.supportEmail}`, label: t(selectorFromPath("emails.accountInactivity.cta.secondary"))}}
      showUnsubscribe={false}
      unsubscribeUrl=''
      managePreferencesUrl=''>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.accountInactivity.greeting"), {name})}</Text>

      <Text style={EmailParagraphStyles}>
        {t.rich(selectorFromPath("emails.accountInactivity.intro"), {
          inactiveDays,
          // eslint-disable-next-line react/no-unstable-nested-components -- emails render server-side via React Email; never mounted, no reconciliation
          count: (chunks) => <strong>{chunks}</strong>,
        })}
      </Text>

      <EmailCard title={t(selectorFromPath("emails.accountInactivity.whatThisMeans.title"))}>
        <BulletList
          items={[
            t(selectorFromPath("emails.accountInactivity.whatThisMeans.bullet1")),
            t(selectorFromPath("emails.accountInactivity.whatThisMeans.bullet2"), {daysUntilClosure}),
            t(selectorFromPath("emails.accountInactivity.whatThisMeans.bullet3")),
          ]}
        />
      </EmailCard>

      <EmailCard title={t(selectorFromPath("emails.accountInactivity.timeline.title"))}>
        <KeyValueTable
          title=''
          items={[
            {
              label: t(selectorFromPath("emails.accountInactivity.timeline.inactiveFor")),
              value: t(selectorFromPath("emails.accountInactivity.timeline.daysValue"), {days: inactiveDays}),
            },
            {
              label: t(selectorFromPath("emails.accountInactivity.timeline.timeRemaining")),
              value: t(selectorFromPath("emails.accountInactivity.timeline.daysValue"), {days: daysUntilClosure}),
            },
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        {t.rich(selectorFromPath("emails.accountInactivity.supportPrompt"), {
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
        {t(selectorFromPath("emails.accountInactivity.signOff.line1"))}
        <br />
        {t(selectorFromPath("emails.accountInactivity.signOff.line2"), {brand: BRAND.name})}
      </Text>

      <Text
        style={{
          ...EmailParagraphStyles,
          marginTop: "16px",
          fontSize: "12px",
          lineHeight: "18px",
          color: EMAIL_COLORS.muted,
        }}>
        {t(selectorFromPath("emails.accountInactivity.footnote"))}
      </Text>
    </EmailLayout>
  );
};

/**
 * Preview props for Storybook and React Email development environment.
 *
 * @remarks
 * These props are used in the React Email preview server to demonstrate
 * the email template with realistic data. The `satisfies Props` ensures
 * type safety while allowing inference.
 *
 * **Preview Values**:
 * - 30 days inactive (typical first warning threshold)
 * - 60 days until closure (common grace period)
 * - Test username for personalization preview
 */
AccountInactivityWarningEmail.PreviewProps = {
  username: "Test User",
  inactiveDays: 30,
  daysUntilClosure: 60,
  signInUrl: `${BRAND.url}/auth/sign-in`,
  locale: "en",
} satisfies Props;

export default AccountInactivityWarningEmail;
