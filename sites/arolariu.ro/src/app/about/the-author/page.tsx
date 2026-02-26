/**
 * @fileoverview Author profile page for the About section.
 * @module app/about/the-author/page
 *
 * @remarks
 * Defines metadata and the server-rendered Author page layout, composing
 * multiple informational sections about Alexandru-Răzvan Olariu.
 *
 * @see {@link createMetadata}
 */

import {ScrollToTop} from "@/hooks/useScrollToTop";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import Biography from "./_components/Biography";
import Certifications from "./_components/Certifications";
import Competencies from "./_components/Competencies";
import Contact from "./_components/Contact";
import Education from "./_components/Education";
import Experience from "./_components/Experience";
import Hero from "./_components/Hero";
import Perspectives from "./_components/Perspectives";
import styles from "./page.module.scss";

/**
 * Generates localized metadata for the Author page.
 *
 * @remarks
 * **Rendering Context**: Server Component metadata generator.
 *
 * **i18n**: Uses `next-intl` translations from the About.Author namespace.
 *
 * **SEO**: Delegates to `createMetadata` for consistent Open Graph defaults.
 *
 * @returns Metadata configured for the Author route.
 *
 * @example
 * ```tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   return createMetadata({title: "About the Author"});
 * }
 * ```
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About.Author.metadata");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the Author profile page with detailed sections.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Composition**: Combines hero, biography, competencies, experience,
 * education, certifications, perspectives, and contact sections.
 *
 * **Interaction**: Includes a `ScrollToTop` helper for improved navigation.
 *
 * @returns The server-rendered Author page JSX.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /about/the-author
 * <AuthorPage />
 * ```
 */
export default async function AboutTheAuthorPage(_props: Readonly<PageProps<"/about/the-author">>): Promise<React.JSX.Element> {
  return (
    <div className={styles["authorPage"]}>
      <ScrollToTop />
      <div className={styles["authorMain"]}>
        <Hero />
        <Biography />
        <Competencies />
        <Experience />
        <Education />
        <Certifications />
        <Perspectives />
        <Contact />
      </div>
    </div>
  );
}
