import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./form-skeleton.module.css";
import {Skeleton} from "./skeleton";

/**
 * Represents the configurable props for the {@link FormSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so form-shaped placeholders can be composed into
 * dialogs, cards, and pages while still supporting accessibility annotations.
 */
interface FormSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of labeled field placeholders rendered before the submit action.
   *
   * @default 4
   */
  fields?: number;
}

/**
 * Renders a skeleton placeholder shaped like a labeled form.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Uses stacked label and input placeholders plus a trailing submit action placeholder to
 * preserve form layout during async initialization or schema-driven rendering.
 *
 * @example
 * ```tsx
 * <FormSkeleton fields={5} aria-label="Loading profile form" />
 * ```
 *
 * @see {@link FormSkeletonProps} for available props
 */
const FormSkeleton = React.forwardRef<HTMLDivElement, FormSkeletonProps>(
  ({fields = 4, className, ...props}: Readonly<FormSkeletonProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.form, className)}
      {...props}>
      {Array.from({length: fields}, (_, index) => (
        <div
          key={index}
          className={styles.field}>
          <Skeleton className={styles.label} />
          <Skeleton className={styles.input} />
        </div>
      ))}
      <Skeleton className={styles.submit} />
    </div>
  ),
);

FormSkeleton.displayName = "FormSkeleton";

export {FormSkeleton};
export type {FormSkeletonProps};
