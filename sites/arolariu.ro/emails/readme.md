# Email Templates

When developing e-mail templates, use pixels (px) instead of rem/em units because most e-mail clients do not support rem/em consistently.

## Shared layout and components

Compose templates from the `emails/_components` barrel: wrap the content in `EmailLayout` and build it from `EmailCard`, `BulletList`,
`DonutChart`, `KeyValueTable`, and `MetricsGrid`. Style with inline `style` objects that use the `BRAND`, `EMAIL_COLORS`, and
`EMAIL_TYPOGRAPHY` tokens from `emails/_components/brand.ts`, plus the shared `EmailParagraphStyles`, `EmailLinkStyles`, and `EmailHrStyles`
exported by `EmailLayout.tsx`.

```tsx
import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../_components";
```

## Logo

Emails render the remote `BRAND.logoUrl` at 140px (`emails/_components/brand.ts`, `EmailLayout.tsx`).

## Defining new templates

Use `defineEmailTemplate({namespace, render})` from `emails/_lib/defineEmailTemplate.ts`. The HOF resolves the locale, loads the message
bundle, constructs a namespace-scoped translator, and calls your `render` callback with `{locale, t, props}`. Attach `PreviewProps` on the
returned function for the `npm run email` preview (run from `sites/arolariu.ro`). The HOF also attaches `.namespace` and
`.getSubject(locale, vars)` as static helpers: the `sendEmail` action resolves the subject with
`entry.template.getSubject(locale, subjectVars)`, and `_registry.test.ts` asserts that every registry template has a `.namespace`. The
`_registry.ts` map only stores template references (plus `variantProps` for variant entries), so you do not need to maintain a separate
namespace mapping.

## Variant entries (sharing a base template)

When two or more registry entries differ only in a small set of props (e.g., the 3/7/14/30-day inactivity reminders, the
daily/weekly/monthly/yearly stats digests), prefer a single base template plus multiple **variant registry entries** with a `variantProps`
field, rather than separate wrapper template files. The shared subject string interpolates the differing prop via ICU vars (e.g.,
`"It's been {daysWithoutUpload} days"` reads `{daysWithoutUpload}` from `variantProps.daysWithoutUpload`). The action merges `variantProps`
over caller props at runtime so callers cannot override fixed variant values.
