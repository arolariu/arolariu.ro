"use client";

/**
 * @fileoverview Invoice domain homepage island composed from focused sections.
 * @module app/domains/invoices/island
 */

import BentoSection from "./_components/homepage/BentoSection";
import EnhancedCTASection from "./_components/homepage/EnhancedCTASection";
import FeaturesSection from "./_components/homepage/FeaturesSection";
import HeroSection from "./_components/homepage/HeroSection";
import WorkflowSection from "./_components/homepage/WorkflowSection";
import OnboardingOverlay from "./_components/OnboardingOverlay";
import styles from "./island.module.scss";

type Props = {
  isAuthenticated: boolean;
};

/**
 * Renders the invoices homepage island as a composition of section components.
 *
 * @param props - Component props.
 * @returns The invoices homepage screen.
 */
export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      <HeroSection isAuthenticated={isAuthenticated} />
      <WorkflowSection />
      <FeaturesSection isAuthenticated={isAuthenticated} />
      <BentoSection />
      <EnhancedCTASection />
      <div className={styles["footerSpacing"]} />
      <OnboardingOverlay />
    </div>
  );
}
