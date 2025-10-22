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
  description:
    "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu, a software engineer based in Bucharest, Romania.",
} as const;

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

export const metadata: Metadata = {
  metadataBase: options.siteUrl,
  title: {
    absolute: `${options.siteName} | ${options.author}`,
    default: `${options.siteName} | Unknown page"`,
    template: `%s | ${options.siteName}`,
  } satisfies TemplateString,
  description: options.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: options.siteName,
  } satisfies AppleWebApp,
  classification: "Personal",
  applicationName: options.siteName,
  authors: {
    name: options.author,
    url: options.siteUrl,
  } satisfies Author,
  category: "Technology",
  creator: options.author,
  keywords: ["arolariu", options.siteName, options.author, "Technology"],
  alternates: {
    canonical: options.siteUrl,
  } satisfies AlternateURLs,
  robots: {
    follow: true,
    index: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: "index, follow",
  } satisfies Robots,
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
  twitter: {
    creator: options.author,
    title: `${options.siteName} | ${options.author}`,
    description: options.description,
    card: "summary",
  } satisfies Twitter,
  manifest: "/manifest.json",
  icons: [...normalIcons, ...appleTouchIcons] satisfies Icon[],
};

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
  } satisfies Metadata;
};
