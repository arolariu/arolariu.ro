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
import styles from "./island.module.scss";

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
    <section className={styles["acknowledgementsMain"]}>
      {/* Hero section */}
      <Hero lastUpdatedDate={lastUpdatedDate} />

      {/* Statistics dashboard */}
      <Stats />

      {/* Top contributors */}
      <Contributors />

      {/* License breakdown */}
      <LicenseBreakdown />

      {/* NPM packages browser */}
      <section className={styles["packagesSection"]}>
        <div className={styles["packagesSectionHeader"]}>
          <h2 className={styles["packagesTitle"]}>
            <span className={styles["packagesTitleGradient"]}>{t("packages.title")}</span>
          </h2>
          <p className={styles["packagesSubtitle"]}>{t("packages.subtitle")}</p>
        </div>
        <PackagesScreen packages={packages} />
      </section>
    </section>
  );
}
