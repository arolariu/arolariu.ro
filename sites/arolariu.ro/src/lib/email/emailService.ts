/**
 * @fileoverview Central email-sending service wrapping Resend with OTel + tags.
 * @module lib/email/emailService
 */

import "server-only";

import type {ReactElement} from "react";
import {Resend} from "resend";

import {logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchResendApiKey} from "@/lib/config/configProxy";

import type {EmailLocale} from "@/../emails/_i18n";

const FROM_ADDRESS = "AROLARIU.RO <doNotReply@mail.arolariu.ro>";

type SendEmailOptions = Readonly<{
  readonly to: string;
  readonly subject: string;
  readonly react: ReactElement;
  readonly templateKey: string;
  readonly locale: EmailLocale;
  readonly idempotencyKey?: string;
  readonly replyTo?: string;
}>;

async function sendEmail(options: SendEmailOptions): Promise<void> {
  return withSpan("api.email.send", async () => {
    const apiKey = await fetchResendApiKey();
    if (!apiKey) throw new Error("Resend API key not configured");

    const resend = new Resend(apiKey);

    const result = await resend.emails.send(
      {
        from: FROM_ADDRESS,
        to: options.to,
        subject: options.subject,
        react: options.react,
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
