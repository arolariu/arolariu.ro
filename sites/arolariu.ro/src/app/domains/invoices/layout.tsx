/**
 * @fileoverview Layout boundary for the invoices domain routes.
 * @module app/domains/invoices/layout
 *
 * @remarks
 * Provides a shared layout wrapper for all /domains/invoices routes and
 * nested segments. The layout uses React Suspense to stream child routes and
 * display the route-level loading state while modules or data resolve.
 *
 * Includes a fixed header with notification bell, a mobile bottom navigation
 * bar visible only on mobile devices, global keyboard shortcuts for power users,
 * and an invoice-specific command palette for quick actions and search.
 *
 * @see {@link Loading}
 * @see {@link InvoiceHeader}
 * @see {@link MobileBottomNav}
 * @see {@link KeyboardShortcutsProvider}
 * @see {@link InvoiceCommandPaletteProvider}
 */

import {Suspense} from "react";
import Loading from "./loading";
import KeyboardShortcutsProvider from "./_components/KeyboardShortcutsProvider";
import InvoiceCommandPaletteProvider from "./_components/InvoiceCommandPaletteProvider";
import InvoiceHeader from "./_components/InvoiceHeader";
import MobileBottomNav from "./_components/MobileBottomNav";

/**
 * Renders the shared layout for the invoices domain.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router layout).
 *
 * **Suspense Boundary**: Wraps nested /domains/invoices routes to provide a
 * cohesive loading experience via the route-level `Loading` component.
 *
 * **Invoice Header**: Includes a fixed top header bar with notification bell
 * for in-app activity feed and real-time updates.
 *
 * **Mobile Navigation**: Includes a fixed bottom navigation bar that appears
 * only on mobile devices (hidden on desktop via media query).
 *
 * **Keyboard Shortcuts**: The `KeyboardShortcutsProvider` enables global keyboard
 * shortcuts for common invoice actions across all routes in this domain:
 * - Ctrl/Cmd+K: Open invoice command palette
 * - Ctrl/Cmd+N: Create new invoice
 * - Ctrl/Cmd+U: Upload scans
 * - ?: Show keyboard shortcuts help
 * - Escape: Close dialogs
 *
 * **Invoice Command Palette**: The `InvoiceCommandPaletteProvider` enables a
 * domain-specific command palette with quick actions and invoice search:
 * - Quick actions: Upload scans, create invoice, view statistics, view all
 * - Search invoices by name and merchant
 * - Recent invoices (last 5)
 *
 * @param props - Layout props for the invoices domain route group.
 * @returns The Suspense-wrapped invoices layout with rendered child routes, invoice header with notification bell, mobile navigation, keyboard shortcuts, and command palette.
 *
 * @example
 * ```tsx
 * // Next.js renders this automatically for /domains/invoices routes
 * <InvoicesRootLayout>
 *   <InvoicesPage />
 * </InvoicesRootLayout>
 * ```
 */
export default async function InvoicesRootLayout(props: Readonly<LayoutProps<"/domains/invoices">>): Promise<React.JSX.Element> {
  return (
    <KeyboardShortcutsProvider>
      <InvoiceCommandPaletteProvider>
        <InvoiceHeader />
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
        <MobileBottomNav />
      </InvoiceCommandPaletteProvider>
    </KeyboardShortcutsProvider>
  );
}
