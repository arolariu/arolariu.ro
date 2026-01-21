/**
 * @fileoverview Layout boundary for authentication routes.
 * @module app/auth/layout
 *
 * @remarks
 * Provides a shared layout wrapper for all /auth routes and nested segments.
 * The layout uses React Suspense to stream child routes and display the
 * route-level loading state while modules or data resolve.
 *
 * @see {@link Loading}
 */

import {Suspense} from "react";
import Loading from "./loading";

/**
 * Renders the shared layout for authentication pages.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router layout).
 *
 * **Suspense Boundary**: Wraps nested /auth routes to provide a cohesive
 * loading experience via the route-level `Loading` component.
 *
 * **Visual Features**: Background effects (Three.js scene, particles, beams)
 * are rendered in client islands to avoid RSC hydration issues.
 *
 * **Accessibility**:
 * - Content remains fully accessible.
 * - Reduced motion preferences respected in child components.
 *
 * @param props - Layout props for the /auth route group.
 * @returns The Suspense-wrapped auth layout with rendered child routes.
 *
 * @example
 * ```tsx
 * // Next.js renders this automatically for /auth routes
 * <AuthRootLayout>
 *   <SignInPage />
 * </AuthRootLayout>
 * ```
 */
export default async function AuthRootLayout(props: Readonly<LayoutProps<"/auth">>): Promise<React.JSX.Element> {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
