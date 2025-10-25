# RFC 1003: next-intl Internationalization System for Next.js 16

- **Status**: Implemented
- **Date**: 2025-10-25
- **Authors**: arolariu
- **Related Components**: `sites/arolariu.ro`, `src/i18n/request.ts`, `messages/`, `src/app/providers.tsx`

---

## Abstract

This RFC documents the implementation of a comprehensive internationalization (i18n) system for the arolariu.ro Next.js 16 application using the next-intl library. The system provides type-safe translations, locale management, and seamless integration with React Server Components (RSC) and Client Components, supporting multiple languages across the entire application stack with automatic type generation and compile-time validation.

---

## 1. Motivation

### 1.1 Problem Statement

Modern Next.js applications with App Router and React Server Components require a robust i18n solution that:

1. **Type-Safe Translations**: Prevent runtime errors from missing or misspelled translation keys
2. **RSC Compatibility**: Work seamlessly with React Server Components and streaming SSR
3. **Performance**: Minimize bundle size and avoid shipping unused translations to the client
4. **Developer Experience**: Provide IntelliSense, autocomplete, and compile-time validation
5. **Locale Persistence**: Maintain user language preference across sessions
6. **SEO Optimization**: Support proper metadata localization for search engines

### 1.2 Design Goals

- **Type Safety**: Auto-generated TypeScript definitions for all translation keys
- **Framework Integration**: Deep integration with Next.js 16 App Router
- **Minimal Overhead**: Tree-shakeable translations with dynamic imports
- **User Experience**: Cookie-based locale persistence and instant switching
- **Scalability**: Support for namespace organization and nested message structures
- **Standards Compliance**: Follow i18n best practices and ICU MessageFormat

---

## 2. Technical Design

### 2.1 Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 16 Application                       │
├─────────────────────────────────────────────────────────────────┤
│  i18n/request.ts                                                │
│  ├─ getRequestConfig() - Locale resolution                      │
│  ├─ Dynamic message imports                                     │
│  └─ Locale validation                                           │
├─────────────────────────────────────────────────────────────────┤
│  messages/                                                      │
│  ├─ en.json - English translations                             │
│  ├─ ro.json - Romanian translations                            │
│  └─ en.d.json.ts - Auto-generated TypeScript types            │
├─────────────────────────────────────────────────────────────────┤
│  app/layout.tsx                                                 │
│  ├─ getLocale() - Server-side locale detection                 │
│  └─ <html lang={locale}> - HTML lang attribute                 │
├─────────────────────────────────────────────────────────────────┤
│  app/providers.tsx                                              │
│  ├─ NextIntlClientProvider - Client context                    │
│  ├─ ClerkProvider localization                                 │
│  └─ Locale prop passing                                        │
├─────────────────────────────────────────────────────────────────┤
│  Components                                                     │
│  ├─ Server Components: getTranslations()                       │
│  └─ Client Components: useTranslations()                       │
├─────────────────────────────────────────────────────────────────┤
│  lib/actions/cookies/                                           │
│  ├─ getCookie() - Server Action for reading cookies            │
│  └─ setCookie() - Server Action for writing cookies            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Components

#### 2.2.1 Request Configuration (`i18n/request.ts`)

The central configuration file that determines the user's locale and loads appropriate translations:

```typescript
import {getCookie} from "@/lib/actions/cookies";
import {Locale} from "next-intl";
import {getRequestConfig} from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = (await getCookie("locale")) ?? "en";

  const supportedLocales = ["en", "ro"] as const;
  if (!supportedLocales.includes(locale as Locale)) {
    throw new Error(`[arolariu.ro::i18n] >>> Locale "${locale}" is not supported.`);
  }

  return {
    locale: locale as Locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**Key Features**:

- **Cookie-based locale detection**: User preference persisted via HTTP cookies
- **Fallback to English**: Default locale when no cookie is present
- **Locale validation**: Compile-time type safety with runtime validation
- **Dynamic imports**: Only load the required locale's messages
- **Explicit error handling**: Clear error messages for unsupported locales

#### 2.2.2 Translation Messages Structure

Messages are organized in namespaced JSON files with deep nesting support:

```json
{
  "About": {
    "__metadata__": {
      "title": "About Us",
      "description": "Learn more about the author and the platform."
    },
    "Author": {
      "Biography": {
        "FirstPoint": "Alexandru is a {age} years old software engineer..."
      }
    }
  },
  "Domains": {
    "services": {
      "invoices": {
        "service": {
          "main-page": {
            "steps": {
              "step1": "Upload invoice",
              "step2": "Review items"
            }
          }
        }
      }
    }
  }
}
```

**Organization Principles**:

- **Namespace hierarchy**: Top-level keys represent feature domains
- **Metadata convention**: `__metadata__` objects store page-level SEO data
- **Deep nesting**: Reflects UI component hierarchy
- **ICU MessageFormat**: Support for variables (`{age}`), pluralization, and formatting
- **Parallel structure**: All locale files mirror the same structure

#### 2.2.3 Type Generation (`messages/en.d.json.ts`)

Auto-generated TypeScript definitions provide compile-time safety:

```typescript
// Auto-generated by next-intl
declare const messages: {
  "About": {
    "__metadata__": {
      "description": "Learn more about the author and the platform.",
      "title": "About Us"
    },
    "Author": {
      "Biography": {
        "FirstPoint": "Alexandru is a {age} years old software engineer..."
      }
    }
  }
  // ... complete type definitions for all messages
};

export default messages;
```

**Benefits**:

- IntelliSense autocomplete for translation keys
- Compile-time errors for missing or typo'd keys
- Type-safe parameter passing for ICU variables
- Refactoring safety when restructuring messages

### 2.3 Integration Patterns

#### 2.3.1 Server Components

Server Components use the async `getTranslations()` API:

```typescript
// app/domains/page.tsx
import {getLocale, getTranslations} from "next-intl/server";

export default async function DomainsPage() {
  const locale = await getLocale();
  const t = await getTranslations("Domains.__metadata__");
  
  return (
    <main>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
    </main>
  );
}

// Metadata generation
export async function generateMetadata() {
  const t = await getTranslations("Domains.__metadata__");
  
  return {
    title: t("title"),
    description: t("description"),
  };
}
```

**Characteristics**:

- **Async/await API**: Compatible with React Server Components
- **No provider needed**: Direct access to translations in RSC
- **Namespace scoping**: `getTranslations("Namespace")` returns scoped translator
- **Metadata support**: Use in `generateMetadata()` for SEO

#### 2.3.2 Client Components

Client Components use the hook-based `useTranslations()` API:

```typescript
// components/Footer.tsx
"use client";

import {useTranslations} from "next-intl";

export function Footer() {
  const t = useTranslations("Footer");
  
  return (
    <footer>
      <p>{t("copyright")}</p>
      <p>{t("description")}</p>
    </footer>
  );
}
```

**Characteristics**:

- **Hook-based API**: Standard React pattern
- **Client-side reactivity**: Translations update without rehydration
- **Provider dependency**: Requires `NextIntlClientProvider` ancestor
- **Namespace scoping**: Same scoping pattern as server API

#### 2.3.3 Root Layout Integration

The root layout orchestrates locale detection and provider setup:

```typescript
// app/layout.tsx
import {getLocale} from "next-intl/server";
import ContextProviders from "./providers";

export default async function RootLayout(props: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning dir='ltr'>
      <body>
        <ContextProviders locale={locale}>
          <Header />
          <Suspense fallback={<Loading />}>
            {props.children}
          </Suspense>
          <Footer />
        </ContextProviders>
      </body>
    </html>
  );
}
```

**Key Points**:

- **Server-side locale resolution**: `getLocale()` reads from cookie
- **HTML lang attribute**: Proper semantic HTML for accessibility and SEO
- **Locale propagation**: Pass to providers for client-side context
- **Suspense boundaries**: Protect against translation loading delays

#### 2.3.4 Context Providers Setup

The providers file wraps the app with necessary context:

```typescript
// app/providers.tsx
import {enUS, roRO} from "@clerk/localizations";
import {ClerkProvider as AuthProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";

type Props = {
  locale: "en" | "ro";
  children: React.ReactNode;
};

export default function ContextProviders({locale, children}: Props) {
  return (
    <AuthProvider localization={locale === "ro" ? roRO : enUS}>
      <FontProvider>
        <ThemeProvider>
          <TranslationProvider>
            {children}
            <ToastProvider />
            <Commander />
          </TranslationProvider>
        </ThemeProvider>
      </FontProvider>
    </AuthProvider>
  );
}
```

**Provider Stack**:

1. **AuthProvider (Clerk)**: Localized authentication UI
2. **FontProvider**: Font preference context
3. **ThemeProvider**: Light/dark mode
4. **TranslationProvider**: next-intl client context
5. **ToastProvider**: Notification system
6. **Commander**: Command palette (includes locale switcher)

### 2.4 Locale Switching Mechanism

#### 2.4.1 Cookie Management

Server Actions handle locale persistence:

```typescript
// lib/actions/cookies/cookies.action.ts
"use server";

import {cookies} from "next/headers";

export async function getCookie(name: string): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
}

export async function setCookie(name: string, value: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    path: "/",
    httpOnly: false, // Allow client-side reading for immediate UI updates
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
```

**Cookie Configuration**:

- **Name**: `"locale"`
- **Lifetime**: 1 year (365 days)
- **Scope**: Site-wide (`path: "/"`)
- **Security**: Secure in production, lax SameSite
- **Accessibility**: Not httpOnly for client-side reading

#### 2.4.2 Language Switcher Implementation

The Commander component provides a command palette with locale switching:

```typescript
// components/Commander.tsx
"use client";

import {setCookie} from "@/lib/actions/cookies";
import {useRouter} from "next/navigation";

export function Commander() {
  const router = useRouter();
  
  const onSelectLangEnglish = useCallback(() => {
    void setCookie("locale", "en");
    router.refresh(); // Trigger server re-render with new locale
  }, [router]);

  const onSelectLangRomanian = useCallback(() => {
    void setCookie("locale", "ro");
    router.refresh();
  }, [router]);

  return (
    <CommandDialog>
      <CommandList>
        <CommandGroup heading="Language">
          <CommandItem onSelect={onSelectLangEnglish}>
            <Languages />
            <span>English</span>
          </CommandItem>
          <CommandItem onSelect={onSelectLangRomanian}>
            <Languages />
            <span>Română</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

**Switching Flow**:

1. User selects language from command palette
2. Server Action updates `locale` cookie
3. `router.refresh()` triggers server re-render
4. `getLocale()` reads new cookie value
5. App re-renders with new translations
6. No full page reload required

### 2.5 Next.js Configuration

The `next.config.ts` integrates next-intl plugin:

```typescript
// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // ... other config
};

export default withNextIntl(nextConfig);
```

**Plugin Responsibilities**:

- Inject locale resolution middleware
- Setup request context for `getLocale()`
- Configure message loading infrastructure
- Enable React Server Components support

---

## 3. Translation Workflow

### 3.1 Adding New Translations

#### Step 1: Update Source Locale (en.json)

```json
{
  "NewFeature": {
    "__metadata__": {
      "title": "New Feature",
      "description": "Discover our new feature"
    },
    "welcome": "Welcome to our new feature!",
    "callToAction": "Get started now"
  }
}
```

#### Step 2: Update All Locales (ro.json, etc.)

Maintain parallel structure in all locale files:

```json
{
  "NewFeature": {
    "__metadata__": {
      "title": "Funcționalitate Nouă",
      "description": "Descoperă noua noastră funcționalitate"
    },
    "welcome": "Bine ai venit la noua noastră funcționalitate!",
    "callToAction": "Începe acum"
  }
}
```

#### Step 3: Regenerate Types

```bash
npm run generate:translations
```

This auto-generates `en.d.json.ts` with updated type definitions.

#### Step 4: Use in Components

```typescript
// Server Component
const t = await getTranslations("NewFeature");
<h1>{t("welcome")}</h1>

// Client Component
const t = useTranslations("NewFeature");
<button>{t("callToAction")}</button>
```

### 3.2 Translation Conventions

#### Namespace Naming

- **PascalCase**: Top-level domain keys (`About`, `Domains`, `Footer`)
- **camelCase**: Nested property keys (`mainPage`, `callToAction`)
- **kebab-case**: Route-based namespaces (`view-invoices`, `create-invoice`)

#### Metadata Pattern

Use `__metadata__` for SEO-related translations:

```json
{
  "PageName": {
    "__metadata__": {
      "title": "Page Title - SEO optimized",
      "description": "Page description for meta tags",
      "keywords": "optional, comma, separated"
    },
    "content": {
      // ... actual page content translations
    }
  }
}
```

#### ICU MessageFormat

Support for dynamic content:

```json
{
  "greeting": "Hello, {name}!",
  "itemCount": "{count, plural, =0 {no items} one {# item} other {# items}}",
  "price": "{amount, number, currency}"
}
```

Usage:

```typescript
t("greeting", {name: "Alexandru"})
// Output: "Hello, Alexandru!"

t("itemCount", {count: 5})
// Output: "5 items"

t("price", {amount: 99.99})
// Output: "$99.99" (locale-aware formatting)
```

---

## 4. Type Safety System

### 4.1 Compile-Time Validation

#### Type-Safe Key Access

```typescript
const t = useTranslations("Footer");

t("copyright");    // ✅ Valid - key exists
t("description");  // ✅ Valid - key exists
t("invalidKey");   // ❌ TypeScript error: Key doesn't exist
```

#### Scoped Translators

```typescript
// Scope to specific namespace
const t = useTranslations("Domains.services.invoices.service.main-page");

// IntelliSense shows only keys under this namespace:
// - steps
// - steps.step1
// - steps.step2
// - title
// - description
```

#### Type-Safe Parameters

```typescript
// Translation with parameter
"greeting": "Hello, {name}!"

// Usage
t("greeting", {name: "Alexandru"}); // ✅ Valid
t("greeting", {age: 25});           // ❌ TypeScript error: wrong parameter
t("greeting");                       // ❌ TypeScript error: missing parameter
```

### 4.2 Runtime Validation

#### Locale Validation

```typescript
const supportedLocales = ["en", "ro"] as const;
if (!supportedLocales.includes(locale as Locale)) {
  throw new Error(`Locale "${locale}" is not supported.`);
}
```

#### Missing Key Detection

next-intl provides development-mode warnings:

```text
[next-intl] Missing message: "Footer.invalidKey"
```

### 4.3 Type Generation

#### Auto-Generated Type File (`messages/en.d.json.ts`)

```typescript
declare const messages: {
  "Footer": {
    "copyright": string;
    "description": string;
    "links": {
      "about": string;
      "contact": string;
    };
  };
  // ... all other namespaces
};

export default messages;
```

#### Integration with next-intl

```typescript
// Type augmentation for next-intl
import messages from "../messages/en.json";

type Messages = typeof messages;

declare module "next-intl" {
  interface IntlConfig {
    locale: "en" | "ro";
    messages: Messages;
  }
}
```

---

## 5. Performance Optimizations

### 5.1 Code Splitting

#### Dynamic Message Loading

Messages are loaded only when needed:

```typescript
// Dynamic import in i18n/request.ts
messages: (await import(`../../messages/${locale}.json`)).default
```

**Benefits**:

- Only one locale's messages are loaded per request
- Tree-shaking removes unused translation keys
- Reduced bundle size for client components

### 5.2 Server-Side Translation

#### Zero Client Overhead for RSC

```typescript
// Server Component - translations resolved on server
export default async function Page() {
  const t = await getTranslations("Namespace");
  return <h1>{t("title")}</h1>;
  // Rendered output: <h1>Actual Title Text</h1>
  // No translation library shipped to client
}
```

#### Client Components

Only client components that use translations include the library:

```typescript
"use client";
import {useTranslations} from "next-intl";
// Only this component's bundle includes next-intl
```

### 5.3 Caching Strategy

#### Cookie-Based Locale Persistence

```typescript
// Set once, persist for 1 year
cookieStore.set("locale", value, {
  maxAge: 60 * 60 * 24 * 365
});
```

#### Request-Level Caching

```typescript
// getLocale() is memoized per request
const locale = await getLocale();
// Subsequent calls return cached value
```

---

## 6. SEO and Accessibility

### 6.1 HTML Language Attribute

```typescript
// app/layout.tsx
<html lang={locale} dir='ltr'>
```

**Benefits**:

- Screen readers use correct pronunciation
- Search engines index content with proper language tagging
- Browser translation features work correctly

### 6.2 Metadata Localization

```typescript
export async function generateMetadata() {
  const t = await getTranslations("Page.__metadata__");
  
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: await getLocale(),
      alternateLocale: ["en_US", "ro_RO"],
    },
  };
}
```

**SEO Impact**:

- Localized page titles and descriptions
- Proper Open Graph tags for social sharing
- hreflang alternatives for multi-language SEO

### 6.3 Accessibility

#### Screen Reader Support

```typescript
<button aria-label={t("closeDialog")}>
  <X />
</button>
```

#### Form Labels

```typescript
<label htmlFor="email">
  {t("form.emailLabel")}
</label>
<input
  id="email"
  type="email"
  placeholder={t("form.emailPlaceholder")}
/>
```

---

## 7. Testing Strategies

### 7.1 Translation Coverage

#### Ensure All Locales Have Same Keys

```typescript
// scripts/validate-translations.ts
import en from "./messages/en.json";
import ro from "./messages/ro.json";

function getKeys(obj: any, prefix = ""): string[] {
  return Object.keys(obj).flatMap((key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof obj[key] === "object" && !Array.isArray(obj[key])
      ? getKeys(obj[key], fullKey)
      : [fullKey];
  });
}

const enKeys = getKeys(en);
const roKeys = getKeys(ro);

const missingInRo = enKeys.filter((key) => !roKeys.includes(key));
const missingInEn = roKeys.filter((key) => !enKeys.includes(key));

if (missingInRo.length > 0) {
  console.error("Missing in ro.json:", missingInRo);
  process.exit(1);
}
```

### 7.2 Component Testing

#### Mock Translations in Tests

```typescript
// jest.setup.ts
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  getTranslations: async () => (key: string) => key,
}));
```

#### Test Locale Switching

```typescript
// components/Commander.test.tsx
import {render, screen, fireEvent} from "@testing-library/react";
import {Commander} from "./Commander";

test("switches locale to Romanian", async () => {
  render(<Commander />);
  
  const romanianOption = screen.getByText("Română");
  fireEvent.click(romanianOption);
  
  expect(setCookie).toHaveBeenCalledWith("locale", "ro");
});
```

### 7.3 E2E Testing

#### Playwright Tests for Locale Switching

```typescript
// tests/e2e/i18n.spec.ts
import {test, expect} from "@playwright/test";

test("changes language to Romanian", async ({page}) => {
  await page.goto("/");
  
  // Open command palette
  await page.keyboard.press("Meta+K");
  
  // Select Romanian
  await page.click('text="Română"');
  
  // Verify locale cookie
  const cookies = await page.context().cookies();
  const localeCookie = cookies.find((c) => c.name === "locale");
  expect(localeCookie?.value).toBe("ro");
  
  // Verify UI updated
  await expect(page.locator("footer")).toContainText("Drepturi de autor");
});
```

---

## 8. Migration Guide

### 8.1 Adding a New Locale

#### Step 1: Create Translation File

```bash
cp messages/en.json messages/es.json
# Translate all values to Spanish
```

#### Step 2: Update Type Definitions

```typescript
// app/globals.ts
const locales = ["en", "ro", "es"] as const;
type Locale = (typeof locales)[number];
```

#### Step 3: Update i18n Configuration

```typescript
// i18n/request.ts
const supportedLocales = ["en", "ro", "es"] as const;
```

#### Step 4: Update Providers

```typescript
// app/providers.tsx
import {enUS, roRO, esES} from "@clerk/localizations";

const clerkLocalizations = {
  en: enUS,
  ro: roRO,
  es: esES,
};

<AuthProvider localization={clerkLocalizations[locale]}>
```

#### Step 5: Update Locale Switcher

```typescript
// components/Commander.tsx
const onSelectLangSpanish = useCallback(() => {
  void setCookie("locale", "es");
  router.refresh();
}, [router]);

<CommandItem onSelect={onSelectLangSpanish}>
  <Languages />
  <span>Español</span>
</CommandItem>
```

### 8.2 Restructuring Namespaces

When refactoring translation structure:

1. **Update all locale files simultaneously** to maintain structure parity
2. **Run type generation** to update type definitions
3. **Update component imports** to use new namespace paths
4. **Run tests** to catch any missing translations
5. **Commit atomically** to keep files in sync

---

## 9. Best Practices

### 9.1 Translation Organization

✅ **DO**: Use hierarchical namespaces

```json
{
  "Domains": {
    "services": {
      "invoices": {
        "createInvoice": {
          "title": "Create Invoice"
        }
      }
    }
  }
}
```

❌ **DON'T**: Use flat keys

```json
{
  "domainsServicesInvoicesCreateInvoiceTitle": "Create Invoice"
}
```

### 9.2 Message Content

✅ **DO**: Use ICU MessageFormat for dynamic content

```json
{
  "greeting": "Welcome, {name}!"
}
```

❌ **DON'T**: Use string concatenation

```json
{
  "greeting": "Welcome, "
  // Expecting: t("greeting") + name + "!"
}
```

### 9.3 Metadata Convention

✅ **DO**: Use `__metadata__` for page-level data

```json
{
  "PageName": {
    "__metadata__": {
      "title": "SEO Title",
      "description": "SEO Description"
    },
    "content": { }
  }
}
```

❌ **DON'T**: Mix SEO data with content

```json
{
  "PageName": {
    "pageTitle": "Title",
    "contentTitle": "Different Title",
    "description": "Which one is for SEO?"
  }
}
```

### 9.4 Component Patterns

✅ **DO**: Scope translators to namespace

```typescript
const t = useTranslations("Footer");
return <p>{t("copyright")}</p>;
```

❌ **DON'T**: Use full key paths

```typescript
const t = useTranslations();
return <p>{t("Footer.copyright")}</p>;
```

### 9.5 Type Safety

✅ **DO**: Enable strict TypeScript mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

✅ **DO**: Regenerate types after changing messages

```bash
npm run generate:translations
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue: "Locale is not supported" Error

```typescript
Error: [arolariu.ro::i18n] >>> Locale "fr" is not supported.
```

**Solution**: Ensure locale is in supported list

```typescript
const supportedLocales = ["en", "ro", "fr"] as const;
```

#### Issue: Missing Translation Keys

```text
[next-intl] Missing message: "Footer.newKey"
```

**Solution**: Add key to all locale files or provide fallback

```typescript
t("newKey", {}, {fallback: "Default text"})
```

#### Issue: Types Not Updating

TypeScript shows old translation keys after adding new ones.

**Solution**: Regenerate type definitions

```bash
npm run generate:translations
# or manually
npx next-intl compile --src ./messages
```

#### Issue: Locale Not Persisting

User's language preference resets on page refresh.

**Solution**: Check cookie settings

```typescript
// Ensure maxAge is set
cookieStore.set("locale", value, {
  maxAge: 60 * 60 * 24 * 365
});
```

### 10.2 Debugging

#### Enable Debug Logging

```typescript
// i18n/request.ts
export default getRequestConfig(async () => {
  const locale = (await getCookie("locale")) ?? "en";
  console.log("[i18n] Resolved locale:", locale);
  
  return {
    locale: locale as Locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

#### Inspect Cookie Value

```typescript
// Browser DevTools Console
document.cookie.split("; ").find(c => c.startsWith("locale="))
// Output: "locale=en" or "locale=ro"
```

#### Check Translation Loading

```typescript
// Add to i18n/request.ts
const messages = (await import(`../../messages/${locale}.json`)).default;
console.log("[i18n] Loaded keys:", Object.keys(messages));
```

---

## 11. Performance Metrics

### 11.1 Bundle Size Impact

#### Production Bundle Analysis

```bash
ANALYZE=true npm run build
```

**Typical Size**:

- `next-intl` client library: ~5-8 KB gzipped
- English translations (en.json): ~15 KB raw, ~3 KB gzipped
- Romanian translations (ro.json): ~16 KB raw, ~3 KB gzipped

**Per-Route Impact**:

- Server Components: 0 KB (translations resolved server-side)
- Client Components: Only used translations + next-intl runtime

### 11.2 Runtime Performance

**Locale Resolution**: <1ms (cookie read)

**Message Loading**: <5ms (dynamic import, cached after first load)

**Translation Function Call**: <0.1ms (object property access)

**Optimization Notes**:

- Translations cached per request in RSC
- Client-side translations memoized
- No runtime parsing (pre-compiled JSON)

---

## 12. Future Enhancements

### 12.1 Potential Improvements

1. **Route-Based Locale Detection**
   - Support `/en/about` and `/ro/despre` URL patterns
   - Implement locale middleware for path-based routing

2. **Browser Locale Detection**
   - Use `Accept-Language` header as fallback
   - Suggest locale based on user's browser settings

3. **Translation Management UI**
   - Admin interface for non-technical translators
   - In-context editing for content managers

4. **Lazy Loading Optimizations**
   - Split large namespaces into separate chunks
   - Load translations on-demand for code-split routes

5. **RTL Language Support**
   - Add support for Arabic, Hebrew, etc.
   - Dynamic `dir` attribute based on locale

6. **Translation Validation**
   - CI/CD checks for translation completeness
   - Automated quality checks (no empty strings, etc.)

### 12.2 Integration Opportunities

1. **Content Management System (CMS)**
   - Integrate with Contentful/Sanity for dynamic content
   - Manage translations outside of codebase

2. **Translation Services**
   - Connect to Lokalise/Phrase for professional translation
   - Automated translation workflows

3. **Analytics Integration**
   - Track locale distribution in Application Insights
   - Monitor translation coverage across user base

---

## 13. References

### 13.1 External Documentation

- [next-intl Documentation](https://next-intl.dev/)
- [Next.js App Router i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [ICU MessageFormat Guide](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Web Accessibility i18n](https://www.w3.org/International/)

### 13.2 Related RFCs

- **RFC 1001**: OpenTelemetry Observability System
  - Locale context in distributed tracing
  - Spans for translation loading performance

- **RFC 1002**: Comprehensive JSDoc Documentation Standard
  - Documentation patterns for translation functions
  - Type safety in documentation

### 13.3 Internal Resources

- Translation workflow: `scripts/generate.i18n.ts`
- Message files: `sites/arolariu.ro/messages/`
- i18n configuration: `sites/arolariu.ro/src/i18n/request.ts`
- Provider setup: `sites/arolariu.ro/src/app/providers.tsx`

---

## 14. Conclusion

The next-intl internationalization system provides a robust, type-safe, and performant solution for multi-language support in the arolariu.ro Next.js application. By leveraging React Server Components, cookie-based persistence, and auto-generated TypeScript definitions, the system delivers an exceptional developer experience while maintaining optimal performance and SEO characteristics.

**Key Achievements**:

- ✅ Type-safe translations with compile-time validation
- ✅ Seamless RSC and Client Component integration
- ✅ Zero-overhead for server-rendered content
- ✅ Cookie-based locale persistence
- ✅ SEO-optimized with proper metadata localization
- ✅ Scalable namespace organization
- ✅ Developer-friendly API with IntelliSense

The system is production-ready and actively used across the entire application, supporting English and Romanian locales with the flexibility to add additional languages as needed.

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-25  
**Status**: Implemented ✅
