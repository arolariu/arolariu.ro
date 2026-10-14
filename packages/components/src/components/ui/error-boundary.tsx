"use client";

import * as React from "react";

import styles from "./error-boundary.module.css";

/**
 * Represents the configurable props for the {@link ErrorBoundary} component.
 *
 * @remarks
 * Accepts child content plus an optional fallback renderer and error callback for
 * recovery-oriented error handling in React client trees.
 */
interface ErrorBoundaryProps {
  /** Localized title for the built-in fallback. @default "Something went wrong" */
  readonly errorTitle?: string;
  /** Localized error detail; `null` omits it. Defaults to the captured error message. */
  readonly errorDescription?: React.ReactNode;
  /** Localized accessible and visible retry label. @default "Try again" */
  readonly retryLabel?: string;
  /**
   * Content rendered when no error has been captured.
   */
  readonly children: React.ReactNode;
  /**
   * Custom fallback UI or render function invoked with the current error and reset action.
   * Explicit `null` renders no fallback. Omit this prop to use the default alert.
   */
  readonly fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  /**
   * Callback invoked after an error has been captured.
   */
  readonly onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Represents the tracked state for the {@link ErrorBoundary} component.
 *
 * @remarks
 * Stores the most recent rendering error so the boundary can swap to fallback UI and
 * later clear that error when `reset()` is invoked.
 */
interface ErrorBoundaryState {
  /**
   * The latest captured error, or `null` when the subtree is healthy.
   */
  readonly error: Error | null;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown rendering failure", {cause: error});
}

/**
 * Catches JavaScript errors in descendant client components and renders fallback UI.
 *
 * @remarks
 * **Rendering Context**: Client component.
 *
 * React currently requires class components for error boundaries. This implementation
 * captures render-time and lifecycle errors, not asynchronous event handler exceptions,
 * and exposes a `reset()` pathway so callers can retry the failed subtree. Resetting
 * does not repair its data or promises: fix the condition or replace the rejected
 * resource first. An unchanged failure is caught again, never reported as success.
 * This boundary does not catch errors during server rendering or in itself.
 * Non-Error throws are normalized to an Error whose `cause` preserves the original
 * value; throwing `null` cannot be mistaken for a healthy state.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}>
 *   <DashboardPanel />
 * </ErrorBoundary>
 * ```
 *
 * @see {@link ErrorBoundaryProps} for available props
 */
class ErrorBoundary extends React.Component<Readonly<ErrorBoundaryProps>, Readonly<ErrorBoundaryState>> {
  /** Stores a descendant's render failure for the next fallback render. */
  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {error: normalizeError(error)};
  }

  static readonly displayName = "ErrorBoundary";

  /** Starts with a healthy subtree; no child work is performed in the constructor. */
  constructor(props: Readonly<ErrorBoundaryProps>) {
    super(props);
    this.state = {error: null};
  }

  /** Rerenders when the descendant tree, recovery UI, reporter or captured failure changes. */
  override shouldComponentUpdate(nextProps: Readonly<ErrorBoundaryProps>, nextState: Readonly<ErrorBoundaryState>): boolean {
    const {children, fallback, onError, errorTitle, errorDescription, retryLabel} = this.props;
    const {error} = this.state;

    return (
      nextProps.children !== children
      || nextProps.fallback !== fallback
      || nextProps.onError !== onError
      || nextProps.errorTitle !== errorTitle
      || nextProps.errorDescription !== errorDescription
      || nextProps.retryLabel !== retryLabel
      || nextState.error !== error
    );
  }

  /** Reports React's captured error and component stack after the fallback commits. */
  override componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    const {onError} = this.props;
    const {error: capturedError} = this.state;

    onError?.(capturedError ?? normalizeError(error), errorInfo);
  }

  /** Clears the captured failure and remounts descendants; callers own repairing the cause. */
  handleReset = (): void => {
    // eslint-disable-next-line react/no-set-state -- Error boundaries must clear internal error state to retry rendering.
    this.setState({error: null});
  };

  // eslint-disable-next-line sonarjs/function-return-type -- Error boundary render paths intentionally return generic ReactNode content.
  override render(): React.ReactNode {
    const {error} = this.state;
    const {children, fallback, errorTitle = "Something went wrong", errorDescription, retryLabel = "Try again"} = this.props;
    const content: React.ReactNode =
      error === null ? (
        children
      ) : typeof fallback === "function" ? (
        fallback(error, this.handleReset)
      ) : fallback !== undefined ? (
        fallback
      ) : (
        <div
          className={styles.fallback}
          role='alert'>
          <p className={styles.title}>{errorTitle}</p>
          <p className={styles.message}>{errorDescription === undefined ? error.message : errorDescription}</p>
          <button
            type='button'
            className={styles.retry}
            onClick={this.handleReset}>
            {retryLabel}
          </button>
        </div>
      );

    return content;
  }
}

export {ErrorBoundary};
export type {ErrorBoundaryProps};
