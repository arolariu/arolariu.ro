import {Loader2} from "lucide-react";
import {getTranslations} from "next-intl/server";
import EmptyState from "./EmptyState";

/**
 * @fileoverview Loading state for the invoice list fetch operation.
 * @module app/domains/invoices/_components/LoadingInvoices
 */

/**
 * Server component that renders an animated loading state while the invoice list is being fetched.
 *
 * @returns The LoadingInvoices server component
 */
export default async function LoadingInvoices(): Promise<React.JSX.Element> {
  const t = await getTranslations("IMS--Common.loadingInvoices");
  return (
    <EmptyState
      icon={<Loader2 className='animate-spin' />}
      title={t("title")}
      description={t("description")}
    />
  );
}
