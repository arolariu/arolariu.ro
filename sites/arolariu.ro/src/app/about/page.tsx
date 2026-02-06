import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderAboutScreen from "./island";
import styles from "./page.module.scss";

/** Generates localized SEO metadata for the About hub page. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/** About hub page — server component wrapper with semantic `<main>`. */
export default async function AboutHomepage(_props: Readonly<PageProps<"/about">>): Promise<React.JSX.Element> {
  return (
    <main className={styles["aboutPage"]}>
      <RenderAboutScreen />
    </main>
  );
}
