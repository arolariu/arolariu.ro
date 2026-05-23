import {Loader2} from "lucide-react";
import {getTranslations} from "next-intl/server";
import EmptyState from "./EmptyState";

/**
 * @fileoverview Loading state for a single invoice fetch operation.
 * @module app/domains/invoices/_components/LoadingInvoice
 */

type Props = {
  /** Optional invoice identifier interpolated into the loading description. */
  invoiceIdentifier?: string;
};

/**
 * Server component that renders an animated loading state while a single invoice is being fetched.
 *
 * @param props - Component props
 * @returns The LoadingInvoice server component
 */
export default async function LoadingInvoice({invoiceIdentifier = ""}: Readonly<Props>): Promise<React.JSX.Element> {
  const t = await getTranslations("IMS--Common.statesLoading");
  return (
    <EmptyState
      icon={<Loader2 className='animate-spin' />}
      title={t("title")}
      description={t("description", {invoiceIdentifier})}
    />
  );
}
