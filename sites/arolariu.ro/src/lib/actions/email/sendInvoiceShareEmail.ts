"use server";

/**
 * @fileoverview Server action for sending invoice share notification emails.
 * @module lib/actions/email/sendInvoiceShareEmail
 *
 * @remarks
 * This action orchestrates email sending by calling the internal `/api/email` route.
 * By delegating to an API route, we avoid importing `@react-email/render` directly
 * in server actions, which was causing peer dependency issues that blocked other
 * server actions from working correctly.
 *
 * **Security**: Two-layered protection:
 * 1. Server Actions are inherently protected — they can only be invoked
 *    from our own React components, not via arbitrary HTTP requests.
 * 2. The internal API route requires a server-signed JWT token that only this
 *    server action can generate, preventing direct API calls from clients.
 *
 * **Authentication**: Requires the caller to be authenticated via Clerk.
 *
 * @see {@link POST} from `/api/email/route.ts` for the email sending implementation
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchApiJwtSecret} from "@/lib/config/configProxy";
import {createJwtToken} from "@/lib/utils.server";
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
 * This server action delegates to the internal `/api/email` route for actual
 * email sending. It performs these steps:
 * 1. Authenticates the caller via Clerk
 * 2. Validates input parameters
 * 3. Generates a short-lived internal JWT token
 * 4. Calls the internal `/api/email` route with the token
 * 5. Returns the result to the caller
 *
 * The internal API route handles:
 * - React Email template rendering
 * - Resend SDK integration
 * - Full OpenTelemetry tracing
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

    try {
      // 1. Authenticate
      addSpanEvent("auth_check");
      const {user, userIdentifier} = await fetchBFFUserFromAuthService();
      if (!userIdentifier || !user) {
        logWithTrace("warn", "Unauthenticated email send attempt", {toEmail}, "server");
        return {success: false, error: "Authentication required"};
      }

      const fromName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Someone";
      addSpanEvent("auth_verified", {userIdentifier, toEmail});

      // 2. Validate input
      if (!toEmail || !toEmail.includes("@")) {
        return {success: false, error: "Invalid email address"};
      }
      if (!invoiceId) {
        return {success: false, error: "Invoice ID is required"};
      }

      addSpanEvent("input_validated");

      // 3. Generate short-lived internal JWT token (prevents direct API calls from clients)
      const jwtSecret = await fetchApiJwtSecret();
      if (!jwtSecret) {
        logWithTrace("error", "JWT secret not configured", {}, "server");
        return {success: false, error: "Internal authentication not configured"};
      }

      const internalToken = await createJwtToken(
        {
          sub: userIdentifier,
          purpose: "email-send",
          iat: Math.floor(Date.now() / 1000),
        },
        jwtSecret,
      );

      addSpanEvent("jwt_token_generated");

      // 4. Call internal API route
      const apiUrl = `${process.env["SITE_URL"] ?? "http://localhost:3000"}/api/email`;
      addSpanEvent("email.api.call", {apiUrl});

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalToken}`,
        },
        body: JSON.stringify({
          toEmail,
          toName: toName || toEmail.split("@")[0] || "there",
          fromName,
          invoiceId,
        }),
      });

      const result = (await response.json()) as SendEmailResult;

      if (!result.success) {
        logWithTrace("error", "Email API returned error", {error: result.error, toEmail}, "server");
        return {success: false, error: result.error ?? "Failed to send email"};
      }

      addSpanEvent("email.api.success");
      logWithTrace("info", "Invoice share email sent successfully", {toEmail, invoiceId}, "server");

      return {success: true};
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error("sendInvoiceShareEmail failed:", msg, error);
      logWithTrace("error", "sendInvoiceShareEmail failed", {error: msg, toEmail}, "server");
      return {success: false, error: `Email sending failed: ${msg}`};
    }
  });
}
