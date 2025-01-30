/** @format */

import licenses from "@/../licenses.json";
import {TIMESTAMP} from "@/lib/utils.generic";
import type {NodePackagesJSON} from "@/types";
import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import PackagesTable from "./_components/PackagesTable";
import RenderAcknowledgementsPage from "./island";

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
  const totalPackages = Object.values(packages).flat().length;
  const lastUpdatedDate = new Date(TIMESTAMP).toUTCString();

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-center text-3xl font-black text-transparent'>
          {t("title")}
        </h1>
        <p className='text-center'>
          {t("lastUpdate")}
          <small>{lastUpdatedDate}</small>
        </p>
      </section>

      {/* NPM packages acknowledgements. */}
      <section>
        <article className='pb-4 text-center text-xl'>
          This website could not have been possible without the following third-party packages. <br /> I would like to
          thank the authors of these packages for their hard work and dedication to the open-source community.
        </article>
        <div className='pb-8'>
          <h2 className='inline text-2xl font-black underline'>Total Packages: {totalPackages}</h2>
          <br />
          <br />
          <PackagesTable packages={packages} />
        </div>
        <RenderAcknowledgementsPage packages={packages} />
      </section>
    </main>
  );
}
