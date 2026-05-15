import "server-only";

import type {ReactElement} from "react";

import {
  createEmailTranslator,
  DEFAULT_LOCALE,
  type EmailLocale,
  type EmailTranslator,
  loadMessages,
} from "../_i18n";

/**
 * Render-time context handed to a template's `render` callback.
 *
 * @typeParam P - The template's user-supplied prop shape (excluding `locale`,
 *   which the HOF injects from the resolved {@link EmailLocale}).
 *
 * @remarks
 * The HOF resolves the locale exactly once per render and constructs the
 * namespace-scoped translator (`t`) from a single `loadMessages` call.
 * Templates must use the translator handed to them in the render context —
 * do not call `loadMessages` themselves; doing so re-parses the bundle and
 * defeats the optimisation.
 *
 * `EmailLayout` resolves its own `email.layout`-scoped translator via the
 * memoised `getLayoutTranslator` helper, so no `tLayout` is threaded
 * through this context.
 */
export type EmailRenderContext<P> = Readonly<{
  /** Resolved locale (defaulted to `"en"` if the caller omitted it). */
  readonly locale: EmailLocale;
  /** Translator scoped to the template's namespace, e.g. `"email.welcome"`. */
  readonly t: EmailTranslator;
  /** The caller-supplied props, minus `locale`. */
  readonly props: P;
}>;

/**
 * Configuration object for {@link defineEmailTemplate}.
 *
 * @typeParam P - User prop shape (locale is added by the HOF, not by the caller).
 */
export type EmailTemplateConfig<P> = Readonly<{
  /**
   * Full next-intl namespace path — must point at a JSON object that
   * contains a `subject` key. Example: `"email.welcome"`.
   *
   * @remarks
   * The HOF reads this string when constructing the namespace-scoped
   * translator and when resolving the subject. Keep it in sync with the
   * shape of `messages/{en,ro,fr}.json` — locale parity is enforced
   * separately by `npm run generate:i18n` (RFC 1003).
   */
  readonly namespace: string;

  /**
   * Render callback — returns the React tree for the email body.
   *
   * @param ctx - {@link EmailRenderContext} with `locale`, the translator,
   *   and the caller's props.
   *
   * @example
   * ```ts
   * render: ({locale, t, props}) => (
   *   <EmailLayout
   *     locale={locale}
   *     preview={t("preview", {name: props.username})}
   *     heading={t("heading")}>
   *     <Text>{t("greeting", {name: props.username})}</Text>
   *   </EmailLayout>
   * )
   * ```
   */
  readonly render: (ctx: EmailRenderContext<P>) => ReactElement;
}>;

/**
 * The runtime shape of a template produced by {@link defineEmailTemplate}.
 *
 * @remarks
 * Templates returned by the HOF are *callable* (React Server Components —
 * `(props) => Promise<ReactElement>`) **and** carry two static members:
 *
 * - {@link EmailTemplate.namespace | `.namespace`} — the next-intl
 *   namespace the template reads from. Consumed by the registry and by
 *   tooling that needs to introspect a template without instantiating it.
 * - {@link EmailTemplate.getSubject | `.getSubject(locale, vars?)`} —
 *   async helper that resolves the localized subject string. Used by the
 *   `sendEmail` server action so the registry does not need a separate
 *   subject-resolution path.
 *
 * @typeParam P - The template's prop shape (excluding `locale`).
 */
export type EmailTemplate<P> = ((
  props: P & {readonly locale?: EmailLocale},
) => Promise<ReactElement>) & {
  /** The next-intl namespace this template is scoped to. */
  readonly namespace: string;
  /**
   * Resolve the localized `subject` string for this template.
   *
   * @param locale - Defaults to `"en"`.
   * @param vars - ICU variables for interpolation (e.g. `{name: "Alex"}`).
   */
  readonly getSubject: (
    locale?: EmailLocale,
    vars?: Readonly<Record<string, string | number>>,
  ) => Promise<string>;
};

/**
 * Define a localized React Email template with a single source of truth
 * for its next-intl namespace and a typed subject resolver.
 *
 * @typeParam P - The template's prop shape (excluding `locale`).
 * @param config - {@link EmailTemplateConfig}: `namespace` + `render` callback.
 * @returns An {@link EmailTemplate} — an async React component callable as
 *   `await Template({...props, locale})`, plus `.namespace` and
 *   `.getSubject(locale, vars?)` static helpers.
 *
 * @remarks
 * - **Single message load per render.** The HOF resolves the locale, loads
 *   the message bundle, and constructs the namespace-scoped translator
 *   once. Templates must use the translator handed to them — do not call
 *   `loadMessages` or `createEmailTranslator` directly.
 * - **`PreviewProps` is unchanged.** Attach `PreviewProps` to the returned
 *   template the same way as before; the HOF does not interpose on it.
 *
 * @example
 * ```ts
 * type Props = Readonly<{
 *   readonly username: string;
 *   readonly uploadUrl?: string;
 * }>;
 *
 * const WelcomeEmail = defineEmailTemplate<Props>({
 *   namespace: "email.welcome",
 *   render: ({locale, t, props}) => {
 *     const name = props.username?.trim() || "there";
 *     return (
 *       <EmailLayout
 *         locale={locale}
 *         preview={t("preview", {brand: BRAND.name, name})}
 *         heading={t("heading", {brand: BRAND.name})}>
 *         <Text>{t("greeting", {name})}</Text>
 *       </EmailLayout>
 *     );
 *   },
 * });
 *
 * WelcomeEmail.PreviewProps = {username: "Test User", locale: "en"} satisfies Props & {locale: EmailLocale};
 *
 * export default WelcomeEmail;
 * ```
 *
 * @example Reading the namespace from outside
 * ```ts
 * import WelcomeEmail from "./WelcomeEmail";
 * console.log(WelcomeEmail.namespace);            // "email.welcome"
 * const subject = await WelcomeEmail.getSubject("ro", {name: "Alex"});
 * ```
 */
export function defineEmailTemplate<P>(
  config: EmailTemplateConfig<P>,
): EmailTemplate<P> {
  const component = async (
    props: P & {readonly locale?: EmailLocale},
  ): Promise<ReactElement> => {
    const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
    const messages = await loadMessages(locale);
    const t = createEmailTranslator({locale, messages, namespace: config.namespace});
    return config.render({locale, t, props});
  };

  const getSubject = async (
    locale: EmailLocale = DEFAULT_LOCALE,
    vars: Readonly<Record<string, string | number>> = {},
  ): Promise<string> => {
    const messages = await loadMessages(locale);
    const t = createEmailTranslator({locale, messages, namespace: config.namespace});
    return t("subject", vars);
  };

  return Object.assign(component, {
    namespace: config.namespace,
    getSubject,
  });
}
