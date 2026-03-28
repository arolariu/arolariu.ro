"use client";

/**
 * @fileoverview Dialog displaying available keyboard shortcuts for the invoice management system.
 * @module app/domains/invoices/_components/ShortcutsHelpDialog
 *
 * @remarks
 * Provides a visual reference for all available keyboard shortcuts, displayed
 * in a modal dialog. Uses the `Kbd` component for keyboard key visualization.
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Kbd,
  KbdGroup,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {TbKeyboard} from "react-icons/tb";
import styles from "./ShortcutsHelpDialog.module.scss";

/**
 * Props for the {@link ShortcutsHelpDialog} component.
 */
type ShortcutsHelpDialogProps = {
  /** Whether the dialog is currently open. */
  open: boolean;
  /** Callback to close the dialog. */
  onClose: () => void;
};

/**
 * Keyboard shortcut display item.
 */
type ShortcutItem = {
  /** The keys to display (e.g., ["Ctrl", "K"]). */
  keys: string[];
  /** Translation key for the shortcut description. */
  descriptionKey: string;
};

/**
 * Displays a modal dialog showing all available keyboard shortcuts.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Features**:
 * - Lists all available keyboard shortcuts with visual key representations
 * - Uses `Kbd` and `KbdGroup` components from `@arolariu/components`
 * - Displays platform-appropriate modifier key (Ctrl on Windows/Linux, ⌘ on macOS)
 * - Fully internationalized with translations from `Invoices.Shared.shortcuts`
 *
 * **Shortcuts Displayed**:
 * - Ctrl+K: Open search/command palette
 * - Ctrl+N: Create new invoice
 * - Ctrl+U: Upload scans
 * - ?: Show this help dialog
 * - Escape: Close dialog
 *
 * **Accessibility**:
 * - Proper dialog semantics via Base UI Dialog component
 * - Keyboard navigation support (Escape to close)
 * - Screen reader friendly labels
 *
 * @param props - Component props containing open state and close handler.
 * @returns The keyboard shortcuts help dialog.
 *
 * @example
 * ```tsx
 * const [showHelp, setShowHelp] = useState(false);
 * return (
 *   <ShortcutsHelpDialog
 *     open={showHelp}
 *     onClose={() => setShowHelp(false)}
 *   />
 * );
 * ```
 */
export default function ShortcutsHelpDialog({open, onClose}: Readonly<ShortcutsHelpDialogProps>): React.JSX.Element {
  const t = useTranslations("Invoices.Shared.shortcuts");

  // Detect if user is on macOS for Cmd vs Ctrl display
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
  const modifierKey = isMac ? "⌘" : "Ctrl";

  /**
   * List of keyboard shortcuts to display in the dialog.
   */
  const shortcuts: ShortcutItem[] = [
    {keys: [modifierKey, "K"], descriptionKey: "openSearch"},
    {keys: [modifierKey, "N"], descriptionKey: "newInvoice"},
    {keys: [modifierKey, "U"], descriptionKey: "uploadScan"},
    {keys: ["?"], descriptionKey: "showHelp"},
    {keys: ["Esc"], descriptionKey: "closeDialog"},
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}>
      <DialogContent className={styles["dialog"]}>
        <DialogHeader className={styles["header"]}>
          <div className={styles["titleRow"]}>
            <TbKeyboard
              className={styles["icon"]}
              aria-hidden='true'
            />
            <DialogTitle className={styles["title"]}>{t("title")}</DialogTitle>
          </div>
          <DialogDescription className={styles["description"]}>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className={styles["shortcutsGrid"]}>
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.descriptionKey}
              className={styles["shortcutRow"]}>
              <KbdGroup className={styles["kbdGroup"]}>
                {shortcut.keys.map((key, index) => (
                  <Kbd
                    key={`${key}-${index}`}
                    className={styles["kbd"]}>
                    {key}
                  </Kbd>
                ))}
              </KbdGroup>
              <span className={styles["shortcutDescription"]}>{t(shortcut.descriptionKey)}</span>
            </div>
          ))}
        </div>

        <DialogFooter className={styles["footer"]}>
          <Button
            onClick={onClose}
            variant='default'
            className={styles["closeButton"]}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
