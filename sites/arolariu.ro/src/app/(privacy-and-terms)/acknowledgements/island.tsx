/**
 * @fileoverview Client island for third-party acknowledgements.
 * @module app/(privacy-and-terms)/acknowledgements/island
 *
 * @remarks
 * Renders attribution content for open-source dependencies, including
 * statistics, contributors, and an interactive package browser.
 */

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
 * Renders the acknowledgements screen for third-party dependencies.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **Composition**: Displays attribution sections, then renders a packages
 * browser with localized copy from the `Acknowledgements` namespace.
 *
 * **Why Client Component?**
 * - Uses `next-intl` client translations.
 * - Hosts interactive browsing of package data.
 *
 * @param props - Acknowledgements data and last update timestamp.
 * @param props.packages - Parsed dependency metadata for attribution.
 * @param props.lastUpdatedDate - ISO date string for the data snapshot.
 * @returns The acknowledgements screen with attribution sections and packages.
 *
 * @example
 * ```tsx
 * <RenderAcknowledgementsScreen packages={data} lastUpdatedDate="2026-01-21" />
 * ```
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
