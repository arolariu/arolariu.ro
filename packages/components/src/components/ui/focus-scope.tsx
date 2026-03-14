"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./focus-scope.module.css";

/**
 * Represents the configurable props for the {@link FocusScope} component.
 */
interface FocusScopeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether focus should be trapped within the scope.
   *
   * @defaultValue true
   */
  contain?: boolean;
  /**
   * Whether to restore focus to the previously focused element on unmount.
   *
   * @defaultValue true
   */
  restoreFocus?: boolean;
  /**
   * Whether to auto-focus the first focusable element on mount.
   *
   * @defaultValue false
   */
  autoFocus?: boolean;
  /**
   * Content rendered within the focus scope.
   */
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex >= 0,
  );
}

/**
 * Traps keyboard focus within a container element.
 *
 * @remarks
 * Renders a `<div>` and cycles `Tab` and `Shift+Tab` navigation through its focusable
 * descendants without allowing focus to escape the scope. Use it for custom dialogs,
 * drawers, and composite widgets that need explicit focus containment and restoration.
 *
 * Base UI dialog-style primitives already manage focus internally, so prefer those
 * built-in mechanisms when available.
 *
 * @example
 * ```tsx
 * <FocusScope contain autoFocus>
 *   <input placeholder='First' />
 *   <input placeholder='Second' />
 *   <button type='submit'>Submit</button>
 * </FocusScope>
 * ```
 */
const FocusScope = React.forwardRef<HTMLDivElement, FocusScopeProps>(
  ({contain = true, restoreFocus = true, autoFocus = false, children, className, ...props}, ref) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const previousFocusRef = React.useRef<Element | null>(null);

    React.useEffect(() => {
      previousFocusRef.current = document.activeElement;

      if (autoFocus && containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);

        focusable[0]?.focus();
      }

      return () => {
        if (restoreFocus && previousFocusRef.current instanceof HTMLElement) {
          previousFocusRef.current.focus();
        }
      };
    }, [autoFocus, restoreFocus]);

    React.useEffect(() => {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent): void => {
        if (!contain || event.key !== "Tab") {
          return;
        }

        const focusable = getFocusableElements(container);

        if (focusable.length === 0) {
          return;
        }

        const [first] = focusable;
        const last = focusable.at(-1);

        if (event.shiftKey && first?.isSameNode(document.activeElement)) {
          event.preventDefault();
          last?.focus();
          return;
        }

        if (!event.shiftKey && last?.isSameNode(document.activeElement)) {
          event.preventDefault();
          first?.focus();
        }
      };

      container.addEventListener("keydown", handleKeyDown);

      return () => {
        container.removeEventListener("keydown", handleKeyDown);
      };
    }, [contain]);

    return (
      <div
        ref={(node) => {
          containerRef.current = node;

          if (typeof ref === "function") {
            ref(node);
            return;
          }

          if (ref) {
            ref.current = node;
          }
        }}
        className={cn(styles.scope, className)}
        role={props.role ?? "group"}
        tabIndex={props.tabIndex ?? -1}
        {...props}>
        {children}
      </div>
    );
  },
);
FocusScope.displayName = "FocusScope";

export {FocusScope};
export type {FocusScopeProps};
