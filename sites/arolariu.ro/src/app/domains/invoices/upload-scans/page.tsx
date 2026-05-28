/**
 * @fileoverview Upload scans page — direct scan upload without invoice creation.
 * @module app/domains/invoices/upload-scans/page
 *
 * @remarks
 * **Upload-First Workflow**: This page enables users to upload invoice scan images
 * directly to cloud storage (Azure Blob Storage) without immediately creating
 * invoice records. Scans are stored with user metadata and can be processed later
 * via the view-scans workflow.
 *
 * **Workflow Distinction**:
 * - **upload-scans** (this page): Upload new scans → Store in cloud → Navigate to view-scans
 * - **view-scans**: View stored scans → Select scans → Create invoices from selections
 *
 * **Use Cases**:
 * - Bulk upload: Users photograph multiple receipts and upload them all at once
 * - Deferred processing: Upload now, create invoices later when time permits
 * - Batch collection: Accumulate scans over time before processing into invoices
 *
 * **Authentication-Gated**: Requires active user session to associate scans with
 * user identity in storage metadata. Unauthenticated visitors are redirected to
 * sign-in with return URL preservation.
 *
 * **Architecture Pattern**: Server Component shell that performs auth check and
 * delegates interactive upload UI to client island (`RenderUploadScansScreen`).
 *
 * **Storage Flow**:
 * 1. User uploads scan images via island component (drag-drop or file picker)
 * 2. Client compresses images and generates blob URLs for preview
 * 3. Scans uploaded to Azure Blob Storage with user ID metadata
 * 4. Success → Redirect to view-scans to see uploaded scans
 * 5. View-scans → User can create invoices from uploaded scans
 *
 * @see {@link RenderUploadScansScreen} - Client island handling file upload UI
 * @see {@link ViewScansPage} - Next step: view uploaded scans and create invoices
 * @see RFC 1001 - OpenTelemetry observability patterns
 * @see RFC 1003 - Internationalization system
 */

import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale} from "next-intl/server";
import {getTranslations} from "next-intl-selector/server";
import {redirect} from "next/navigation";
import RenderUploadScansScreen from "./island";
import styles from "./page.module.scss";

/**
 * Generates SEO metadata for the scan upload page with localized content.
 *
 * @remarks
 * **Rendering Context**: Server-side metadata generation (Next.js App Router).
 *
 * **Localization**: Uses `next-intl` to fetch translations from the
 * `pages.invoices.uploadScans.metadata` namespace for the current locale.
 *
 * **SEO Strategy**: Delegates to `createMetadata` utility for consistent
 * Open Graph, Twitter Card, and robots directive defaults across the application.
 *
 * **Keywords Optimization**: Metadata targets users searching for invoice scanning,
 * receipt upload, expense tracking, and document digitization features.
 *
 * **Workflow Context**: Part of the two-step scan-to-invoice workflow:
 * 1. This page: Upload scans to cloud storage
 * 2. View-scans page: Create invoices from uploaded scans
 *
 * **Caching**: Metadata is generated at build time for static routes. No runtime
 * caching beyond Next.js defaults.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title,
 * description, Open Graph metadata, and SEO-related fields optimized for scan
 * upload and document digitization discovery.
 *
 * @example
 * ```typescript
 * // Automatically invoked by Next.js for /domains/invoices/upload-scans route
 * // Generates metadata like:
 * // {
 * //   title: "Upload Scans | Invoices | arolariu.ro",
 * //   description: "Upload invoice scans for later processing",
 * //   openGraph: {
 * //     title: "Upload Scans | Invoices | arolariu.ro",
 * //     description: "Upload invoice scans for later processing",
 * //     url: "https://arolariu.ro/domains/invoices/upload-scans",
 * //     siteName: "arolariu.ro",
 * //     locale: "en",
 * //   }
 * // }
 * ```
 *
 * @see {@link createMetadata} - Centralized metadata generation utility
 * @see RFC 1004 - Metadata & SEO System documentation
 * @see RFC 1003 - Internationalization System documentation
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t((m) => m.pages.invoices.uploadScans.metadata.title),
    description: t((m) => m.pages.invoices.uploadScans.metadata.description),
  });
}

/**
 * Renders the scan upload page with auth guard and file upload interface.
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
 * - Redirect preserves deep-link context: `/auth/sign-in?redirect_url=/domains/invoices/upload-scans`
 * - Required because scans are stored with user ID metadata in Azure Blob Storage
 *
 * **Upload-First Workflow**: Enables direct scan upload without immediate invoice
 * creation. Use cases:
 * - **Bulk upload**: Photograph 10+ receipts at once, upload all, process later
 * - **Deferred processing**: Upload during lunch break, create invoices at desk
 * - **Batch collection**: Accumulate scans over a week, then batch-create invoices
 *
 * **Component Delegation**: Server shell delegates interactive upload UI to
 * `RenderUploadScansScreen` client island, which handles:
 * - File picker and drag-drop zone
 * - Image compression and preview generation
 * - Progress tracking during upload (% complete, file count, errors)
 * - Upload to Azure Blob Storage with retry logic
 * - Success confirmation and navigation to view-scans
 *
 * **Storage Flow**:
 * 1. User selects files (file picker or drag-drop)
 * 2. Client validates file types (JPEG, PNG, PDF, HEIC) and sizes (<10MB each)
 * 3. Images compressed to reduce storage costs (target: <2MB per scan)
 * 4. Blob URLs generated for instant preview feedback
 * 5. Files uploaded to Azure Blob Storage with metadata:
 *    - User ID (from auth context)
 *    - Upload timestamp
 *    - Original filename
 *    - MIME type
 * 6. Success → Redirect to `/domains/invoices/view-scans` to see uploads
 * 7. View-scans → User can select scans and create invoices
 *
 * **Workflow Sequence**:
 * ```
 * [Upload Scans Page] → Upload files to Azure
 *         ↓
 * [View Scans Page] → Select uploaded scans
 *         ↓
 * [Create Invoice Dialog] → Generate invoice from selected scans
 *         ↓
 * [Edit Invoice Page] → Review/edit AI-extracted data
 *         ↓
 * [View Invoices Page] → See completed invoice in collection
 * ```
 *
 * **Side Effects**:
 * - Server Action call: `fetchAaaSUserFromAuthService`
 * - Navigation: `redirect()` on auth failure (throws to abort rendering)
 *
 * **Performance**: Server Component renders instantly with auth check;
 * client island hydrates with upload UI for file handling and Azure SDK calls.
 *
 * **Security**: Auth check happens server-side before any client code loads,
 * preventing unauthorized access to upload functionality and ensuring scans
 * are always associated with authenticated user identity.
 *
 * @param _props - Next.js page props including route parameters and search params.
 * Prefixed with underscore since this page has no dynamic route segments.
 * Type is enforced by Next.js route typing: `PageProps<"/domains/invoices/upload-scans">`.
 *
 * @returns Promise resolving to server-rendered JSX with auth-gated scan upload UI.
 * Throws redirect exception on authentication failure (handled by Next.js router).
 *
 * @throws {RedirectError} When user is not authenticated (Next.js internal exception).
 *
 * @example
 * ```tsx
 * // Next.js automatically renders this at /domains/invoices/upload-scans
 * // Authenticated user sees:
 * <div className={styles.page}>
 *   <RenderUploadScansScreen /> // Client island with file upload UI
 * </div>
 *
 * // Unauthenticated user is redirected to:
 * // /auth/sign-in?redirect_url=/domains/invoices/upload-scans
 *
 * // Typical user flow:
 * // 1. User authenticates and lands on upload-scans page
 * // 2. User drags 5 receipt photos into upload zone
 * // 3. Island component shows 5 preview cards with progress bars
 * // 4. Files compress (10MB → 2MB each) and upload to Azure (~5-10s)
 * // 5. Success toast: "5 scans uploaded successfully"
 * // 6. Auto-redirect to /domains/invoices/view-scans
 * // 7. View-scans page shows 5 new scans in grid
 * // 8. User selects scans and clicks "Create Invoice"
 * // 9. AI extracts data from scans and pre-fills invoice form
 * ```
 *
 * @see {@link RenderUploadScansScreen} - Client island component
 * @see {@link fetchAaaSUserFromAuthService} - Server action for auth state
 * @see {@link ViewScansPage} - Next workflow step (view uploaded scans)
 * @see RFC 1003 - Internationalization patterns
 * @see RFC 2001 - Domain-Driven Design architecture (Invoices bounded context)
 */
export default async function UploadScansPage(_props: Readonly<PageProps<"/domains/invoices/upload-scans">>): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/upload-scans");
  }

  return (
    <div className={styles["page"]}>
      <RenderUploadScansScreen />
    </div>
  );
}
