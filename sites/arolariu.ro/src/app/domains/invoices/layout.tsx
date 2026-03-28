/**
 * @fileoverview Layout boundary for the invoices domain routes.
 * @module app/domains/invoices/layout
 *
 * @remarks
 * Provides a shared layout wrapper for all /domains/invoices routes and
 * nested segments. The layout uses React Suspense to stream child routes and
 * display the route-level loading state while modules or data resolve.
 *
 * Includes a mobile bottom navigation bar visible only on mobile devices,
 * and global keyboard shortcuts for power users.
 *
 * @see {@link Loading}
 * @see {@link MobileBottomNav}
 * @see {@link KeyboardShortcutsProvider}
 */

import {Suspense} from "react";
import KeyboardShortcutsProvider from "./_components/KeyboardShortcutsProvider";
import MobileBottomNav from "./_components/MobileBottomNav";
import Loading from "./loading";

/**
 * Renders the shared layout for the invoices domain.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router layout).
 *
 * **Suspense Boundary**: Wraps nested /domains/invoices routes to provide a
 * cohesive loading experience via the route-level `Loading` component.
 *
 * **Mobile Navigation**: Includes a fixed bottom navigation bar that appears
 * only on mobile devices (hidden on desktop via media query).
 *
 * **Keyboard Shortcuts**: The `KeyboardShortcutsProvider` enables global keyboard
 * shortcuts for common invoice actions across all routes in this domain:
 * - Ctrl/Cmd+N: Create new invoice
 * - Ctrl/Cmd+U: Upload scans
 * - ?: Show keyboard shortcuts help
 * - Escape: Close dialogs
 *
 * @param props - Layout props for the invoices domain route group.
 * @returns The Suspense-wrapped invoices layout with rendered child routes, mobile navigation, and keyboard shortcuts.
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
      <Suspense fallback={<Loading />}>{props.children}</Suspense>
      <MobileBottomNav />
    </KeyboardShortcutsProvider>
  );
}
