import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import fetchMerchant from "@/lib/actions/invoices/fetchMerchant";
import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import RenderForbiddenScreen from "@/presentation/ForbiddenScreen";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import RenderViewInvoiceScreen from "./island";

/**
 * Generates SEO metadata for the invoice viewing page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from the
 * translation key `Domains.services.invoices.service.view-page.__metadata__`. Falls back
 * to sensible defaults if translation keys are not yet defined.
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility following RFC 1004
 * (Metadata & SEO System) standards. Generates Open Graph tags, Twitter cards, and
 * canonical URLs optimized for invoice viewing workflow discovery.
 *
 * **Domain Context**: This page is part of the invoices bounded context (RFC 2001),
 * allowing users to view invoice details, items, metadata, and associated merchant information.
 *
 * **Dynamic Route**: This is a dynamic route (`[id]`), so metadata is generated per-request
 * with the specific invoice context.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * Open Graph metadata, and other SEO-related fields for the invoice viewing workflow.
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js for /domains/invoices/view-invoice/[id] route
 * // Generates metadata like:
 * // {
 * //   title: "View Invoice | Invoices | arolariu.ro",
 * //   description: "View your invoice details",
 * //   openGraph: {
 * //     title: "View Invoice | Invoices | arolariu.ro",
 * //     description: "View your invoice details",
 * //     url: "https://arolariu.ro/domains/invoices/view-invoice/abc-123",
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
  const t = await getTranslations("Domains.services.invoices.service.view-page.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the invoice viewing page for displaying a specific invoice's details.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Dynamic Route**: Uses `[id]` parameter to identify the specific invoice.
 * The invoice ID is extracted from the route parameters and used to fetch
 * the invoice and associated merchant data.
 *
 * **Authentication**: Validates user authentication via `fetchAaaSUserFromAuthService`.
 * Unauthenticated users are shown a `ForbiddenScreen` component instead of invoice data.
 *
 * **Data Fetching**: Performs server-side data fetching for:
 * - Invoice details (via `fetchInvoice` server action)
 * - Merchant information (via `fetchMerchant` server action)
 *
 * This ensures the page renders with the latest snapshot of invoice data,
 * avoiding stale cache issues for viewable content.
 *
 * **Domain Purpose**: Part of the invoices bounded context (RFC 2001). This page enables:
 * - Viewing complete invoice details (items, amounts, dates, merchant)
 * - Viewing invoice metadata and sharing settings
 * - Viewing spending analytics and trends
 *
 * **Client Component Delegation**: Delegates interactive viewing UI to
 * `RenderViewInvoiceScreen` (island.tsx), which handles:
 * - Tab-based navigation
 * - Invoice data presentation
 * - Animation and interactive feedback
 *
 * **Error Handling**: If the invoice or merchant cannot be fetched, the server
 * action will throw an error, triggering Next.js error boundary.
 *
 * @param props - Page props containing dynamic route parameters
 * @returns Promise resolving to server-rendered JSX element containing the
 * invoice viewing interface with pre-fetched invoice and merchant data,
 * or ForbiddenScreen if user is not authenticated.
 *
 * @example
 * ```tsx
 * // Route: /domains/invoices/view-invoice/abc-123-def
 * // 1. Validates user authentication
 * // 2. Extracts invoiceIdentifier = "abc-123-def" from params
 * // 3. Fetches invoice with that ID from backend
 * // 4. Fetches associated merchant using invoice.merchantReference
 * // 5. Renders <RenderViewInvoiceScreen /> with both props
 * ```
 *
 * @see {@link fetchInvoice} - Server action for fetching invoice data
 * @see {@link fetchMerchant} - Server action for fetching merchant data
 * @see {@link fetchAaaSUserFromAuthService} - Server action for user authentication
 * @see {@link RenderViewInvoiceScreen} - Client component with viewing interface
 * @see {@link RenderForbiddenScreen} - Component shown for unauthenticated users
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 */
export default async function ViewInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const invoiceIdentifier = pageParams.id;

  const {isAuthenticated} = await fetchAaaSUserFromAuthService();
  if (!isAuthenticated) return <RenderForbiddenScreen />;

  // By fetching straight from the server, we ensure we have the latest snapshot.
  const invoice = await fetchInvoice({invoiceId: invoiceIdentifier});
  const merchant = await fetchMerchant({merchantId: invoice.merchantReference});

  return (
    <main className='px-5 py-24'>
      <RenderViewInvoiceScreen
        invoice={invoice}
        merchant={merchant}
      />
    </main>
  );
}
