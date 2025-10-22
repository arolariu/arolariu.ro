import licenses from "@/../licenses.json";
import {TIMESTAMP} from "@/lib/utils.generic";
import {createMetadata} from "@/metadata";
import type {NodePackagesJSON} from "@/types";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import RenderAcknowledgementsScreen from "./island";

/**
 * Generates metadata for the Acknowledgements page.
 * @returns The metadata object for the Acknowledgements page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Acknowledgements.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Acknowledgements page for the third-party packages used in this project.
 * @returns The acknowledgements page, SSR'ed.
 */
export default async function AcknowledgementsPage(): Promise<React.JSX.Element> {
  const lastUpdatedDate = new Date(TIMESTAMP).toUTCString();

  return (
    <RenderAcknowledgementsScreen
      packages={licenses as NodePackagesJSON}
      lastUpdatedDate={lastUpdatedDate}
    />
  );
}
