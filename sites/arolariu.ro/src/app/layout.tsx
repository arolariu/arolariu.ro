import Footer from "@/components/Footer";
import {Caudex} from "next/font/google";

import Header from "@/components/Header";
import {SITE_URL} from "@/constants";
import "@mantine/core/styles.css";
import type {Metadata} from "next";
import type {NextFont} from "next/dist/compiled/@next/font";
import type {AlternateURLs} from "next/dist/lib/metadata/types/alternative-urls-types";
import type {AppleWebApp} from "next/dist/lib/metadata/types/extra-types";
import type {Author, Icon, Robots, TemplateString} from "next/dist/lib/metadata/types/metadata-types";
import type {OpenGraph} from "next/dist/lib/metadata/types/opengraph-types";
import {Suspense, type PropsWithChildren} from "react";
import "./globals.css";
import Loading from "./loading";
import {Providers} from "./providers";

const fontFamily: NextFont = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  preload: true,
});

const siteDescription =
  "Welcome to `arolariu.ro` - the personal website of Alexandru-Razvan Olariu, a software engineer based in Bucharest, Romania.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    absolute: "arolariu.ro | Alexandru-Razvan Olariu",
    default: "arolariu.ro | Unknown page",
    template: "%s | arolariu.ro",
  } satisfies TemplateString,
  description: siteDescription,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "arolariu.ro",
  } satisfies AppleWebApp,
  classification: "Personal",
  applicationName: "arolariu.ro",
  authors: {
    name: "Alexandru-Razvan Olariu",
    url: "https://arolariu.ro",
  } satisfies Author,
  category: "Technology",
  creator: "Alexandru-Razvan Olariu",
  keywords: ["arolariu", "arolariu.ro", "Alexandru-Razvan Olariu", "Technology"],
  alternates: {
    canonical: "https://arolariu.ro",
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
    url: "https://arolariu.ro",
    countryName: "Romania",
    description: siteDescription,
    siteName: "arolariu.ro",
    locale: "en",
    title: "arolariu.ro | Alexandru-Razvan Olariu",
    alternateLocale: "ro_RO",
  } satisfies OpenGraph,
  twitter: {
    creator: "Alexandru-Razvan Olariu",
    title: "arolariu.ro | Alexandru-Razvan Olariu",
    description: siteDescription,
  },
  manifest: "/manifest.json",
  icons: [
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "manifest/favicon-16x16.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "manifest/favicon-32x32.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "57x57",
      url: "manifest/apple-touch-icon-57x57.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "60x60",
      url: "manifest/apple-touch-icon-60x60.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "72x72",
      url: "manifest/apple-touch-icon-72x72.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "76x76",
      url: "manifest/apple-touch-icon-76x76.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "114x114",
      url: "manifest/apple-touch-icon-114x114.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "120x120",
      url: "manifest/apple-touch-icon-120x120.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "144x144",
      url: "manifest/apple-touch-icon-144x144.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "152x152",
      url: "manifest/apple-touch-icon-152x152.png",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      sizes: "180x180",
      url: "manifest/apple-touch-icon-180x180.png",
    },
  ] satisfies Icon[],
};

/**
 * The root layout.
 * @returns The root layout.
 */
export default async function RootLayout({children}: Readonly<PropsWithChildren<{}>>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={fontFamily.className}
      dir='ltr'>
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <Providers>
          <Header />
          <Suspense fallback={<Loading />}>{children}</Suspense>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
