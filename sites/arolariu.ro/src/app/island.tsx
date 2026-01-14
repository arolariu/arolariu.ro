"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import FeaturesSection from "./_components/Features";
import FinalCTA from "./_components/FinalCTA";
import HeroSection from "./_components/Hero";
import HomeFAQ from "./_components/HomeFAQ";
import Stats from "./_components/Stats";
import TechShowcase from "./_components/TechShowcase";
import TechnologiesSection from "./_components/Technologies";
import Testimonials from "./_components/Testimonials";

/**
 * Homepage with comprehensive sections showcasing the platform.
 *
 * @remarks
 * **Rendering Context**: Client Component with interactive animations.
 *
 * **Sections**:
 * - **Hero**: Full-screen intro with animated tech sphere
 * - **Stats**: Key platform metrics (uptime, commits, technologies, coverage)
 * - **Technologies**: Architecture overview and code snippet
 * - **Features**: Grid of 6 key features with icons
 * - **TechShowcase**: Scrolling technology logos
 * - **Testimonials**: Social proof from colleagues
 * - **HomeFAQ**: Common questions accordion
 * - **FinalCTA**: Call-to-action with links to explore
 *
 * @returns The rendered home screen component, CSR'ed.
 */
export default function RenderHomeScreen(): React.JSX.Element {
  return (
    <main className='relative'>
      <BackgroundBeams className='pointer-events-none' />
      <HeroSection />
      <Stats />
      <TechnologiesSection />
      <FeaturesSection />
      <TechShowcase />
      <Testimonials />
      <HomeFAQ />
      <FinalCTA />
    </main>
  );
}
