"use client";

import type {NodePackagesJSON} from "@/types";
import {useTranslations} from "next-intl";
import Contributors from "./_components/Contributors";
import Hero from "./_components/Hero";
import LicenseBreakdown from "./_components/LicenseBreakdown";
import PackagesScreen from "./_components/PackagesScreen";
import Stats from "./_components/Stats";

type Props = {
  packages: NodePackagesJSON;
  lastUpdatedDate: string;
};

/**
 * This component renders the acknowledgements screen for the third-party packages used in this project.
 * It displays comprehensive attribution with statistics, contributors, and package browser.
 * The component is designed to be used in a client-side rendered context.
 * @returns The acknowledgements screen, CSR'ed.
 */
export default function RenderAcknowledgementsScreen({packages, lastUpdatedDate}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Acknowledgements");

  return (
    <main className='flex min-h-screen flex-col'>
      {/* Hero section */}
      <Hero lastUpdatedDate={lastUpdatedDate} />

      {/* Statistics dashboard */}
      <Stats />

      {/* Top contributors */}
      <Contributors />

      {/* License breakdown */}
      <LicenseBreakdown />

      {/* NPM packages browser */}
      <section className='mx-auto w-full max-w-7xl px-4 py-16'>
        <div className='mb-8 text-center'>
          <h2 className='mb-4 text-3xl font-bold'>
            <span className='from-gradient-from to-gradient-to bg-gradient-to-r bg-clip-text text-transparent'>{t("packages.title")}</span>
          </h2>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>{t("packages.subtitle")}</p>
        </div>
        <PackagesScreen packages={packages} />
      </section>
    </main>
  );
}
