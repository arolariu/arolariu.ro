import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderDomainsScreen from "./island";

/**
 * Generates SEO metadata for the domains overview page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from translation keys
 * under the `Domains.__metadata__` namespace. Supports all configured locales (en, ro, etc.).
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility to generate
 * consistent metadata following RFC 1004 (Metadata & SEO System) standards, including
 * Open Graph tags, Twitter cards, and canonical URLs.
 *
 * **Caching**: Metadata is generated at build time for static routes or on-demand
 * for dynamic routes. No runtime caching beyond Next.js defaults.
 *
 * **Domain Context**: This page serves as the landing page for the domain-specific
 * services (invoices, analytics, user management, etc.), providing an overview of
 * available business domains within the application.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * Open Graph metadata, and other SEO-related fields configured by the createMetadata utility.
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js for /domains route
 * // Generates metadata like:
 * // {
 * //   title: "Domains | arolariu.ro",
 * //   description: "Explore available business domains and services",
 * //   openGraph: {
 * //     title: "Domains | arolariu.ro",
 * //     description: "Explore available business domains and services",
 * //     url: "https://arolariu.ro/domains",
 * //     siteName: "arolariu.ro",
 * //     locale: "en",
 * //   }
 * // }
 * ```
 *
 * @see {@link createMetadata} - Centralized metadata generation utility
 * @see RFC 1004 - Metadata & SEO System documentation
 * @see RFC 1003 - Internationalization System documentation
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

/**
 * Renders the domains overview page showcasing available business domains.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Purpose**: Serves as the landing page for domain-specific services within the
 * arolariu.ro platform. This page provides an overview and navigation hub for
 * accessing business domains such as:
 * - Invoices domain: Receipt management and analytics
 * - Analytics domain: Business intelligence and insights
 * - User management domain: Profile and preferences
 * - Future domains: Additional business capabilities
 *
 * **Client Component Delegation**: Delegates rendering to `RenderDomainsScreen`
 * (island.tsx), which is a client component handling interactive elements like
 * navigation cards, animations, and domain selection.
 *
 * **Data Fetching**: Currently no server-side data fetching. Future iterations
 * may include domain-level statistics, user permissions, or feature availability.
 *
 * **Performance**: As a Server Component, initial HTML is rendered on the server,
 * reducing time-to-interactive. The client component (island) hydrates for interactivity.
 *
 * **Architecture**: Follows the "islands architecture" pattern where the server
 * component provides the shell and the client component provides interactive islands.
 *
 * @returns Promise resolving to server-rendered JSX element that wraps the
 * RenderDomainsScreen client component.
 *
 * @example
 * ```tsx
 * // Rendered at /domains route
 * // Server renders:
 * // <html>
 * //   <body>
 * //     <RenderDomainsScreen /> // Client component for interactivity
 * //   </body>
 * // </html>
 * //
 * // User sees:
 * // - Grid of domain cards (Invoices, Analytics, etc.)
 * // - Interactive hover effects and navigation
 * // - Localized content based on user's language preference
 * ```
 *
 * @see {@link RenderDomainsScreen} - Client component with interactive domain cards
 * @see RFC 2001 - Domain-Driven Design Architecture documentation
 */
export default async function DomainsHomepage(): Promise<React.JSX.Element> {
  return <RenderDomainsScreen />;
}
