---
name: i18n-page
description: 'Adds internationalization to Next.js pages using next-intl with server and client component patterns, supporting en/ro/fr locales following RFC 1003 for the arolariu.ro frontend.'
---

# i18n Page Setup

Adds internationalization support to Next.js pages using next-intl.

## When to Use

- Creating a new page with user-facing text
- Adding translations to an existing page
- Converting hardcoded strings to i18n
- Adding a new locale

## Supported Locales

| Locale | Language | File |
|--------|----------|------|
| `en` | English | `sites/arolariu.ro/messages/en.json` |
| `ro` | Romanian | `sites/arolariu.ro/messages/ro.json` |
| `fr` | French | `sites/arolariu.ro/messages/fr.json` |

## Message Structure

Messages are organized by namespace (usually matching the page/feature):

```json
{
  "Namespace": {
    "__metadata__": {
      "title": "Page Title for SEO",
      "description": "Page description for SEO and social sharing"
    },
    "title": "Display Title",
    "subtitle": "Subtitle text",
    "actions": {
      "submit": "Submit",
      "cancel": "Cancel"
    },
    "errors": {
      "required": "This field is required",
      "invalid": "Invalid input"
    }
  }
}
```

**Conventions:**
- `__metadata__` — Reserved for SEO metadata (used by `generateMetadata()`)
- Nest by feature: `actions.submit`, `errors.required`
- Use descriptive keys: `invoiceCount` not `count`
- Keep keys in camelCase

## Server Component Pattern

Use `getTranslations()` for Server Components:

```tsx
// page.tsx (Server Component)
import {getTranslations} from "next-intl/server";
import {createMetadata} from "@/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Namespace.__metadata__");
  return createMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function Page(): Promise<React.JSX.Element> {
  const t = await getTranslations("Namespace");
  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
    </main>
  );
}
```

## Client Component Pattern

Use `useTranslations()` hook for Client Components:

```tsx
// island.tsx (Client Component)
"use client";

import {useTranslations} from "next-intl";

export default function RenderScreen(): React.JSX.Element {
  const t = useTranslations("Namespace");

  return (
    <main>
      <h1>{t("title")}</h1>
      <button>{t("actions.submit")}</button>
    </main>
  );
}
```

## Rich Text and Interpolation

```tsx
// Interpolation
t("greeting", {name: "Alex"})
// Message: "Hello, {name}!"

// Pluralization
t("itemCount", {count: items.length})
// Message: "You have {count, plural, =0 {no items} one {# item} other {# items}}"

// Rich text (HTML tags)
t.rich("terms", {
  link: (chunks) => <a href="/terms">{chunks}</a>,
})
// Message: "By continuing you agree to our <link>terms</link>"
```

## Workflow

1. **Define namespace** matching the page or feature name
2. **Add keys** to `messages/en.json` first (primary locale)
3. **Add translations** to `messages/ro.json` and `messages/fr.json`
4. **Use in Server Components** with `getTranslations()`
5. **Use in Client Components** with `useTranslations()`
6. **Use in metadata** with `generateMetadata()` + `createMetadata()`
7. **Verify** all 3 locales have matching keys

## Checklist

- [ ] Keys added to all 3 locale files (`en.json`, `ro.json`, `fr.json`)
- [ ] `__metadata__` namespace includes `title` and `description`
- [ ] Server Components use `getTranslations()`
- [ ] Client Components use `useTranslations()`
- [ ] No hardcoded user-facing strings in JSX
- [ ] Interpolation used for dynamic values (not string concatenation)
- [ ] Keys follow camelCase naming
- [ ] Nested structure matches feature organization
- [ ] `npm run generate:i18n` runs without errors

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

## Execution Contract

### Prerequisites
- Confirm feature scope and expected behavior before creating or modifying files.
- Identify whether this task changes architecture-sensitive behavior and trigger RFC grounding.

### Required Context Reads
- `.github/instructions/frontend.instructions.md`
- `.github/instructions/react.instructions.md`
- `docs/rfc/1003-internationalization-system.md`
- `sites/arolariu.ro/messages/en.json`
- `sites/arolariu.ro/src/i18n/request.ts`

### File Mutation Boundaries
- Allowed: `sites/arolariu.ro/src/app/**`, `sites/arolariu.ro/messages/*.json`.
- Disallowed: backend or infra changes unless explicitly requested.

### Validation Commands
```bash
npm run build:website
npm run test:website
```

### Success Output Contract
- Return created/updated file paths.
- Summarize validation commands and outcomes.
- Report assumptions made during generation.

### Failure Output Contract
- Report failing step and exact error output.
- Provide impacted files and rollback-safe next steps.
- Request user confirmation when risk or ambiguity blocks safe continuation.

