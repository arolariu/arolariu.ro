import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./loading-overlay.module.css";
import {Spinner} from "./spinner";

/**
 * Represents the configurable props for the {@link LoadingOverlay} component.
 *
 * @remarks
 * Extends native `<div>` attributes so overlays can be positioned inside relatively
 * positioned containers, annotated for accessibility, and visually customized.
 */
interface LoadingOverlayProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Whether the overlay should be rendered.
   *
   * @default true
   */
  readonly visible?: boolean;
  /**
   * Whether a backdrop blur effect should be applied behind the overlay.
   *
   * @default false
   */
  readonly blur?: boolean;
}

/**
 * Renders a centered loading overlay for pending asynchronous operations.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * This is visual status feedback, not an interaction blocker or modal. The overlay
 * ignores pointer input and leaves keyboard interaction underneath unchanged. Its
 * status region announces custom children too; supply an accessible name as needed.
 * Custom children should be informational, not interactive controls.
 *
 * Blocking is explicitly owned by the caller: mark the relatively positioned owner
 * `aria-busy`, place background content in an `inert` wrapper, and disable native
 * controls where appropriate. Keep this overlay outside both the inert content and
 * the busy region so pending live announcements are not deferred by `aria-busy`. The owner
 * also chooses a safe focus destination when loading starts and restores it afterward.
 * A pointer-covering overlay alone cannot block keyboard activation.
 *
 * @example
 * ```tsx
 * <div className={styles.owner}>
 *   <section aria-busy={loading}>
 *     <div inert={loading}>
 *       <button type="button" disabled={loading}>Save</button>
 *     </div>
 *   </section>
 *   <LoadingOverlay visible={loading} aria-label="Saving" />
 * </div>
 * ```
 *
 * @see {@link LoadingOverlayProps} for available props
 */
const LoadingOverlay = ({
  ref,
  visible = true,
  blur = false,
  className,
  children,
  ...props
}: Readonly<LoadingOverlayProps>): React.JSX.Element | null => {
  if (!visible) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(styles.overlay, blur && styles.blur, className)}
      role='status'
      aria-live='polite'
      aria-atomic='true'
      aria-label={children === null || children === undefined ? "Loading" : undefined}
      {...props}>
      {children ?? (
        <Spinner
          className={styles.spinner}
          role='presentation'
          aria-hidden='true'
          aria-label={undefined}
        />
      )}
    </div>
  );
};

LoadingOverlay.displayName = "LoadingOverlay";

export {LoadingOverlay};
export type {LoadingOverlayProps};
