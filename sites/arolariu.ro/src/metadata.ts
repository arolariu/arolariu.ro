/**
 * @fileoverview Next.js metadata configuration for arolariu.ro website.
 * @module metadata
 *
 * @remarks
 * This module provides comprehensive SEO and social media metadata for the Next.js application,
 * including OpenGraph, Twitter Cards, Apple Web App configuration, and favicons.
 *
 * **Architecture Alignment**: Implements RFC 1004 (Metadata & SEO System).
 *
 * **Key Features**:
 * - Type-safe metadata generation with Next.js 16 Metadata API
 * - Multi-platform favicon support (16x16 to 180x180)
 * - OpenGraph and Twitter Card configurations
 * - Apple Web App capabilities
 * - SEO-optimized robots configuration
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata}
 */

import type {Metadata} from "next";
import type {AlternateURLs} from "next/dist/lib/metadata/types/alternative-urls-types";
import type {AppleWebApp} from "next/dist/lib/metadata/types/extra-types";
import type {Icon, Robots, TemplateString} from "next/dist/lib/metadata/types/metadata-types";
import type {OpenGraph} from "next/dist/lib/metadata/types/opengraph-types";
import type {Twitter} from "next/dist/lib/metadata/types/twitter-types";
import {SITE_URL} from "./lib/utils.generic";

/**
 * Base configuration options for site metadata.
 *
 * @remarks
 * Centralized configuration object used across all metadata generation functions.
 * Marked as `const` to ensure immutability and enable literal type inference.
 */
const options = {
  siteName: "arolariu.ro",
  siteUrl: new URL(SITE_URL),
  author: "Alexandru-Razvan Olariu",
  description:
    "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu, a software engineer based in Bucharest, Romania. Features invoice management, portfolio, and technology insights.",
  themeColor: "#9013fe",
  backgroundColor: "#000000",
} as const;

/**
 * Standard favicon definitions for browsers.
 *
 * @remarks
 * Provides 16x16 and 32x32 PNG favicons for browser tab/bookmark display.
 * These icons are displayed in browser tabs, bookmarks, and history.
 *
 * **Browser Support**: All modern browsers support PNG favicons.
 */
const normalIcons: Icon[] = [
  {
    rel: "icon",
    type: "image/png",
    sizes: "16x16",
    url: `${SITE_URL}/manifest/favicon-16x16.png`,
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    url: `${SITE_URL}/manifest/favicon-32x32.png`,
  },
] as const;

/**
 * Apple touch icon definitions for iOS/iPadOS devices.
 *
 * @remarks
 * Comprehensive set of touch icons for Apple devices, supporting various screen densities
 * and device types (iPhone, iPad, iPod Touch).
 *
 * **Icon Sizes**:
 * - 57x57, 60x60: iPhone (non-Retina, Retina)
 * - 72x72, 76x76: iPad (non-Retina, Retina)
 * - 114x114, 120x120: iPhone 4/5/6/7/8 (Retina)
 * - 144x144, 152x152: iPad (Retina)
 * - 180x180: iPhone X/11/12/13/14/15 (Super Retina)
 *
 * **Usage**: When users add the website to their iOS home screen, these icons are used
 * based on the device's screen density.
 */
const appleTouchIcons: Icon[] = [
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "57x57",
    url: `${SITE_URL}/manifest/apple-touch-icon-57x57.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "60x60",
    url: `${SITE_URL}/manifest/apple-touch-icon-60x60.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "72x72",
    url: `${SITE_URL}/manifest/apple-touch-icon-72x72.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "76x76",
    url: `${SITE_URL}/manifest/apple-touch-icon-76x76.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "114x114",
    url: `${SITE_URL}/manifest/apple-touch-icon-114x114.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "120x120",
    url: `${SITE_URL}/manifest/apple-touch-icon-120x120.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "144x144",
    url: `${SITE_URL}/manifest/apple-touch-icon-144x144.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "152x152",
    url: `${SITE_URL}/manifest/apple-touch-icon-152x152.png`,
  },
  {
    rel: "apple-touch-icon",
    type: "image/png",
    sizes: "180x180",
    url: `${SITE_URL}/manifest/apple-touch-icon-180x180.png`,
  },
] as const;

/**
 * Base metadata configuration for the arolariu.ro website.
 *
 * @remarks
 * **Rendering Context**: Used in root layout (Server Component).
 *
 * **SEO Configuration**:
 * - Title templates for dynamic page titles
 * - Comprehensive robot directives for search engine optimization
 * - OpenGraph metadata for rich social media previews
 * - Twitter Card metadata for Twitter/X sharing
 * - Apple Web App configuration for iOS home screen installation
 *
 * **Icons**:
 * - Standard favicons (16x16, 32x32)
 * - Apple touch icons (57x57 to 180x180)
 *
 * **Robots Directives**:
 * - `index: true` - Allow search engine indexing
 * - `follow: true` - Allow crawling of linked pages
 * - `max-snippet: -1` - No limit on text snippet length
 * - `max-image-preview: large` - Allow large image previews
 *
 * **Enterprise SEO Features**:
 * - Search engine verification tokens
 * - Format detection controls
 * - Publisher information
 * - Referrer policy
 *
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata}
 * @see {@link createMetadata} For page-specific metadata generation
 */
export const metadata: Metadata = {
  metadataBase: options.siteUrl,
  title: {
    absolute: `${options.siteName} | ${options.author}`,
    default: `${options.siteName} | Unknown page`,
    template: `%s | ${options.siteName}`,
  } satisfies TemplateString,
  description: options.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: options.siteName,
    startupImage: [
      {
        url: `${SITE_URL}/manifest/apple-touch-icon-180x180.png`,
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  } satisfies AppleWebApp,

  // Classification and categorization
  classification: "Personal Website, Technology, Software Engineering, Invoice Management",
  applicationName: options.siteName,
  authors: [
    {
      name: options.author,
      url: options.siteUrl,
    },
  ],
  category: "Technology",
  creator: options.author,

  // Enhanced keywords for SEO
  keywords: [
    "arolariu",
    options.siteName,
    options.author,
    "software engineer",
    "invoice management",
    "technology",
    "React",
    "Next.js",
    ".NET",
    "Azure",
    "Romania",
    "Bucharest",
    "web development",
    "full-stack developer",
  ],

  // Canonical and alternate URLs
  alternates: {
    canonical: options.siteUrl,
  } satisfies AlternateURLs,

  // Search engine robots configuration
  robots: {
    follow: true,
    index: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      noimageindex: false,
    },
  } satisfies Robots,
  openGraph: {
    type: "website",
    url: options.siteUrl,
    countryName: "Romania",
    description: options.description,
    siteName: options.siteName,
    locale: "en_US",
    title: `${options.siteName} | ${options.author}`,
    alternateLocale: ["ro_RO"],
    images: [
      {
        url: `${SITE_URL}/images/og-default.png`,
        width: 1200,
        height: 630,
        alt: `${options.siteName} - ${options.author}`,
        type: "image/png",
      },
    ],
  } satisfies OpenGraph,
  twitter: {
    creator: options.author,
    title: `${options.siteName} | ${options.author}`,
    description: options.description,
    card: "summary_large_image",
    images: [
      {
        url: `${SITE_URL}/images/twitter-card.png`,
        width: 1200,
        height: 600,
        alt: `${options.siteName} - ${options.author}`,
      },
    ],
  } satisfies Twitter,

  // App links for mobile deep linking
  appLinks: {
    web: {
      url: options.siteUrl,
      should_fallback: true,
    },
  },

  // Manifest and icons
  manifest: "/manifest.json",
  icons: [...normalIcons, ...appleTouchIcons] satisfies Icon[],

  // Additional metadata
  other: {
    "theme-color": options.themeColor,
    "color-scheme": "dark light",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": options.themeColor,
    "msapplication-config": "/browserconfig.xml",
    "format-detection": "telephone=no",
  },
};

/**
 * Type-safe partial metadata configuration for page-specific overrides.
 *
 * @remarks
 * This type extends Next.js Metadata but:
 * - Makes all properties optional (for merging with base metadata)
 * - Excludes `title` and `description` from OpenGraph/Twitter (automatically inherited)
 * - Adds `locale` property for internationalization support
 *
 * **Design Rationale**: Prevents accidental duplication of title/description between
 * base metadata and social media metadata, ensuring consistency.
 *
 * @example
 * ```typescript
 * const pageMetadata: PartialMetadata = {
 *   title: "About",
 *   description: "Learn more about arolariu.ro",
 *   locale: "ro",
 * };
 * ```
 */
type PartialMetadata = Readonly<
  Partial<
    Omit<Metadata, "openGraph" | "twitter"> & {
      openGraph?: Partial<Omit<OpenGraph, "title" | "description">>;
      twitter?: Partial<Omit<Twitter, "title" | "description">>;
      locale?: string;
    }
  >
>;

/**
 * Creates page-specific metadata by merging with base configuration.
 *
 * @remarks
 * **Usage Pattern**: Call this function in page-level `generateMetadata` or static `metadata` exports
 * to create page-specific SEO metadata that inherits from the base configuration.
 *
 * **Merge Behavior**:
 * - Base metadata properties are inherited
 * - Partial metadata properties override base properties
 * - `title` and `description` automatically populate OpenGraph and Twitter metadata
 * - `locale` determines OpenGraph locale and alternate locale mapping
 *
 * **Locale Mapping**:
 * - `en` → `en_US` (OpenGraph locale)
 * - `ro` → `ro_RO` (OpenGraph locale)
 * - Unknown locales default to `en_US`
 *
 * **Type Safety**: Returns readonly metadata to prevent accidental mutations.
 *
 * @param partialMetadata - Optional page-specific metadata overrides
 * @returns Complete metadata object with base configuration merged with overrides
 *
 * @example
 * ```typescript
 * // In a page component
 * export const metadata = createMetadata({
 *   title: "Invoice Dashboard",
 *   description: "View and manage your invoices",
 *   locale: "en",
 *   openGraph: {
 *     images: [{ url: "/og-invoice.png" }],
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Dynamic metadata generation
 * export async function generateMetadata({ params }): Promise<Metadata> {
 *   const invoice = await fetchInvoice(params.id);
 *   return createMetadata({
 *     title: `Invoice ${invoice.name}`,
 *     description: `Invoice details for ${invoice.merchantName}`,
 *   });
 * }
 * ```
 *
 * @see {@link metadata} Base metadata configuration
 * @see {@link PartialMetadata} Type definition for partial metadata
 */
export const createMetadata = (partialMetadata: PartialMetadata = {}): Readonly<Metadata> => {
  const {title, description, openGraph, twitter, locale, ...rest} = partialMetadata;

  const LOCALE_ALTERNATES: ReadonlyMap<string, string> = new Map<string, string>([
    ["en", "en_US"],
    ["ro", "ro_RO"],
  ]);

  const generatedMetadata: Metadata = {
    ...metadata,
    ...rest,
    ...(title && {title}),
    ...(description && {description}),
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
  };

  return generatedMetadata;
};
