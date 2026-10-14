import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./stepper.module.css";
import {VisuallyHidden} from "./visually-hidden";

/**
 * Represents the configurable props for the {@link Stepper} component.
 *
 * @remarks
 * Extends native `<div>` attributes so step progress indicators can expose data
 * attributes, testing hooks, and ARIA metadata while remaining layout-flexible.
 */
interface StepperProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Labels for each step in the progress sequence.
   */
  readonly steps: ReadonlyArray<string>;
  /**
   * Zero-based index of the currently active step.
   */
  readonly activeStep: number;
  /**
   * Caller-owned accessible text appended to completed steps.
   * Pass localized text, or an empty string to suppress the announcement.
   *
   * @default "Completed"
   */
  readonly completedLabel?: string;
  /**
   * Visual orientation of the stepper layout.
   *
   * @default "horizontal"
   */
  readonly orientation?: "horizontal" | "vertical";
}

/**
 * Displays a multi-step progress indicator for wizard-like workflows.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a semantic list of steps and marks each item as completed, active, or upcoming
 * based on the supplied zero-based active index. Use it to communicate progress across
 * onboarding flows, checkout funnels, or multi-step forms.
 *
 * @example
 * ```tsx
 * <Stepper
 *   steps={["Account", "Profile", "Review"]}
 *   activeStep={1}
 * />
 * ```
 *
 * @see {@link https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/progressbar/progressbar.html | WAI progress indicator guidance}
 */
const Stepper = ({
  ref,
  steps,
  activeStep,
  completedLabel = "Completed",
  orientation = "horizontal",
  className,
  ...props
}: Readonly<StepperProps>): React.JSX.Element => (
  <div
    ref={ref}
    role='list'
    aria-label='Progress'
    data-orientation={orientation}
    className={cn(styles.stepper, orientation === "vertical" && styles.vertical, className)}
    {...props}>
    {steps.map((label, index) => {
      let state: "completed" | "active" | "upcoming" = "upcoming";

      if (index < activeStep) {
        state = "completed";
      } else if (index === activeStep) {
        state = "active";
      }

      return (
        <div
          key={`${label}-${index}`}
          role='listitem'
          aria-current={state === "active" ? "step" : undefined}
          className={styles.step}
          data-state={state}>
          <div
            className={styles.indicator}
            aria-hidden='true'>
            {state === "completed" ? "✓" : index + 1}
          </div>
          {index < steps.length - 1 ? (
            <div
              className={styles.connector}
              aria-hidden='true'
            />
          ) : null}
          <span className={styles.label}>{label}</span>
          {state === "completed" && completedLabel ? <VisuallyHidden> {completedLabel}</VisuallyHidden> : null}
        </div>
      );
    })}
  </div>
);
Stepper.displayName = "Stepper";

export {Stepper};
export type {StepperProps};
