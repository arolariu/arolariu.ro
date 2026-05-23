"use client";

import {FileSearch} from "lucide-react";
import {useTranslations} from "next-intl";
import EmptyState from "./EmptyState";

/**
 * @fileoverview Not-found state for a single invoice lookup.
 * @module app/domains/invoices/_components/InvoiceNotFound
 */

type Props = {
  /** Optional invoice identifier interpolated into the not-found description. */
  invoiceIdentifier?: string;
};

/**
 * Client component that displays a "not found" state when a specific invoice cannot be located.
 *
 * @param props - Component props
 * @returns The InvoiceNotFound component
 */
export default function InvoiceNotFound({invoiceIdentifier = ""}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--Common.statesNotFound");
  return (
    <EmptyState
      icon={<FileSearch />}
      title={t("title")}
      description={t("description", {invoiceIdentifier})}
    />
  );
}
