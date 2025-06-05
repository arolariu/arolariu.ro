/** @format */
"use client";

import type {NodePackagesJSON} from "@/types";
import {useTranslations} from "next-intl";
import PackagesScreen from "./_components/PackagesScreen";

type Props = {
  packages: NodePackagesJSON;
  lastUpdatedDate: string;
};

/**
 * This component renders the acknowledgements screen for the third-party packages used in this project.
 * It displays the title, last updated date, and a list of packages with their licenses.
 * The component is designed to be used in a client-side rendered context.
 * @returns The acknowledgements screen, CSR'ed.
 */
export default function RenderAcknowledgementsScreen({packages, lastUpdatedDate}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Acknowledgements");

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      {/* Hero section */}
      <section className='text-center'>
        <h1 className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>{t("title")}</h1>
        <span>{t("lastUpdate", {date: lastUpdatedDate})}</span>
      </section>

      {/* NPM packages acknowledgements. */}
      <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4'>
        <h1 className='bg-linear-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          {t("packages.title")}
        </h1>
        <span className='w-1/2 pb-4 text-center text-xl text-pretty'>{t("packages.subtitle")}</span>
        <PackagesScreen packages={packages} />
      </section>
    </main>
  );
}
