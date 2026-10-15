"use client";

import {Check, Copy} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./copy-button.module.css";

/**
 * Represents the configurable props for the {@link CopyButton} component.
 *
 * @remarks
 * Extends native `<button>` attributes while reserving `children` for the internal icon
 * swap and exposing a required clipboard value.
 */
interface CopyButtonProps extends Readonly<Omit<React.ComponentPropsWithRef<"button">, "children">> {
  /** Localizable idle accessible name. @default "Copy to clipboard" */
  readonly copyLabel?: string;
  /** Localizable success name and polite status announcement. @default "Copied" */
  readonly copiedLabel?: string;
  /** Localizable failure name and polite status announcement. @default "Copy failed" */
  readonly errorLabel?: string;
  /**
   * The text value copied to the clipboard when the button is activated.
   */
  readonly value: string;
  /**
   * Duration in milliseconds to show the success state before restoring the copy icon.
   *
   * @default 2000
   */
  readonly timeout?: number;
  /**
   * Receives clipboard failures, including an unavailable Clipboard API.
   * Not called for canceled activations or work completed after unmount.
   * The button also exposes `data-state="error"` and a default failure label.
   */
  readonly onCopyError?: (error: unknown) => void;
}

/**
 * A compact icon button that copies text to the clipboard.
 *
 * @remarks
 * **Rendering Context**: Client component.
 *
 * Uses `navigator.clipboard.writeText` when available and swaps from a copy icon to a
 * confirmation icon for a configurable duration after a successful copy. If clipboard
 * access fails, `onCopyError` receives the failure and the button exposes an error
 * state. Caller-provided accessible labels are preserved.
 *
 * @example
 * ```tsx
 * <CopyButton value="npm install @arolariu/components" />
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText | MDN Clipboard.writeText}
 */
function CopyButton({
  ref,
  value,
  timeout = 2000,
  className,
  onClick,
  onCopyError,
  disabled,
  copyLabel = "Copy to clipboard",
  copiedLabel = "Copied",
  errorLabel = "Copy failed",
  ...props
}: Readonly<CopyButtonProps>): React.JSX.Element {
  const [status, setStatus] = React.useState<"idle" | "copied" | "error">("idle");
  const timeoutRef = React.useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const mountedRef = React.useRef(false);
  const requestRef = React.useRef(0);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      if (timeoutRef.current !== null) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showCopied = React.useCallback((): void => {
    setStatus("copied");
    timeoutRef.current = globalThis.setTimeout(() => {
      timeoutRef.current = null;
      setStatus("idle");
    }, timeout);
  }, [timeout]);

  const handleCopy = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      const request = ++requestRef.current;
      if (timeoutRef.current !== null) globalThis.clearTimeout(timeoutRef.current);

      // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Clipboard access is browser-only and required for this client component.
      const {clipboard} = globalThis.navigator;

      try {
        if (!clipboard?.writeText) throw new Error("Clipboard API is unavailable");
        await clipboard.writeText(value);
        if (!mountedRef.current || request !== requestRef.current) return;
        showCopied();
      } catch (error: unknown) {
        if (!mountedRef.current || request !== requestRef.current) return;
        setStatus("error");
        onCopyError?.(error);
      }
    },
    [disabled, onClick, onCopyError, showCopied, value],
  );

  const message = status === "copied" ? copiedLabel : status === "error" ? errorLabel : "";
  return (
    <>
      <button
        ref={ref}
        type='button'
        aria-label={message || copyLabel}
        className={cn(styles.copyButton, className)}
        disabled={disabled}
        onClick={handleCopy}
        data-state={status}
        {...props}>
        {status === "copied" ? (
          <Check
            aria-hidden='true'
            className={styles.icon}
          />
        ) : (
          <Copy
            aria-hidden='true'
            className={styles.icon}
          />
        )}
      </button>
      <span
        role='status'
        aria-atomic='true'
        className={styles.status}>
        {message}
      </span>
    </>
  );
}
CopyButton.displayName = "CopyButton";

export {CopyButton};
export type {CopyButtonProps};
