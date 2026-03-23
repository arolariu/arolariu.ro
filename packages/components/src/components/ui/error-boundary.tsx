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
  /**
   * Content rendered when no error has been captured.
   */
  children: React.ReactNode;
  /**
   * Custom fallback UI or render function invoked with the current error and reset action.
   */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  /**
   * Callback invoked after an error has been captured.
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
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
  error: Error | null;
}

/**
 * Catches JavaScript errors in descendant client components and renders fallback UI.
 *
 * @remarks
 * **Rendering Context**: Client component.
 *
 * React currently requires class components for error boundaries. This implementation
 * captures render-time and lifecycle errors, not asynchronous event handler exceptions,
 * and exposes a `reset()` pathway so callers can retry the failed subtree.
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
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error};
  }

  static readonly displayName = "ErrorBoundary";

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {error: null};
  }

  override shouldComponentUpdate(nextProps: Readonly<ErrorBoundaryProps>, nextState: Readonly<ErrorBoundaryState>): boolean {
    const {children, fallback, onError} = this.props;
    const {error} = this.state;

    return nextProps.children !== children || nextProps.fallback !== fallback || nextProps.onError !== onError || nextState.error !== error;
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const {onError} = this.props;

    onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    // eslint-disable-next-line react/no-set-state -- Error boundaries must clear internal error state to retry rendering.
    this.setState({error: null});
  };

  // eslint-disable-next-line sonarjs/function-return-type -- Error boundary render paths intentionally return generic ReactNode content.
  override render(): React.ReactNode {
    const {error} = this.state;
    const {children, fallback} = this.props;
    const content: React.ReactNode =
      error === null
        ? children
        : typeof fallback === "function"
          ? fallback(error, this.handleReset)
          : (fallback ?? (
              <div
                className={styles.fallback}
                role='alert'>
                <p className={styles.title}>Something went wrong</p>
                <p className={styles.message}>{error.message}</p>
                <button
                  type='button'
                  className={styles.retry}
                  onClick={this.handleReset}>
                  Try again
                </button>
              </div>
            ));

    return content;
  }
}

export {ErrorBoundary};
export type {ErrorBoundaryProps};
