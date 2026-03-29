"use client";

/**
 * @fileoverview Client-side provider for keyboard shortcuts in the invoices domain.
 * @module app/domains/invoices/_components/KeyboardShortcutsProvider
 *
 * @remarks
 * Wraps the keyboard shortcuts functionality and help dialog state in a client component
 * so it can be integrated into the server-side layout without converting the entire layout
 * to a client component.
 */

import {useState} from "react";
import KeyboardShortcuts from "./KeyboardShortcuts";
import ShortcutsHelpDialog from "./ShortcutsHelpDialog";

/**
 * Props for the {@link KeyboardShortcutsProvider} component.
 */
type KeyboardShortcutsProviderProps = {
  /** Child components to render (typically the page content). */
  children: React.ReactNode;
};

/**
 * Provides keyboard shortcuts functionality and help dialog for the invoices domain.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Features**:
 * - Manages state for the keyboard shortcuts help dialog
 * - Registers global keyboard shortcuts via the `KeyboardShortcuts` component
 * - Renders the help dialog when triggered by the `?` shortcut or other means
 *
 * **Integration**:
 * This component is designed to be added to the invoices layout to provide
 * keyboard shortcuts across all invoice routes without converting the layout
 * to a client component.
 *
 * @param props - Component props containing children to render.
 * @returns The children wrapped with keyboard shortcuts functionality.
 *
 * @example
 * ```tsx
 * // In layout.tsx (Server Component)
 * export default function InvoicesLayout({ children }) {
 *   return (
 *     <KeyboardShortcutsProvider>
 *       {children}
 *     </KeyboardShortcutsProvider>
 *   );
 * }
 * ```
 */
export default function KeyboardShortcutsProvider({children}: Readonly<KeyboardShortcutsProviderProps>): React.JSX.Element {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {children}
      <KeyboardShortcuts onShowHelp={() => setShowHelp(true)} />
      <ShortcutsHelpDialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}
