/** @format */

import licenses from "@/../licenses.json";
import {TIMESTAMP} from "@/lib/utils.generic";
import type {NodePackagesJSON} from "@/types";
import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import PackagesScreen from "./_components/PackagesScreen";

export const metadata: Metadata = {
  title: "Acknowledgements",
  description: "Acknowledgements page for the third-party packages used in this project and collaborators.",
};

/**
 * Acknowledgements page for the third-party packages used in this project.
 * @returns The acknowledgements page, SSR'ed.
 */
export default async function AcknowledgementsPage() {
  const t = await getTranslations("Acknowledgements");
  const packages: NodePackagesJSON = licenses;
  const lastUpdatedDate = new Date(TIMESTAMP).toUTCString();

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      {/* Hero section */}
      <section className='text-center'>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          {t("title")}
        </h1>
        <span>{t("lastUpdate", {date: lastUpdatedDate})}</span>
      </section>

      {/* NPM packages acknowledgements. */}
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4'>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          {t("packages.title")}
        </h1>
        <span className='w-1/2 text-pretty pb-4 text-center text-xl'>{t("packages.subtitle")}</span>
        <PackagesScreen packages={packages} />
      </section>
    </main>
  );
}
