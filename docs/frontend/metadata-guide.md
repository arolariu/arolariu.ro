# Metadata and SEO Guide

## Quick Reference for RFC 1004: Metadata and SEO System

This guide provides practical examples for implementing metadata and SEO optimization in the arolariu.ro frontend.

## Quick Start

### 1. Static Metadata (Simple Pages)

For pages with unchanging metadata:

```typescript
import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about our platform and team",
};

export default function AboutPage() {
  return <div>About content...</div>;
}
```

### 2. Dynamic Metadata (Localized Pages)

For pages with translations or dynamic content:

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
  return <div>Page content...</div>;
}
```

## Common Patterns

### Page with Custom Open Graph Image

```typescript
import {createMetadata} from "@/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: "Special Feature",
    description: "Amazing new feature description",
    openGraph: {
      images: [
        {
          url: "https://arolariu.ro/images/feature-og.png",
          width: 1200,
          height: 630,
          alt: "Feature preview",
        },
      ],
    },
  });
}
```

### Dynamic Page (e.g., Blog Post)

```typescript
import {createMetadata} from "@/metadata";

type Props = {
  params: {slug: string};
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  
  return createMetadata({
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
      authors: [post.author.name],
      images: [{url: post.coverImage}],
    },
  });
}

export default async function BlogPost({params}: Props) {
  const post = await getPostBySlug(params.slug);
  return <article>{/* post content */}</article>;
}
```

### Localized Metadata with SEO

```typescript
import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invoices.__metadata__");
  const locale = await getLocale();
  
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    keywords: ["invoices", "receipts", "expense tracking"],
    openGraph: {
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
  });
}
```

## The `createMetadata` Helper

The `createMetadata` function merges your custom metadata with base configuration.

### Base Configuration

Defined in `src/metadata.ts`:

- Site name and URL
- Author information
- Default icons (favicons, Apple touch icons)
- Default Open Graph and Twitter settings
- Robots configuration
- PWA manifest

### Override Properties

```typescript
createMetadata({
  // Basic SEO
  title: "Page Title",              // Becomes "Page Title | arolariu.ro"
  description: "Page description",  // Meta description
  
  // Locale (for i18n)
  locale: "en",                     // Sets Open Graph locale to "en_US"
  
  // Open Graph (social sharing)
  openGraph: {
    type: "article",                // Override type
    images: [{url: "..."}],         // Custom images
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",    // Card type
  },
  
  // Advanced
  keywords: ["keyword1", "keyword2"],
  alternates: {
    canonical: "https://arolariu.ro/preferred-url",
  },
});
```

## SEO Best Practices

### Title Format

```typescript
// ✅ Good - Clear, under 60 characters
title: "Invoice Management System"

// ❌ Avoid - Too long, keyword stuffing
title: "Invoice Management System - Track Invoices, Receipts, Expenses, Bills"
```

**Rules**:

- 50-60 characters (including " | arolariu.ro")
- Front-load important keywords
- Clear and descriptive

### Description Format

```typescript
// ✅ Good - 120-160 characters, actionable
description: "Manage your invoices and track expenses with our powerful invoice management system. Upload, organize, and analyze your receipts."

// ❌ Avoid - Too short
description: "Invoice system"

// ❌ Avoid - Too long (truncated by search engines)
description: "This is a very long description that goes on and on and will be truncated by search engines because it exceeds the recommended 160 character limit for meta descriptions which means users won't see the full text in search results"
```

**Rules**:

- 120-160 characters
- Include primary keyword
- Actionable and compelling
- No duplicate content

### Open Graph Images

```typescript
// ✅ Optimal dimensions
openGraph: {
  images: [
    {
      url: "https://arolariu.ro/og-image.png",
      width: 1200,
      height: 630,  // 1.91:1 aspect ratio
      alt: "Descriptive alt text",
    },
  ],
}

// Image requirements:
// - Format: PNG or JPG
// - Size: 1200x630px (recommended)
// - Min: 200x200px
// - Max: 8MB
// - Absolute URL (not relative)
```

### Canonical URLs

```typescript
// Use for duplicate content
createMetadata({
  alternates: {
    canonical: "https://arolariu.ro/preferred-url",
  },
});

// Example: paginated content
// Page 2: canonical -> Page 1
// Page 3: canonical -> Page 1
```

## Translation Integration

### Add Metadata Translations

In `messages/en.json` and `messages/ro.json`:

```json
{
  "MyFeature": {
    "__metadata__": {
      "title": "My Feature",
      "description": "Detailed description of my feature for search engines"
    },
    "content": {
      "heading": "Welcome to My Feature"
    }
  }
}
```

### Use in Metadata

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyFeature.__metadata__");
  const locale = await getLocale();
  
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}
```

### Benefits

- SEO optimized for both English and Romanian
- Open Graph locale automatically set (`en_US` or `ro_RO`)
- Consistent translations across metadata and content

## Testing Your Metadata

### Browser DevTools

```typescript
// View metadata in Elements tab
<head>
  <title>Page Title | arolariu.ro</title>
  <meta name="description" content="..." />
  <meta property="og:title" content="..." />
</head>
```

### Social Media Preview Tools

- **Twitter**: <https://cards-dev.twitter.com/validator>
- **Facebook**: <https://developers.facebook.com/tools/debug/>
- **LinkedIn**: <https://www.linkedin.com/post-inspector/>

### SEO Tools

- **Google Search Console**: Monitor search performance
- **Lighthouse**: Run SEO audit in Chrome DevTools
- **Screaming Frog**: Crawl site for SEO issues

### Manual Checklist

- [ ] Title under 60 characters
- [ ] Description 120-160 characters
- [ ] Open Graph image 1200x630px
- [ ] All metadata localized (en + ro)
- [ ] No duplicate content (use canonical)
- [ ] Images have absolute URLs
- [ ] Alt text for all images

## Common Issues

### Issue: Metadata Not Showing on Social Media

**Check**:

1. Open Graph image is publicly accessible
2. URL is absolute, not relative
3. Image size is within limits (< 8MB)
4. Clear social media cache (use debug tools)

### Issue: Wrong Language in Search Results

**Solution**:

```typescript
// Always include locale
const locale = await getLocale();
return createMetadata({
  locale,  // ← Don't forget this!
  title: t("title"),
  description: t("description"),
});
```

### Issue: Title Shows "Unknown page"

**Root Cause**: No metadata exported from page

**Solution**:

```typescript
// Add metadata export
export const metadata: Metadata = {
  title: "Page Title",
  description: "Page description",
};
```

### Issue: Description Truncated in Search

**Solution**: Keep under 160 characters

```typescript
// Check length
const description = t("description");
if (description.length > 160) {
  console.warn("Description too long:", description.length);
}
```

## Advanced Patterns

### Conditional Metadata

```typescript
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const user = await getCurrentUser();
  const invoice = await getInvoice(params.id);
  
  // Private invoice - don't index
  if (invoice.isPrivate) {
    return createMetadata({
      title: "Private Invoice",
      robots: {
        index: false,
        follow: false,
      },
    });
  }
  
  // Public invoice - full metadata
  return createMetadata({
    title: `Invoice ${invoice.number}`,
    description: `Invoice from ${invoice.merchant} - ${invoice.total}`,
  });
}
```

### Paginated Content

```typescript
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const page = parseInt(params.page);
  
  return createMetadata({
    title: `Invoices - Page ${page}`,
    description: "Browse all your invoices",
    alternates: {
      canonical: "https://arolariu.ro/invoices",  // Point to page 1
    },
  });
}
```

## Quick Reference

| Metadata Type | When to Use | Example |
|---------------|-------------|---------|
| Static | Unchanging pages | About, Contact |
| Dynamic | Localized pages | Dashboard, Features |
| Dynamic with params | Content-specific | Blog posts, Invoices |
| Conditional | Private/public content | User profiles, Documents |

## File Locations

- **Base Config**: `sites/arolariu.ro/src/metadata.ts`
- **Helper Function**: `createMetadata()` in `src/metadata.ts`
- **Translations**: `sites/arolariu.ro/messages/en.json` (use `__metadata__` namespace)
- **Manifest**: `sites/arolariu.ro/src/app/manifest.json`
- **Robots**: `sites/arolariu.ro/src/app/robots.txt`
- **Sitemap**: `sites/arolariu.ro/src/app/sitemap.xml`

## Additional Resources

- **RFC 1004**: Complete metadata system documentation
- **Next.js Metadata API**: <https://nextjs.org/docs/app/building-your-application/optimizing/metadata>
- **Open Graph Protocol**: <https://ogp.me/>
- **Google SEO Guide**: <https://developers.google.com/search/docs>
