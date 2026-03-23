import * as React from "react";

import {ErrorBoundary, type ErrorBoundaryProps} from "./error-boundary";
import {Spinner} from "./spinner";

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
  children: React.ReactNode;
  /**
   * Fallback UI rendered while descendants are suspended.
   *
   * @default <Spinner />
   */
  loadingFallback?: React.ReactNode;
}

/**
 * Combines Suspense loading behavior with error boundary recovery semantics.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible composition component.
 *
 * Wrap async child trees with this component to centralize loading and error handling.
 * The loading fallback is rendered by `React.Suspense`, while rendering errors are
 * delegated to the shared client-side {@link ErrorBoundary}.
 *
 * @example
 * ```tsx
 * <AsyncBoundary loadingFallback={<CardSkeleton />}>
 *   <AsyncDataPanel />
 * </AsyncBoundary>
 * ```
 *
 * @see {@link AsyncBoundaryProps} for available props
 */
function AsyncBoundary({children, loadingFallback, ...errorBoundaryProps}: Readonly<AsyncBoundaryProps>): React.JSX.Element {
  return (
    <ErrorBoundary {...errorBoundaryProps}>
      <React.Suspense fallback={loadingFallback ?? <Spinner />}>{children}</React.Suspense>
    </ErrorBoundary>
  );
}

AsyncBoundary.displayName = "AsyncBoundary";

export {AsyncBoundary};
export type {AsyncBoundaryProps};
