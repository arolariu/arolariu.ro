/**
 * @fileoverview View scans page — displays uploaded invoice scans with creation workflow.
 * @module app/domains/invoices/view-scans/page
 *
 * @remarks
 * **Authentication-Gated Route**: This page requires an active user session.
 * Unauthenticated visitors are redirected to sign-in with return URL preservation.
 *
 * **Architecture Pattern**: Server Component shell that fetches auth state and
 * delegates interactive rendering to the client island (`RenderViewScansScreen`).
 *
 * **Workflow Context**: Part of the invoice management workflow where users:
 * 1. View previously uploaded scan images
 * 2. Select scans for batch invoice creation
 * 3. Initiate AI-powered invoice extraction
 *
 * **Data Flow**: Auth check happens server-side; scan data is fetched client-side
 * in the island component for better interactivity and state management.
 *
 * @see {@link RenderViewScansScreen} - Client island handling scan grid and interactions
 * @see RFC 1001 - OpenTelemetry observability patterns
 * @see RFC 1003 - Internationalization system
 */

import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale} from "next-intl/server";
import {getTranslations} from "next-intl-selector/server";
import {redirect} from "next/navigation";
import RenderViewScansScreen from "./island";
import styles from "./page.module.scss";

/**
 * Generates SEO metadata for the view scans page with localized content.
 *
 * @remarks
 * **Rendering Context**: Server-side metadata generation (Next.js App Router).
 *
 * **Localization**: Uses `next-intl` to fetch translations from the
 * `IMS--ViewScans.metadata` namespace for the current locale.
 *
 * **SEO Strategy**: Delegates to `createMetadata` utility for consistent
 * Open Graph, Twitter Card, and robots directive defaults across the application.
 *
 * **Metadata Keys**:
 * - `title`: Page title for browser tab and search results
 * - `description`: Meta description for search engine snippets
 *
 * **Caching**: Metadata is computed per request to respect locale-based routing.
 *
 * @returns Metadata object with localized title and description.
 *
 * @example
 * ```typescript
 * // Next.js automatically calls this when rendering /domains/invoices/view-scans
 * const metadata = await generateMetadata();
 * // metadata.title = "View Scans | arolariu.ro"
 * // metadata.description = "Manage your uploaded invoice scans"
 * ```
 *
 * @see {@link createMetadata} - Centralized metadata factory
 * @see RFC 1004 - Metadata and SEO system architecture
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t((m) => m.pages.invoices.viewScans.metadata.title),
    description: t((m) => m.pages.invoices.viewScans.metadata.description),
  });
}

/**
 * Renders the view scans page with authentication guard and scan management UI.
 *
 * @remarks
 * **Rendering Context**: Server Component (Next.js App Router page route).
 *
 * **Async Component**: Can use `await` for direct server-side data fetching
 * without client-side API calls or loading states.
 *
 * **Authentication Guard**:
 * - Fetches user auth state via `fetchAaaSUserFromAuthService` server action
 * - Redirects unauthenticated users to sign-in with return URL preservation
 * - Redirect preserves deep-link context: `/auth/sign-in?redirect_url=/domains/invoices/view-scans`
 *
 * **Component Delegation**: Server shell delegates interactive rendering to
 * `RenderViewScansScreen` client island, which handles:
 * - Scan image fetching and display
 * - Multi-select functionality
 * - Batch invoice creation workflow
 * - Real-time UI updates and animations
 *
 * **Side Effects**:
 * - Server Action call: `fetchAaaSUserFromAuthService`
 * - Navigation: `redirect()` on auth failure (throws to abort rendering)
 *
 * **Performance**: Server Component renders instantly with auth check;
 * client island hydrates with scan data for interactivity.
 *
 * **Security**: Auth check happens server-side before any client code loads,
 * preventing unauthorized access to scan management UI.
 *
 * @param _props - Next.js page props including route parameters and search params.
 * Prefixed with underscore since this page has no dynamic route segments.
 * Type is enforced by Next.js route typing: `PageProps<"/domains/invoices/view-scans">`.
 *
 * @returns Promise resolving to server-rendered JSX with auth-gated scan management UI.
 * Throws redirect exception on authentication failure (handled by Next.js router).
 *
 * @throws {RedirectError} When user is not authenticated (Next.js internal exception).
 *
 * @example
 * ```tsx
 * // Next.js automatically renders this at /domains/invoices/view-scans
 * // Authenticated user sees:
 * <div className={styles.page}>
 *   <RenderViewScansScreen /> // Client island with scan grid
 * </div>
 *
 * // Unauthenticated user is redirected to:
 * // /auth/sign-in?redirect_url=/domains/invoices/view-scans
 * ```
 *
 * @see {@link RenderViewScansScreen} - Client island component
 * @see {@link fetchAaaSUserFromAuthService} - Server action for auth state
 * @see RFC 1003 - Internationalization patterns
 * @see RFC 2001 - Domain-Driven Design architecture (Invoices bounded context)
 */
export default async function ViewScansPage(_props: Readonly<PageProps<"/domains/invoices/view-scans">>): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/view-scans");
  }

  return (
    <div className={styles["page"]}>
      <RenderViewScansScreen />
    </div>
  );
}
