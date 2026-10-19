import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./loading-overlay.module.css";
import {Spinner} from "./spinner";

/**
 * Represents the configurable props for the {@link LoadingOverlay} component.
 *
 * @remarks
 * Extends native `<div>` attributes so overlays can be positioned inside relatively
 * positioned containers and visually customized. Native props, `className` and `ref`
 * target the visual overlay element, not the persistent status region.
 */
interface LoadingOverlayProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Whether the visual overlay is rendered and `loadingLabel` is written into the
   * persistent status region.
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
  /**
   * Localizable text written into the persistent, visually hidden status region while
   * `visible` is true and removed when it becomes false. Changing it while visible replaces
   * the region text. An empty string keeps the region mounted but silent, for example when
   * another live region already announces the operation.
   *
   * @default "Loading"
   */
  readonly loadingLabel?: string;
}

/**
 * Renders a centered loading overlay for pending asynchronous operations and writes its
 * loading message into a persistent status region.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * The component always renders a visually hidden `role="status"` region, also while
 * `visible` is false, and writes `loadingLabel` into it only while `visible` is true.
 * Keep the overlay mounted and toggle `visible`: a status region inserted already
 * populated, as with `{loading && <LoadingOverlay />}` or a first render with `visible`,
 * is not reliably announced. Live regions announce content changes, never accessible
 * names, so the message is region text rather than an `aria-label`.
 *
 * The visual overlay renders only while `visible` is true. It shows a decorative spinner,
 * or custom `children` as visible, informational (non-interactive) content that is not
 * announced; keep `loadingLabel` in sync with what they convey. `ref`, `className` and
 * native `<div>` props, including ARIA attributes, apply to this overlay element, which
 * has no role: give it one (for example `role="progressbar"` with value attributes) before
 * naming it with `aria-label` or `aria-labelledby`.
 *
 * This is visual feedback, not an interaction blocker or modal. The overlay ignores
 * pointer input and leaves keyboard interaction underneath unchanged.
 *
 * Blocking is explicitly owned by the caller: mark the relatively positioned owner's
 * content `aria-busy`, place background content in an `inert` wrapper, and disable native
 * controls where appropriate. Keep this overlay outside both the inert content and the
 * busy region so its status announcements are not deferred by `aria-busy`. The owner
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
 *   <LoadingOverlay visible={loading} loadingLabel="Saving" />
 * </div>
 * ```
 *
 * @see {@link LoadingOverlayProps} for available props
 */
const LoadingOverlay = ({
  ref,
  visible = true,
  blur = false,
  loadingLabel = "Loading",
  className,
  children,
  ...props
}: Readonly<LoadingOverlayProps>): React.JSX.Element => (
  <>
    <span
      className={styles.status}
      role='status'
      aria-live='polite'
      aria-atomic='true'>
      {visible ? loadingLabel : null}
    </span>
    {visible ? (
      <div
        ref={ref}
        className={cn(styles.overlay, blur && styles.blur, className)}
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
    ) : null}
  </>
);

LoadingOverlay.displayName = "LoadingOverlay";

export {LoadingOverlay};
export type {LoadingOverlayProps};
