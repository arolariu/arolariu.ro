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
 * Generates metadata for the Platform page.
 * @returns The metadata for the Platform page.
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
 * The Platform page - A comprehensive showcase of the arolariu.ro platform.
 *
 * This page provides an immersive experience exploring:
 * - Platform overview and vision (Hero)
 * - Key features and capabilities (Features)
 * - Technical architecture (Architecture)
 * - Technology stack (TechStack)
 * - Platform statistics (Statistics)
 * - Development timeline (Timeline)
 * - Call to action (CallToAction)
 *
 * @returns The platform page, rendered as a React Server Component.
 */
export default async function PlatformPage(): Promise<React.JSX.Element> {
  return (
    <div className='bg-background text-foreground relative min-h-screen'>
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
    </div>
  );
}
