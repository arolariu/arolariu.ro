"use client";

/**
 * @fileoverview Client-side island for the create invoice wizard workflow.
 * @module app/domains/invoices/create-invoice/island
 *
 * @remarks
 * Implements a 3-step wizard for creating invoices from scans:
 * 1. Select scans from available READY scans
 * 2. Enter invoice details (name, category, payment, date)
 * 3. Review selections and create invoice
 *
 * Before the wizard mounts, scans are fetched into the IndexedDB-persisted store. Users without a READY
 * scan are redirected to the upload-scans page.
 *
 * Uses context for wizard state management and Zustand for scan data.
 */

import {useScansStore} from "@/stores";
import {ScanStatus} from "@/types/scans";
import {Button, Skeleton} from "@arolariu/components";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {TbArrowLeft} from "react-icons/tb";
import {fetchScans} from "../_actions/scans";
import skeletonStyles from "./_components/CreateInvoiceSkeleton.module.scss";
import InvoiceDetailsForm from "./_components/InvoiceDetailsForm";
import ReviewStep from "./_components/ReviewStep";
import ScanSelector from "./_components/ScanSelector";
import StepIndicator from "./_components/StepIndicator";
import {CreateInvoiceProvider, useCreateInvoiceContext} from "./_context/CreateInvoiceContext";
import styles from "./island.module.scss";

/**
 * Animation variants for step transitions.
 */
const stepVariants: Variants = {
  enter: {
    x: 50,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: -50,
    opacity: 0,
  },
};

/**
 * Wizard content component - renders current step.
 */
function WizardContent(): React.JSX.Element {
  const {currentStep} = useCreateInvoiceContext();

  return (
    <motion.div
      key={currentStep}
      variants={stepVariants}
      initial='enter'
      animate='center'
      exit='exit'
      transition={{duration: 0.3}}
      className={styles["stepContent"]}>
      {currentStep === "select-scans" && <ScanSelector />}
      {currentStep === "details" && <InvoiceDetailsForm />}
      {currentStep === "review" && <ReviewStep />}
    </motion.div>
  );
}

/**
 * Navigation buttons component.
 */
function WizardNavigation(): React.JSX.Element {
  const t = useTranslations();
  const {currentStep, canGoNext, goBack, goNext, isCreating} = useCreateInvoiceContext();

  const showBack = currentStep !== "select-scans";
  const showNext = currentStep !== "review";

  return (
    <div className={styles["navigation"]}>
      {showBack ? (
        <Button
          variant='outline'
          onClick={goBack}
          disabled={isCreating}>
          <TbArrowLeft />
          {t((m) => m.forms.invoices.createInvoice.navigation.back)}
        </Button>
      ) : null}

      {showNext ? (
        <Button
          onClick={goNext}
          disabled={!canGoNext || isCreating}
          className={styles["nextButton"]}>
          {t((m) => m.forms.invoices.createInvoice.navigation.next)}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Result of the one-time scan availability check performed on landing.
 */
type ScanAvailability = "checking" | "available" | "unavailable";

/**
 * Fetches the user's scans into the IndexedDB-persisted store and decides once whether a READY scan exists.
 *
 * @remarks
 * Waits for store hydration so persisted state cannot overwrite the fetched scans. When the fetch fails,
 * the cached scans decide availability. The decision is never revisited: creating an invoice attaches its
 * scans, which must not redirect the user away mid-navigation.
 *
 * @returns The current scan availability.
 */
function useScanAvailability(): ScanAvailability {
  const hasHydrated = useScansStore((state) => state.hasHydrated);
  const setScans = useScansStore((state) => state.setScans);
  const setLastSyncTimestamp = useScansStore((state) => state.setLastSyncTimestamp);
  const [availability, setAvailability] = useState<ScanAvailability>("checking");

  useEffect(() => {
    if (!hasHydrated) return;

    let isCurrent = true;

    const checkScans = async (): Promise<void> => {
      try {
        const result = await fetchScans();
        if (isCurrent && result.success) {
          const cachedAt = new Date();
          setScans(result.data.map((scan) => ({...scan, cachedAt})));
          setLastSyncTimestamp(cachedAt);
        }
      } catch (error) {
        console.error("Failed to fetch scans before creating an invoice:", error);
      } finally {
        if (isCurrent) {
          const hasReadyScans = useScansStore.getState().scans.some((scan) => scan.status === ScanStatus.READY);
          setAvailability(hasReadyScans ? "available" : "unavailable");
        }
      }
    };

    void checkScans();

    return () => {
      isCurrent = false;
    };
  }, [hasHydrated, setScans, setLastSyncTimestamp]);

  return availability;
}

function ScanAvailabilitySkeleton(): React.JSX.Element {
  return (
    <div className={skeletonStyles["container"]}>
      <div className={skeletonStyles["stepIndicator"]}>
        <Skeleton className={skeletonStyles["stepDot"]} />
        <Skeleton className={skeletonStyles["stepDot"]} />
        <Skeleton className={skeletonStyles["stepDot"]} />
      </div>

      <div className={skeletonStyles["content"]}>
        <Skeleton className={skeletonStyles["title"]} />
        <Skeleton className={skeletonStyles["subtitle"]} />

        <div className={skeletonStyles["grid"]}>
          <Skeleton className={skeletonStyles["card"]} />
          <Skeleton className={skeletonStyles["card"]} />
          <Skeleton className={skeletonStyles["card"]} />
          <Skeleton className={skeletonStyles["card"]} />
        </div>
      </div>

      <div className={skeletonStyles["navigation"]}>
        <Skeleton className={skeletonStyles["button"]} />
        <Skeleton className={skeletonStyles["button"]} />
      </div>
    </div>
  );
}

/**
 * Main wizard component wrapped with context.
 */
function CreateInvoiceWizard(): React.JSX.Element {
  const t = useTranslations();

  return (
    <div className={styles["wizard"]}>
      {/* Header */}
      <div className={styles["header"]}>
        <Link
          href='/domains/invoices'
          className={styles["backLink"]}>
          <TbArrowLeft />
          {t((m) => m.forms.invoices.createInvoice.header.backToInvoices)}
        </Link>
        <h1 className={styles["title"]}>{t((m) => m.forms.invoices.createInvoice.header.title)}</h1>
        <p className={styles["subtitle"]}>{t((m) => m.forms.invoices.createInvoice.header.subtitle)}</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator />

      {/* Step Content */}
      <WizardContent />

      {/* Navigation */}
      <WizardNavigation />
    </div>
  );
}

/**
 * Root island component with context provider.
 *
 * @remarks
 * Holds on the wizard skeleton until the scan check settles, then either redirects to upload-scans
 * (replacing history so Back does not loop) or mounts the wizard.
 *
 * @returns JSX element with create invoice wizard
 */
export default function RenderCreateInvoiceScreen(): React.JSX.Element {
  const router = useRouter();
  const availability = useScanAvailability();

  useEffect(() => {
    if (availability === "unavailable") {
      router.replace("/domains/invoices/upload-scans");
    }
  }, [availability, router]);

  if (availability !== "available") {
    return <ScanAvailabilitySkeleton />;
  }

  return (
    <CreateInvoiceProvider>
      <CreateInvoiceWizard />
    </CreateInvoiceProvider>
  );
}
