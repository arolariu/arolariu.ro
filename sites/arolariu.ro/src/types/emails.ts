/**
 * @fileoverview Locale primitive for the email subsystem, exposed to the rest of `src/`.
 * @module types/emails
 *
 * @remarks
 * The email templates under `emails/` declare their own `EmailLocale` in
 * `emails/_lib/i18n.tsx` (with the matching SUPPORTED_LOCALES tuple and
 * DEFAULT_LOCALE constant) because that file is the self-contained source
 * of truth for everything email-rendering.
 *
 * This file mirrors *only* the type so `src/` callers (server actions,
 * email-service wrapper, dialog components that thread a locale through
 * to a server action) don't have to reach into `emails/` for it.
 * Keeping the type duplicated rather than re-exported avoids a structural
 * `src/` → `emails/` dependency: the directional rule is `emails/` may
 * use `src/`, never the reverse.
 *
 * **Invariant:** the union here MUST match `EmailLocale` in
 * `emails/_lib/i18n.tsx`. If a locale is added or removed, update both.
 * The `assertEmailLocaleSync` helper at the bottom is a structural-check
 * helper for tests that want to fail loudly on drift.
 */

/**
 * The set of locales the email subsystem renders.
 *
 * Must stay in sync with the same-named type in `emails/_lib/i18n.tsx`.
 */
export type EmailLocale = "en" | "ro" | "fr";

/**
 * The default locale used when none is explicitly passed by a caller.
 *
 * Must stay in sync with `DEFAULT_LOCALE` in `emails/_lib/i18n.tsx`.
 */
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "en";
