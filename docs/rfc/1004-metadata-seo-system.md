# RFC 1004: Metadata and SEO System

**Status**: Implemented

**Date**: 2025-10-25

**Authors**: Alexandru-Razvan Olariu

**Related RFCs**: RFC 1003 (next-intl Internationalization System)

## Abstract

This RFC documents the comprehensive metadata and Search Engine Optimization (SEO) system implemented for the arolariu.ro Next.js website. The system provides centralized metadata management, multi-language SEO support, structured data optimization, and performance-focused configurations. It integrates deeply with Next.js 16's App Router metadata API, the next-intl internationalization system, and modern web standards to ensure optimal search engine visibility, social media sharing, and user experience.

## Motivation

Modern web applications require sophisticated metadata management to achieve optimal search engine rankings, social media engagement, and user experience. The arolariu.ro platform faces several specific challenges:

1. **Multi-language SEO**: Supporting English and Romanian content requires locale-aware metadata generation
2. **Consistent Branding**: Maintaining consistent titles, descriptions, and Open Graph data across 20+ routes
3. **Type Safety**: Preventing metadata errors through compile-time validation
4. **Performance**: Minimizing metadata computation overhead in Server Components
5. **Maintainability**: Centralizing metadata logic to avoid duplication across routes
6. **Social Sharing**: Optimizing content appearance on Twitter, LinkedIn, Facebook, and other platforms
7. **Mobile Experience**: Ensuring proper Progressive Web App (PWA) behavior and mobile metadata
8. **Search Visibility**: Implementing sitemap, robots.txt, and structured data for crawlers

### Goals

- **Centralized Metadata**: Single source of truth for all metadata configuration
- **Type-Safe API**: TypeScript-first metadata generation with compile-time validation
- **I18n Integration**: Seamless integration with next-intl for localized SEO content
- **Performance**: Zero runtime overhead for static metadata
- **Accessibility**: Proper semantic HTML and ARIA attributes throughout
- **SEO Best Practices**: Canonical URLs, proper redirects, sitemap generation, robots.txt
- **Social Optimization**: Rich previews on all major social platforms
- **PWA Support**: Full Progressive Web App metadata with manifest and icons

## Design Overview

### Architecture

The metadata system follows a **layered architecture** with clear separation of concerns:

```text
┌─────────────────────────────────────────────────────────┐
│                   Route-Level Metadata                   │
│              (generateMetadata functions)                │
├─────────────────────────────────────────────────────────┤
│                  createMetadata Helper                   │
│          (Type-safe metadata composition API)            │
├─────────────────────────────────────────────────────────┤
│              Base Metadata Configuration                 │
│       (src/metadata.ts - global defaults)                │
├─────────────────────────────────────────────────────────┤
│                  I18n Integration Layer                  │
│        (next-intl __metadata__ namespaces)               │
├─────────────────────────────────────────────────────────┤
│                Next.js Metadata API                      │
│           (App Router metadata system)                   │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. Base Metadata Configuration (`src/metadata.ts`)

The foundation of the metadata system - provides global defaults and helper functions:

```typescript
import type {Metadata} from "next";
import type {AlternateURLs} from "next/dist/lib/metadata/types/alternative-urls-types";
import type {AppleWebApp} from "next/dist/lib/metadata/types/extra-types";
import type {Author, Icon, Robots, TemplateString} from "next/dist/lib/metadata/types/metadata-types";
import type {OpenGraph} from "next/dist/lib/metadata/types/opengraph-types";
import type {Twitter} from "next/dist/lib/metadata/types/twitter-types";
import {SITE_URL} from "./lib/utils.generic";

const options = {
  siteName: "arolariu.ro",
  siteUrl: new URL(SITE_URL),
  author: "Alexandru-Razvan Olariu",
  description: "Welcome to `arolariu.ro` - the personal website...",
} as const;

export const metadata: Metadata = {
  metadataBase: options.siteUrl,
  title: {
    absolute: `${options.siteName} | ${options.author}`,
    default: `${options.siteName} | Unknown page`,
    template: `%s | ${options.siteName}`,
  } satisfies TemplateString,
  description: options.description,
  // ... complete configuration
};
```

**Key Features**:

- **Type-Safe Constants**: Using `as const` for immutable configuration
- **Metadata Base URL**: Centralized base URL for all relative paths
- **Template String**: Consistent title formatting across all pages
- **Comprehensive Defaults**: Full metadata coverage for fallback scenarios

#### 2. Icon Configuration

Multi-resolution icon support for all platforms:

```typescript
const normalIcons: Icon[] = [
  {rel: "icon", type: "image/png", sizes: "16x16", url: `${SITE_URL}/manifest/favicon-16x16.png`},
  {rel: "icon", type: "image/png", sizes: "32x32", url: `${SITE_URL}/manifest/favicon-32x32.png`},
] as const;

const appleTouchIcons: Icon[] = [
  {rel: "apple-touch-icon", type: "image/png", sizes: "57x57", url: `${SITE_URL}/manifest/apple-touch-icon-57x57.png`},
  {rel: "apple-touch-icon", type: "image/png", sizes: "60x60", url: `${SITE_URL}/manifest/apple-touch-icon-60x60.png`},
  // ... 9 different Apple touch icon sizes
] as const;

export const metadata: Metadata = {
  // ...
  icons: [...normalIcons, ...appleTouchIcons] satisfies Icon[],
};
```

**Icon Coverage**:

- Standard favicons (16x16, 32x32)
- Apple touch icons (57x57 to 180x180 - 9 sizes)
- Android Chrome icons (via manifest.json)
- Progressive Web App icons (72x72 to 512x512)

#### 3. Social Media Metadata

**Open Graph Configuration** (Facebook, LinkedIn, etc.):

```typescript
openGraph: {
  type: "website",
  url: options.siteUrl,
  countryName: "Romania",
  description: options.description,
  siteName: options.siteName,
  locale: "en",
  title: `${options.siteName} | ${options.author}`,
  alternateLocale: "ro_RO",
} satisfies OpenGraph,
```

**Twitter Card Configuration**:

```typescript
twitter: {
  creator: options.author,
  title: `${options.siteName} | ${options.author}`,
  description: options.description,
  card: "summary",
} satisfies Twitter,
```

**Social Features**:

- Rich previews on Twitter, Facebook, LinkedIn
- Locale-aware Open Graph tags
- Author attribution
- Consistent branding across platforms

#### 4. Mobile & PWA Metadata

**Apple Web App Configuration**:

```typescript
appleWebApp: {
  capable: true,
  statusBarStyle: "black-translucent",
  title: options.siteName,
} satisfies AppleWebApp,
```

**Progressive Web App Support**:

```typescript
manifest: "/manifest.json",
```

The `manifest.json` file provides:

```json
{
  "$schema": "https://json.schemastore.org/web-manifest",
  "background_color": "#000000",
  "categories": ["education", "productivity", "utilities"],
  "description": "The `arolariu.ro` platform...",
  "dir": "ltr",
  "display": "standalone",
  "icons": [
    {"sizes": "72x72", "src": "manifest/android-chrome-72x72.png", "type": "image/png"},
    {"sizes": "512x512", "src": "manifest/android-chrome-512x512.png", "type": "image/png"}
  ],
  "shortcuts": [
    {
      "name": "Invoices",
      "short_name": "Invoices",
      "description": "View and manage your invoices",
      "url": "/domains/invoices",
      "icons": [{"src": "manifest/android-chrome-192x192.png", "sizes": "192x192"}]
    }
  ],
  "name": "arolariu.ro",
  "short_name": "arolariu.ro",
  "start_url": "/",
  "theme_color": "#000000"
}
```

#### 5. SEO & Crawler Configuration

**Robots Configuration**:

```typescript
robots: {
  follow: true,
  index: true,
  "max-image-preview": "large",
  "max-snippet": -1,
  "max-video-preview": -1,
  googleBot: "index, follow",
} satisfies Robots,
```

**Canonical URLs**:

```typescript
alternates: {
  canonical: options.siteUrl,
} satisfies AlternateURLs,
```

**Additional SEO Properties**:

```typescript
classification: "Personal",
applicationName: options.siteName,
authors: {name: options.author, url: options.siteUrl} satisfies Author,
category: "Technology",
creator: options.author,
keywords: ["arolariu", options.siteName, options.author, "Technology"],
```

#### 6. The `createMetadata` Helper Function

Type-safe API for route-specific metadata:

```typescript
type PartialMetadata = Readonly<
  Partial<
    Omit<Metadata, "openGraph" | "twitter"> & {
      openGraph?: Partial<Omit<OpenGraph, "title" | "description">>;
      twitter?: Partial<Omit<Twitter, "title" | "description">>;
      locale?: string;
    }
  >
>;

export const createMetadata = (partialMetadata: PartialMetadata): Readonly<Metadata> => {
  const {title, description, openGraph, twitter, locale, ...rest} = partialMetadata;

  const LOCALE_ALTERNATES: ReadonlyMap<string, string> = new Map<string, string>([
    ["en", "en_US"],
    ["ro", "ro_RO"],
  ]);

  return {
    ...metadata, // Base metadata
    ...rest, // Custom properties
    ...(title && {title}), // Override title if provided
    ...(description && {description}), // Override description if provided
    openGraph: {
      ...metadata.openGraph,
      ...openGraph,
      ...(title && {title}),
      ...(description && {description}),
      ...(locale && {locale, alternateLocale: LOCALE_ALTERNATES.get(locale) ?? "en_US"}),
    },
    twitter: {
      ...metadata.twitter,
      ...twitter,
      ...(title && {title}),
      ...(description && {description}),
    },
  } satisfies Metadata;
};
```

**Key Features**:

- **Type Safety**: TypeScript enforces valid metadata structure
- **Immutability**: All objects are `Readonly` to prevent mutations
- **Composition**: Merges base metadata with route-specific overrides
- **Automatic Propagation**: Title/description automatically update Open Graph and Twitter metadata
- **Locale Mapping**: Converts simple locale codes to Open Graph format

### Route-Level Metadata Generation

#### Pattern 1: Static Metadata Export

For routes with static metadata (no dynamic data):

```typescript
// src/app/domains/invoices/page.tsx
import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage your invoices and receipts",
};
```

#### Pattern 2: Dynamic Metadata with `generateMetadata`

For routes requiring dynamic or localized metadata:

```typescript
// src/app/domains/page.tsx
import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";

/**
 * Generates metadata for the domains homepage.
 * @returns The metadata for the domains homepage.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Domains.__metadata__");
  const locale = await getLocale();
  
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}
```

#### Pattern 3: Root Layout Metadata

The root layout (`app/layout.tsx`) exports base metadata:

```typescript
// src/app/layout.tsx
export {metadata} from "@/metadata";
```

This establishes global defaults for all routes.

### I18n Integration for SEO

The metadata system integrates with next-intl through the `__metadata__` namespace convention:

#### Translation Structure

```json
{
  "Domains": {
    "__metadata__": {
      "title": "Domains",
      "description": "Explore the different domains and services available"
    },
    "About": {
      "__metadata__": {
        "title": "About Domains",
        "description": "Learn more about our domain services"
      }
    }
  }
}
```

#### Benefits of `__metadata__` Convention

1. **Clear Separation**: Metadata keys are visually distinct from UI translations
2. **Consistency**: All routes follow the same pattern
3. **Type Safety**: TypeScript types generated for all metadata keys
4. **Centralization**: All SEO content lives in translation files
5. **Maintainability**: Easy to update metadata without touching component code

#### Locale-Aware Open Graph Tags

The `createMetadata` helper automatically updates Open Graph locale:

```typescript
const metadata = createMetadata({
  locale: "ro", // Input: simple locale code
  title: t("title"),
  description: t("description"),
});

// Output includes:
// openGraph.locale = "ro_RO"
// openGraph.alternateLocale = "en_US"
```

## Sitemap Configuration

The website uses a static XML sitemap for crawler guidance:

```xml
<!-- src/app/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://arolariu.ro/</loc>
    <lastmod>2025-05-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://arolariu.ro/about</loc>
    <lastmod>2025-05-16</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  <!-- Additional routes... -->
</urlset>
```

**Sitemap Features**:

- **Priority Hierarchy**: Homepage (1.0), Domains (0.6), Static Pages (0.4)
- **Change Frequency**: Weekly for homepage, monthly for domains, yearly for static content
- **Last Modified Dates**: Manual timestamps for cache control
- **Comprehensive Coverage**: All public routes included

**Referenced in robots.txt**:

```text
User-Agent: *
Allow: /
Disallow: /private/

Sitemap: https://arolariu.ro/sitemap.xml
```

## Robots.txt Configuration

Crawler control and sitemap registration:

```text
User-Agent: *
Allow: /
Disallow: /private/

Sitemap: https://arolariu.ro/sitemap.xml
```

**Configuration Strategy**:

- **Allow All**: Default policy allows all crawlers
- **Private Routes**: Explicit disallow for `/private/` paths
- **Sitemap Reference**: Direct crawlers to sitemap location

## Security Headers for SEO

The `next.config.ts` includes security headers that impact SEO:

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {key: "X-DNS-Prefetch-Control", value: "on"},
        {key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload"},
        {key: "X-Content-Type-Options", value: "nosniff"},
        {key: "X-Frame-Options", value: "DENY"},
        {key: "Permissions-Policy", value: "camera=(), geolocation=()"},
        {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
        {key: "Access-Control-Allow-Origin", value: "https://cdn.arolariu.ro"},
      ],
    },
  ];
}
```

**SEO Impact**:

- **HTTPS Enforcement**: HSTS ensures secure connections (search engines prefer HTTPS)
- **DNS Prefetching**: Improves perceived performance
- **Referrer Policy**: Controls referrer information for analytics
- **CORS Headers**: Allows CDN asset loading without impacting SEO

## Performance Optimizations

### 1. Static Metadata Export

Routes with static metadata use direct exports:

```typescript
export const metadata: Metadata = {
  title: "Static Page",
  description: "This metadata is computed at build time",
};
```

**Performance Benefits**:

- Zero runtime computation
- Metadata available immediately during SSR
- No async operations required

### 2. Memoized Metadata Generation

For dynamic metadata, Next.js automatically caches `generateMetadata` results:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  // This function is called once per unique route/params combination
  // Results are cached for subsequent requests
  const t = await getTranslations("Namespace.__metadata__");
  return createMetadata({title: t("title"), description: t("description")});
}
```

### 3. CDN Configuration for Assets

Icons and manifest files are served from CDN when enabled:

```typescript
// next.config.ts
const isCdnEnabled = process.env["USE_CDN"] === "true";

const nextConfig: NextConfig = {
  assetPrefix: isCdnEnabled ? "https://cdn.arolariu.ro" : undefined,
  // ...
};
```

**SEO Benefits**:

- Faster asset loading improves Core Web Vitals
- Better Lighthouse scores
- Improved perceived performance

### 4. Image Optimization

The metadata system works with Next.js Image Optimization:

```typescript
images: {
  qualities: [50, 75, 100],
  remotePatterns: [
    new URL("https://cdn.arolariu.ro"),
    new URL("https://arolariustorage.blob.core.windows.net"),
    // ... additional patterns
  ],
},
```

**Impact on SEO**:

- Properly sized images reduce LCP (Largest Contentful Paint)
- `srcset` generation improves mobile experience
- Lazy loading reduces initial page weight

## Type Safety & Developer Experience

### 1. Compile-Time Validation

TypeScript ensures metadata correctness:

```typescript
// ✅ Valid - TypeScript enforces correct structure
export const metadata: Metadata = {
  title: "Page Title",
  description: "Page description",
  openGraph: {
    title: "OG Title",
    type: "website", // Type-checked against valid values
  },
};

// ❌ Compile error - invalid type
export const metadata: Metadata = {
  openGraph: {
    type: "invalid-type", // Error: Type '"invalid-type"' is not assignable
  },
};
```

### 2. Type-Safe Helper API

The `createMetadata` function provides IDE autocomplete:

```typescript
createMetadata({
  title: "...", // ✅ string
  locale: "en", // ✅ string
  openGraph: {
    images: ["..."], // ✅ string[] or ImageObject[]
  },
  invalidKey: "...", // ❌ Compile error: unknown property
});
```

### 3. Translation Key Validation

Generated TypeScript types from `messages/en.json`:

```typescript
// Auto-generated: messages/en.d.json.ts
export interface Messages {
  Domains: {
    __metadata__: {
      title: string;
      description: string;
    };
  };
}

// Usage - TypeScript validates keys
const t = await getTranslations("Domains.__metadata__");
t("title"); // ✅ Valid
t("invalid"); // ❌ Compile error: Argument of type '"invalid"' is not assignable
```

## Testing Strategy

### 1. Metadata Validation Tests

Example test structure:

```typescript
import {metadata, createMetadata} from "@/metadata";

describe("Metadata System", () => {
  it("should have valid base metadata", () => {
    expect(metadata.title).toBeDefined();
    expect(metadata.description).toBeDefined();
    expect(metadata.openGraph?.siteName).toBe("arolariu.ro");
  });

  it("should merge partial metadata correctly", () => {
    const result = createMetadata({
      title: "Custom Title",
      description: "Custom Description",
    });

    expect(result.title).toBe("Custom Title");
    expect(result.openGraph?.title).toBe("Custom Title");
    expect(result.twitter?.title).toBe("Custom Title");
  });

  it("should handle locale mapping", () => {
    const result = createMetadata({locale: "ro"});
    expect(result.openGraph?.locale).toBe("ro_RO");
    expect(result.openGraph?.alternateLocale).toBe("en_US");
  });
});
```

### 2. SEO Audit Tools

Recommended tools for validation:

- **Lighthouse**: Automated SEO audits in Chrome DevTools
- **Google Search Console**: Monitor search performance
- **Screaming Frog**: Comprehensive site crawls
- **Twitter Card Validator**: Preview Twitter cards
- **Facebook Sharing Debugger**: Preview Open Graph data
- **LinkedIn Post Inspector**: Preview LinkedIn shares

### 3. Manual Testing Checklist

- [ ] Verify page titles in browser tab
- [ ] Check Open Graph preview on Facebook
- [ ] Test Twitter card appearance
- [ ] Validate structured data with Google Rich Results Test
- [ ] Confirm robots.txt accessibility
- [ ] Verify sitemap.xml format
- [ ] Test mobile PWA installation
- [ ] Check canonical URLs in source
- [ ] Validate all icon resolutions load

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Metadata Not Updating

**Symptoms**: Changes to `metadata.ts` not reflected in browser

**Solution**:

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

**Root Cause**: Next.js aggressively caches metadata during development

#### Issue 2: Open Graph Images Not Showing

**Symptoms**: Social platforms show broken image previews

**Checklist**:

1. Verify image URL is absolute (not relative)
2. Check image is accessible publicly (not behind auth)
3. Validate image dimensions (minimum 200x200px, recommended 1200x630px)
4. Confirm CDN CORS headers allow social platform access

**Solution**:

```typescript
openGraph: {
  images: [
    {
      url: "https://arolariu.ro/og-image.png", // ✅ Absolute URL
      width: 1200,
      height: 630,
      alt: "Description",
    },
  ],
},
```

#### Issue 3: Translation Keys Not Found

**Symptoms**: `generateMetadata` throws error for missing translation key

**Solution**:

1. Verify `__metadata__` namespace exists in both `en.json` and `ro.json`
2. Run `npm run generate:i18n` to regenerate TypeScript types
3. Check translation key spelling matches exactly

**Example Fix**:

```json
{
  "PageName": {
    "__metadata__": {
      "title": "Page Title",
      "description": "Page Description"
    }
  }
}
```

#### Issue 4: Lighthouse SEO Score Low

**Common Causes**:

1. Missing meta description → Add `description` to metadata
2. Document doesn't have `<title>` → Ensure `title` is exported
3. Links are not crawlable → Use `<Link>` component, not client-side navigation only
4. Images missing `alt` attributes → Add alt text to all `<Image>` components
5. Font size too small → Ensure minimum 12px font size on mobile

#### Issue 5: PWA Not Installing on Mobile

**Checklist**:

- [ ] `manifest.json` is accessible at `/manifest.json`
- [ ] Manifest includes required fields (name, short_name, start_url, icons)
- [ ] At least one icon is 192x192px or larger
- [ ] Site is served over HTTPS
- [ ] Service Worker is registered (if applicable)

## Best Practices

### 1. Metadata Consistency

**DO**:

```typescript
// ✅ Use createMetadata for consistency
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Page.__metadata__");
  return createMetadata({
    title: t("title"),
    description: t("description"),
  });
}
```

**DON'T**:

```typescript
// ❌ Manually construct metadata (loses base config)
export const metadata: Metadata = {
  title: "Page Title",
  // Missing: openGraph, twitter, robots, etc.
};
```

### 2. Localized Metadata

**DO**:

```typescript
// ✅ Always include locale for multi-language sites
const locale = await getLocale();
return createMetadata({
  locale,
  title: t("title"),
  description: t("description"),
});
```

**DON'T**:

```typescript
// ❌ Hardcode English locale
return createMetadata({
  locale: "en", // Wrong for Romanian users
  title: "English Title",
});
```

### 3. Title Templates

**DO**:

```typescript
// ✅ Use title templates for consistency
// Base config already has: template: "%s | arolariu.ro"
return createMetadata({
  title: "About", // Renders as "About | arolariu.ro"
});
```

**DON'T**:

```typescript
// ❌ Include site name manually
return createMetadata({
  title: "About | arolariu.ro", // Renders as "About | arolariu.ro | arolariu.ro"
});
```

### 4. Description Length

**Guidelines**:

- **Minimum**: 50 characters
- **Optimal**: 120-160 characters
- **Maximum**: 320 characters (truncated by search engines)

**Example**:

```typescript
// ✅ Optimal length (142 characters)
description: "Explore the different domain services available on arolariu.ro, including invoice management, personal portfolio, and documentation."

// ❌ Too short (23 characters)
description: "Domain services page"

// ❌ Too long (350+ characters)
description: "This is an extremely long description that will be truncated by search engines..."
```

### 5. Keywords

**Modern Approach** (No `keywords` meta tag):

```typescript
// ✅ Keywords embedded in content naturally
return createMetadata({
  title: "Invoice Management System",
  description: "Manage invoices, receipts, and expenses with our invoice tracking system",
});
```

**Legacy Approach** (Deprecated):

```typescript
// ❌ Meta keywords tag is ignored by Google
keywords: ["invoice", "management", "system"], // Not used
```

### 6. Canonical URLs

**DO**:

```typescript
// ✅ Set canonical for duplicate content
return createMetadata({
  alternates: {
    canonical: "https://arolariu.ro/preferred-url",
  },
});
```

**DON'T**:

```typescript
// ❌ Forget canonical for paginated content
// This causes duplicate content issues
```

## Performance Metrics

### Target Lighthouse Scores

- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 100
- **PWA**: 100 (if PWA criteria met)

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Metadata Impact on Performance

- **Static Metadata**: ~0ms overhead (build-time computation)
- **Dynamic Metadata**: ~5-10ms overhead (translation lookup + merge)
- **Icon Resolution**: Minimal (cached by browser after first load)

## Future Enhancements

### 1. Dynamic Sitemap Generation

**Current State**: Static XML file manually maintained

**Proposed Enhancement**: Generate sitemap dynamically from route structure

```typescript
// app/sitemap.ts (proposed)
import {MetadataRoute} from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getRoutes(); // Fetch all routes
  return routes.map((route) => ({
    url: `https://arolariu.ro${route.path}`,
    lastModified: route.updatedAt,
    changeFrequency: route.changeFreq,
    priority: route.priority,
  }));
}
```

**Benefits**:

- Automatically includes new routes
- Dynamic last-modified dates
- Reduces maintenance overhead

### 2. Structured Data (JSON-LD)

**Proposed Enhancement**: Add Schema.org structured data

```typescript
// Proposed: src/lib/structuredData.ts
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Alexandru-Razvan Olariu",
    url: "https://arolariu.ro",
    sameAs: [
      "https://github.com/arolariu",
      "https://linkedin.com/in/arolariu",
    ],
  };
}
```

**Usage in Layout**:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{__html: JSON.stringify(generateOrganizationSchema())}}
/>
```

**Benefits**:

- Rich snippets in search results
- Knowledge Graph integration
- Better social media previews

### 3. Dynamic Open Graph Images

**Current State**: Static images for all pages

**Proposed Enhancement**: Generate OG images dynamically per route

```typescript
// app/domains/[slug]/opengraph-image.tsx (proposed)
import {ImageResponse} from "next/og";

export default async function Image({params}: {params: {slug: string}}) {
  return new ImageResponse(
    (
      <div style={{...styles}}>
        <h1>{params.slug}</h1>
      </div>
    ),
    {width: 1200, height: 630}
  );
}
```

**Benefits**:

- Unique preview for each page
- Automatic title rendering
- Better social media engagement

### 4. Metadata Analytics

**Proposed Enhancement**: Track metadata performance

```typescript
// Proposed: Track which metadata drives engagement
export function trackMetadataPerformance(page: string, source: string) {
  // Track:
  // - Click-through rate from search results
  // - Social media share engagement
  // - Metadata-specific conversions
}
```

### 5. A/B Testing for Metadata

**Proposed Enhancement**: Test different titles/descriptions

```typescript
// Proposed: Experiment with metadata variations
export async function generateMetadata(): Promise<Metadata> {
  const variant = await getMetadataVariant(userId);
  
  return createMetadata({
    title: variant.title, // A/B test different titles
    description: variant.description,
  });
}
```

## Related Documentation

### Internal References

- **RFC 1003**: next-intl Internationalization System (i18n integration)
- **RFC 1001**: OpenTelemetry Observability System (performance monitoring)
- **Frontend Instructions**: `.github/instructions/frontend.instructions.md`
- **Main Copilot Instructions**: `.github/copilot-instructions.md`

### External References

- [Next.js Metadata API Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org Structured Data](https://schema.org/)
- [Web Manifest Specification](https://www.w3.org/TR/appmanifest/)
- [Google Search Central SEO Guide](https://developers.google.com/search/docs)

## Conclusion

The metadata and SEO system for arolariu.ro provides a robust, type-safe, and maintainable foundation for search engine optimization and social media integration. By centralizing metadata configuration, integrating deeply with the i18n system, and following modern web standards, the system ensures consistent branding, optimal search visibility, and excellent user experience across all platforms.

The architecture's emphasis on type safety, performance, and developer experience makes it straightforward to maintain and extend as the platform evolves. The comprehensive testing strategy and troubleshooting guide ensure long-term reliability and ease of debugging.

Future enhancements will further automate metadata generation, add structured data support, and enable metadata experimentation through A/B testing, continuing to improve the platform's search engine performance and user engagement.
