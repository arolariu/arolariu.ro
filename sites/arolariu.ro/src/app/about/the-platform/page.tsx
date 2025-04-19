/** @format */

import {ScrollToTop} from "@/hooks/useScrollToTop";
import Hero from "./_components/Hero";
import Statistics from "./_components/Statistics";
import TechStack from "./_components/TechStack";
import Timeline from "./_components/Timeline";

/**
 * This is the platform page.
 */
export default async function PlatformPage(): Promise<React.JSX.Element> {
  return (
    <div
      className='bg-background text-foreground relative min-h-screen'
      style={{
        cursor:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%231e90ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m18 16 4-4-4-4'/><path d='m6 8-4 4 4 4'/><path d='m14.5 4-5 16'/></svg>\") 16 16, auto",
      }}>
      <ScrollToTop />
      <main className='pb-12'>
        <Hero />
        <TechStack />
        <Timeline />
        <Statistics />
      </main>
    </div>
  );
}
