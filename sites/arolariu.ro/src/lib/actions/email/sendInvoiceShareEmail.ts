"use server";

/**
 * @fileoverview Server action for sending invoice share notification emails via Resend.
 * @module lib/actions/email/sendInvoiceShareEmail
 *
 * @remarks
 * This action sends an email notification when a user shares an invoice privately
 * with another user. Uses the React Email template `InvoiceHasBeenSharedWithEmail`
 * and the Resend SDK for delivery.
 *
 * **Security**: Server Actions are inherently protected — they can only be invoked
 * from our own React components, not via arbitrary HTTP requests.
 *
 * **Authentication**: Requires the caller to be authenticated via Clerk.
 *
 * @see {@link InvoiceHasBeenSharedWithEmail} for the email template
 */

import InvoiceHasBeenSharedWithEmail from "@/../emails/invoices/InvoiceHasBeenSharedWithEmail";
import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchResendApiKey} from "@/lib/config/configProxy";
import {Resend} from "resend";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for sending an invoice share email.
 */
type SendInvoiceShareEmailInput = Readonly<{
  /** Email address of the recipient. */
  readonly toEmail: string;
  /** Display name of the recipient (used in email greeting). */
  readonly toName: string;
  /** The invoice ID being shared. */
  readonly invoiceId: string;
}>;

/**
 * Result of the email send operation.
 */
type SendEmailResult = Readonly<{
  /** Whether the email was sent successfully. */
  readonly success: boolean;
  /** Error message if the send failed. */
  readonly error?: string;
}>;

/**
 * Sends an invoice share notification email to the specified recipient.
 *
 * @param input - The email parameters (recipient, invoice ID)
 * @returns A result indicating success or failure
 *
 * @remarks
 * - Authenticates the caller via Clerk before sending
 * - Uses the `InvoiceHasBeenSharedWithEmail` React Email template
 * - Sends via Resend SDK with API key from config proxy
 * - Full OpenTelemetry tracing for observability
 *
 * @example
 * ```typescript
 * const result = await sendInvoiceShareEmail({
 *   toEmail: "colleague@example.com",
 *   toName: "John",
 *   invoiceId: "550e8400-e29b-41d4-a716-446655440000",
 * });
 * if (!result.success) toast.error(result.error);
 * ```
 */
export async function sendInvoiceShareEmail(input: SendInvoiceShareEmailInput): Promise<SendEmailResult> {
  return withSpan("email.send.invoice-share", async () => {
    const {toEmail, toName, invoiceId} = input;

    // 1. Auth check
    const {user, userIdentifier} = await fetchBFFUserFromAuthService();
    if (!userIdentifier || !user) {
      logWithTrace("warn", "Unauthenticated email send attempt", {toEmail}, "server");
      return {success: false, error: "Authentication required"};
    }

    const fromName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Someone";

    addSpanEvent("email.auth_verified", {userIdentifier, toEmail});

    // 2. Validate input
    if (!toEmail || !toEmail.includes("@")) {
      return {success: false, error: "Invalid email address"};
    }
    if (!invoiceId) {
      return {success: false, error: "Invoice ID is required"};
    }

    // 3. Get Resend API key
    const apiKey = await fetchResendApiKey();
    if (!apiKey) {
      logWithTrace("error", "Resend API key not configured", {}, "server");
      return {success: false, error: "Email service not configured"};
    }

    addSpanEvent("email.resend_configured");

    // 4. Send via Resend with React Email template
    try {
      const resend = new Resend(apiKey);

      const emailData = await resend.emails.send({
        from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
        to: toEmail,
        subject: `${fromName} shared an invoice with you`,
        react: InvoiceHasBeenSharedWithEmail({
          fromUsername: fromName,
          toUsername: toName,
          identifier: invoiceId,
        }),
      });

      if (emailData.error) {
        logWithTrace("error", "Resend API error", {error: emailData.error.message, toEmail}, "server");
        return {success: false, error: "Failed to send email"};
      }

      addSpanEvent("email.sent_successfully", {resendId: emailData.data?.id ?? "unknown"});
      logWithTrace("info", "Invoice share email sent", {toEmail, invoiceId, resendId: emailData.data?.id}, "server");

      return {success: true};
    } catch (error) {
      logWithTrace("error", "Unexpected email error", {error: String(error), toEmail}, "server");
      return {success: false, error: "Failed to send email"};
    }
  });
}
