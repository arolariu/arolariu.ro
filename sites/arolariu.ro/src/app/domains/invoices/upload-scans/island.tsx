"use client";

/**
 * @fileoverview Client-side island for the scan upload workflow.
 * @module app/domains/invoices/upload-scans/island
 *
 * @remarks
 * Thin composition root: provides `ScanUploadContext` and mounts the self-contained
 * section components. All logic lives in the sections and the provider.
 */

import OnboardingOverlay from "../_components/OnboardingOverlay";
import WorkflowProgress from "../_components/WorkflowProgress";
import UploadHeader from "./_components/UploadHeader";
import UploadBreadcrumb from "./_components/_header/UploadBreadcrumb";
import UploadPromptContainer from "./_components/UploadPromptContainer";
import UploadSidebar from "./_components/_sidebar/UploadSidebar";
import UploadWorkspace from "./_components/UploadWorkspace";
import {ScanUploadProvider} from "./_context/ScanUploadContext";
import styles from "./island.module.scss";

/** Lays out the upload-scans sections under the provider. */
function UploadScreen(): React.JSX.Element {
  return (
    <section className={styles["contentSection"]}>
      <UploadBreadcrumb />
      <WorkflowProgress currentStep='upload' />
      <UploadHeader />
      <div className={styles["contentGrid"]}>
        <UploadWorkspace />
        <UploadSidebar />
      </div>
      <UploadPromptContainer />
      <OnboardingOverlay />
    </section>
  );
}

/**
 * Client-side island for the scan upload workflow.
 *
 * @returns The provider-wrapped upload screen.
 */
export default function RenderUploadScansScreen(): React.JSX.Element {
  return (
    <ScanUploadProvider>
      <UploadScreen />
    </ScanUploadProvider>
  );
}
