/**
 * @fileoverview Platform overview page for the About section.
 * @module app/about/the-platform/page
 *
 * @remarks
 * Provides metadata and a server-rendered page that showcases the
 * arolariu.ro platform, including features, architecture, and roadmap.
 *
 * @see {@link createMetadata}
 */

import {ScrollToTop} from "@/hooks/useScrollToTop";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import Architecture from "./_components/Architecture";
import CallToAction from "./_components/CallToAction";
import Features from "./_components/Features";
import Hero from "./_components/Hero";
import Statistics from "./_components/Statistics";
import TechStack from "./_components/TechStack";
import Timeline from "./_components/Timeline";

/**
 * Generates localized metadata for the Platform page.
 *
 * @remarks
 * **Rendering Context**: Server Component metadata generator.
 *
 * **i18n**: Uses `next-intl` translations from About.Platform.
 *
 * **SEO**: Delegates to `createMetadata` for consistent Open Graph defaults.
 *
 * @returns Metadata configured for the Platform route.
 *
 * @example
 * ```tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   return createMetadata({title: "Platform"});
 * }
 * ```
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About.Platform.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the Platform showcase page for the About section.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Composition**: Combines hero, features, architecture, tech stack,
 * statistics, timeline, and CTA sections.
 *
 * **Navigation**: Includes a `ScrollToTop` helper for UX consistency.
 *
 * @returns The server-rendered Platform page JSX.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /about/the-platform
 * <PlatformPage />
 * ```
 */
export default async function AboutThePlatformPage(_props: Readonly<PageProps<"/about/the-platform">>): Promise<React.JSX.Element> {
  return (
    <main className='bg-background text-foreground relative min-h-screen'>
      <ScrollToTop />
      <main>
        {/* Hero Section - Full viewport intro with animated background */}
        <Hero />

        {/* Features Section - Interactive feature cards */}
        <Features />

        {/* Architecture Section - Technical architecture diagram */}
        <Architecture />

        {/* Tech Stack Section - Technologies used */}
        <TechStack />

        {/* Statistics Section - Platform metrics with animated counters */}
        <Statistics />

        {/* Timeline Section - Development journey */}
        <Timeline />

        {/* Call to Action Section - Footer CTA */}
        <CallToAction />
      </main>
    </main>
  );
}
