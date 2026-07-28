# Email Templates

When developing e-mail templates, use pixels (px) instead of rem/em units because most e-mail clients do not support rem/em consistently.

## Email utility wrapper

For email-only utility classes, use the `Tailwind` wrapper from `react-email` inside the JSX/TSX template.

```tsx
import {Tailwind, Text} from "react-email";

<Tailwind>
  <Text className='bg-red-500 text-white p-4'>This is an email utility class</Text>
</Tailwind>;
```

## Logo sizes

The small logo should be 96x96 pixels, with transparency. The large logo should be 384x384 pixels, with transparency.

## Defining new templates

Use `defineEmailTemplate({namespace, render})` from `emails/_lib/defineEmailTemplate.ts`. The HOF resolves the locale, loads the message
bundle, constructs a namespace-scoped translator, and calls your `render` callback with `{locale, t, props}`. Attach `PreviewProps` on the
returned function for `npm run email:dev` preview. The HOF also attaches `.namespace` and `.getSubject(locale, vars)` as static helpers —
the `_registry.ts` map and the `sendEmail` action use these directly; you do not need to maintain a separate namespace mapping.

## Variant entries (sharing a base template)

When two or more registry entries differ only in a small set of props (e.g., the 3/7/14/30-day inactivity reminders, the
daily/weekly/monthly/yearly stats digests), prefer a single base template plus multiple **variant registry entries** with a `variantProps`
field, rather than separate wrapper template files. The shared subject string interpolates the differing prop via ICU vars (e.g.,
`"It's been {daysWithoutUpload} days"` reads `{daysWithoutUpload}` from `variantProps.daysWithoutUpload`). The action merges `variantProps`
over caller props at runtime so callers cannot override fixed variant values.
