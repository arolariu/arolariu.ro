/**
 * @fileoverview Inactivity nudge: 30 days without invoice uploads (final escalation).
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor30DaysEmail
 *
 * @remarks
 * This email represents the **final escalation tier** in the progressive engagement
 * strategy to re-activate users who have stopped uploading invoices. After 30 days
 * of inactivity, the messaging shifts from gentle nudges to direct assistance offers
 * with support escalation.
 *
 * **Engagement Context**:
 * - **Trigger**: User has not uploaded invoices for 30 consecutive days
 * - **Tone**: Direct assistance offer with urgency and support escalation
 * - **Strategy**: Offer personal help to overcome barriers preventing uploads
 *
 * **Rendering Context**: React Email Component (renders to HTML email via React Email).
 *
 * **Email Content Strategy** (30-day threshold - Final Tier):
 * - Subject line emphasizes risk of losing tracking and offers direct help
 * - Includes warning callout section (unique to 30-day variant)
 * - Features direct support contact information
 * - Productivity tips section to help overcome upload friction
 * - Shows status timeline with 30-day inactivity indicator
 * - Dual CTAs: create invoice (primary) + contact support (implicit)
 *
 * **Design Pattern**: Wrapper component that delegates to shared template
 * - Hardcodes `daysWithoutUpload={30}` parameter
 * - Triggers warning callout in parent component logic
 * - Part of exhaustively-typed inactivity series (3 | 7 | 14 | 30 days)
 * - Final automated touchpoint before potential account review
 *
 * **Next Steps After 30 Days**:
 * If user remains inactive, consider:
 * - Manual outreach from support team
 * - Account status review
 * - Data retention policy enforcement
 * - Potential account dormancy flag
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Parent template component
 * @see {@link NoInvoiceUploadsFor14DaysEmail} - Previous escalation tier (14 days)
 * @see {@link AccountInactivityWarningEmail} - Related account-level inactivity (hypothetical)
 * @see RFC 1008 - Email Communication System (hypothetical - if documented)
 */

import {InvoiceUploadInactivityReminderEmail} from "./InvoiceUploadInactivityReminderEmail";

/**
 * Props for the 30-day inactivity email component.
 *
 * @remarks
 * **Campaign Tracking**: URLs should include UTM parameters to track email engagement:
 * - `?utm_source=email&utm_medium=inactivity&utm_campaign=30d-urgent`
 *
 * **Personalization**: Username is used in greeting; falls back gracefully to "there".
 *
 * **Date Formatting**: lastUploadDate should be human-readable (e.g., "January 15, 2026")
 * for display in the status timeline table. Backend should format before passing to email.
 *
 * **Support Escalation**: At 30 days, consider adding support team contact info in email body.
 */
type Props = Readonly<{
  /**
   * User's display name for email personalization.
   * Falls back to "there" if empty or undefined.
   *
   * @example "John Smith"
   */
  readonly username: string;

  /**
   * Human-readable date of last upload (e.g., "January 15, 2026").
   * Displayed in status table. Falls back to "—" if not provided.
   *
   * @remarks
   * **Format**: Should be pre-formatted by backend (e.g., using Intl.DateTimeFormat)
   * rather than passing raw Date/timestamp to email component.
   *
   * **30-Day Context**: With 30 days inactivity, this date is particularly important
   * for user context and may trigger concerns about data loss or account status.
   *
   * @example "January 15, 2026"
   */
  readonly lastUploadDate?: string;

  /**
   * Direct link to invoice creation page.
   * Primary CTA destination. Should include campaign tracking parameters.
   * Defaults to `${BRAND.url}/domains/invoices/create-invoice`.
   *
   * @example "https://arolariu.ro/domains/invoices/create-invoice?utm_source=email&utm_campaign=30d-urgent"
   */
  readonly createInvoiceUrl?: string;

  /**
   * Link to user's invoice list page.
   * Secondary CTA destination for reviewing existing invoices.
   * Defaults to `${BRAND.url}/domains/invoices/view-invoices`.
   *
   * @example "https://arolariu.ro/domains/invoices/view-invoices?utm_source=email&utm_campaign=30d"
   */
  readonly invoicesUrl?: string;
}>;

/**
 * Email component for 30-day invoice upload inactivity reminder (final escalation).
 *
 * @remarks
 * **Purpose**: Final automated touchpoint to re-engage users after 30 days of
 * inactivity by offering direct support assistance and highlighting risks of
 * continued inactivity (data insights loss, tracking gaps).
 *
 * **Email Features** (30-day variant - Final Tier):
 * - ⚠️ Warning callout section emphasizing urgency
 * - Direct support assistance offer ("We're here to help")
 * - Productivity tips section with quick upload strategies
 * - Status timeline showing 30-day inactivity gap
 * - Dual CTAs: Upload new invoice (primary) + Review existing (secondary)
 * - Implicit support contact invitation in warning section
 *
 * **Escalation Context**:
 * This is the **final automated email** in the 4-tier inactivity series:
 * 1. 3 days: Light check-in
 * 2. 7 days: Gentle reminder
 * 3. 14 days: Re-engagement with tips
 * 4. **30 days: Direct assistance offer (THIS EMAIL)**
 *
 * After 30 days without response, consider manual support outreach or
 * account dormancy procedures per data retention policies.
 *
 * **Rendering Pipeline**:
 * 1. Backend cron job identifies users with 30-day inactivity
 * 2. Email service calls this component with user-specific props
 * 3. Component delegates to {@link InvoiceUploadInactivityReminderEmail}
 * 4. Parent component renders warning callout (30-day specific)
 * 5. React Email renders to responsive HTML email
 * 6. Email service dispatches via transactional email provider
 * 7. Backend logs engagement for support follow-up tracking
 *
 * **Testing**: Uses PreviewProps for React Email preview mode (`npm run dev:email`).
 *
 * **Accessibility**: Email HTML includes semantic structure and alt text for icons.
 *
 * @param props - User-specific email data and action URLs
 * @returns Rendered email component (React Email format)
 *
 * @example
 * ```typescript
 * // Backend email service usage
 * import {render} from "@react-email/render";
 * import NoInvoiceUploadsFor30DaysEmail from "./NoInvoiceUploadsFor30DaysEmail";
 *
 * const emailHtml = await render(
 *   <NoInvoiceUploadsFor30DaysEmail
 *     username={user.displayName}
 *     lastUploadDate={formatDate(user.lastInvoiceUpload)}
 *     createInvoiceUrl={`${baseUrl}/create?utm_campaign=30d-urgent`}
 *     invoicesUrl={`${baseUrl}/view?utm_source=email&utm_campaign=30d`}
 *   />
 * );
 *
 * await emailService.send({
 *   to: user.email,
 *   subject: "We're here to help - 30 days without uploads ⚠️",
 *   html: emailHtml,
 *   metadata: {
 *     inactivityDays: 30,
 *     escalationTier: "final",
 *     requiresFollowUp: true
 *   }
 * });
 *
 * // Log for support team visibility
 * await supportQueue.addToFollowUp({
 *   userId: user.id,
 *   reason: "30_day_inactivity",
 *   priority: "low",
 *   emailSentAt: new Date()
 * });
 * ```
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Shared template implementation
 */
const NoInvoiceUploadsFor30DaysEmail = (props: Readonly<Props>) => {
  const {username, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

  return (
    <InvoiceUploadInactivityReminderEmail
      username={username}
      lastUploadDate={lastUploadDate}
      createInvoiceUrl={createInvoiceUrl}
      invoicesUrl={invoicesUrl}
      daysWithoutUpload={30}
    />
  );
};

/**
 * Preview props for React Email development mode.
 *
 * @remarks
 * Used by React Email's preview server (`npm run dev:email`) to demonstrate
 * the 30-day inactivity email with realistic test data.
 *
 * **Development Usage**:
 * ```bash
 * npm run dev:email
 * # Navigate to: http://localhost:3000/emails/invoices/inactivity/no-invoice-uploads-for-30-days
 * ```
 *
 * **Preview Features**:
 * - Shows warning callout (30-day specific)
 * - Displays productivity tips section
 * - Demonstrates dual CTA layout
 * - Shows status timeline with 30-day gap
 *
 * @see {@link https://react.email/docs/components/preview} - React Email Preview documentation
 */
NoInvoiceUploadsFor30DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "November 23, 2025",
} satisfies Props;

export default NoInvoiceUploadsFor30DaysEmail;
