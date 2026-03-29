"use client";

/**
 * @fileoverview Workflow progress indicator for the invoice creation process.
 * @module app/domains/invoices/_components/WorkflowProgress
 *
 * @remarks
 * Displays a 3-step workflow progress indicator:
 * 1. Upload - Upload scans
 * 2. Review - Review scans
 * 3. Create - Create invoice
 *
 * Shows current step with appropriate styling and connects steps with lines.
 * Responsive: horizontal on desktop, compact on mobile.
 */

import {useTranslations} from "next-intl";
import {TbCheck, TbEye, TbFileInvoice, TbUpload} from "react-icons/tb";
import styles from "./WorkflowProgress.module.scss";

type WorkflowStep = "upload" | "review" | "create";

type Props = {
  currentStep: WorkflowStep;
};

/**
 * Maps step order to determine completion status.
 */
const STEP_ORDER: Record<WorkflowStep, number> = {
  upload: 1,
  review: 2,
  create: 3,
};

/**
 * Step configuration with icons.
 */
const STEP_CONFIG: Record<WorkflowStep, {icon: React.ReactNode; key: string}> = {
  upload: {icon: <TbUpload />, key: "upload"},
  review: {icon: <TbEye />, key: "review"},
  create: {icon: <TbFileInvoice />, key: "create"},
};

/**
 * Individual step component.
 */
function Step({
  step,
  isActive,
  isCompleted,
  label,
}: Readonly<{
  step: WorkflowStep;
  isActive: boolean;
  isCompleted: boolean;
  label: string;
}>): React.JSX.Element {
  const config = STEP_CONFIG[step];
  const circleClass = isCompleted ? styles["stepCompleted"] : isActive ? styles["stepActive"] : styles["stepFuture"];

  return (
    <div className={styles["step"]}>
      <div className={`${styles["stepCircle"]} ${circleClass}`}>{isCompleted ? <TbCheck /> : config.icon}</div>
      <span
        className={`${styles["stepLabel"]} ${isActive ? styles["stepLabelActive"] : ""}`}
        aria-current={isActive ? "step" : undefined}>
        {label}
      </span>
    </div>
  );
}

/**
 * Connector line between steps.
 */
function Connector({isCompleted}: Readonly<{isCompleted: boolean}>): React.JSX.Element {
  return (
    <div
      className={`${styles["connector"]} ${isCompleted ? styles["connectorCompleted"] : ""}`}
      aria-hidden='true'
    />
  );
}

/**
 * Workflow progress indicator component.
 *
 * @param props - Component props
 * @param props.currentStep - Current step in the workflow
 * @returns JSX element with progress indicator
 *
 * @example
 * ```tsx
 * <WorkflowProgress currentStep="upload" />
 * ```
 */
export default function WorkflowProgress({currentStep}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.Shared.workflowProgress");

  const currentOrder = STEP_ORDER[currentStep];

  return (
    <nav
      className={styles["container"]}
      aria-label='Invoice workflow progress'>
      <Step
        step='upload'
        isActive={currentStep === "upload"}
        isCompleted={currentOrder > STEP_ORDER["upload"]}
        label={t("upload")}
      />
      <Connector isCompleted={currentOrder > STEP_ORDER["upload"]} />
      <Step
        step='review'
        isActive={currentStep === "review"}
        isCompleted={currentOrder > STEP_ORDER["review"]}
        label={t("review")}
      />
      <Connector isCompleted={currentOrder > STEP_ORDER["review"]} />
      <Step
        step='create'
        isActive={currentStep === "create"}
        isCompleted={currentOrder > STEP_ORDER["create"]}
        label={t("create")}
      />
    </nav>
  );
}
