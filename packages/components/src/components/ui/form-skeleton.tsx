import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./form-skeleton.module.css";
import {Skeleton, type SkeletonProps} from "./skeleton";

/**
 * Represents the configurable props for the {@link FormSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so form-shaped placeholders can be composed into
 * dialogs, cards, and pages while still supporting accessibility annotations.
 */
interface FormSkeletonProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Number of labeled field placeholders: a nonnegative finite integer at most 10,000.
   * Zero preserves the submit placeholder without fields.
   *
   * @default 4
   */
  readonly fields?: number;
  /** Enables shared Skeleton motion; reduced motion remains static. @default true */
  readonly animated?: SkeletonProps["animated"];
}

/**
 * Renders a skeleton placeholder shaped like a labeled form.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Uses stacked label and input placeholders plus a trailing submit action placeholder to
 * preserve form layout during async initialization or schema-driven rendering.
 * Labels, inputs and the submit shape are decorative, not actual form controls, and the
 * skeleton announces nothing. Announce loading through a status region that is mounted
 * before loading starts and receives its text when loading begins, such as a persistent
 * `VisuallyHidden` status or `useAnnounce`: a status element inserted already populated is
 * not reliably announced, and `aria-busy` on a live region defers its announcements.
 * `animated={false}` and the shared reduced-motion policy keep placeholders static.
 *
 * @throws {RangeError} Before allocation when fields is not a nonnegative finite
 * integer or exceeds 10,000.
 *
 * @example
 * ```tsx
 * <VisuallyHidden role="status">{loading ? "Loading form" : null}</VisuallyHidden>
 * {loading ? <FormSkeleton fields={5} /> : <ProfileForm />}
 * ```
 *
 * @see {@link FormSkeletonProps} for available props
 */
const FormSkeleton = ({ref, fields = 4, animated = true, className, ...props}: Readonly<FormSkeletonProps>): React.JSX.Element => {
  if (!Number.isSafeInteger(fields) || fields < 0 || fields > 10_000) {
    throw new RangeError("FormSkeleton fields must be a nonnegative finite integer no greater than 10,000.");
  }

  return (
    <div
      ref={ref}
      className={cn(styles.form, className)}
      {...props}>
      {Array.from({length: fields}, (_, index) => (
        <div
          key={index}
          className={styles.field}>
          <Skeleton
            aria-hidden
            animated={animated}
            className={styles.label}
          />
          <Skeleton
            aria-hidden
            animated={animated}
            className={styles.input}
          />
        </div>
      ))}
      <Skeleton
        aria-hidden
        animated={animated}
        className={styles.submit}
      />
    </div>
  );
};

FormSkeleton.displayName = "FormSkeleton";

export {FormSkeleton};
export type {FormSkeletonProps};
