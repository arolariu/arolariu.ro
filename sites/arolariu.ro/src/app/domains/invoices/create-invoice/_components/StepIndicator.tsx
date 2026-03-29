"use client";

/**
 * @fileoverview Step indicator component for the create invoice wizard.
 * @module app/domains/invoices/create-invoice/_components/StepIndicator
 *
 * @remarks
 * Visual indicator showing current position in the 3-step wizard with:
 * - Numbered step circles
 * - Step labels
 * - Visual states (completed, active, upcoming)
 * - Connecting lines between steps
 */

import {useTranslations} from "next-intl";
import {TbCheck, TbFileInvoice, TbPhoto, TbReceipt} from "react-icons/tb";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import styles from "./StepIndicator.module.scss";

/**
 * Step data configuration.
 */
interface StepConfig {
  id: "select-scans" | "details" | "review";
  labelKey: "selectScans" | "details" | "review";
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {id: "select-scans", labelKey: "selectScans", icon: <TbPhoto />},
  {id: "details", labelKey: "details", icon: <TbFileInvoice />},
  {id: "review", labelKey: "review", icon: <TbReceipt />},
];

/**
 * Individual step indicator item.
 */
function StepItem({
  step,
  isActive,
  isCompleted,
}: Readonly<{
  step: StepConfig;
  isActive: boolean;
  isCompleted: boolean;
}>): React.JSX.Element {
  const t = useTranslations("Invoices.CreateInvoice.steps");

  const circleClassName = [styles["stepCircle"], isActive && styles["stepCircleActive"], isCompleted && styles["stepCircleCompleted"]]
    .filter(Boolean)
    .join(" ");

  const labelClassName = [styles["stepLabel"], isActive && styles["stepLabelActive"]].filter(Boolean).join(" ");

  return (
    <div className={styles["stepItem"]}>
      <div className={circleClassName}>{isCompleted ? <TbCheck className={styles["stepCheckIcon"]} /> : step.icon}</div>
      <span className={labelClassName}>{t(step.labelKey)}</span>
    </div>
  );
}

/**
 * Step indicator component.
 *
 * @returns JSX element with step indicator UI
 */
export default function StepIndicator(): React.JSX.Element {
  const {currentStep} = useCreateInvoiceContext();

  const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <div className={styles["container"]}>
      {STEPS.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;

        return (
          <div
            key={step.id}
            className={styles["stepWrapper"]}>
            <StepItem
              step={step}
              isActive={isActive}
              isCompleted={isCompleted}
            />

            {/* Connecting line (not shown after last step) */}
            {index < STEPS.length - 1 && <div className={`${styles["stepLine"]} ${isCompleted ? styles["stepLineCompleted"] : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}
