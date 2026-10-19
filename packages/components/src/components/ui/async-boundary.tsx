"use client";

import * as React from "react";

import {ErrorBoundary, type ErrorBoundaryProps} from "./error-boundary";
import {Spinner} from "./spinner";
import {VisuallyHidden} from "./visually-hidden";

/**
 * Represents the configurable props for the {@link AsyncBoundary} component.
 *
 * @remarks
 * Extends the shared error boundary contract with a Suspense fallback so async child
 * trees can handle loading and error states through a single composition primitive.
 */
interface AsyncBoundaryProps extends Omit<ErrorBoundaryProps, "children"> {
  /**
   * Content that may suspend or throw during rendering.
   */
  readonly children: React.ReactNode;
  /**
   * Fallback UI rendered while descendants are suspended. Omission uses a decorative
   * spinner announced through the boundary's persistent status region (see
   * `loadingLabel`). A custom fallback, or explicit `null` (nothing while pending),
   * replaces both: the caller then owns any loading announcement.
   *
   * @default a decorative `<Spinner />` announced through `loadingLabel`
   */
  readonly loadingFallback?: React.ReactNode;
  /**
   * Localizable text written into the persistent, visually hidden status region while the
   * default fallback is shown, and removed when it unmounts. Ignored when `loadingFallback`
   * is provided; an empty string keeps the region silent.
   *
   * @default "Loading"
   */
  readonly loadingLabel?: string;
}

/** Props for the private default fallback that reports its mounted lifetime to the boundary. */
interface DefaultLoadingFallbackProps {
  readonly onPendingChange: (pending: boolean) => void;
}

/** Decorative default fallback; its mount and unmount drive the boundary's status region. */
function DefaultLoadingFallback({onPendingChange}: Readonly<DefaultLoadingFallbackProps>): React.JSX.Element {
  React.useEffect(() => {
    onPendingChange(true);
    return () => {
      onPendingChange(false);
    };
  }, [onPendingChange]);

  return (
    <Spinner
      role='presentation'
      aria-hidden='true'
      aria-label={undefined}
    />
  );
}

/**
 * Combines Suspense loading behavior with error boundary recovery semantics.
 *
 * @remarks
 * **Rendering Context**: Client component.
 *
 * Wrap async child trees with this component to centralize loading and error handling.
 * The loading fallback is rendered by `React.Suspense`, while rendering errors are
 * delegated to the shared client-side {@link ErrorBoundary}.
 * Descendants must read a stable Suspense resource; creating a new promise on every
 * render never completes. A retry renderer must replace a rejected resource before
 * invoking its reset action. This component does not fetch, cache or recreate resources.
 *
 * With the default fallback, the boundary also renders a visually hidden
 * `<span role="status">` after its content, outside `Suspense` and the error boundary, for
 * its whole lifetime. Mounting the default fallback writes `loadingLabel` into that region and
 * unmounting it (content resolved or an error caught) clears it, so assistive technology can
 * announce loading that starts after the boundary mounted. A boundary that mounts already
 * suspended inserts the region empty and fills it one commit later, which some assistive
 * technology may miss; a status element inserted already populated is not reliably announced.
 * The spinner itself is decorative. Where the parent's content model forbids a `<span>` (for
 * example `<ul>` or table sections), pass a `loadingFallback` that fits the context and
 * announce through your own persistent region. While a server-streamed boundary is still
 * pending before hydration, the region stays empty.
 *
 * @example
 * ```tsx
 * <AsyncBoundary loadingLabel="Loading the dashboard">
 *   <AsyncDataPanel />
 * </AsyncBoundary>
 *
 * // A custom fallback replaces the default spinner and its announcement.
 * <AsyncBoundary loadingFallback={<CardSkeleton />}>
 *   <AsyncDataPanel />
 * </AsyncBoundary>
 * ```
 *
 * @see {@link AsyncBoundaryProps} for available props
 */
function AsyncBoundary({
  children,
  loadingFallback,
  loadingLabel = "Loading",
  ...errorBoundaryProps
}: Readonly<AsyncBoundaryProps>): React.JSX.Element {
  const [pending, setPending] = React.useState(false);
  const usesDefaultFallback = loadingFallback === undefined;

  return (
    <>
      <ErrorBoundary {...errorBoundaryProps}>
        <React.Suspense fallback={usesDefaultFallback ? <DefaultLoadingFallback onPendingChange={setPending} /> : loadingFallback}>
          {children}
        </React.Suspense>
      </ErrorBoundary>
      {usesDefaultFallback ? (
        <VisuallyHidden
          role='status'
          aria-live='polite'
          aria-atomic='true'>
          {pending ? loadingLabel : null}
        </VisuallyHidden>
      ) : null}
    </>
  );
}

AsyncBoundary.displayName = "AsyncBoundary";

export {AsyncBoundary};
export type {AsyncBoundaryProps};
