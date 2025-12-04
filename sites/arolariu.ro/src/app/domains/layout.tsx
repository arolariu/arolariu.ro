import {Suspense} from "react";
import Loading from "./loading";

/**
 * Layout component for the domains section of the application.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js App Router layout).
 *
 * **Purpose**: Provides a Suspense boundary for the domains page and its children,
 * enabling streaming SSR and automatic loading state management. This layout wraps
 * all routes under `/domains/*` including the overview page and domain-specific pages.
 *
 * **Suspense Integration**: Explicitly wraps children in a Suspense boundary with the
 * domain-specific Loading component as fallback. This ensures the correct loading
 * skeleton is displayed for this route segment, overriding any parent loading states.
 *
 * **Loading State Hierarchy**: By explicitly defining the Suspense boundary here,
 * this layout takes precedence over the root-level loading.tsx, ensuring users see
 * the domain-specific skeleton (three cards layout) instead of the generic site-wide
 * loading animation.
 *
 * **Performance Benefits**:
 * - **Streaming SSR**: Allows the shell to be sent immediately while content loads
 * - **Progressive Enhancement**: Shows loading state immediately, then content
 * - **Reduced Layout Shift**: Skeleton matches actual content structure
 * - **Better UX**: Visual feedback during all loading scenarios
 *
 * **Architecture**: Follows Next.js App Router nested layout pattern, where this
 * layout inherits from parent layouts (root layout.tsx) and can be further nested
 * by domain-specific layouts (e.g., `/domains/invoices/layout.tsx`).
 *
 * **Error Handling**: If an error occurs during content loading, Next.js will
 * automatically fall back to the nearest error.tsx boundary (parent or root level).
 *
 * @param props - Component props
 * @param props.children - Child components (page.tsx or nested routes)
 *
 * @returns Server-rendered JSX element with Suspense-wrapped children
 *
 * @example
 * ```tsx
 * // Route hierarchy:
 * // /domains → layout.tsx → Suspense(fallback=Loading) → page.tsx → island.tsx
 * //
 * // Rendering flow:
 * // 1. Layout renders immediately with Suspense boundary
 * // 2. Domain-specific Loading skeleton displays (NOT root loading.tsx)
 * // 3. Page content streams in and replaces skeleton
 * // 4. Client components hydrate for interactivity
 * ```
 *
 * @see {@link Loading} - Domain-specific skeleton fallback component
 * @see {@link DomainsHomepage} - Main domains page component
 * @see RFC 1001 - OpenTelemetry Observability System (for instrumentation patterns)
 */
export default function DomainsLayout(props: Readonly<LayoutProps<"/domains">>): React.JSX.Element {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
