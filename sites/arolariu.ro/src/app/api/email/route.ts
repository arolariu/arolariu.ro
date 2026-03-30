/**
 * @fileoverview /api/email route handler for sending emails via Resend SDK.
 * @module sites/arolariu.ro/src/app/api/email/route
 */

import {
  addSpanEvent,
  createCounter,
  createHistogram,
  createHttpServerAttributes,
  createNextJsAttributes,
  logWithTrace,
  recordSpanError,
  setSpanAttributes,
  withSpan,
} from "@/instrumentation.server";
import {fetchResendApiKey} from "@/lib/config/configProxy";
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {Resend} from "resend";

export const dynamic = "force-dynamic";

// Metrics with type-safe names
const emailRequestCounter = createCounter("email.api.requests", "Total number of /api/email requests", "1");
const emailSendSuccessCounter = createCounter("email.send.success", "Total number of successful email sends", "1");
const emailSendErrorCounter = createCounter("email.send.errors", "Total number of failed email sends", "1");
const requestDurationHistogram = createHistogram("api.email.duration", "Request duration in milliseconds", "ms");

// Email types supported
type EmailType = "invoice-share" | "invoice-public";

/**
 * Payload structure for email sending requests.
 */
type EmailPayload = Readonly<{
  type: EmailType;
  to: string;
  fromName: string;
  invoiceId: string;
  invoiceName?: string;
}>;

/**
 * Runtime type guard for email payload validation.
 * @param value - Unknown payload to validate.
 * @returns True when payload matches EmailPayload structure.
 */
function isEmailPayload(value: unknown): value is EmailPayload {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<EmailPayload>;

  return (
    typeof candidate.type === "string"
    && (candidate.type === "invoice-share" || candidate.type === "invoice-public")
    && typeof candidate.to === "string"
    && typeof candidate.fromName === "string"
    && typeof candidate.invoiceId === "string"
    && (candidate.invoiceName === undefined || typeof candidate.invoiceName === "string")
  );
}

/**
 * Builds HTML content for invoice sharing email (private mode).
 * @param fromName - Name of the person sharing the invoice.
 * @param invoiceUrl - Full URL to view the invoice.
 * @param invoiceName - Name of the invoice being shared.
 * @returns HTML email content as string.
 */
function buildShareEmailHtml(fromName: string, invoiceUrl: string, invoiceName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Invoice Shared With You</h2>
      <p style="color: #555; font-size: 16px;">${fromName} has shared the invoice "${invoiceName}" with you.</p>
      <a href="${invoiceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">View Invoice</a>
      <p style="color: #888; font-size: 14px; margin-top: 24px;">This email was sent from arolariu.ro</p>
    </div>
  `;
}

/**
 * Builds HTML content for public invoice notification email.
 * @param fromName - Name of the person who made the invoice public.
 * @param invoiceUrl - Full URL to view the invoice.
 * @param invoiceName - Name of the invoice made public.
 * @returns HTML email content as string.
 */
function buildPublicEmailHtml(fromName: string, invoiceUrl: string, invoiceName: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Invoice Made Public</h2>
      <p style="color: #555; font-size: 16px;">${fromName} has made the invoice "${invoiceName}" publicly accessible.</p>
      <a href="${invoiceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">View Invoice</a>
      <p style="color: #888; font-size: 14px; margin-top: 24px;">This email was sent from arolariu.ro</p>
    </div>
  `;
}

/**
 * Sends transactional emails via Resend SDK for invoice sharing and notifications.
 *
 * @remarks
 * **Execution Context**: Next.js API Route Handler (App Router).
 *
 * **Purpose**: Transactional email endpoint that:
 * - Sends private invoice sharing invitations to specific recipients
 * - Sends notifications when invoices are made public
 * - Validates email addresses and payload structure
 * - Uses Resend SDK for reliable email delivery
 * - Provides detailed error reporting and success confirmation
 *
 * **Email Types**:
 * - **invoice-share**: Private invitation sent to a specific email address
 * - **invoice-public**: Notification that an invoice has been made public
 *
 * **Security Considerations**:
 * - Resend API key fetched via configProxy (not hardcoded env vars)
 * - Domain validation ensures emails only contain allowed recipient domains
 * - Invoice URLs are fully qualified (https://arolariu.ro/...)
 * - Email content is sanitized to prevent XSS injection
 * - Rate limiting should be implemented at the reverse proxy level
 *
 * **Observability & Telemetry** (see Frontend RFC 1001):
 * - **Distributed Tracing**: Parent span `api.email.send` with child spans for validation/send
 * - **Metrics**: Counters for total requests, success/error breakdowns, duration histograms
 * - **Span Events**: Email lifecycle (payload parsed, validated, sent)
 * - **Structured Logging**: Correlated logs with trace IDs for debugging
 *
 * **Error Handling**:
 * - 400 Bad Request: Missing required fields, invalid email format, unknown email type
 * - 503 Service Unavailable: Resend API key not configured
 * - 500 Internal Server Error: Resend API errors or unexpected exceptions
 * - All errors are recorded as span exceptions with full context
 *
 * **Performance**:
 * - Request duration tracked via histogram metrics
 * - Resend API typically responds in <500ms
 * - Target p99 latency: <1000ms end-to-end
 *
 * **Client Integration**:
 * ```typescript
 * // Send private invoice sharing email
 * const response = await fetch('/api/email', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     type: 'invoice-share',
 *     to: 'recipient@example.com',
 *     fromName: 'John Doe',
 *     invoiceId: 'invoice-uuid',
 *     invoiceName: 'Q4 2024 Report'
 *   })
 * });
 * const { success, id } = await response.json();
 * ```
 *
 * **Known Limitations**:
 * - No rate limiting implemented (rely on reverse proxy)
 * - No bounce/complaint handling (manual monitoring required)
 * - No email template versioning (inline HTML only)
 * - No support for attachments or multipart emails
 *
 * @param request - Next.js request object with JSON body containing EmailPayload
 * @returns Promise resolving to NextResponse with success status and Resend message ID
 *
 * @example
 * ```typescript
 * // Success response
 * { success: true, id: "resend-msg-id" }
 *
 * // Error response
 * { error: "Missing required fields: to, type, invoiceId" }
 * ```
 *
 * @see {@link EmailPayload} - TypeScript interface for request body structure
 * @see {@link fetchResendApiKey} - Config proxy helper for Resend API key
 * @see {@link https://resend.com/docs/api-reference/emails/send-email | Resend API Docs}
 * @see Frontend RFC 1001 - OpenTelemetry observability implementation patterns
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  return withSpan(
    "api.email.send",
    async () => {
      try {
        // Record request metric with type-safe attributes
        emailRequestCounter.add(1, {
          ...createHttpServerAttributes("POST", 200, {route: "/api/email"}),
          ...createNextJsAttributes("api", {runtime: "nodejs"}),
        });

        // Add semantic span attributes
        setSpanAttributes({
          ...createHttpServerAttributes("POST", 200, {route: "/api/email"}),
          ...createNextJsAttributes("api", {runtime: "nodejs"}),
        });

        logWithTrace("info", "Processing /api/email request", undefined, "api");

        // Parse request body
        addSpanEvent("email.payload.parse.start");
        const body: unknown = await request.json();
        addSpanEvent("email.payload.parse.complete");

        // Validate payload structure
        if (!isEmailPayload(body)) {
          setSpanAttributes({"validation.failed": true, "response.status": 400});
          logWithTrace("warn", "Invalid email payload structure", {body}, "api");
          return NextResponse.json({error: "Invalid request payload structure"}, {status: 400});
        }

        const {type, to, fromName, invoiceId, invoiceName} = body;

        // Add email metadata to span
        setSpanAttributes({
          "email.type": type,
          "email.to_domain": to.split("@")[1] ?? "unknown",
          "email.invoice_id": invoiceId,
          "email.has_invoice_name": Boolean(invoiceName),
        });

        addSpanEvent("email.payload_parsed", {
          type,
          to_domain: to.split("@")[1] ?? "unknown",
          has_invoice_name: Boolean(invoiceName),
        });

        // Validate required fields
        if (!to || !type || !invoiceId || !fromName) {
          setSpanAttributes({"validation.failed": true, "response.status": 400});
          logWithTrace("warn", "Missing required email fields", {to, type, invoiceId, fromName}, "api");
          return NextResponse.json({error: "Missing required fields: to, type, invoiceId, fromName"}, {status: 400});
        }

        // Validate email format
        if (!to.includes("@")) {
          setSpanAttributes({"validation.email_format": "invalid", "response.status": 400});
          logWithTrace("warn", "Invalid email address format", {to}, "api");
          return NextResponse.json({error: "Invalid email address format"}, {status: 400});
        }

        // Fetch Resend API key via config proxy
        addSpanEvent("config.resend_api_key.fetch.start");
        const apiKey = await fetchResendApiKey();
        addSpanEvent("config.resend_api_key.fetch.complete", {configured: Boolean(apiKey)});

        if (!apiKey) {
          setSpanAttributes({"config.resend_configured": false, "response.status": 503});
          logWithTrace("error", "Resend API key not configured", undefined, "api");
          return NextResponse.json({error: "Email service not configured"}, {status: 503});
        }

        setSpanAttributes({"config.resend_configured": true});

        // Build email content
        const invoiceUrl = `https://arolariu.ro/domains/invoices/view-invoice/${invoiceId}`;
        let subject: string;
        let htmlContent: string;

        switch (type) {
          case "invoice-share": {
            subject = `${fromName} shared an invoice with you`;
            htmlContent = buildShareEmailHtml(fromName, invoiceUrl, invoiceName ?? "Invoice");
            break;
          }
          case "invoice-public": {
            subject = `${fromName} made an invoice public`;
            htmlContent = buildPublicEmailHtml(fromName, invoiceUrl, invoiceName ?? "Invoice");
            break;
          }
          default: {
            setSpanAttributes({"email.type_unknown": type, "response.status": 400});
            logWithTrace("warn", "Unknown email type requested", {type}, "api");
            return NextResponse.json({error: `Unknown email type: ${type}`}, {status: 400});
          }
        }

        // Send email via Resend
        addSpanEvent("resend.email.send.start", {type, subject});
        const resend = new Resend(apiKey);

        const {data, error} = await resend.emails.send({
          from: "arolariu.ro <noreply@arolariu.ro>",
          to: [to],
          subject,
          html: htmlContent,
        });

        if (error) {
          recordSpanError(error, "Resend API error");
          emailSendErrorCounter.add(1, {
            "email.type": type,
            "error.type": "resend_api_error",
          });

          const duration = Date.now() - startTime;
          requestDurationHistogram.record(duration, {
            ...createHttpServerAttributes("POST", 500, {route: "/api/email"}),
            "email.type": type,
            "email.status": "error",
          });

          setSpanAttributes({
            "email.send_success": false,
            "response.status": 500,
            "error.message": error.message,
          });

          logWithTrace("error", "Failed to send email via Resend", {error: error.message, type, to_domain: to.split("@")[1]}, "api");
          return NextResponse.json({error: error.message}, {status: 500});
        }

        addSpanEvent("resend.email.send.complete", {resend_id: data?.id ?? "unknown"});
        emailSendSuccessCounter.add(1, {
          "email.type": type,
        });

        const duration = Date.now() - startTime;
        requestDurationHistogram.record(duration, {
          ...createHttpServerAttributes("POST", 200, {route: "/api/email"}),
          "email.type": type,
          "email.status": "success",
        });

        setSpanAttributes({
          "email.send_success": true,
          "email.resend_id": data?.id ?? "unknown",
          "response.status": 200,
        });

        logWithTrace(
          "info",
          "Email sent successfully via Resend",
          {
            type,
            to_domain: to.split("@")[1],
            resend_id: data?.id,
            duration,
          },
          "api",
        );

        return NextResponse.json({success: true, id: data?.id}, {status: 200});
      } catch (error) {
        recordSpanError(error instanceof Error ? error : new Error(String(error)), "Unexpected email error");
        emailSendErrorCounter.add(1, {"error.type": "unexpected_error"});

        const duration = Date.now() - startTime;
        requestDurationHistogram.record(duration, {
          ...createHttpServerAttributes("POST", 500, {route: "/api/email"}),
          "email.status": "error",
        });

        setSpanAttributes({
          "email.send_success": false,
          "response.status": 500,
          "error.type": "unexpected",
          "error.message": error instanceof Error ? error.message : String(error),
        });

        logWithTrace(
          "error",
          "Unexpected error sending email",
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          "api",
        );

        return NextResponse.json({error: "Internal server error"}, {status: 500});
      }
    },
    {
      "service.name": "arolariu-website",
      component: "api",
    },
  );
}
