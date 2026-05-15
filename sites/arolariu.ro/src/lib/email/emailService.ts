/**
 * @fileoverview Central email-sending service wrapping Resend with OTel + tags.
 * @module lib/email/emailService
 */

import "server-only";

import type {ReactElement} from "react";
import {render} from "react-email";

import {logWithTrace, withSpan} from "@/instrumentation.server";

import type {EmailLocale} from "@/../emails/_i18n";

import {getResendClient} from "./resendClient";

const FROM_ADDRESS = "AROLARIU.RO <doNotReply@mail.arolariu.ro>";

/**
 * Options accepted by {@link emailService.sendEmail}.
 *
 * @remarks
 * Every member is `readonly` (no outer `Readonly<>` wrapper — they're
 * equivalent, and the per-member form is the codebase convention).
 *
 * `templateKey` and `locale` surface as Resend tags for dashboard
 * filtering; do not put PII in either.
 */
type SendEmailOptions = {
  /** Recipient email address. Single recipient only. */
  readonly to: string;
  /** Localised subject line (already resolved). */
  readonly subject: string;
  /** Pre-awaited React tree from `await Template({...props, locale})`. */
  readonly react: ReactElement;
  /** Stable kebab-case template key — surfaces as the `template` tag in Resend. */
  readonly templateKey: string;
  /** Locale this send was rendered in — surfaces as the `locale` tag. */
  readonly locale: EmailLocale;
  /**
   * Optional idempotency key (`<event-type>/<entity-id>`, max 256 chars).
   * Resend dedupes within a 24h window.
   */
  readonly idempotencyKey?: string;
  /** Optional `Reply-To` address. */
  readonly replyTo?: string;
};

/**
 * Send an email through the central Resend client.
 *
 * @remarks
 * Wraps the underlying `resend.emails.send` call in:
 * - An OpenTelemetry span (`api.email.send`).
 * - Structured logs at info (success) and error (failure) levels.
 * - Three tags on every send: `template`, `locale`, `env`.
 *
 * Throws a plain `Error` on Resend failure. The caller is responsible
 * for translating to a user-safe result shape.
 *
 * @example
 * ```ts
 * await emailService.sendEmail({
 *   to: "jane@example.com",
 *   subject: "Alex shared an invoice with you",
 *   react: await InvoiceHasBeenSharedWithEmail({...}),
 *   templateKey: "invoice-shared",
 *   locale: "en",
 *   replyTo: "alex@example.com",
 * });
 * ```
 */
async function sendEmail(options: SendEmailOptions): Promise<void> {
  return withSpan("api.email.send", async () => {
    const resend = await getResendClient();

    // Pre-render to HTML via `react-email`'s exported `render` instead of
    // passing `react: …` to Resend. Resend's `{react}` path dynamically
    // requires `@react-email/render` (legacy package name) at runtime; we
    // dropped that legacy package in favour of the unified `react-email`
    // v6, so the dynamic require fails with "Make sure to install
    // @react-email/render or @react-email/components". Doing the render
    // here makes the dependency explicit and bypasses the dynamic-require
    // path entirely.
    const html = await render(options.react);

    const result = await resend.emails.send(
      {
        from: FROM_ADDRESS,
        to: options.to,
        subject: options.subject,
        html,
        replyTo: options.replyTo,
        tags: [
          {name: "template", value: options.templateKey},
          {name: "locale", value: options.locale},
          {name: "env", value: process.env["NODE_ENV"] ?? "unknown"},
        ],
      },
      options.idempotencyKey ? {idempotencyKey: options.idempotencyKey} : undefined,
    );

    if (result.error) {
      logWithTrace(
        "error",
        "Resend send failed",
        {to: options.to, template: options.templateKey, locale: options.locale, error: result.error.message},
        "api",
      );
      throw new Error(result.error.message);
    }

    logWithTrace("info", "Email sent", {to: options.to, template: options.templateKey, locale: options.locale, id: result.data?.id}, "api");
  });
}

export const emailService = {sendEmail} as const;
