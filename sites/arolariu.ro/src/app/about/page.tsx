import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getTranslations} from "next-intl-selector/server";
import {getLocale} from "next-intl/server";
import RenderAboutScreen from "./island";
import styles from "./page.module.scss";

/** Generates localized SEO metadata for the About hub page. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t((m) => m.shared.legacy.about.metadata.title),
    description: t((m) => m.shared.legacy.about.metadata.description),
  });
}

/** About hub page — server component wrapper with semantic `<main>`. */
export default async function AboutHomepage(_props: Readonly<PageProps<"/about">>): Promise<React.JSX.Element> {
  return (
    <div className={styles["aboutPage"]}>
      <RenderAboutScreen />
    </div>
  );
}
