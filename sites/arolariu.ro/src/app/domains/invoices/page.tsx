/**
 * @fileoverview Invoice Management System landing page.
 * @module app/domains/invoices/page
 *
 * @remarks
 * Defines metadata and a server-rendered entry point for the invoices domain.
 *
 * @see {@link fetchAaaSUserFromAuthService}
 */

import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import RenderInvoiceDomainScreen from "./island";

/**
 * Generates metadata for the invoices domain page.
 *
 * @remarks
 * **Rendering Context**: Server Component metadata generator.
 *
 * **i18n**: Uses `next-intl` translations from Invoices.__metadata__.
 *
 * **TODO**: Replace hardcoded title/description with translated strings.
 *
 * @returns Metadata configured for the invoices domain route.
 *
 * @example
 * ```tsx
 * export async function generateMetadata(): Promise<Metadata> {
 *   return {title: "Invoice Management System"};
 * }
 * ```
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invoices.__metadata__");
  const locale = await getLocale();
  // TODO: Use translations instead of hardcoding.
  return {
    locale,
    title: "Invoice Management System",
    description:
      "The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
  };
}

/**
 * Renders the invoice management system landing page.
 *
 * @remarks
 * **Rendering Context**: Server Component (App Router page).
 *
 * **Auth State**: Queries the auth service to decide initial UI state.
 *
 * @returns The invoices domain page with an authenticated flag.
 *
 * @example
 * ```tsx
 * // Next.js renders this page at /domains/invoices
 * <InvoicePage />
 * ```
 */
export default async function InvoicesHomepage(props: Readonly<PageProps<"/domains/invoices">>): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();
  return <RenderInvoiceDomainScreen isAuthenticated={isAuthenticated} />;
}
