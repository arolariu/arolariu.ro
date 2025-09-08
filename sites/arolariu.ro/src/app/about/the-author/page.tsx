/** @format */

import {ScrollToTop} from "@/hooks/useScrollToTop";
import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import Biography from "./_components/Biography";
import Certifications from "./_components/Certifications";
import Competencies from "./_components/Competencies";
import Contact from "./_components/Contact";
import Education from "./_components/Education";
import Experience from "./_components/Experience";
import Hero from "./_components/Hero";
import Perspectives from "./_components/Perspectives";

/**
 * Generates metadata for the Author page.
 * @returns The metadata for the Author page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About.Author.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the Author's page which contains detailed information about Alexandru-Razvan Olariu.
 * @returns The rendered AuthorPage component, SSR'ed.
 */
export default async function AuthorPage(): Promise<React.JSX.Element> {
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
