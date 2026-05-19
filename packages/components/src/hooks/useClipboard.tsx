"use client";

import * as React from "react";

/**
 * Options for the `useClipboard` hook.
 */
export interface UseClipboardOptions {
  /**
   * The duration in milliseconds after which the `copied` state resets to `false`.
   *
   * @defaultValue 2000
   */
  timeout?: number;
}

/**
 * Return type for the `useClipboard` hook.
 */
export interface UseClipboardReturn {
  /**
   * Whether the text was successfully copied to the clipboard.
   */
  copied: boolean;

  /**
   * Copies the provided text to the clipboard.
   *
   * @param text - The text to copy.
   * @returns A promise that resolves when the copy operation completes.
   */
  copy: (text: string) => Promise<void>;

  /**
   * The error that occurred during the copy operation, or `null` if no error occurred.
   */
  error: Error | null;
}

/**
 * Copies text to the clipboard with success/error state management.
 *
 * @remarks
 * This hook provides a simple interface for copying text to the clipboard using
 * the Clipboard API. It manages the `copied` state that automatically resets
 * after a configurable timeout, and handles errors gracefully when the Clipboard
 * API is unavailable or the operation fails.
 *
 * The hook is SSR-safe and will handle the case where `navigator.clipboard` is
 * not available (e.g., in non-secure contexts or older browsers).
 *
 * @param options - Configuration options for the hook.
 * @returns An object containing the copied state, copy function, and any error.
 *
 * @example
 * ```tsx
 * function CopyButton({textToCopy}: {textToCopy: string}) {
 *   const {copied, copy, error} = useClipboard({timeout: 3000});
 *
 *   return (
 *     <div>
 *       <button onClick={() => copy(textToCopy)}>
 *         {copied ? "Copied!" : "Copy to clipboard"}
 *       </button>
 *       {error && <span>Failed to copy: {error.message}</span>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ShareLink({url}: {url: string}) {
 *   const {copied, copy} = useClipboard();
 *
 *   return (
 *     <button onClick={() => copy(url)} disabled={copied}>
 *       {copied ? "✓ Copied" : "Share link"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const {timeout = 2000} = options;

  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous helper: clears any pending reset and schedules a fresh one.
  // Extracted to keep the ref read+write off the async path (satisfies
  // require-atomic-updates: copy() never touches timeoutRef directly).
  const scheduleReset = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, timeout);
  }, [timeout]);

  const copy = React.useCallback(
    async (text: string): Promise<void> => {
      setError(null);

      try {
        if (globalThis.navigator?.clipboard === undefined) {
          throw new Error("Clipboard API is not available");
        }

        await globalThis.navigator.clipboard.writeText(text);
        setCopied(true);
        scheduleReset();
      } catch (error_) {
        const errorMessage = error_ instanceof Error ? error_ : new Error("Failed to copy to clipboard");
        setError(errorMessage);
        setCopied(false);
      }
    },
    [scheduleReset],
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {copied, copy, error};
}
