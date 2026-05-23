"use client";

import {FolderSearch} from "lucide-react";
import {useTranslations} from "next-intl";
import EmptyState from "./EmptyState";

/**
 * @fileoverview Not-found state when the user has no invoices in their account.
 * @module app/domains/invoices/_components/InvoicesNotFound
 */

/**
 * Client component that displays an empty state with a CTA when the user has no invoices.
 *
 * @returns The InvoicesNotFound component
 */
export default function InvoicesNotFound(): React.JSX.Element {
  const t = useTranslations("IMS--Common.invoicesNotFound");
  return (
    <EmptyState
      icon={<FolderSearch />}
      title={t("title")}
      description={t("description")}
      primaryAction={{
        label: t("cta"),
        href: "/domains/invoices/create-invoice",
      }}
    />
  );
}
