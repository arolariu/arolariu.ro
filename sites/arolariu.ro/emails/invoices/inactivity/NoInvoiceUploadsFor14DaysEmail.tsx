/**
 * @fileoverview Inactivity nudge: 14 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor14DaysEmail
 *
 * @remarks
 * This email is part of a progressive engagement strategy to re-activate users
 * who have stopped uploading invoices. It represents the third escalation tier
 * in the inactivity series (3→7→14→30 days), focusing on re-engagement with
 * productivity tips and feature highlights.
 *
 * **Engagement Context**:
 * - **Trigger**: User has not uploaded invoices for 14 consecutive days
 * - **Tone**: Re-engagement with helpful suggestions and feature reminders
 * - **Strategy**: Balance urgency with value proposition (insights, trends)
 *
 * **Rendering Context**: React Email Component (renders to HTML email via React Email).
 *
 * **Email Content Strategy** (14-day threshold):
 * - Subject line emphasizes missed insights/trends
 * - Includes productivity tips section (unique to 14-day variant)
 * - Features dual CTAs: create invoice (primary) + view existing (secondary)
 * - Shows status timeline with last upload date
 *
 * **Design Pattern**: Wrapper component that delegates to shared template
 * - Hardcodes `daysWithoutUpload={14}` parameter
 * - Inherits progressive disclosure logic from parent component
 * - Part of exhaustively-typed inactivity series (3 | 7 | 14 | 30 days)
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Parent template component
 * @see {@link NoInvoiceUploadsFor7DaysEmail} - Previous escalation tier (7 days)
 * @see {@link NoInvoiceUploadsFor30DaysEmail} - Next escalation tier (30 days)
 * @see RFC 1008 - Email Communication System (hypothetical - if documented)
 */

import {InvoiceUploadInactivityReminderEmail} from "./InvoiceUploadInactivityReminderEmail";

/**
 * Props for the 14-day inactivity email component.
 *
 * @remarks
 * **Campaign Tracking**: URLs should include UTM parameters to track email engagement:
 * - `?utm_source=email&utm_medium=inactivity&utm_campaign=14d-nudge`
 *
 * **Personalization**: Username is used in greeting; falls back gracefully to "there".
 *
 * **Date Formatting**: lastUploadDate should be human-readable (e.g., "January 15, 2026")
 * for display in the status timeline table. Backend should format before passing to email.
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
   * @example "January 15, 2026"
   */
  readonly lastUploadDate?: string;

  /**
   * Direct link to invoice creation page.
   * Primary CTA destination. Should include campaign tracking parameters.
   * Defaults to `${BRAND.url}/domains/invoices/create-invoice`.
   *
   * @example "https://arolariu.ro/domains/invoices/create-invoice?utm_source=email&utm_campaign=14d"
   */
  readonly createInvoiceUrl?: string;

  /**
   * Link to user's invoice list page.
   * Secondary CTA destination for reviewing existing invoices.
   * Defaults to `${BRAND.url}/domains/invoices/view-invoices`.
   *
   * @example "https://arolariu.ro/domains/invoices/view-invoices?utm_source=email"
   */
  readonly invoicesUrl?: string;
}>;

/**
 * Email component for 14-day invoice upload inactivity reminder.
 *
 * @remarks
 * **Purpose**: Re-engages users after 14 days of inactivity by highlighting
 * missed insights and providing productivity tips to overcome upload friction.
 *
 * **Email Features** (14-day variant):
 * - Productivity tips section with quick upload strategies
 * - Emphasis on data insights and trends user is missing
 * - Status timeline showing last upload date
 * - Dual CTAs: Upload new invoice (primary) + Review existing (secondary)
 *
 * **Rendering Pipeline**:
 * 1. Backend schedules email for users with 14-day inactivity
 * 2. Email service calls this component with user-specific props
 * 3. Component delegates to {@link InvoiceUploadInactivityReminderEmail}
 * 4. React Email renders to responsive HTML email
 * 5. Email service dispatches via transactional email provider
 *
 * **Testing**: Uses PreviewProps for React Email preview mode (`npm run dev:email`).
 *
 * @param props - User-specific email data and action URLs
 * @returns Rendered email component (React Email format)
 *
 * @example
 * ```typescript
 * // Backend email service usage
 * import {render} from "@react-email/render";
 * import NoInvoiceUploadsFor14DaysEmail from "./NoInvoiceUploadsFor14DaysEmail";
 *
 * const emailHtml = await render(
 *   <NoInvoiceUploadsFor14DaysEmail
 *     username={user.displayName}
 *     lastUploadDate={formatDate(user.lastInvoiceUpload)}
 *     createInvoiceUrl={`${baseUrl}/create?utm_campaign=14d-nudge`}
 *     invoicesUrl={`${baseUrl}/view?utm_source=email`}
 *   />
 * );
 *
 * await emailService.send({
 *   to: user.email,
 *   subject: "You're missing valuable insights 📊",
 *   html: emailHtml
 * });
 * ```
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Shared template implementation
 */
const NoInvoiceUploadsFor14DaysEmail = (props: Readonly<Props>) => {
  const {username, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

  return (
    <InvoiceUploadInactivityReminderEmail
      username={username}
      lastUploadDate={lastUploadDate}
      createInvoiceUrl={createInvoiceUrl}
      invoicesUrl={invoicesUrl}
      daysWithoutUpload={14}
    />
  );
};

/**
 * Preview props for React Email development mode.
 *
 * @remarks
 * Used by React Email's preview server (`npm run dev:email`) to demonstrate
 * the email component with realistic test data.
 *
 * @see {@link https://react.email/docs/components/preview} - React Email Preview documentation
 */
NoInvoiceUploadsFor14DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "December 10, 2025",
} satisfies Props;

export default NoInvoiceUploadsFor14DaysEmail;
