"use client";

import CallToAction from "./_components/CallToAction";
import Faq from "./_components/Faq";
import Hero from "./_components/Hero";
import Mission from "./_components/Mission";
import Navigation from "./_components/Navigation";
import Stats from "./_components/Stats";
import Values from "./_components/Values";

/**
 * About hub page with comprehensive sections introducing the platform and author.
 *
 * @remarks
 * **Rendering Context**: Client Component with interactive animations.
 *
 * **Sections**:
 * - **Hero**: Full-screen intro with animated background and CTAs
 * - **Mission**: Platform mission statement and core pillars
 * - **Values**: Grid of 6 core values guiding development
 * - **Stats**: Key metrics showcasing platform quality
 * - **Navigation**: Enhanced cards linking to platform and author pages
 * - **FAQ**: Common questions with accordion interface
 * - **CallToAction**: Final CTA with GitHub and contact links
 *
 * @returns The About hub page, client-side rendered with animations.
 */
export default function RenderAboutScreen(): React.JSX.Element {
  return (
    <div className='flex w-full flex-col'>
      <Hero />
      <Mission />
      <Values />
      <Stats />
      <Navigation />
      <Faq />
      <CallToAction />
    </div>
  );
}
