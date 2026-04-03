"use client";

/**
 * @fileoverview Global keyboard shortcuts for the invoices domain.
 * @module app/domains/invoices/_components/KeyboardShortcuts
 *
 * @remarks
 * Registers keyboard shortcuts for common invoice management actions:
 * - Ctrl/Cmd+N: Navigate to create invoice
 * - Ctrl/Cmd+U: Navigate to upload scans
 * - ?: Show keyboard shortcuts help dialog
 * - Escape: Close any open dialog
 *
 * Shortcuts are disabled when focus is inside input fields to avoid conflicts.
 */

import {useRouter} from "next/navigation";
import {useCallback, useEffect} from "react";

/**
 * Props for the {@link KeyboardShortcuts} component.
 */
type KeyboardShortcutsProps = {
  /** Callback to show the shortcuts help dialog. */
  onShowHelp: () => void;
};

/**
 * Keyboard shortcut definition with handler and metadata.
 */
type ShortcutDef = {
  /** The key to listen for (e.g., "k", "n", "u"). */
  key: string;
  /** Whether Ctrl (or Cmd on macOS) must be pressed. @default false */
  ctrl?: boolean;
  /** Handler function to execute when the shortcut is triggered. */
  handler: () => void;
  /** Human-readable description of what the shortcut does. */
  description: string;
};

/**
 * Checks if an element should block keyboard shortcuts.
 *
 * @param element - The currently focused element.
 * @returns True if shortcuts should be blocked (e.g., inside an input field).
 */
function shouldBlockShortcuts(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName;
  const isInput = tagName === "INPUT" || tagName === "TEXTAREA";
  const isContentEditable = element instanceof HTMLElement && element.isContentEditable;

  return isInput || isContentEditable;
}

/**
 * Registers global keyboard shortcuts for the invoice management system.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Registered Shortcuts**:
 * - `Ctrl+N` / `Cmd+N`: Navigate to create invoice page
 * - `Ctrl+U` / `Cmd+U`: Navigate to upload scans page
 * - `?`: Show keyboard shortcuts help overlay
 * - `Escape`: Close any open dialog
 *
 * **Implementation Details**:
 * - Uses `useEffect` with `keydown` event listener
 * - Checks `e.ctrlKey || e.metaKey` for modifier keys (Cmd on macOS)
 * - Prevents shortcuts when focus is in an input/textarea or contentEditable element
 * - Cleans up event listener on component unmount
 *
 * @param props - Component props containing callback to show help dialog.
 * @returns Nothing (invisible component that only registers event handlers).
 *
 * @example
 * ```tsx
 * <KeyboardShortcuts onShowHelp={() => setShowHelp(true)} />
 * ```
 */
export default function KeyboardShortcuts({onShowHelp}: Readonly<KeyboardShortcutsProps>): null {
  const router = useRouter();

  /**
   * Navigate to the create invoice page.
   */
  const navigateToCreateInvoice = useCallback((): void => {
    router.push("/domains/invoices/create-invoice");
  }, [router]);

  /**
   * Navigate to the upload scans page.
   */
  const navigateToUploadScans = useCallback((): void => {
    router.push("/domains/invoices/upload-scans");
  }, [router]);

  /**
   * Close any open dialogs by dispatching Escape key event.
   *
   * @remarks
   * This is a fallback handler that simulates pressing Escape.
   * Dialog components should already handle Escape natively via Base UI.
   */
  const closeDialogs = useCallback((): void => {
    // Base UI Dialog components handle Escape automatically
    // This is just a fallback to ensure consistent behavior
    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);
  }, []);

  /**
   * Shortcut definitions with their handlers.
   */
  const shortcuts: ShortcutDef[] = [
    {
      key: "n",
      ctrl: true,
      handler: navigateToCreateInvoice,
      description: "Create new invoice",
    },
    {
      key: "u",
      ctrl: true,
      handler: navigateToUploadScans,
      description: "Upload scans",
    },
    {
      key: "?",
      ctrl: false,
      handler: onShowHelp,
      description: "Show keyboard shortcuts help",
    },
    {
      key: "Escape",
      ctrl: false,
      handler: closeDialogs,
      description: "Close dialog",
    },
  ];

  useEffect(() => {
    /**
     * Handles keydown events and triggers the appropriate shortcut handler.
     *
     * @param event - The keyboard event.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't trigger shortcuts when user is typing in an input field
      if (shouldBlockShortcuts(document.activeElement)) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifierMatches = shortcut.ctrl ? isModifierPressed : !isModifierPressed;

        if (keyMatches && modifierMatches) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    // Register the global event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup function to remove the event listener on unmount
    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts, navigateToCreateInvoice, navigateToUploadScans, onShowHelp, closeDialogs]);

  // This component doesn't render anything visible
  return null;
}
