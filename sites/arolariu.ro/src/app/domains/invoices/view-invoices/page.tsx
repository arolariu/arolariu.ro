import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import {RichText} from "@/presentation/Text";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderViewInvoicesScreen from "./island";

/**
 * Generates SEO metadata for the invoice viewing page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from the
 * translation key `Domains.services.invoices.service.view-invoices.__metadata__`.
 * This ensures consistent terminology for invoice listing and viewing across all locales.
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility following RFC 1004
 * (Metadata & SEO System) standards. Optimizes metadata for users searching for invoice
 * management, receipt history, and expense tracking features.
 *
 * **Domain Context**: Part of the invoices bounded context (RFC 2001). This page serves
 * as the primary interface for users to browse, search, and manage their invoice collection.
 *
 * **Caching**: Metadata is generated at build time for static routes. No runtime caching
 * beyond Next.js defaults.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * Open Graph metadata, and SEO-related fields optimized for invoice viewing and management.
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js for /domains/invoices/view-invoices route
 * // Generates metadata like:
 * // {
 * //   title: "View Invoices | Invoices | arolariu.ro",
 * //   description: "Browse and manage your invoice collection",
 * //   openGraph: {
 * //     title: "View Invoices | Invoices | arolariu.ro",
 * //     description: "Browse and manage your invoice collection",
 * //     url: "https://arolariu.ro/domains/invoices/view-invoices",
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
  const t = await getTranslations("Domains.services.invoices.service.view-invoices.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the invoice viewing page with personalized greetings and invoice data.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Data Fetching Strategy**: Performs parallel server-side data fetching:
 * - User authentication status and profile (`fetchAaaSUserFromAuthService`)
 * - Complete invoice collection for the user (`fetchInvoices`)
 *
 * **Personalization**: Extracts user's full name from authentication service to display
 * a personalized greeting. Falls back to "dear guest" for unauthenticated or anonymous users.
 *
 * **Domain Purpose**: Part of the invoices bounded context (RFC 2001). This page enables:
 * - Browsing all invoices in the user's collection
 * - Searching and filtering invoices (delegated to client component)
 * - Viewing invoice summaries with merchant, date, and amount
 * - Accessing individual invoice details via navigation
 *
 * **Client Component Delegation**: Delegates interactive invoice management to
 * `RenderViewInvoicesScreen` (island.tsx), which handles:
 * - Pagination and virtual scrolling for large invoice lists
 * - Real-time search and filtering
 * - Selection and bulk actions (delete, export, share)
 * - Responsive grid/list view toggling
 *
 * **UI Structure**:
 * - Header section: Personalized title with gradient styling and subtitle
 * - Content section: Invoice grid/list with interactive controls
 * - Uses responsive container with Tailwind CSS for mobile/desktop layouts
 *
 * **Performance**: Server-side data fetching reduces client-side API calls.
 * Initial HTML includes all invoice data for immediate rendering. Client component
 * hydrates for interactivity without additional network requests.
 *
 * **Internationalization**: Uses `RichText` component for complex subtitle rendering
 * with markdown support, ensuring consistent formatting across locales.
 *
 * @returns Promise resolving to server-rendered JSX element containing a personalized
 * header with user greeting and the invoice collection interface wrapped in a responsive
 * container with sections for header and invoice grid.
 *
 * @example
 * ```tsx
 * // Authenticated user with invoices:
 * // 1. fetchAaaSUserFromAuthService returns { user: { fullName: "John Doe" } }
 * // 2. fetchInvoices returns [invoice1, invoice2, invoice3, ...]
 * // 3. Renders:
 * //    <h1>Your Invoices, John Doe</h1>
 * //    <RenderViewInvoicesScreen invoices={[...]} /> // Grid with 3+ invoices
 *
 * // Unauthenticated user (guest):
 * // 1. fetchAaaSUserFromAuthService returns { user: null }
 * // 2. fetchInvoices returns [] (empty collection)
 * // 3. Renders:
 * //    <h1>Your Invoices, dear guest</h1>
 * //    <RenderViewInvoicesScreen invoices={[]} /> // Empty state message
 * ```
 *
 * @see {@link fetchAaaSUserFromAuthService} - Server action for authentication and profile
 * @see {@link fetchInvoices} - Server action for invoice collection retrieval
 * @see {@link RenderViewInvoicesScreen} - Client component with interactive invoice grid
 * @see {@link RichText} - Presentation component for localized rich text rendering
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 * @see RFC 1003 - Internationalization System (rich text formatting)
 */
export default async function ViewInvoicesPage() {
  const t = await getTranslations("Domains.services.invoices.service.view-invoices");
  const {user} = await fetchAaaSUserFromAuthService();
  const username = user?.fullName ?? "dear guest";

  return (
    <main className='container mx-auto px-5 py-24'>
      <section className='mb-20 flex w-full flex-col text-center'>
        <h1 className='mb-4 bg-linear-to-r from-pink-400 to-red-600 bg-clip-text text-2xl font-medium text-transparent sm:text-3xl'>
          {t("title", {name: username})}
        </h1>
        <article className='mx-auto text-base leading-relaxed lg:w-2/3'>
          <RichText
            sectionKey='Domains.services.invoices.service.view-invoices'
            textKey='subtitle'
          />
        </article>
      </section>
      <section>
        <RenderViewInvoicesScreen />
      </section>
    </main>
  );
}
