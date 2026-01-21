/**
 * @fileoverview Layout boundary for the invoices domain routes.
 * @module app/domains/invoices/layout
 *
 * @remarks
 * Provides a shared layout wrapper for all /domains/invoices routes and
 * nested segments. The layout uses React Suspense to stream child routes and
 * display the route-level loading state while modules or data resolve.
 *
 * @see {@link Loading}
 */

import {Suspense} from "react";
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
 * @param props - Layout props for the invoices domain route group.
 * @returns The Suspense-wrapped invoices layout with rendered child routes.
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
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
