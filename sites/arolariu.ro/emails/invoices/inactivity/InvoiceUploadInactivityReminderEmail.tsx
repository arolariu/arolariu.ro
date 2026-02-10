/**
 * @fileoverview Progressive engagement email for invoice upload inactivity.
 * @module emails/invoices/inactivity/InvoiceUploadInactivityReminderEmail
 *
 * @remarks
 * This email template implements a progressive engagement strategy to re-activate
 * users who have stopped uploading invoices. The messaging and tone escalate based
 * on inactivity duration (3, 7, 14, or 30 days), moving from gentle nudges to
 * more direct assistance offers.
 *
 * **Engagement Strategy**:
 * - 3 days: Light "check-in" with minimal pressure
 * - 7 days: Gentle reminder emphasizing benefits
 * - 14 days: Re-engagement focus with productivity tips
 * - 30 days: Direct assistance offer with support escalation
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Key Features**:
 * - Type-safe inactivity period (literal union: 3 | 7 | 14 | 30)
 * - Exhaustive switch statements with compile-time validation
 * - Conditional content sections based on inactivity duration
 * - Warning callouts for extended inactivity (30+ days)
 * - Dual CTAs: Primary (create invoice) + Secondary (view invoices)
 *
 * **Design Pattern**: Progressive disclosure with escalating urgency
 * - Consistent structure across all variants
 * - Conditional tip section (14+ days)
 * - Conditional assistance section (30+ days)
 * - Status timeline for transparency
 *
 * @see {@link https://react.email} - React Email documentation
 * @see {@link EmailLayout} - Base layout component
 * @see {@link AccountInactivityWarningEmail} - Related account-level inactivity email
 */

import {Link, Text} from "@react-email/components";
import {
  BRAND,
  BulletList,
  EMAIL_COLORS,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
} from "../../_components";

/**
 * Properties for the invoice upload inactivity reminder email.
 *
 * @remarks
 * **Type Safety**: `daysWithoutUpload` uses literal union type (3 | 7 | 14 | 30)
 * to ensure only valid inactivity thresholds are used, preventing runtime errors
 * and enabling exhaustive switch statement validation.
 *
 * **Business Rules**:
 * - Emails typically sent at exact day thresholds (day 3, 7, 14, 30)
 * - `lastUploadDate` should be formatted for display (e.g., "Jan 5, 2026")
 * - URLs should include UTM tracking parameters for campaign analytics
 *
 * **Optional Fields**:
 * - `lastUploadDate`: Falls back to "—" if unavailable
 * - `createInvoiceUrl`: Defaults to `/domains/invoices/create-invoice`
 * - `invoicesUrl`: Defaults to `/domains/invoices/view-invoices`
 */
export type Props = Readonly<{
  /**
   * User's display name for email personalization.
   * Falls back to "there" if empty or undefined.
   */
  readonly username: string;

  /**
   * Number of days since last invoice upload.
   * Literal union type ensures only valid campaign thresholds (3, 7, 14, 30).
   * Drives conditional content, messaging tone, and urgency level.
   */
  readonly daysWithoutUpload: 3 | 7 | 14 | 30;

  /**
   * Human-readable date of last upload (e.g., "January 15, 2026").
   * Displayed in status table. Falls back to "—" if not provided.
   */
  readonly lastUploadDate?: string;

  /**
   * Direct link to invoice creation page.
   * Primary CTA destination. Should include campaign tracking parameters.
   * Defaults to `${BRAND.url}/domains/invoices/create-invoice`.
   */
  readonly createInvoiceUrl?: string;

  /**
   * Link to user's invoice list page.
   * Secondary CTA destination for reviewing existing invoices.
   * Defaults to `${BRAND.url}/domains/invoices/view-invoices`.
   */
  readonly invoicesUrl?: string;
}>;

/**
 * Generates progressive heading text based on inactivity duration.
 *
 * @remarks
 * **Tone Progression**:
 * - 3 days: Casual, low-pressure ("Quick check-in")
 * - 7 days: Friendly reminder ("A gentle reminder")
 * - 14 days: Re-engagement focus ("Let's get you back on track")
 * - 30 days: Empathetic acknowledgment ("It's been a while")
 *
 * **Type Safety**: Exhaustive switch with `never` type ensures compile-time
 * validation that all union members are handled. Adding new thresholds to the
 * union type will cause compilation errors until this function is updated.
 *
 * @param daysWithoutUpload - Number of days inactive (3, 7, 14, or 30)
 * @returns Heading string appropriate for inactivity duration
 *
 * @example
 * ```typescript
 * headingFor(3);  // Returns: "Quick check-in"
 * headingFor(30); // Returns: "It's been a while"
 * ```
 */
function headingFor(daysWithoutUpload: Props["daysWithoutUpload"]): string {
  switch (daysWithoutUpload) {
    case 3:
      return "Quick check-in";
    case 7:
      return "A gentle reminder";
    case 14:
      return "Let's get you back on track";
    case 30:
      return "It's been a while";
    default: {
      const exhaustive: never = daysWithoutUpload;
      return exhaustive;
    }
  }
}

/**
 * Generates badge label displaying inactivity category and duration.
 *
 * @remarks
 * Badge appears in email header as a visual categorization indicator.
 * Format: "Inactivity • {days} days"
 *
 * **Type Safety**: Uses exhaustive switch pattern with `never` type for
 * compile-time validation of all union members.
 *
 * @param daysWithoutUpload - Number of days inactive (3, 7, 14, or 30)
 * @returns Badge label string with category and day count
 *
 * @example
 * ```typescript
 * badgeFor(7);  // Returns: "Inactivity • 7 days"
 * badgeFor(30); // Returns: "Inactivity • 30 days"
 * ```
 */
function badgeFor(daysWithoutUpload: Props["daysWithoutUpload"]): string {
  switch (daysWithoutUpload) {
    case 3:
      return "Inactivity • 3 days";
    case 7:
      return "Inactivity • 7 days";
    case 14:
      return "Inactivity • 14 days";
    case 30:
      return "Inactivity • 30 days";
    default: {
      const exhaustive: never = daysWithoutUpload;
      return exhaustive;
    }
  }
}

/**
 * Generates context-appropriate introduction text based on inactivity duration.
 *
 * @remarks
 * Opening paragraph sets the tone and acknowledges the user's inactivity period.
 * Messaging becomes progressively more direct and solution-oriented as days increase.
 *
 * **Messaging Strategy**:
 * - 3 days: Neutral observation ("noticed you haven't uploaded")
 * - 7 days: Timeline acknowledgment ("been a week")
 * - 14 days: Habit formation focus ("restart the habit")
 * - 30 days: Re-engagement offer ("help you pick up where you left off")
 *
 * **Type Safety**: Exhaustive switch ensures all literal union members handled.
 *
 * @param daysWithoutUpload - Number of days inactive (3, 7, 14, or 30)
 * @returns Introduction paragraph text
 *
 * @example
 * ```typescript
 * introFor(3);
 * // Returns: "We noticed you haven't uploaded any invoices recently."
 *
 * introFor(30);
 * // Returns: "It's been about a month since your last upload — we can help..."
 * ```
 */
function introFor(daysWithoutUpload: Props["daysWithoutUpload"]): string {
  switch (daysWithoutUpload) {
    case 3:
      return "We noticed you haven't uploaded any invoices recently.";
    case 7:
      return "Looks like it's been a week since your last invoice upload.";
    case 14:
      return "Two weeks without uploads — want a quick nudge to restart the habit?";
    case 30:
      return "It's been about a month since your last upload — we can help you pick up where you left off.";
    default: {
      const exhaustive: never = daysWithoutUpload;
      return exhaustive;
    }
  }
}

/**
 * Renders progressive engagement email for invoice upload inactivity.
 *
 * @remarks
 * **Rendering Context**: React Email component rendered to HTML email markup.
 *
 * **Email Client Compatibility**: Tested with major email clients (Gmail, Outlook,
 * Apple Mail). Uses inline styles and table-based layout for maximum compatibility.
 *
 * **Progressive Content Strategy**:
 * The email structure adapts based on `daysWithoutUpload`:
 *
 * - **Always shown**: Greeting, intro, benefits card, status table, support contact
 * - **14+ days**: Productivity tip card with action suggestion
 * - **30+ days**: Highlighted assistance card with support escalation
 *
 * **Conditional Rendering Logic**:
 * ```typescript
 * {daysWithoutUpload >= 14 ? <TipCard /> : null}
 * {daysWithoutUpload >= 30 ? <AssistanceCard /> : null}
 * ```
 *
 * **Design Philosophy**: "Small consistency beats big catch-up"
 * - Encourages single upload rather than overwhelming backlog
 * - Emphasizes benefits (timeline accuracy, faster receipt search)
 * - Reduces friction with direct upload CTA
 * - Escalates to human support at 30+ days
 *
 * **CTA Strategy**:
 * - Primary: "Upload an invoice" (action-oriented, immediate)
 * - Secondary: "View invoices" (context review, lower commitment)
 *
 * **Accessibility**:
 * - Semantic HTML structure with proper heading hierarchy
 * - Descriptive link labels
 * - Sufficient color contrast for warning callouts
 * - Table layout for email client compatibility
 *
 * @param props - Email configuration with user details and inactivity duration
 * @returns React Email component JSX rendered to HTML
 *
 * @example
 * ```tsx
 * // Early nudge (3 days) with minimal pressure
 * <InvoiceUploadInactivityReminderEmail
 *   username="Sarah Chen"
 *   daysWithoutUpload={3}
 *   lastUploadDate="February 7, 2026"
 *   createInvoiceUrl="https://arolariu.ro/domains/invoices/create-invoice?utm_source=email&utm_campaign=inactivity_3d"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Extended inactivity (30 days) with support escalation
 * <InvoiceUploadInactivityReminderEmail
 *   username="John Doe"
 *   daysWithoutUpload={30}
 *   lastUploadDate="January 11, 2026"
 * />
 * // Shows: Greeting, intro, benefits, status, productivity tip, assistance card, support contact
 * ```
 *
 * @example
 * ```tsx
 * // Minimal props with defaults
 * <InvoiceUploadInactivityReminderEmail
 *   username=""
 *   daysWithoutUpload={7}
 * />
 * // Uses fallbacks: "there" for username, default URLs, no lastUploadDate
 * ```
 *
 * @see {@link EmailLayout} - Base layout with header/footer
 * @see {@link EmailCard} - Card containers for content sections
 * @see {@link BulletList} - Benefit list component
 * @see {@link KeyValueTable} - Status timeline display
 */
export function InvoiceUploadInactivityReminderEmail(props: Readonly<Props>) {
  const {username, daysWithoutUpload, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveCreateInvoiceUrl = createInvoiceUrl ?? `${BRAND.url}/domains/invoices/create-invoice`;
  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoice inactivity`}
      preview={`Hi ${name} — ${daysWithoutUpload} days since your last upload.`}
      badge={badgeFor(daysWithoutUpload)}
      heading={headingFor(daysWithoutUpload)}
      primaryCta={{href: effectiveCreateInvoiceUrl, label: "Upload an invoice"}}
      secondaryCta={{href: effectiveInvoicesUrl, label: "View invoices"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>{introFor(daysWithoutUpload)}</Text>

      <EmailCard title='Why it’s worth it'>
        <BulletList
          items={[
            "Keep your spending timeline accurate.",
            "Get cleaner totals by merchant and category.",
            "Find receipts faster when you need them.",
          ]}
        />
      </EmailCard>

      <EmailCard title='Status'>
        <KeyValueTable
          items={[
            {label: "Days without upload", value: String(daysWithoutUpload)},
            {label: "Last upload", value: lastUploadDate ?? "—"},
          ]}
        />
      </EmailCard>

      {daysWithoutUpload >= 14 ? (
        <EmailCard title='Tip (30 seconds)'>
          <Text style={{...EmailParagraphStyles, fontSize: "14px", margin: "0"}}>
            Upload one recent invoice today — small consistency beats big catch-up.
          </Text>
        </EmailCard>
      ) : null}

      {daysWithoutUpload >= 30 ? (
        <EmailCard title='Important'>
          <Text
            style={{
              ...EmailParagraphStyles,
              fontSize: "14px",
              margin: "0",
              backgroundColor: EMAIL_COLORS.warningBackground,
              border: `1px solid ${EMAIL_COLORS.warningInk}`,
              borderRadius: "10px",
              padding: "12px",
            }}>
            If you're stuck or something isn't working, reply to this email or contact support — we'll help.
          </Text>
        </EmailCard>
      ) : null}

      <Text style={EmailParagraphStyles}>
        Need help or have questions? Email{" "}
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
