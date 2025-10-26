import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAboutScreen from "./island";

/**
 * Generates metadata for the About page.
 * @returns The metadata for the About page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * This is the about page.
 * It is a simple page that displays some information about the application.
 * @returns The about page, rendered as a React component, server-side.
 */
export default async function AboutPage(): Promise<React.JSX.Element> {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center pt-24 text-center'>
      <RenderAboutScreen />
    </main>
  );
}
