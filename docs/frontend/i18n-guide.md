# Internationalization (i18n) Guide

## Quick Reference for RFC 1003: next-intl Internationalization System

This guide provides practical examples for implementing multi-language support in the arolariu.ro frontend.

## Quick Start

### 1. Add Translation Keys

Add keys to both `messages/en.json` and `messages/ro.json`:

```json
{
  "MyPage": {
    "__metadata__": {
      "title": "My Page Title",
      "description": "SEO description for my page"
    },
    "heading": "Welcome to My Page",
    "description": "This page displays {itemCount} items",
    "actions": {
      "save": "Save Changes",
      "cancel": "Cancel"
    }
  }
}
```

**Key Rules**:

- Use `__metadata__` for SEO/metadata translations
- Nest keys logically by feature/component
- Use variables with `{variableName}` syntax

### 2. Use Translations in Server Components

```typescript
import {getTranslations} from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("MyPage");
  
  return (
    <div>
      <h1>{t("heading")}</h1>
      <p>{t("description", {itemCount: 42})}</p>
      <button>{t("actions.save")}</button>
    </div>
  );
}
```

### 3. Use Translations in Client Components

```typescript
"use client";

import {useTranslations} from "next-intl";

export function MyComponent() {
  const t = useTranslations("MyPage");
  
  return (
    <div>
      <h1>{t("heading")}</h1>
      <button>{t("actions.save")}</button>
    </div>
  );
}
```

## Common Patterns

### Server Component with Metadata

```typescript
import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyPage.__metadata__");
  const locale = await getLocale();
  
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

export default async function MyPage() {
  const t = await getTranslations("MyPage");
  return <h1>{t("heading")}</h1>;
}
```

### Client Component with Multiple Namespaces

```typescript
"use client";

import {useTranslations} from "next-intl";

export function InvoiceCard() {
  const tInvoice = useTranslations("Invoices");
  const tCommon = useTranslations("Common");
  
  return (
    <div>
      <h2>{tInvoice("title")}</h2>
      <button>{tCommon("actions.delete")}</button>
    </div>
  );
}
```

### Pluralization

```json
{
  "items": "{count, plural, =0 {No items} =1 {One item} other {# items}}"
}
```

```typescript
const t = useTranslations("Namespace");
t("items", {count: 0});  // "No items"
t("items", {count: 1});  // "One item"
t("items", {count: 42}); // "42 items"
```

### Rich Text with Components

```typescript
import {useTranslations} from "next-intl";
import Link from "next/link";

export function Message() {
  const t = useTranslations("Messages");
  
  return (
    <p>
      {t.rich("learnMore", {
        link: (chunks) => <Link href="/learn">{chunks}</Link>,
        bold: (chunks) => <strong>{chunks}</strong>,
      })}
    </p>
  );
}
```

Translation file:

```json
{
  "Messages": {
    "learnMore": "Visit our <link><bold>learning center</bold></link> for tutorials"
  }
}
```

### Date and Number Formatting

```typescript
import {useFormatter} from "next-intl";

export function FormattedData() {
  const format = useFormatter();
  
  const date = new Date();
  const number = 1234.56;
  
  return (
    <div>
      <p>{format.dateTime(date, {dateStyle: "full"})}</p>
      <p>{format.number(number, {style: "currency", currency: "USD"})}</p>
    </div>
  );
}
```

## Language Switching

### Get Current Locale

```typescript
import {getLocale} from "next-intl/server";

export default async function Page() {
  const locale = await getLocale(); // "en" or "ro"
  return <div>Current language: {locale}</div>;
}
```

### Switch Language (Client Component)

```typescript
"use client";

import {setCookie} from "@/lib/actions/cookies";
import {useRouter} from "next/navigation";

export function LanguageSwitcher() {
  const router = useRouter();
  
  const switchToEnglish = async () => {
    await setCookie("NEXT_LOCALE", "en");
    router.refresh();
  };
  
  const switchToRomanian = async () => {
    await setCookie("NEXT_LOCALE", "ro");
    router.refresh();
  };
  
  return (
    <div>
      <button onClick={switchToEnglish}>English</button>
      <button onClick={switchToRomanian}>Română</button>
    </div>
  );
}
```

## Type Safety

### Type-Safe Translation Keys

TypeScript types are auto-generated from `messages/en.json`:

```typescript
// ✅ Valid - key exists
t("Invoices.title");

// ❌ Compile error - key doesn't exist
t("Invoices.nonExistent");
```

### Regenerate Types

After updating translation files:

```bash
npm run dev  # Types auto-generate in development
```

Or manually:

```bash
npm run generate:i18n
```

## Best Practices

### ✅ Do: Organize by Feature

```json
{
  "Invoices": {
    "__metadata__": { },
    "list": { },
    "details": { },
    "actions": { }
  },
  "Merchants": {
    "__metadata__": { },
    "list": { },
    "details": { }
  }
}
```

### ✅ Do: Use Variables for Dynamic Content

```json
{
  "greeting": "Hello, {userName}!",
  "itemCount": "Showing {count} of {total} items"
}
```

```typescript
t("greeting", {userName: "Alex"});
t("itemCount", {count: 10, total: 100});
```

### ✅ Do: Keep Keys Semantic

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  }
}
```

### ❌ Don't: Hardcode Text

```typescript
// ❌ Bad
<button>Save Changes</button>

// ✅ Good
<button>{t("actions.save")}</button>
```

### ❌ Don't: Duplicate Keys

```json
{
  "Invoices": {
    "save": "Save"  // ❌ Duplicate
  },
  "Merchants": {
    "save": "Save"  // ❌ Duplicate
  }
}
```

Instead, use common namespace:

```json
{
  "Common": {
    "actions": {
      "save": "Save"
    }
  }
}
```

## Troubleshooting

### Issue: Translation Key Not Found

**Error**: `Missing message for key "MyPage.title"`

**Solution**:

1. Check key exists in both `en.json` and `ro.json`
2. Verify correct namespace: `useTranslations("MyPage")`
3. Run `npm run dev` to regenerate types

### Issue: Translations Not Updating

**Solution**:

1. Restart dev server: `Ctrl+C`, then `npm run dev`
2. Clear `.next` cache: `rm -rf .next && npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R`

### Issue: Type Errors After Adding Keys

**Solution**:

```bash
# Regenerate TypeScript definitions
npm run generate:i18n
```

### Issue: Wrong Language Displayed

**Check locale cookie**:

```typescript
import {getCookie} from "@/lib/actions/cookies";

const locale = await getCookie("NEXT_LOCALE");
console.log("Current locale:", locale); // Should be "en" or "ro"
```

## Translation File Structure

```text
messages/
├── en.json           # English translations (source of truth)
├── ro.json           # Romanian translations
└── en.d.json.ts      # Auto-generated TypeScript types
```

### Example Translation Structure

```json
{
  "Common": {
    "actions": {
      "save": "Save",
      "cancel": "Cancel",
      "delete": "Delete"
    }
  },
  "Invoices": {
    "__metadata__": {
      "title": "Invoices",
      "description": "Manage your invoices"
    },
    "title": "My Invoices",
    "empty": "No invoices found",
    "list": {
      "header": "All Invoices",
      "filters": {
        "search": "Search invoices...",
        "sortBy": "Sort by",
        "dateRange": "Date range"
      }
    }
  }
}
```

## Quick Reference

| Task | Server Component | Client Component |
|------|------------------|------------------|
| Get translations | `await getTranslations("Namespace")` | `useTranslations("Namespace")` |
| Get locale | `await getLocale()` | `const locale = useLocale()` |
| Format dates | `const format = await useFormatter()` | `const format = useFormatter()` |
| Generate metadata | `generateMetadata()` with `getTranslations()` | N/A |

## Additional Resources

- **RFC 1003**: Complete i18n system documentation
- **next-intl Docs**: <https://next-intl-docs.vercel.app/>
- **ICU Message Format**: <https://formatjs.io/docs/core-concepts/icu-syntax/>
- **Translation Files**: `sites/arolariu.ro/messages/`
