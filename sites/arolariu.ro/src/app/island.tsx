/** @format */

"use client";

import FeaturesSection from "./_components/Features";
import HeroSection from "./_components/Hero";
import TechnologiesSection from "./_components/Technologies";

/**
 * This page represents the home screen of the application.
 * @returns The rendered home screen component, CSR'ed.
 */
export default function RenderHomeScreen(): React.JSX.Element {
  return (
    <main>
      <HeroSection />
      <TechnologiesSection />
      <FeaturesSection />
    </main>
  );
}
