/**
 * @fileoverview Client-side island that renders the About hub content.
 * @module app/about/island
 *
 * @remarks
 * Aggregates all interactive About sections into a single client-rendered
 * wrapper to support animations and browser-only behaviors.
 */

"use client";

import CallToAction from "./_components/CallToAction";
import Faq from "./_components/Faq";
import Hero from "./_components/Hero";
import Mission from "./_components/Mission";
import Navigation from "./_components/Navigation";
import Stats from "./_components/Stats";
import Values from "./_components/Values";

/**
 * Renders the About hub with all interactive sections.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **Why Client Component?**
 * - Uses animation and browser-only effects inside child sections.
 * - Aggregates interactive UI blocks that require client-side hydration.
 *
 * **Sections**:
 * - **Hero**: Full-screen intro with animated background and CTAs.
 * - **Mission**: Platform mission statement and core pillars.
 * - **Values**: Grid of core values guiding development.
 * - **Stats**: Key metrics showcasing platform quality.
 * - **Navigation**: Cards linking to platform and author pages.
 * - **FAQ**: Common questions with accordion interface.
 * - **CallToAction**: Final CTA with GitHub and contact links.
 *
 * @returns The About hub UI composed of all sections.
 *
 * @example
 * ```tsx
 * <RenderAboutScreen />
 * ```
 */
export default function RenderAboutScreen(): React.JSX.Element {
  return (
    <main className='flex w-full flex-col'>
      <Hero />
      <Mission />
      <Values />
      <Stats />
      <Navigation />
      <Faq />
      <CallToAction />
    </main>
  );
}
