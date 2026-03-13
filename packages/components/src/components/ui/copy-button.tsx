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
interface CopyButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * The text value copied to the clipboard when the button is activated.
   */
  value: string;
  /**
   * Duration in milliseconds to show the success state before restoring the copy icon.
   *
   * @default 2000
   */
  timeout?: number;
}

/**
 * A compact icon button that copies text to the clipboard.
 *
 * @remarks
 * **Rendering Context**: Client component.
 *
 * Uses `navigator.clipboard.writeText` when available and swaps from a copy icon to a
 * confirmation icon for a configurable duration after a successful copy. If clipboard
 * access fails, the button remains interactive without throwing to the UI.
 *
 * @example
 * ```tsx
 * <CopyButton value="npm install @arolariu/components" />
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText | MDN Clipboard.writeText}
 */
const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({value, timeout = 2000, className, onClick, disabled, ...props}, ref) => {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

    React.useEffect(() => () => {
      if (timeoutRef.current !== null) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    }, []);

    const handleCopy = React.useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);

      // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Clipboard access is browser-only and required for this client component.
      const {clipboard} = globalThis.navigator;

      if (event.defaultPrevented || disabled || !clipboard?.writeText) {
        return;
      }

      try {
        await clipboard.writeText(value);
        setCopied(true);

        if (timeoutRef.current !== null) {
          globalThis.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = globalThis.setTimeout(() => {
          setCopied(false);
        }, timeout);
      } catch {
        // Clipboard access can fail in unsupported or insecure contexts.
      }
    }, [disabled, onClick, timeout, value]);

    return (
      <button
        ref={ref}
        type="button"
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className={cn(styles.copyButton, className)}
        disabled={disabled}
        onClick={handleCopy}
        {...props}>
        {copied ? (
          <Check
            aria-hidden="true"
            className={styles.icon}
          />
        ) : (
          <Copy
            aria-hidden="true"
            className={styles.icon}
          />
        )}
      </button>
    );
  },
);
CopyButton.displayName = "CopyButton";

export {CopyButton};
export type {CopyButtonProps};
