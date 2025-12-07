import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import fetchMerchant from "@/lib/actions/invoices/fetchMerchant";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import React from "react";
import RenderEditInvoiceScreen from "./island";

/**
 * Generates SEO metadata for the invoice editing page with localized content.
 *
 * @remarks
 * **Execution Context**: Server-side metadata generation function (Next.js App Router).
 *
 * **Internationalization**: Retrieves localized title and description from the
 * translation key `Domains.services.invoices.service.edit-page.__metadata__`. Falls back
 * to sensible defaults if translation keys are not yet defined.
 *
 * **SEO Optimization**: Uses the centralized `createMetadata` utility following RFC 1004
 * (Metadata & SEO System) standards. Generates Open Graph tags, Twitter cards, and
 * canonical URLs optimized for invoice editing workflow discovery.
 *
 * **Domain Context**: This page is part of the invoices bounded context (RFC 2001),
 * allowing users to view and edit invoice details, items, metadata, and sharing settings.
 *
 * **Dynamic Route**: This is a dynamic route (`[id]`), so metadata is generated per-request
 * with the specific invoice context.
 *
 * @returns Promise resolving to Next.js Metadata object with localized title, description,
 * Open Graph metadata, and other SEO-related fields for the invoice editing workflow.
 *
 * @example
 * ```tsx
 * // Automatically invoked by Next.js for /domains/invoices/edit-invoice/[id] route
 * // Generates metadata like:
 * // {
 * //   title: "Edit Invoice | Invoices | arolariu.ro",
 * //   description: "View and edit your invoice details",
 * //   openGraph: {
 * //     title: "Edit Invoice | Invoices | arolariu.ro",
 * //     description: "View and edit your invoice details",
 * //     url: "https://arolariu.ro/domains/invoices/edit-invoice/abc-123",
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
  const t = await getTranslations("Domains.services.invoices.service.edit-page.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Renders the invoice editing page for viewing and modifying a specific invoice.
 *
 * @remarks
 * **Rendering Context**: Server Component (default in Next.js App Router).
 *
 * **Dynamic Route**: Uses `[id]` parameter to identify the specific invoice.
 * The invoice ID is extracted from the route parameters and used to fetch
 * the invoice and associated merchant data.
 *
 * **Data Fetching**: Performs parallel server-side data fetching for:
 * - Invoice details (via `fetchInvoice` server action)
 * - Merchant information (via `fetchMerchant` server action)
 *
 * This ensures the page renders with the latest snapshot of invoice data,
 * avoiding stale cache issues for editable content.
 *
 * **Domain Purpose**: Part of the invoices bounded context (RFC 2001). This page enables:
 * - Viewing complete invoice details (items, amounts, dates, merchant)
 * - Editing invoice metadata, items, and sharing settings
 * - Managing recipes associated with invoice items
 * - Sharing invoices with other users
 * - Viewing spending analytics and trends
 *
 * **Client Component Delegation**: Delegates interactive editing UI to
 * `RenderEditInvoiceScreen` (island.tsx), which handles:
 * - Tab-based navigation (recipes, metadata)
 * - Dialog-based editing (items, merchant, sharing)
 * - Real-time invoice name editing
 * - Animation and interactive feedback
 *
 * **Error Handling**: If the invoice or merchant cannot be fetched, the server
 * action will throw an error, triggering Next.js error boundary.
 *
 * @param props - Page props containing dynamic route parameters
 * @returns Promise resolving to server-rendered JSX element containing the
 * invoice editing interface with pre-fetched invoice and merchant data.
 *
 * @example
 * ```tsx
 * // Route: /domains/invoices/edit-invoice/abc-123-def
 * // 1. Extracts invoiceIdentifier = "abc-123-def" from params
 * // 2. Fetches invoice with that ID from backend
 * // 3. Fetches associated merchant using invoice.merchantReference
 * // 4. Renders <RenderEditInvoiceScreen /> with both props
 * ```
 *
 * @see {@link fetchInvoice} - Server action for fetching invoice data
 * @see {@link fetchMerchant} - Server action for fetching merchant data
 * @see {@link RenderEditInvoiceScreen} - Client component with editing interface
 * @see RFC 2001 - Domain-Driven Design Architecture (invoices bounded context)
 */
export default async function EditInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/edit-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const resolvedParams = await props.params;
  const invoiceIdentifier = resolvedParams.id;

  // By fetching straight from the server, we ensure we have the latest snapshot.
  const invoice = await fetchInvoice({invoiceId: invoiceIdentifier});
  const merchant = await fetchMerchant({merchantId: invoice.merchantReference});

  return (
    <main className='overflow-hidden py-24'>
      <RenderEditInvoiceScreen
        invoice={invoice}
        merchant={merchant}
      />
    </main>
  );
}
