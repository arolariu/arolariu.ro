import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderCreateInvoiceScreen from "./island";

/**
 * Generates SEO metadata for the invoice creation page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from the deeply nested
 * translation key `Domains.services.invoices.service.create-page.__metadata__`. This ensures
 * consistent terminology across the invoices domain.
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility following RFC 1004
 * (Metadata & SEO System) standards. Generates Open Graph tags, Twitter cards, and canonical URLs
 * optimized for invoice creation workflow discovery.
 *
 * **Domain Context**: This page is part of the invoices bounded context, allowing users to
 * manually create invoice records from receipt scans or manual entry. Metadata targets users
 * searching for invoice management and receipt digitization features.
 *
 * **Caching**: Metadata is generated at build time for static routes. No runtime caching
 * beyond Next.js defaults.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * Open Graph metadata, and other SEO-related fields for the invoice creation workflow.
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js for /domains/invoices/create-invoice route
 * // Generates metadata like:
 * // {
 * //   title: "Create Invoice | Invoices | arolariu.ro",
 * //   description: "Upload receipt images to create and manage invoices",
 * //   openGraph: {
 * //     title: "Create Invoice | Invoices | arolariu.ro",
 * //     description: "Upload receipt images to create and manage invoices",
 * //     url: "https://arolariu.ro/domains/invoices/create-invoice",
 * //     siteName: "arolariu.ro",
 * //     locale: "en",
 * //   }
 * // }
 * ```
 *
 * @see {@link createMetadata} - Centralized metadata generation utility
 * @see RFC 1004 - Metadata & SEO System documentation
 * @see RFC 1003 - Internationalization System documentation
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Domains.services.invoices.service.create-page.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the invoice creation page with authentication-aware UI and disclaimers.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Authentication Awareness**: Fetches user authentication status from the backend
 * authentication service. Based on authentication state:
 * - **Authenticated users**: See full invoice creation interface without restrictions
 * - **Unauthenticated users**: See invoice creation interface with a disclaimer about
 *   limited functionality or data persistence requirements
 *
 * **Domain Purpose**: Part of the invoices bounded context (RFC 2001). This page enables:
 * - Manual invoice creation from receipt images
 * - OCR-based data extraction (delegated to backend)
 * - Invoice metadata input (merchant, date, amount, currency)
 * - Product line item management
 *
 * **Client Component Delegation**: Delegates interactive invoice creation UI to
 * `RenderCreateInvoiceScreen` (island.tsx), which handles:
 * - File upload (drag-and-drop, click-to-upload)
 * - Form validation and submission
 * - Real-time preview of extracted data
 * - Error handling for upload failures
 *
 * **Conditional Rendering**: Displays a localized disclaimer for unauthenticated users,
 * informing them about authentication requirements for invoice persistence, sharing,
 * or advanced features.
 *
 * **Performance**: Server-side authentication check and initial HTML rendering reduce
 * time-to-interactive. Client component hydrates for file upload interactivity.
 *
 * **Layout**: Centered flexbox layout with responsive padding and text sizing,
 * optimized for mobile and desktop invoice creation workflows.
 *
 * @returns Promise resolving to server-rendered JSX element containing the invoice
 * creation interface wrapped in a responsive main container, with conditional
 * disclaimer for unauthenticated users.
 *
 * @example
 * ```tsx
 * // Authenticated user flow:
 * // 1. fetchAaaSUserFromAuthService returns { isAuthenticated: true }
 * // 2. Renders <RenderCreateInvoiceScreen /> without disclaimer
 * // 3. User uploads receipt, extracts data, saves invoice to backend
 *
 * // Unauthenticated user flow:
 * // 1. fetchAaaSUserFromAuthService returns { isAuthenticated: false }
 * // 2. Renders <RenderCreateInvoiceScreen /> with disclaimer:
 * //    "(Please sign in to save invoices permanently)"
 * // 3. User can test upload/extraction but cannot persist data
 * ```
 *
 * @see {@link fetchAaaSUserFromAuthService} - Server action for authentication status
 * @see {@link RenderCreateInvoiceScreen} - Client component with upload interface
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 * @see RFC 1003 - Internationalization System (disclaimer translation)
 */
export default async function CreateInvoicePage() {
  const t = await getTranslations("Domains.services.invoices.service.create-page");
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  return (
    <main className='flex flex-col flex-wrap items-center justify-center justify-items-center px-5 py-24 text-center'>
      <RenderCreateInvoiceScreen />
      {!isAuthenticated && <small className='2xsm:text-md md:text-md mb-4 p-8 lg:text-xl 2xl:text-2xl'>({t("disclaimer")})</small>}
    </main>
  );
}
