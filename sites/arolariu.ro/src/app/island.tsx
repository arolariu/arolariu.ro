"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import BentoGrid from "./_components/BentoGrid";
import FinalCTA from "./_components/FinalCTA";
import HeroSection from "./_components/Hero";
import Stats from "./_components/Stats";
import TechShowcase from "./_components/TechShowcase";

/**
 * Clean, visual-first homepage with minimal text and smooth animations.
 *
 * @remarks
 * **Rendering Context**: Client Component with interactive animations.
 *
 * **Sections**:
 * - **Hero**: Full-screen intro with TechSphere and gradient text
 * - **BentoGrid**: Visual technology showcase in bento layout
 * - **TechShowcase**: Scrolling technology logo marquee
 * - **Stats**: Animated counting numbers for key metrics
 * - **FinalCTA**: Simple call-to-action with buttons
 *
 * @returns The rendered home screen component, CSR'ed.
 */
export default function RenderHomeScreen(): React.JSX.Element {
  return (
    <main className='relative'>
      <BackgroundBeams className='pointer-events-none' />
      <HeroSection />
      <BentoGrid />
      <TechShowcase />
      <Stats />
      <FinalCTA />
    </main>
  );
}
