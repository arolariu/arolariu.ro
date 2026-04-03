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
 * Uses context for wizard state management and Zustand for scan data.
 */

import {Button, Card, CardContent} from "@arolariu/components";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbArrowLeft} from "react-icons/tb";
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
  const t = useTranslations("IMS--Create");
  const {currentStep, canGoNext, goBack, goNext, isCreating} = useCreateInvoiceContext();

  const showBack = currentStep !== "select-scans";
  const showNext = currentStep !== "review";

  return (
    <div className={styles["navigation"]}>
      {showBack && (
        <Button
          variant='outline'
          onClick={goBack}
          disabled={isCreating}>
          <TbArrowLeft />
          {t("navigation.back")}
        </Button>
      )}

      {showNext && (
        <Button
          onClick={goNext}
          disabled={!canGoNext || isCreating}
          className={styles["nextButton"]}>
          {t("navigation.next")}
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state component when no scans are available.
 */
function EmptyState(): React.JSX.Element {
  const t = useTranslations("IMS--Create");

  return (
    <Card className={styles["emptyState"]}>
      <CardContent className={styles["emptyStateContent"]}>
        <div className={styles["emptyStateIcon"]}>📄</div>
        <h2 className={styles["emptyStateTitle"]}>{t("emptyState.title")}</h2>
        <p className={styles["emptyStateDescription"]}>{t("emptyState.description")}</p>
        <div className={styles["emptyStateActions"]}>
          <Link href='/domains/invoices/upload-scans'>
            <Button>{t("emptyState.uploadButton")}</Button>
          </Link>
          <Link href='/domains/invoices/view-scans'>
            <Button variant='outline'>{t("emptyState.viewScansButton")}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main wizard component wrapped with context.
 */
function CreateInvoiceWizard(): React.JSX.Element {
  const t = useTranslations("IMS--Create");
  const {hasScans} = useCreateInvoiceContext();

  if (!hasScans) {
    return <EmptyState />;
  }

  return (
    <div className={styles["wizard"]}>
      {/* Header */}
      <div className={styles["header"]}>
        <Link
          href='/domains/invoices'
          className={styles["backLink"]}>
          <TbArrowLeft />
          {t("header.backToInvoices")}
        </Link>
        <h1 className={styles["title"]}>{t("header.title")}</h1>
        <p className={styles["subtitle"]}>{t("header.subtitle")}</p>
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
 * @returns JSX element with create invoice wizard
 */
export default function RenderCreateInvoiceScreen(): React.JSX.Element {
  return (
    <CreateInvoiceProvider>
      <CreateInvoiceWizard />
    </CreateInvoiceProvider>
  );
}
