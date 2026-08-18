"use client";

/**
 * @fileoverview Linked merchant card with canonical NACE presentation.
 * @module domains/invoices/view-invoice/[id]/components/cards/MerchantInfoCard
 */

import {ClassificationProvenance} from "@/app/domains/invoices/_components/analysis/StructuredAnalysisDetails";
import {MerchantAnalysisForm} from "@/app/domains/invoices/_components/analysis/MerchantAnalysisForm";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useInvoiceContext} from "../../_context/InvoiceContext";

/** Renders the linked merchant only when the public DTO is available. */
export default function MerchantInfoCard(): React.JSX.Element {
  const t = useTranslations();
  const {merchant} = useInvoiceContext();
  if (merchant === null) {
    return (
      <Card>
        <CardContent>{t((m) => m.cards.invoices.merchantInfoCard.noMerchantLinked)}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t((m) => m.cards.invoices.merchantInfoCard.title)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{merchant.name}</p>
        <p>{merchant.description}</p>
        <ClassificationProvenance classification={merchant.classification} />
        <address>
          {merchant.address.address}
          {merchant.address.phoneNumber === "" ? null : <span>{merchant.address.phoneNumber}</span>}
          {merchant.address.emailAddress === "" ? null : <span>{merchant.address.emailAddress}</span>}
        </address>
        <MerchantAnalysisForm merchantIdentifier={merchant.id} />
      </CardContent>
    </Card>
  );
}
