import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import RenderDomainsScreen from "./island";

/**
 * Generates metadata for the domains homepage.
 * @returns The metadata for the domains homepage.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Domains.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The domains homepage.
 * This is the main page for the domain space services.
 * This page hosts the domain space services.
 * @returns The domains homepage SSR'ed component.
 */
export default async function DomainsHomepage(): Promise<React.JSX.Element> {
  return <RenderDomainsScreen />;
}
