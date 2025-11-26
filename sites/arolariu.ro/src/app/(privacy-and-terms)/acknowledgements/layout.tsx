import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {Suspense} from "react";
import Loading from "./loading";

/**
 * Generates SEO metadata for the Acknowledgements page with i18n support.
 *
 * @remarks
 * **Execution Context**: Async Server Component metadata generation function.
 *
 * **Purpose**: Creates localized Open Graph, Twitter Card, and standard HTML meta tags
 * for the acknowledgements page listing all third-party packages and their licenses.
 *
 * **Async Operations**:
 * - Fetches translations from `Acknowledgements.__metadata__` namespace
 * - Retrieves current locale for language-specific metadata
 *
 * **Metadata Generation**:
 * - Uses `createMetadata` utility for consistent metadata structure
 * - Includes translated title and description
 * - Applies locale-specific SEO optimization
 *
 * **Why Async?**:
 * - `getTranslations` and `getLocale` are async in next-intl/server
 * - Allows server-side i18n metadata generation
 * - Ensures metadata is rendered before page content
 *
 * **SEO Benefits**:
 * - Improves discoverability of open-source attribution
 * - Provides localized social media sharing cards
 * - Enhances search engine indexing with relevant keywords
 *
 * @returns Promise resolving to Next.js Metadata object with localized SEO tags
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js App Router
 * // No manual invocation needed
 * export async function generateMetadata(): Promise<Metadata> {
 *   // Implementation
 * }
 * ```
 *
 * @see {@link createMetadata} - Utility function for consistent metadata generation
 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata | Next.js Metadata API}
 * @see {@link https://next-intl.com/docs/environments/server-client-components | next-intl Server Components}
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Acknowledgements.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The layout for the acknowledgements pages.
 * @returns The layout for the acknowledgements pages.
 */
export default async function AcknowledgementsLayout(props: Readonly<LayoutProps<"/acknowledgements">>): Promise<React.JSX.Element> {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
