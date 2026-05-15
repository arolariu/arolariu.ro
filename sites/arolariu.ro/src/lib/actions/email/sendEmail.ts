"use server";

/**
 * @fileoverview Generic typed server action for sending any registered email template.
 * @module lib/actions/email/sendEmail
 */

import {auth} from "@clerk/nextjs/server";
import type React from "react";

import {emailTemplates, type EmailTemplateKey, type EmailTemplatePropsMap} from "@/../emails/_registry";
import {DEFAULT_LOCALE, type EmailLocale, getEmailSubject} from "@/../emails/_i18n";
import {emailService} from "@/lib/email";

type SendEmailInput<K extends EmailTemplateKey> = Readonly<{
  readonly templateKey: K;
  readonly to: string;
  /** Props for the template. `locale` is optional; defaults to `"en"` if omitted. */
  readonly props: Omit<EmailTemplatePropsMap[K], "locale"> & {locale?: EmailLocale};
  /** Optional Resend idempotency key. */
  readonly idempotencyKey?: string;
  /** Optional reply-to override. */
  readonly replyTo?: string;
  /** Optional ICU subject variables. */
  readonly subjectVars?: Record<string, string | number>;
}>;

type Result = Readonly<{success: true} | {success: false; error: string}>;

export async function sendEmail<K extends EmailTemplateKey>(input: SendEmailInput<K>): Promise<Result> {
  const {userId} = await auth();
  if (!userId) return {success: false, error: "Unauthorized"};

  const entry = emailTemplates[input.templateKey];
  const locale: EmailLocale = input.props.locale ?? DEFAULT_LOCALE;

  try {
    const subject = await getEmailSubject(entry.namespace, locale, input.subjectVars ?? {});
    const Component = entry.component as (props: EmailTemplatePropsMap[K]) => Promise<React.ReactElement>;
    const react = await Component({...(input.props as EmailTemplatePropsMap[K]), locale});

    await emailService.sendEmail({
      to: input.to,
      subject,
      react,
      templateKey: input.templateKey,
      locale,
      idempotencyKey: input.idempotencyKey,
      replyTo: input.replyTo,
    });

    return {success: true};
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {success: false, error: msg};
  }
}
