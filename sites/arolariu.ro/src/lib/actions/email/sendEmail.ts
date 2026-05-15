"use server";

/**
 * @fileoverview Generic typed server action for sending any registered email template.
 * @module lib/actions/email/sendEmail
 *
 * @remarks
 * The action is the only entry point for user-triggered sends. It always
 * enforces a Clerk session — there is no per-template "no-auth" exemption.
 * System-triggered sends (Clerk webhooks, post-analysis callbacks) bypass
 * this action and call `emailService.sendEmail()` directly with their own
 * idempotency key.
 */

import {auth} from "@clerk/nextjs/server";
import type {ReactElement} from "react";

import {DEFAULT_LOCALE, type EmailLocale} from "@/../emails/_i18n";
import {emailTemplates, type EmailTemplateKey, type EmailTemplatePropsMap} from "@/../emails/_registry";
import {emailService} from "@/lib/email";

/**
 * Caller-supplied input to {@link sendEmail}.
 *
 * @remarks
 * `props` has type {@link EmailTemplatePropsMap}`[K]` — for variant entries
 * this **omits** keys the registry's `variantProps` pre-fills, so callers
 * cannot accidentally override a fixed variant value. The action also
 * merges `variantProps` over `props` at runtime as defence-in-depth.
 */
type SendEmailInput<K extends EmailTemplateKey> = {
  readonly templateKey: K;
  readonly to: string;
  readonly props: EmailTemplatePropsMap[K] & {readonly locale?: EmailLocale};
  readonly subjectVars?: Readonly<Record<string, string | number>>;
  readonly idempotencyKey?: string;
  readonly replyTo?: string;
};

/**
 * Discriminated result of {@link sendEmail}. Never throws to the client.
 */
type Result = {readonly success: true} | {readonly success: false; readonly error: string};

/**
 * Send a registered email template.
 *
 * @example User-triggered share
 * ```ts
 * const locale = useLocale() as EmailLocale;
 * const result = await sendEmail({
 *   templateKey: "invoice-shared",
 *   to: recipientEmail,
 *   props: {fromUsername, toUsername, identifier: invoice.id, locale},
 *   subjectVars: {fromName: fromUsername},
 *   replyTo: user?.emailAddresses?.[0]?.emailAddress,
 * });
 * ```
 */
export async function sendEmail<K extends EmailTemplateKey>(input: SendEmailInput<K>): Promise<Result> {
  const {userId} = await auth();
  if (!userId) return {success: false, error: "Unauthorized"};

  const entry = emailTemplates[input.templateKey];
  if (!entry) {
    return {success: false, error: `Unknown template: ${String(input.templateKey)}`};
  }

  const locale: EmailLocale = input.props.locale ?? DEFAULT_LOCALE;

  // Narrow `variantProps` once — the discriminated registry union has
  // `variantProps` only on variant entries, but reading it through a
  // widened accessor avoids per-branch narrowing in this generic action.
  const variantProps: Readonly<Record<string, unknown>> =
    (entry as {readonly variantProps?: Readonly<Record<string, unknown>>}).variantProps ?? {};

  // variantProps wins over caller props (callers cannot override fixed
  // variant values); locale is applied last to ensure consistency.
  const renderProps: Readonly<Record<string, unknown>> = {
    ...input.props,
    ...variantProps,
    locale,
  };

  // Subject interpolation: variantProps first (so {days}/{frequency} resolve
  // for variant entries), then caller subjectVars override.
  const subjectVars = {
    ...variantProps,
    ...(input.subjectVars ?? {}),
  } as Readonly<Record<string, string | number>>;

  // The registry union widens `template` across all entries, so we erase
  // the generic at the call site. Type safety is enforced upstream by
  // `EmailTemplatePropsMap[K]` on the caller's `props`.
  const template = entry.template as unknown as (props: Readonly<Record<string, unknown>>) => Promise<ReactElement>;

  try {
    const subject = await entry.template.getSubject(locale, subjectVars);
    const react: ReactElement = await template(renderProps);

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
