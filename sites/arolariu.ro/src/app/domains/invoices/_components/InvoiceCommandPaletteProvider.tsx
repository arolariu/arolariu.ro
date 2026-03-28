"use client";

/**
 * @fileoverview Client-side provider for the invoice command palette.
 * @module app/domains/invoices/_components/InvoiceCommandPaletteProvider
 *
 * @remarks
 * Wraps the invoice command palette functionality in a client component
 * so it can be integrated into the server-side layout without converting
 * the entire layout to a client component.
 */

import {useState} from "react";
import InvoiceCommandPalette from "./InvoiceCommandPalette";

/**
 * Props for the {@link InvoiceCommandPaletteProvider} component.
 */
type InvoiceCommandPaletteProviderProps = {
  /** Child components to render (typically the page content). */
  children: React.ReactNode;
};

/**
 * Provides invoice command palette functionality for the invoices domain.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Features**:
 * - Manages state for the invoice command palette dialog
 * - Renders the command palette with quick actions and search
 * - Listens for keyboard shortcut events to open/close the palette
 *
 * **Integration**:
 * This component is designed to be added to the invoices layout to provide
 * the command palette across all invoice routes without converting the layout
 * to a client component.
 *
 * @param props - Component props containing children to render.
 * @returns The children wrapped with invoice command palette functionality.
 *
 * @example
 * ```tsx
 * // In layout.tsx (Server Component)
 * export default function InvoicesLayout({ children }) {
 *   return (
 *     <InvoiceCommandPaletteProvider>
 *       {children}
 *     </InvoiceCommandPaletteProvider>
 *   );
 * }
 * ```
 */
export default function InvoiceCommandPaletteProvider({children}: Readonly<InvoiceCommandPaletteProviderProps>): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      {children}
      <InvoiceCommandPalette
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
