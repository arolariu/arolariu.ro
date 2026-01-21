/**
 * @fileoverview Layout boundary for the About route group with Suspense.
 * @module app/about/layout
 *
 * @remarks
 * Provides a shared layout wrapper for all /about routes and nested segments.
 * The layout uses React Suspense to stream child routes and display the
 * route-level loading state while data or modules resolve.
 *
 * @see {@link Loading}
 */

import {Suspense} from "react";
import Loading from "./loading";

/**
 * Renders the shared layout for the About section.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js App Router layout).
 *
 * **Suspense Boundary**: Wraps all nested /about routes to provide a cohesive
 * loading experience while server-rendered children resolve.
 *
 * **Fallback UI**: Uses the route-level `Loading` component to keep visual
 * consistency across the About subsection.
 *
 * @param props - Layout props for the /about route group.
 * @returns The Suspense-wrapped layout with rendered child routes.
 *
 * @example
 * ```tsx
 * // Next.js renders this automatically for /about routes
 * <AboutRootLayout>
 *   <AboutPage />
 * </AboutRootLayout>
 * ```
 */
export default async function AboutRootLayout(props: Readonly<LayoutProps<"/about">>) {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
