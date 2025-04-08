/** @format */

import {ScrollToTop} from "@/hooks/useScrollToTop";
import type {Metadata} from "next";
import Biography from "./_components/Biography";
import Certifications from "./_components/Certifications";
import Competencies from "./_components/Competencies";
import Contact from "./_components/Contact";
import Education from "./_components/Education";
import Experience from "./_components/Experience";
import Hero from "./_components/Hero";
import Perspectives from "./_components/Perspectives";
import Terminal from "./_secrets/Terminal";

export const metadata: Metadata = {
  title: "Alexandru-Razvan Olariu",
  description: "Learn more about the author, Alexandru-Razvan Olariu",
};

/**
 * Renders the Author's page which contains detailed information about Alexandru-Razvan Olariu.
 * This is a Server-Side Rendered (SSR) Next.js page component that displays various sections about the author:
 * - Hero section
 * - Biography
 * - Competencies/Skills
 * - Professional Experience
 * - Education
 * - Certifications
 * - Personal Perspectives
 * - Contact Information
 * The page also includes a hidden Terminal component for easter egg functionality
 * and a ScrollToTop utility for better navigation.
 * @returns The rendered AuthorPage component
 */
export default async function AuthorPage(): Promise<React.JSX.Element> {
  return (
    <div
      className='bg-background text-foreground relative min-h-screen'
      style={{
        cursor:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%231e90ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m18 16 4-4-4-4'/><path d='m6 8-4 4 4 4'/><path d='m14.5 4-5 16'/></svg>\") 16 16, auto",
      }}>
      <Terminal />
      <ScrollToTop />
      <main className='pb-12'>
        <Hero />
        <Biography />
        <Competencies />
        <Experience />
        <Education />
        <Certifications />

        <Perspectives />
        <Contact />
      </main>
    </div>
  );
}
